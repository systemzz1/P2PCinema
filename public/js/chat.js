import { socket } from './socket-client.js';

const chatToggleBtn = document.getElementById('chatToggleBtn');
const playerChatToggleBtn = document.getElementById('playerChatToggleBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const chatPanel = document.getElementById('chatPanel');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');

if (chatToggleBtn) {
  chatToggleBtn.addEventListener('click', () => {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  });
}

if (playerChatToggleBtn) {
  playerChatToggleBtn.addEventListener('click', () => {
    chatPanel.style.display = chatPanel.style.display === 'none' ? 'flex' : 'none';
  });
}

if (closeChatBtn) {
  closeChatBtn.addEventListener('click', () => {
    chatPanel.style.display = 'none';
  });
}

function parseEmotes(text) {
  let parsed = text.replace(/<3/g, '❤️');
  parsed = parsed.replace(/:popcorn:/g, '🍿');
  parsed = parsed.replace(/:fire:/g, '🔥');
  parsed = parsed.replace(/:eyes:/g, '👀');
  return parsed;
}

function sendMessage() {
  const rawText = chatInput.value.trim();
  if (rawText === "") return;

  const name = localStorage.getItem('cinemaNickname') || 'Guest';
  const isHost = window.location.pathname.includes('/host');
  const colors = ["#4ade80", "#3b82f6", "#facc15", "#c084fc", "#fb923c"];
  const nameColor = isHost ? '#e50914' : colors[name.length % colors.length];

  socket.emit('chat-message', {
    name: name,
    text: parseEmotes(rawText),
    isHost: isHost,
    color: nameColor
  });

  chatInput.value = "";
}

sendChatBtn.addEventListener('click', sendMessage);

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

socket.on('chat-message', (msg) => {
  const msgDiv = document.createElement('div');
  msgDiv.className = 'chat-msg';
  const badge = msg.isHost ? `<span class=\"host-badge\" title=\"Broadcaster\">👑</span>` : '';
  msgDiv.innerHTML = `${badge}<span class=\"chat-name\" style=\"color: ${msg.color}\">${msg.name}:</span><span class=\"chat-text\">${msg.text}</span>`;
  chatMessages.appendChild(msgDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

let appAssets = { emotes: [], sounds: [] };

async function loadAssetsForChat() {
  try {
    const res = await fetch('/api/assets');
    appAssets = await res.json();
    renderChatPicker();
  } catch (e) {
    console.error("Failed to load assets", e);
  }
}

let currentPickerTab = 'emotes';
let pickerVisible = false;

function renderChatPicker() {
  const oldContainer = document.querySelector('.picker-container');
  if (oldContainer) oldContainer.remove();

  const container = document.createElement('div');
  container.className = 'picker-container';
  container.style.display = pickerVisible ? 'flex' : 'none';

  const tabsRow = document.createElement('div');
  tabsRow.className = 'picker-tabs';
  tabsRow.innerHTML = `
    <button class="${currentPickerTab === 'emotes' ? 'active' : ''}" data-tab="emotes">😃 Emotes</button>
    <button class="${currentPickerTab === 'sounds' ? 'active' : ''}" data-tab="sounds">🔊 Sounds</button>
  `;

  const picker = document.createElement('div');
  picker.className = 'emote-picker';

  if (currentPickerTab === 'emotes') {
    appAssets.emotes.forEach(em => {
      const btn = document.createElement('button');
      btn.innerText = em;
      btn.title = "Emote";
      btn.onclick = () => socket.emit('spawn-emote', em);
      picker.appendChild(btn);
    });
  } else {
    appAssets.sounds.forEach(snd => {
      const btn = document.createElement('button');
      btn.innerText = snd.icon;
      btn.title = "Play Sound: " + snd.name;
      btn.style.borderBottom = "2px solid #e50914";
      btn.onclick = () => socket.emit('spawn-sound', snd.id);
      picker.appendChild(btn);
    });
  }

  container.appendChild(tabsRow);
  container.appendChild(picker);
  document.querySelector('.chat-input-area').before(container);

  container.querySelectorAll('.picker-tabs button').forEach(btn => {
    btn.onclick = () => {
      currentPickerTab = btn.dataset.tab;
      renderChatPicker();
    };
  });
}

socket.on('assets-updated', (newAssets) => {
  appAssets = newAssets;
  renderChatPicker();
});

loadAssetsForChat();

const togglePickerBtn = document.getElementById('togglePickerBtn');
if (togglePickerBtn) {
  togglePickerBtn.addEventListener('click', () => {
    pickerVisible = !pickerVisible;
    const container = document.querySelector('.picker-container');
    if (container) container.style.display = pickerVisible ? 'flex' : 'none';
  });
}

socket.on('spawn-emote', (emote) => {
  const hideLocal = localStorage.getItem('hideScreenEmotes') === 'true';
  if (hideLocal && !window.location.pathname.includes('/host')) return; 

  const el = document.createElement('div');
  el.className = 'floating-emote';
  el.innerText = emote;
  el.style.left = Math.random() * 80 + 10 + '%';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
});

socket.on('spawn-sound', (soundId) => {
  const hideLocal = localStorage.getItem('hideScreenSounds') === 'true';
  if (hideLocal && !window.location.pathname.includes('/host')) return; 

  const sound = appAssets.sounds.find(s => s.id === soundId);
  if (sound) {
    const audio = new Audio('/uploads/sounds/' + sound.filename);
    audio.play().catch(e => console.error("Audio play failed:", e));
  }
});