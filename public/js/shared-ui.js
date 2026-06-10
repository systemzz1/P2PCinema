import { socket } from './socket-client.js';

export function injectSharedUI() {
  if (document.getElementById('appHeader')) return;

  const header = document.createElement('header');
  header.className = 'app-header';
  header.id = 'appHeader';
  header.innerHTML = `
        <div class="logo-container">
            <span class="brand-name">P2P Cinema</span>
        </div>
        <div class="header-controls" style="display: flex; gap: 15px; align-items: center;">
            <button class="icon-btn" id="settingsToggleBtn" style="background: var(--bg-glass); border-radius: 50%; padding: 8px; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center;" title="Settings">
                <svg viewBox="0 0 24 24" fill="var(--text-primary)" width="20" height="20"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/></svg>
            </button>
            <button class="icon-btn" id="chatToggleBtn" style="background: var(--bg-glass); border-radius: 50%; padding: 8px; width: 40px; height: 40px; display: flex; justify-content: center; align-items: center;" title="Room Chat">
                <svg viewBox="0 0 24 24" fill="var(--text-primary)" width="20" height="20"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </button>
            <div class="user-profile-pill" id="userProfileBtn" style="display: none;" title="Change Nickname">
                <svg viewBox="0 0 24 24" fill="var(--text-primary)" width="18" height="18"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                <span id="displayName" style="color: var(--text-primary)">Guest</span>
            </div>
        </div>
    `;

  const modal = document.createElement('div');
  modal.className = 'nickname-modal';
  modal.id = 'nicknameModal';
  modal.style.display = 'none';
  modal.innerHTML = `
        <div class="modal-content">
            <h2>Welcome to the Cinema</h2>
            <p>Please enter a nickname to join the chat and sync up.</p>
            <input type="text" id="nicknameInput" placeholder="Enter nickname (2-12 chars)..." minlength="2" maxlength="12" autocomplete="off">
            <div id="nicknameError" class="error-text" style="display: none; color: #ef4444; margin-top: 5px; font-size: 14px;">Nickname must be 2-12 characters.</div>
            <button id="saveNicknameBtn" style="margin-top: 15px; padding: 10px 20px; background: #e50914; color: white; border: none; border-radius: 8px; cursor: pointer;">Join Watch Party</button>
        </div>
    `;



  const assetIframeModal = document.createElement('div');
  assetIframeModal.id = 'assetManagerModal';
  assetIframeModal.style.cssText = 'display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: var(--overlay-bg, rgba(0,0,0,0.8)); z-index: 99999; justify-content: center; align-items: center;';
  assetIframeModal.innerHTML = `
      <iframe id="assetIframe" style="width: 100%; height: 100%; border: none; background: transparent;"></iframe>
  `;

  document.body.prepend(modal);
  document.body.prepend(assetIframeModal);
  document.body.prepend(header);

  initNicknameLogic();
  initSettingsLogic();
}

function initSettingsLogic() {
  const settingsBtn = document.getElementById('settingsToggleBtn');
  const assetModal = document.getElementById('assetManagerModal');
  const isHost = window.location.pathname.includes('/host');
  
  settingsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('assetIframe').src = '/settings';
    assetModal.style.display = 'flex';
  });

  window.addEventListener('message', (event) => {
    if (event.data.type === 'close-settings') {
      assetModal.style.display = 'none';
      document.getElementById('assetIframe').src = '';
    }
    if (event.data.type === 'toggle-room-emotes') {
      socket.emit('toggle-room-emotes', event.data.value);
    }
    if (event.data.type === 'toggle-room-sounds') {
      socket.emit('toggle-room-sounds', event.data.value);
    }
    if (event.data.type === 'toggle-trivia-panel') {
      const panel = document.getElementById('triviaPanelContainer');
      if (panel) panel.style.display = event.data.value ? 'block' : 'none';
    }
    if (event.data.type === 'theme-changed') {
      document.documentElement.setAttribute('data-theme', event.data.value);
    }
  });

  socket.on('room-emotes-toggled', (enabled) => {
    const iframe = document.getElementById('assetIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'sync-room-emotes', value: enabled }, '*');
    }
  });

  socket.on('room-sounds-toggled', (enabled) => {
    const iframe = document.getElementById('assetIframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'sync-room-sounds', value: enabled }, '*');
    }
  });
}

function initNicknameLogic() {
  const modal = document.getElementById('nicknameModal');
  const input = document.getElementById('nicknameInput');
  const saveBtn = document.getElementById('saveNicknameBtn');
  const errorText = document.getElementById('nicknameError');
  const profileBtn = document.getElementById('userProfileBtn');
  const displayName = document.getElementById('displayName');

  const savedName = localStorage.getItem('cinemaNickname');
  if (savedName) {
    displayName.innerText = savedName;
    profileBtn.style.display = 'flex';
  } else {
    modal.style.display = 'flex';
  }

  function saveName() {
    const val = input.value.trim();
    if (val.length >= 2 && val.length <= 12) {
      localStorage.setItem('cinemaNickname', val);
      displayName.innerText = val;
      modal.style.display = 'none';
      profileBtn.style.display = 'flex';
      errorText.style.display = 'none';
    } else {
      errorText.style.display = 'block';
    }
  }

  saveBtn.addEventListener('click', saveName);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveName();
  });

  profileBtn.addEventListener('click', () => {
    input.value = localStorage.getItem('cinemaNickname') || '';
    errorText.style.display = 'none';
    modal.style.display = 'flex';
  });
}

export function showAppToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `app-toast toast-${type}`;
  toast.innerHTML = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}