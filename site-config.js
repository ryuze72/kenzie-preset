/* Domain resmi via Vercel custom domain */
(function () {
  var SITE = 'https://kenzie-preset.web.id';
  // fallback jika masih di vercel.app
  try {
    if (location.hostname && /vercel\.app$/i.test(location.hostname)) {
      SITE = location.origin;
    } else if (location.hostname && /kenzie-preset\.web\.id$/i.test(location.hostname)) {
      SITE = location.origin;
    }
  } catch (e) {}
  window.KENZIE_SITE_URL = SITE;
  window.SITE_URL = SITE;
})();
