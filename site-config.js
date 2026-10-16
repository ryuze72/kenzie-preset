/* Domain resmi Kenzie Preset */
window.KENZIE_SITE_URL = 'https://kenzie-preset.web.id';
try {
  if (typeof SITE_URL === 'undefined') {
    window.SITE_URL = window.KENZIE_SITE_URL;
  }
} catch (e) {}
