/* Anti-flicker #imgView — khusus hasil HD + Control Center */
(function () {
  function applyCss() {
    if (document.getElementById('iv-fix-css')) return;
    var s = document.createElement('style');
    s.id = 'iv-fix-css';
    s.textContent = [
      '#imgView{background:#000!important;-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);',
      '-webkit-backface-visibility:hidden;backface-visibility:hidden;isolation:isolate;contain:strict}',
      '#imgView .iv-bar{background:#000;flex-shrink:0;z-index:2}',
      '#imgView .iv-box{-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);overscroll-behavior:contain}',
      '#imgView img{-webkit-backface-visibility:hidden;backface-visibility:hidden;',
      '-webkit-transform:translate3d(0,0,0);transform:translate3d(0,0,0);background:#000}',
      'body.iv-open{overflow:hidden!important;overscroll-behavior:none}'
    ].join('');
    (document.head || document.documentElement).appendChild(s);
  }

  function snapshot(im) {
    try {
      if (!im || !im.naturalWidth) return;
      if (im.getAttribute('data-frozen') === '1') return;
      var c = document.createElement('canvas');
      c.width = im.naturalWidth;
      c.height = im.naturalHeight;
      c.getContext('2d').drawImage(im, 0, 0);
      var url = c.toDataURL('image/png');
      im.setAttribute('data-live-src', im.getAttribute('data-src') || im.src);
      im.src = url;
      im.setAttribute('data-frozen', '1');
      im.setAttribute('data-src', url);
    } catch (e) {}
  }

  function install() {
    applyCss();
    if (window.__ivFixInstalled) return;
    window.__ivFixInstalled = true;
    var prevOpen = window.imgView;

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
        v.innerHTML = '<div class="iv-bar"><button type="button" onclick="imgViewClose()">Tutup</button><a id="ivSave" download="hasil.png">Simpan</a></div><div class="iv-box" onclick="if(event.target===this)imgViewClose()"><img id="ivImg" alt="" decoding="async" draggable="false" onclick="this.classList.toggle(\'zoom\')" /></div>';
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
        im.removeAttribute('data-frozen');
        im.onload = function () {
          if ((im.naturalWidth * im.naturalHeight) > 800 * 800) snapshot(im);
        };
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
        document.body.classList.add('iv-open');
      } catch (e) {}
    };

    window.imgViewClose = function () {
      var v = document.getElementById('imgView');
      if (v) v.classList.remove('show');
      try {
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.classList.remove('iv-open');
      } catch (e) {}
    };

    document.addEventListener('visibilitychange', function () {
      var v = document.getElementById('imgView');
      var im = document.getElementById('ivImg');
      if (!v || !v.classList.contains('show') || !im) return;
      if (document.hidden) snapshot(im);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(install, 0); });
  } else setTimeout(install, 0);
  setTimeout(install, 500);
})();
