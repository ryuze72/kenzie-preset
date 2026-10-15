/* Default Fake Lobby ML rank = glory (emblem emas seperti contoh) */
(function () {
  function apply() {
    var el = document.getElementById('mlRank');
    if (el && !el.value) el.value = 'glory';
    if (typeof window.mlMake === 'function' && !window.__mlGloryPatched) {
      window.__mlGloryPatched = true;
      var prev = window.mlMake;
      window.mlMake = async function () {
        var r = document.getElementById('mlRank');
        if (r && !String(r.value || '').trim()) r.value = 'glory';
        return prev.apply(this, arguments);
      };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
  setTimeout(apply, 400);
})();
