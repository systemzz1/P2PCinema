import { injectSharedUI } from './shared-ui.js';
injectSharedUI();

const modal = document.getElementById('nicknameModal');
const input = document.getElementById('nicknameInput');
const saveBtn = document.getElementById('saveNicknameBtn');
const profileBtn = document.getElementById('userProfileBtn');
const displayName = document.getElementById('displayName');
const errorText = document.getElementById('nicknameError');

function setNickname(name) {
  localStorage.setItem('cinemaNickname', name);
  displayName.innerHTML = name;
  profileBtn.style.display = 'flex';
  modal.style.display = 'none';
}

const savedName = localStorage.getItem('cinemaNickname');
if (!savedName) {
  modal.style.display = 'flex';
} else {
  setNickname(savedName);
}

// Strict Validation Logic
function validateAndSave() {
  const name = input.value.trim();
  if (name.length < 2 || name.length > 12) {
    input.classList.add('error');
    errorText.style.display = 'block';
  } else {
    input.classList.remove('error');
    errorText.style.display = 'none';
    setNickname(name);
  }
}

saveBtn.addEventListener('click', validateAndSave);

input.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') validateAndSave();
});

// Hide error text immediately when user starts typing
input.addEventListener('input', () => {
  input.classList.remove('error');
  errorText.style.display = 'none';
});

// Click the entire pill button to edit name
profileBtn.addEventListener('click', () => {
  input.value = localStorage.getItem('cinemaNickname') || "";
  modal.style.display = 'flex';
  input.focus();
});