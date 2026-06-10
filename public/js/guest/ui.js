import { socket } from '../socket-client.js';

const screenWrapper = document.getElementById('screenWrapper');
const playerEl = document.getElementById('theaterPlayer');
const noticeEl = document.getElementById('theaterNotice');
const joinBtn = document.getElementById('joinStreamBtn');
const videoContainer = document.getElementById('videoContainer');
const controlsBar = document.getElementById('controlsBar');
const volumeSlider = document.getElementById('volumeSlider');
const muteToggleBtn = document.getElementById('muteToggleBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const pipBtn = document.getElementById('pipBtn');
const statsToggleBtn = document.getElementById('statsToggleBtn');
const statsOverlay = document.getElementById('statsOverlay');
const chatPanel = document.getElementById('chatPanel');

export let isMobileTouch = false;
let uiTimeout;
let triviaTimeout = null;

export function activateStreamUI() {
  noticeEl.style.opacity = '0';
  joinBtn.style.display = 'none';
  controlsBar.style.display = 'flex';
}

export function resetUIForWaiting() {
  joinBtn.style.display = 'none';
  controlsBar.style.display = 'none';
  videoContainer.classList.remove('active');
  noticeEl.innerText = "Waiting for Host to start...";
  noticeEl.style.opacity = '1';
}

export function showControls() {
  videoContainer.classList.add('active');
  if (!isMobileTouch) document.body.style.cursor = 'default';
  clearTimeout(uiTimeout); uiTimeout = setTimeout(hideControls, 3500);
}

export function hideControls() {
  videoContainer.classList.remove('active');
  const isChatOpen = chatPanel && chatPanel.style.display !== 'none';
  const isOverHeader = document.elementFromPoint(10, 10)?.closest('.app-header');
  if (!isMobileTouch && !isChatOpen && !isOverHeader) {
    document.body.style.cursor = 'none';
  } else {
    document.body.style.cursor = 'default';
  }
}

export function initUI() {
  window.addEventListener('touchstart', () => { isMobileTouch = true; }, { passive: true });

  volumeSlider.value = 0.2;
  playerEl.volume = 0.2;
  playerEl.muted = false;

  joinBtn.addEventListener('click', () => {
    playerEl.play();
    activateStreamUI();
    window.dispatchEvent(new Event('guest-join-clicked'));
  });

  volumeSlider.addEventListener('input', (e) => { playerEl.volume = e.target.value; playerEl.muted = playerEl.volume === 0; });
  muteToggleBtn.addEventListener('click', () => {
    playerEl.muted = !playerEl.muted;
    volumeSlider.value = playerEl.muted ? 0 : (playerEl.volume || 1);
  });

  fullscreenBtn.addEventListener('click', async () => {
    if (playerEl.webkitEnterFullscreen) {
      playerEl.webkitEnterFullscreen();
    } else if (!document.fullscreenElement) {
      await screenWrapper.requestFullscreen().catch(e => console.log(e));
    } else {
      document.exitFullscreen();
    }
  });

  playerEl.addEventListener('webkitendfullscreen', () => {
    if (playerEl.srcObject) {
      setTimeout(() => { playerEl.play().catch(() => { }); }, 150);
    }
  });

  playerEl.addEventListener('pause', () => {
    if (playerEl.srcObject && joinBtn.style.display === 'none') {
      playerEl.play().catch(() => { });
    }
  });

  chatPanel.addEventListener('mouseenter', () => {
    document.body.style.cursor = 'default';
    clearTimeout(uiTimeout);
  });

  videoContainer.addEventListener('mousemove', () => { if (playerEl.srcObject && !isMobileTouch) showControls(); });
  videoContainer.addEventListener('mouseleave', () => { if (playerEl.srcObject && !isMobileTouch) hideControls(); });
  videoContainer.addEventListener('click', (e) => {
    if (isMobileTouch && playerEl.srcObject) {
      if (e.target.closest('.controls-bar')) showControls();
      else videoContainer.classList.contains('active') ? hideControls() : showControls();
    }
  });

  if (!document.pictureInPictureEnabled && !playerEl.webkitSetPresentationMode) { pipBtn.style.display = 'none'; }
  pipBtn.addEventListener('click', async () => {
    if (playerEl.webkitSetPresentationMode) playerEl.webkitSetPresentationMode(playerEl.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture');
    else if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await playerEl.requestPictureInPicture();
  });

  statsToggleBtn.addEventListener('click', () => {
    statsOverlay.style.display = statsOverlay.style.display === 'none' ? 'block' : 'none';
    showControls();
  });

  socket.on('stream-title-updated', (title) => {
    const display = document.getElementById('streamTitleDisplay');
    const text = document.getElementById('streamTitleText');
    if (display && text) {
      display.style.display = 'flex';
      text.innerText = title;
    }
  });

  socket.on('trivia-broadcast', (data) => {
    const overlay = document.getElementById('triviaCardOverlay');
    const title = document.getElementById('triviaCardTitle');
    const text = document.getElementById('triviaCardText');
    const img = document.getElementById('triviaCardImg');

    if (!overlay || !title || !text) return;

    title.innerText = data.title;
    text.innerHTML = data.factsHtml || data.extract;

    if (data.imageUrl) {
      img.src = data.imageUrl;
      img.style.display = 'block';
    } else {
      img.style.display = 'none';
    }

    overlay.style.left = '20px';
    if (triviaTimeout) clearTimeout(triviaTimeout);
    triviaTimeout = setTimeout(() => { overlay.style.left = '-450px'; }, 12000);
  });

  const closeTriviaBtn = document.getElementById('closeTriviaBtn');
  if (closeTriviaBtn) {
    closeTriviaBtn.addEventListener('click', () => {
      const overlay = document.getElementById('triviaCardOverlay');
      overlay.style.left = '-450px';
      if (triviaTimeout) clearTimeout(triviaTimeout);
    });
  }

  document.onkeydown = (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    switch (e.key.toLowerCase()) {
      case 'f':
        e.preventDefault();
        fullscreenBtn.click();
        break;
      case 'arrowup':
        e.preventDefault();
        let volUp = Math.min(1, parseFloat(volumeSlider.value) + 0.05);
        volumeSlider.value = volUp;
        playerEl.volume = volUp;
        playerEl.muted = volUp === 0;
        showControls();
        break;
      case 'arrowdown':
        e.preventDefault();
        let volDown = Math.max(0, parseFloat(volumeSlider.value) - 0.05);
        volumeSlider.value = volDown;
        playerEl.volume = volDown;
        playerEl.muted = volDown === 0;
        showControls();
        break;
      case ' ':
        e.preventDefault();
        if (joinBtn.style.display === 'flex') joinBtn.click();
        else window.dispatchEvent(new Event('guest-stop-watching'));
        break;
    }
  };
}
