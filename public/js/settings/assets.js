export async function loadAssets() {
  const res = await fetch('/api/assets');
  const data = await res.json();
  
  const emotesList = document.getElementById('emotesList');
  if (emotesList) {
    emotesList.innerHTML = '';
    data.emotes.forEach(em => {
      emotesList.innerHTML += `
        <div class="asset-item">
          <button class="delete-btn" onclick="deleteAsset('emote', '${em}')">X</button>
          <div class="icon">${em}</div>
          <div class="name">Emote</div>
        </div>
      `;
    });
  }

  const soundsList = document.getElementById('soundsList');
  if (soundsList) {
    soundsList.innerHTML = '';
    data.sounds.forEach(snd => {
      soundsList.innerHTML += `
        <div class="asset-item">
          <button class="delete-btn" onclick="deleteAsset('sound', '${snd.id}')">X</button>
          <div class="icon">${snd.icon}</div>
          <div class="name">${snd.name}</div>
        </div>
      `;
    });
  }
}

window.deleteAsset = async function(type, id) {
  if (!confirm('Are you sure you want to delete this?')) return;
  await fetch('/api/delete-asset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, id })
  });
  loadAssets();
}

export function initAssetsLogic() {
  const addEmoteBtn = document.getElementById('addEmoteBtn');
  if (addEmoteBtn) {
    addEmoteBtn.addEventListener('click', async () => {
      const emote = document.getElementById('newEmoteChar').value.trim();
      if (!emote) return;
      const res = await fetch('/api/add-emote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emote })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error);
      } else {
        document.getElementById('newEmoteChar').value = '';
        loadAssets();
      }
    });
  }

  const uploadSoundBtn = document.getElementById('uploadSoundBtn');
  if (uploadSoundBtn) {
    uploadSoundBtn.addEventListener('click', async () => {
      const fileInput = document.getElementById('soundFileInput');
      const nameInput = document.getElementById('soundNameInput').value.trim();
      const iconInput = document.getElementById('soundIconInput').value.trim();
      const statusEl = document.getElementById('uploadStatus');
      
      if (!fileInput.files.length) {
        statusEl.innerText = "Please select a file!";
        statusEl.style.color = "#ef4444";
        return;
      }
      
      const file = fileInput.files[0];
      if (file.size > 2 * 1024 * 1024) {
        statusEl.innerText = "File exceeds 2MB limit!";
        statusEl.style.color = "#ef4444";
        return;
      }

      const formData = new FormData();
      formData.append('soundFile', file);
      formData.append('name', nameInput);
      formData.append('icon', iconInput);

      statusEl.innerText = "Uploading...";
      statusEl.style.color = "#fbbf24";

      try {
        const res = await fetch('/api/upload-sound', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          statusEl.innerText = "Uploaded successfully!";
          statusEl.style.color = "#4ade80";
          fileInput.value = '';
          document.getElementById('soundNameInput').value = '';
          document.getElementById('soundIconInput').value = '';
          loadAssets();
        } else {
          throw new Error(data.error || 'Upload failed');
        }
      } catch(err) {
        statusEl.innerText = err.message;
        statusEl.style.color = "#ef4444";
      }
      setTimeout(() => { statusEl.innerText = ""; }, 3000);
    });
  }
}
