import { initUI } from './ui.js';
import { initWebRTC } from './webrtc.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initWebRTC();
});
