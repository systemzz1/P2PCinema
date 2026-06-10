(function() {
  function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  const savedTheme = localStorage.getItem('cinemaTheme') || 'system';
  
  let appliedTheme = savedTheme;
  if (savedTheme === 'system') {
    appliedTheme = getSystemTheme();
  }
  
  document.documentElement.setAttribute('data-theme', appliedTheme);

  // Listen for system theme changes if set to system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (localStorage.getItem('cinemaTheme') === 'system') {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    }
  });
})();
