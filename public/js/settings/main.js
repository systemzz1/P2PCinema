import { initAssetsLogic, loadAssets } from './assets.js';

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target).classList.add('active');
    });
  });

  const isHost = window.parent.location.pathname.includes('/host');

  document.getElementById('closeSettingsBtn').addEventListener('click', () => {
    window.parent.postMessage({ type: 'close-settings' }, '*');
  });

  // Toggles Logic
  if (isHost) {
    document.getElementById('emotesToggleLabel').innerText = "Allow Room Emotes (Global)";
    document.getElementById('soundsToggleLabel').innerText = "Allow Room Sounds (Global)";
  } else {
    document.getElementById('emotesToggleLabel').innerText = "Show Floating Emotes (Local)";
    document.getElementById('soundsToggleLabel').innerText = "Play Sound Effects (Local)";
    document.querySelector('[data-target="triviaTab"]').style.display = 'none';
    document.querySelector('[data-target="qualityTab"]').style.display = 'none';
    document.querySelectorAll('#emotesTab .add-form, #soundsTab .add-form').forEach(el => el.style.display = 'none');
    const style = document.createElement('style');
    style.innerHTML = '.delete-btn { display: none !important; }';
    document.head.appendChild(style);
  }

  const emotesToggle = document.getElementById('emotesToggleBtn');
  const soundsToggle = document.getElementById('soundsToggleBtn');

  function updateBtnUI(btn, isEnabled) {
    if (isEnabled) {
      btn.classList.add('active');
      btn.querySelector('.toggle-text').innerText = 'Enabled';
    } else {
      btn.classList.remove('active');
      btn.querySelector('.toggle-text').innerText = 'Disabled';
    }
  }

  let emotesEnabled = true;
  let soundsEnabled = true;

  if (isHost) {
    emotesToggle.addEventListener('click', () => {
      emotesEnabled = !emotesEnabled;
      updateBtnUI(emotesToggle, emotesEnabled);
      window.parent.postMessage({ type: 'toggle-room-emotes', value: emotesEnabled }, '*');
    });

    soundsToggle.addEventListener('click', () => {
      soundsEnabled = !soundsEnabled;
      updateBtnUI(soundsToggle, soundsEnabled);
      window.parent.postMessage({ type: 'toggle-room-sounds', value: soundsEnabled }, '*');
    });
    
    window.addEventListener('message', (event) => {
      if (event.data.type === 'sync-room-emotes') {
        emotesEnabled = event.data.value;
        updateBtnUI(emotesToggle, emotesEnabled);
      }
      if (event.data.type === 'sync-room-sounds') {
        soundsEnabled = event.data.value;
        updateBtnUI(soundsToggle, soundsEnabled);
      }
    });
  } else {
    if (localStorage.getItem('hideScreenEmotes') === 'true') emotesEnabled = false;
    updateBtnUI(emotesToggle, emotesEnabled);
    emotesToggle.addEventListener('click', () => {
      emotesEnabled = !emotesEnabled;
      updateBtnUI(emotesToggle, emotesEnabled);
      localStorage.setItem('hideScreenEmotes', !emotesEnabled);
    });

    if (localStorage.getItem('hideScreenSounds') === 'true') soundsEnabled = false;
    updateBtnUI(soundsToggle, soundsEnabled);
    soundsToggle.addEventListener('click', () => {
      soundsEnabled = !soundsEnabled;
      updateBtnUI(soundsToggle, soundsEnabled);
      localStorage.setItem('hideScreenSounds', !soundsEnabled);
    });
  }

  initAssetsLogic();
  loadAssets();

  // TRIVIA SETTINGS
  const tmdbApiKeyInput = document.getElementById('tmdbApiKeyInput');
  const aiApiKeyInput = document.getElementById('aiApiKeyInput');
  const tmdbKeyGroup = document.getElementById('tmdbKeyGroup');
  const aiKeyGroup = document.getElementById('aiKeyGroup');
  const saveTriviaSettingsBtn = document.getElementById('saveTriviaSettingsBtn');
  const triviaSaveStatus = document.getElementById('triviaSaveStatus');
  const triviaEngineSelect = document.getElementById('triviaEngineSelect');
  const triviaMasterToggleBtn = document.getElementById('triviaMasterToggleBtn');

  let triviaEnabled = localStorage.getItem('cinemaTriviaEnabled') !== 'false';
  if (triviaMasterToggleBtn) {
    updateBtnUI(triviaMasterToggleBtn, triviaEnabled);
    triviaMasterToggleBtn.addEventListener('click', () => {
      triviaEnabled = !triviaEnabled;
      updateBtnUI(triviaMasterToggleBtn, triviaEnabled);
      localStorage.setItem('cinemaTriviaEnabled', triviaEnabled);
      window.parent.postMessage({ type: 'toggle-trivia-panel', value: triviaEnabled }, '*');
    });
  }

  const themeSelect = document.getElementById('themeSelect');
  if (themeSelect) {
    themeSelect.value = localStorage.getItem('cinemaTheme') || 'system';
    themeSelect.addEventListener('change', () => {
      const theme = themeSelect.value;
      localStorage.setItem('cinemaTheme', theme);
      
      let appliedTheme = theme;
      if (theme === 'system') {
        appliedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', appliedTheme);
      window.parent.postMessage({ type: 'theme-changed', value: appliedTheme }, '*');
    });
  }

  if (tmdbApiKeyInput) {
    tmdbApiKeyInput.value = localStorage.getItem('cinemaTmdbApiKey') || '';
  }
  if (aiApiKeyInput) {
    aiApiKeyInput.value = localStorage.getItem('cinemaAiApiKey') || '';
  }
  if (triviaEngineSelect) {
    triviaEngineSelect.value = localStorage.getItem('cinemaTriviaEngine') || 'tmdb';
    
    function updateTriviaUI() {
      if (triviaEngineSelect.value === 'ai') {
        if(tmdbKeyGroup) tmdbKeyGroup.style.display = 'none';
        if(aiKeyGroup) aiKeyGroup.style.display = 'block';
      } else {
        if(tmdbKeyGroup) tmdbKeyGroup.style.display = 'block';
        if(aiKeyGroup) aiKeyGroup.style.display = 'none';
      }
    }
    triviaEngineSelect.addEventListener('change', updateTriviaUI);
    updateTriviaUI();
  }

  if (saveTriviaSettingsBtn) {
    saveTriviaSettingsBtn.addEventListener('click', () => {
      localStorage.setItem('cinemaTriviaEngine', triviaEngineSelect.value);
      localStorage.setItem('cinemaTmdbApiKey', tmdbApiKeyInput.value.trim());
      localStorage.setItem('cinemaAiApiKey', aiApiKeyInput.value.trim());
      
      triviaSaveStatus.innerText = 'Settings saved securely to browser!';
      setTimeout(() => { triviaSaveStatus.innerText = ''; }, 3000);
    });
  }

  // STREAM QUALITY SETTINGS
  const qualityResolution = document.getElementById('qualityResolution');
  const qualityFps = document.getElementById('qualityFps');
  const qualityCodec = document.getElementById('qualityCodec');
  const qualityBitrate = document.getElementById('qualityBitrate');
  const qualityDelay = document.getElementById('qualityDelay');
  const bitrateVal = document.getElementById('bitrateVal');
  const delayVal = document.getElementById('delayVal');
  const saveQualityBtn = document.getElementById('saveQualityBtn');
  const qualitySaveStatus = document.getElementById('qualitySaveStatus');
  const testNetworkBtn = document.getElementById('testNetworkBtn');
  const networkTestResult = document.getElementById('networkTestResult');

  if (qualityResolution) {
    // Load existing
    qualityResolution.value = localStorage.getItem('cinemaQualityRes') || '1920x1080';
    qualityFps.value = localStorage.getItem('cinemaQualityFps') || '60';
    if (qualityCodec) qualityCodec.value = localStorage.getItem('cinemaVideoCodec') || 'default';
    qualityBitrate.value = localStorage.getItem('cinemaQualityBitrate') || '5.0';
    qualityDelay.value = localStorage.getItem('cinemaQualityDelay') || '2.0';
    bitrateVal.innerText = qualityBitrate.value;
    delayVal.innerText = qualityDelay.value;

    qualityBitrate.addEventListener('input', (e) => { bitrateVal.innerText = parseFloat(e.target.value).toFixed(1); });
    qualityDelay.addEventListener('input', (e) => { delayVal.innerText = parseFloat(e.target.value).toFixed(1); });

    saveQualityBtn.addEventListener('click', () => {
      localStorage.setItem('cinemaQualityRes', qualityResolution.value);
      localStorage.setItem('cinemaQualityFps', qualityFps.value);
      if (qualityCodec) localStorage.setItem('cinemaVideoCodec', qualityCodec.value);
      localStorage.setItem('cinemaQualityBitrate', qualityBitrate.value);
      localStorage.setItem('cinemaQualityDelay', qualityDelay.value);

      qualitySaveStatus.innerText = 'Settings saved! Please restart your stream to apply.';
      setTimeout(() => { qualitySaveStatus.innerText = ''; }, 4000);
      
      // Notify host to use these if it reloads stream
      window.parent.postMessage({ type: 'stream-quality-updated' }, '*');
    });

    testNetworkBtn.addEventListener('click', async () => {
      networkTestResult.innerText = "Testing upload speed... Please wait...";
      networkTestResult.style.color = "#fbbf24";
      testNetworkBtn.disabled = true;

      try {
        // Create a 2MB dummy payload
        const dummyData = new Uint8Array(2 * 1024 * 1024);
        const startTime = performance.now();

        await fetch('/api/speedtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: dummyData
        });

        const endTime = performance.now();
        const durationSeconds = (endTime - startTime) / 1000;
        
        // 2MB = 16 Megabits
        const uploadMbps = (16 / durationSeconds).toFixed(1);
        
        // Auto-suggest a safe max bitrate (Leave 20% overhead, and assume 1 guest for baseline, but cap at 10)
        let suggestedBitrate = (uploadMbps * 0.8).toFixed(1);
        if (suggestedBitrate > 10) suggestedBitrate = 10.0;
        if (suggestedBitrate < 1) suggestedBitrate = 1.0;

        qualityBitrate.value = suggestedBitrate;
        bitrateVal.innerText = suggestedBitrate;

        networkTestResult.innerText = `Your Upload Speed is ~${uploadMbps} Mbps. Safe Bitrate set to ${suggestedBitrate} Mbps per guest.`;
        networkTestResult.style.color = "#4ade80";

      } catch (err) {
        networkTestResult.innerText = "Speed test failed. Are you connected to the server?";
        networkTestResult.style.color = "#ef4444";
      }

      testNetworkBtn.disabled = false;
    });
  }
});
