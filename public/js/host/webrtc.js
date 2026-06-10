import { socket } from '../socket-client.js';
import { updateHostStatusUI } from './ui.js';

export let localStream = null;
let peerConnections = {};

export let onStreamEndedCallback = null;
export function setOnStreamEnded(cb) {
  onStreamEndedCallback = cb;
}

export async function startStream(previewEl) {
  const lockStatus = await new Promise((resolve) => {
    socket.emit('request-stream-start', resolve);
    setTimeout(() => resolve({ success: true }), 3000);
  });

  if (lockStatus.error) {
    alert(lockStatus.error + "\n\nPlease wait for the other host to finish, or restart the server.");
    return false;
  }

  socket.emit('host-stream-ready');
  try {
    const resConfig = localStorage.getItem('cinemaQualityRes') || '1920x1080';
    const [width, height] = resConfig.split('x').map(Number);
    const fpsConfig = parseInt(localStorage.getItem('cinemaQualityFps') || '60', 10);

    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { 
        displaySurface: "browser",
        width: { ideal: width, max: width },
        height: { ideal: height, max: height },
        frameRate: { ideal: fpsConfig, max: fpsConfig }
      },
      audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false }
    });
    
    const videoTrack = localStream.getVideoTracks()[0];
    if (videoTrack) videoTrack.contentHint = 'motion';

    previewEl.srcObject = localStream;
    videoTrack.onended = () => {
      stopStream(previewEl);
      if (onStreamEndedCallback) onStreamEndedCallback();
    };
    socket.emit('stream-started');
    updateHostStatusUI(true);
    return true;
  } catch (err) {
    console.error("Stream Start Error:", err);
    socket.emit('stream-ended'); // Release the lock
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      alert("Screen Sharing Blocked!\n\nYour browser blocked screen sharing because this connection is not secure. You MUST use 'localhost' or an HTTPS connection to host a stream.");
    } else if (err.name === "NotAllowedError") {
      alert("Screen Sharing Denied!\n\nYou must grant permission to share your screen, or your browser is blocking it due to an insecure HTTP connection.");
    } else {
      alert("Failed to start stream: " + err.message);
    }
    return false;
  }
}

export function stopStream(previewEl) {
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  if (previewEl) previewEl.srcObject = null;
  Object.values(peerConnections).forEach(pc => pc.close());
  peerConnections = {};
  socket.emit('stream-ended');
  updateHostStatusUI(false);
}

export function toggleAudioMute() {
  if (!localStream) return null;
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    const track = audioTracks[0];
    track.enabled = !track.enabled;
    return track.enabled;
  }
  return null;
}

export function initWebRTCSockets() {
  socket.on('request-offer-for-new-guest', async (data) => {
    if (!localStream) return;

    const guestId = data.guestId;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerConnections[guestId] = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('ice-candidate', { targetId: guestId, candidate: e.candidate });
    };

    localStream.getTracks().forEach(t => {
      const sender = pc.addTrack(t, localStream);
      if (t.kind === 'video') {
        const maxBitrateMbps = parseFloat(localStorage.getItem('cinemaQualityBitrate') || '5.0');
        const parameters = sender.getParameters();
        if (!parameters.encodings) parameters.encodings = [{}];
        parameters.encodings[0].maxBitrate = maxBitrateMbps * 1000000;
        sender.setParameters(parameters).catch(e => console.error("setParameters failed:", e));
      }
    });

    // Force Video Codec Preference
    const preferredCodec = localStorage.getItem('cinemaVideoCodec') || 'default';
    if (preferredCodec !== 'default' && RTCRtpReceiver.getCapabilities) {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      if (capabilities && capabilities.codecs) {
        const transceivers = pc.getTransceivers();
        transceivers.forEach(t => {
          if (t.sender && t.sender.track && t.sender.track.kind === 'video' && t.setCodecPreferences) {
            const targetCodecs = capabilities.codecs.filter(c => c.mimeType.toUpperCase().includes(preferredCodec.toUpperCase()));
            if (targetCodecs.length > 0) {
              const otherCodecs = capabilities.codecs.filter(c => !c.mimeType.toUpperCase().includes(preferredCodec.toUpperCase()));
              try { t.setCodecPreferences([...targetCodecs, ...otherCodecs]); } catch (e) { console.error(e); }
            }
          }
        });
      }
    }

    let offer = await pc.createOffer();
    
    // SDP Munging to force start bitrate
    const startBitrateKbps = Math.floor(parseFloat(localStorage.getItem('cinemaQualityBitrate') || '5.0') * 1000);
    offer.sdp = offer.sdp.replace(/a=mid:video\r\n/g, `a=mid:video\r\nb=AS:${startBitrateKbps}\r\n`);
    
    await pc.setLocalDescription(offer);
    
    const playoutDelay = parseFloat(localStorage.getItem('cinemaQualityDelay') || '2.0');
    socket.emit('webrtc-offer', { targetId: guestId, offer: offer, playoutDelay: playoutDelay });
  });

  socket.on('webrtc-answer', async (data) => {
    if (peerConnections[data.guestId]) {
      await peerConnections[data.guestId].setRemoteDescription(new RTCSessionDescription(data.answer));
    }
  });

  socket.on('ice-candidate', async (data) => {
    if (peerConnections[data.senderId]) {
      try {
        await peerConnections[data.senderId].addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (e) { }
    }
  });
}
