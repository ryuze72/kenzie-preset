/* Anti-flicker for #imgView (hasil Fake ML/FF/HD) */
(function () {
  function applyCss() {
    if (document.getElementById('iv-fix-css')) return;
    var s = document.createElement('style');
    s.id = 'iv-fix-css';
    s.textContent = [
      '#imgView{background:#000!important;-webkit-transform:translateZ(0);transform:translateZ(0);-webkit-backface-visibility:hidden;backface-visibility:hidden}',
      '#imgView .iv-bar{background:#000;flex-shrink:0;z-index:2}',
      '#imgView .iv-box{-webkit-transform:translateZ(0);transform:translateZ(0)}',
      '#imgView img{-webkit-backface-visibility:hidden;backface-visibility:hidden;-webkit-transform:translateZ(0);transform:translateZ(0);background:#000;image-rendering:auto}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function install() {
    applyCss();
    if (window.__ivFixInstalled) return;
    window.__ivFixInstalled = true;

    var prevOpen = window.imgView;
    var prevClose = window.imgViewClose;

    window.imgView = function (src) {
      if (!src) return;
      var v = document.getElementById('imgView');
      if (!v && typeof prevOpen === 'function') {
        prevOpen(src);
        v = document.getElementById('imgView');
      }
      if (!v) {
        v = document.createElement('div');
        v.id = 'imgView';
        v.innerHTML = '<div class="iv-bar"><button type="button" onclick="imgViewClose()">Tutup</button><a id="ivSave" download="hasil.png">Simpan</a></div><div class="iv-box" onclick="if(event.target===this)imgViewClose()"><img id="ivImg" alt="" decoding="async" onclick="this.classList.toggle(\'zoom\')" /></div>';
        document.body.appendChild(v);
      }
      var im = document.getElementById('ivImg');
      if (!im) {
        if (typeof prevOpen === 'function') return prevOpen(src);
        return;
      }
      im.classList.remove('zoom');
      var abs = src;
      try { abs = new URL(src, location.href).href; } catch (e) {}
      if (im.getAttribute('data-src') !== abs) {
        im.setAttribute('data-src', abs);
        im.src = src;
      }
      var a = document.getElementById('ivSave');
      if (a) {
        a.href = src;
        try { a.download = (String(src).split('/').pop() || 'hasil.png').split('?')[0] || 'hasil.png'; } catch (e) {}
      }
      v.classList.add('show');
      try {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
      } catch (e) {}
    };

    window.imgViewClose = function () {
      var v = document.getElementById('imgView');
      if (v) v.classList.remove('show');
      try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
      } catch (e) {}
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 0); });
  } else {
    setTimeout(install, 0);
  }
  setTimeout(install, 500);
  setTimeout(install, 2000);
})();
