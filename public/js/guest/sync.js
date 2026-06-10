export let networkMonitorInterval;

export function startNetworkMonitor(peerConnection) {
  if (!peerConnection) return;
  const syncStatusIcon = document.getElementById('syncStatusIcon');
  let lastBytes = 0, lastTime = Date.now();
  clearInterval(networkMonitorInterval);
  
  networkMonitorInterval = setInterval(async () => {
    if (!peerConnection) return;
    const stats = await peerConnection.getStats();
    let currentBytes = 0, loss = 0, total = 0, rtt = 0;
    stats.forEach(r => {
      if (r.type === 'inbound-rtp' && r.kind === 'video') { 
        currentBytes = r.bytesReceived; loss = r.packetsLost; total = r.packetsReceived + r.packetsLost; 
        if (r.frameWidth) document.getElementById('statRes').innerText = `${r.frameWidth}x${r.frameHeight}`; 
      }
      if (r.type === 'candidate-pair' && r.state === 'succeeded') rtt = r.currentRoundTripTime * 1000;
    });
    const now = Date.now();
    const bitrate = Math.round((currentBytes - lastBytes) * 8 / (now - lastTime));
    lastBytes = currentBytes; lastTime = now;
    document.getElementById('statBitrate').innerText = `${bitrate} kbps`;
    document.getElementById('statLoss').innerText = total > 0 ? ((loss / total) * 100).toFixed(1) : 0;
    document.getElementById('statPing').innerText = rtt ? Math.round(rtt) : '--';
    
    if (syncStatusIcon) {
      syncStatusIcon.className = 'icon-btn wifi-icon ' + (rtt > 200 || (loss / total) > 0.05 ? 'wifi-poor' : rtt > 100 ? 'wifi-warning' : 'wifi-excellent');
    }
  }, 1000);
}
