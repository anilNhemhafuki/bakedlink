
export function initTheme() {
  // Prevent flash of unstyled content by applying theme before React hydration
  const theme = localStorage.getItem('mero-baker-theme') || 'system';
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Call immediately when module loads
if (typeof window !== 'undefined') {
  initTheme();
}
