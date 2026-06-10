import { socket } from '../socket-client.js';

export function initUIListeners() {
  const streamTitleInput = document.getElementById('streamTitleInput');
  const updateTitleBtn = document.getElementById('updateTitleBtn');

  if (updateTitleBtn && streamTitleInput) {
    updateTitleBtn.addEventListener('click', () => {
      const title = streamTitleInput.value.trim();
      if (title) {
        socket.emit('set-stream-title', title);
        const originalText = updateTitleBtn.innerText;
        updateTitleBtn.innerText = "Updated!";
        updateTitleBtn.style.background = "#4ade80";
        setTimeout(() => {
          updateTitleBtn.innerText = originalText;
          updateTitleBtn.style.background = "";
        }, 2000);
      }
    });
  }
}

export function updateHostStatusUI(isLive) {
  const displayName = document.getElementById('displayName');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('connectionStatus');

  if (displayName) {
    displayName.innerText = localStorage.getItem('cinemaNickname') || 'Host';
  }

  if (isLive) {
    statusDot.style.background = '#4ade80';
    statusDot.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.6)';
    statusText.innerText = 'Status: LIVE';
  } else {
    statusDot.style.background = '#ef4444';
    statusDot.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.6)';
    statusText.innerText = 'Status: Offline';
  }
}
