import { socket } from '../socket-client.js';
import { showAppToast } from '../shared-ui.js';
import { activateStreamUI, resetUIForWaiting } from './ui.js';
import { startNetworkMonitor } from './sync.js';

let peerConnection = null;
let currentHostId = null;
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function getPeerConnection() { return peerConnection; }

export function initWebRTC() {
  const playerEl = document.getElementById('theaterPlayer');
  const noticeEl = document.getElementById('theaterNotice');
  const joinBtn = document.getElementById('joinStreamBtn');
  const controlsBar = document.getElementById('controlsBar');

  socket.on('webrtc-offer', async (data) => {
    if (noticeEl.style.opacity === '1') showAppToast("Host started a new stream! Reconnecting...", "info");
    if (peerConnection) {
      try { peerConnection.close(); } catch (e) { }
    }

    noticeEl.innerText = "Connecting to Host Stream...";
    noticeEl.style.opacity = '1';
    currentHostId = data.hostId;
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.ontrack = (event) => {
      if (data.playoutDelay !== undefined && event.receiver && 'playoutDelayHint' in event.receiver) {
        event.receiver.playoutDelayHint = data.playoutDelay;
      }

      if (playerEl.srcObject !== event.streams[0]) {
        playerEl.srcObject = event.streams[0];
        playerEl.play().then(() => {
          activateStreamUI();
          startNetworkMonitor(peerConnection);
          
          const buffOverlay = document.getElementById('bufferingOverlay');
          if (buffOverlay) {
            buffOverlay.style.display = 'flex';
            buffOverlay.style.opacity = '1';
            
            let attempts = 0;
            const checkStable = setInterval(async () => {
              attempts++;
              let isStable = false;
              
              if (peerConnection) {
                try {
                  const stats = await peerConnection.getStats();
                  stats.forEach(report => {
                    if (report.type === 'inbound-rtp' && report.kind === 'video') {
                      // Check if the browser has successfully decoded at least 10 frames
                      // This guarantees we received the Keyframe and video is rendering!
                      if (report.framesDecoded > 10) {
                        isStable = true;
                      }
                    }
                  });
                } catch (e) {}
              }

              // Hide overlay when stable, or fallback after 15 seconds (30 attempts)
              if (isStable || attempts > 30) {
                clearInterval(checkStable);
                buffOverlay.style.opacity = '0';
                setTimeout(() => { buffOverlay.style.display = 'none'; }, 500);
              }
            }, 500);
          }
        }).catch(() => {
          noticeEl.style.opacity = '0';
          joinBtn.style.display = 'flex';
        });
      }
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) socket.emit('ice-candidate-forward', { targetId: currentHostId, candidate: event.candidate });
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc-answer-to-host', { hostId: currentHostId, answer: answer });
  });

  socket.on('ice-candidate', async (data) => {
    if (peerConnection && data.senderId === currentHostId) {
      try { await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (e) { }
    }
  });

  socket.on('host-stream-ended', () => {
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    currentHostId = null; playerEl.srcObject = null;
    resetUIForWaiting();
    showAppToast("The Host has ended the stream.", "error");
  });

  socket.on('host-stream-ready', () => {
    socket.disconnect();
    setTimeout(() => { socket.connect(); }, 300);
  });

  socket.on('stream-started', () => {
    noticeEl.innerText = "Stream is live! Requesting connection...";
    noticeEl.style.opacity = '1';
    socket.emit('guest-request-stream');
  });

  window.addEventListener('guest-join-clicked', () => {
    startNetworkMonitor(peerConnection);
  });

  window.addEventListener('guest-stop-watching', () => {
    if (!peerConnection || !playerEl.srcObject) return;
    playerEl.pause();
    joinBtn.style.display = 'flex';
    controlsBar.style.display = 'none';
    document.getElementById('videoContainer').classList.remove('active');
    noticeEl.style.opacity = '0';
  });

  const disconnectBtn = document.getElementById('disconnectBtn');
  if (disconnectBtn) {
    disconnectBtn.onclick = () => window.dispatchEvent(new Event('guest-stop-watching'));
  }

  const refreshStreamBtn = document.getElementById('refreshStreamBtn');
  if (refreshStreamBtn) {
    refreshStreamBtn.addEventListener('click', () => {
      if (peerConnection) { peerConnection.close(); peerConnection = null; }
      socket.emit('guest-request-stream');
      showAppToast("Reloading stream connection...", "info");
      
      document.getElementById('videoContainer').classList.remove('active');
      controlsBar.style.display = 'none';
      noticeEl.innerText = "Reconnecting...";
      noticeEl.style.opacity = '1';
    });
  }
}
