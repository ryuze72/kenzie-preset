/* Fake Profil ML — generator canvas (nama, rank, avatar bisa diedit) */
(function () {
  if (window.__mpUiInstalled) return;
  window.__mpUiInstalled = true;

  var RANKS = [
    { k: 'warrior', l: 'Warrior', c: '#8B9BB4' },
    { k: 'elite', l: 'Elite', c: '#5DADE2' },
    { k: 'master', l: 'Master', c: '#48C9B0' },
    { k: 'grandmaster', l: 'Grandmaster', c: '#58D68D' },
    { k: 'epic', l: 'Epic', c: '#AF7AC5' },
    { k: 'legend', l: 'Legend', c: '#F5B041' },
    { k: 'mythic', l: 'Mythic', c: '#E74C3C' },
    { k: 'mythical honor', l: 'Mythical Honor', c: '#FF6B6B' },
    { k: 'mythical glory', l: 'Mythical Glory', c: '#FFD700' },
    { k: 'mythical immortal', l: 'Mythical Immortal', c: '#FF3B7A' },
    { k: 'imo', l: 'Immortal', c: '#FF3B7A' }
  ];

  function rankMeta(name) {
    var n = String(name || '').toLowerCase().trim();
    for (var i = 0; i < RANKS.length; i++) {
      if (n.indexOf(RANKS[i].k) !== -1 || n === RANKS[i].l.toLowerCase()) return RANKS[i];
    }
    return { k: 'mythic', l: name || 'Mythic', c: '#E74C3C' };
  }

  function loadImg(src) {
    return new Promise(function (resolve) {
      if (!src) return resolve(null);
      var im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = function () { resolve(im); };
      im.onerror = function () { resolve(null); };
      im.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function drawProfile(opts) {
    var W = 900, H = 520;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    var g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1a3a5c');
    g.addColorStop(0.45, '#2a5080');
    g.addColorStop(1, '#0d2137');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    var rg = ctx.createRadialGradient(220, 180, 20, 220, 180, 280);
    rg.addColorStop(0, 'rgba(100,180,255,0.25)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(8,20,40,0.55)';
    roundRect(ctx, 24, 24, 520, 472, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.25)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 24, 24, 520, 472, 18);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 14px system-ui,-apple-system,sans-serif';
    ctx.fillText('PROFIL', 48, 56);

    var av = await loadImg(opts.avatar);
    var ax = 56, ay = 80, as = 110;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    if (av) {
      var sc = Math.max(as / av.width, as / av.height);
      var dw = av.width * sc, dh = av.height * sc;
      ctx.drawImage(av, ax + (as - dw) / 2, ay + (as - dh) / 2, dw, dh);
    } else {
      ctx.fillStyle = '#3a5a7a';
      ctx.fillRect(ax, ay, as, as);
      ctx.fillStyle = '#9ab';
      ctx.font = '40px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText((opts.username || '?').slice(0, 1).toUpperCase(), ax + as / 2, ay + as / 2 + 14);
      ctx.textAlign = 'left';
    }
    ctx.restore();
    var rm = rankMeta(opts.rank);
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = rm.c;
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '700 26px system-ui,-apple-system,sans-serif';
    ctx.fillText(String(opts.username || 'Player').slice(0, 24), 186, 120);

    ctx.fillStyle = 'rgba(200,220,255,0.75)';
    ctx.font = '13px system-ui,-apple-system,sans-serif';
    var idLine = 'ID: ' + (opts.id || '000000000') + (opts.zone ? ' (' + opts.zone + ')' : '');
    ctx.fillText(idLine, 186, 145);
    ctx.fillText(opts.region || 'Indonesia', 186, 166);

    function badge(x, y, title, value, color) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(ctx, x, y, 150, 72, 12);
      ctx.fill();
      ctx.strokeStyle = color || 'rgba(255,200,80,0.5)';
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, 150, 72, 12);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '11px system-ui';
      ctx.fillText(title, x + 14, y + 24);
      ctx.fillStyle = '#fff';
      ctx.font = '700 18px system-ui';
      ctx.fillText(String(value), x + 14, y + 52);
    }

    badge(48, 220, 'Rank Saat Ini', (opts.rankStars || '24') + ' \u2605', rm.c);
    badge(214, 220, 'Rank Tertinggi', (opts.rankMax || opts.rankStars || '24') + ' \u2605', '#FFD700');
    badge(380, 220, 'Rank', rm.l, rm.c);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, 48, 316, 472, 150, 14);
    ctx.fill();

    function stat(x, y, label, val) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px system-ui';
      ctx.fillText(label, x, y);
      ctx.fillStyle = '#fff';
      ctx.font = '700 20px system-ui';
      ctx.fillText(String(val), x, y + 28);
    }
    stat(72, 350, 'Like', opts.likes || '0');
    stat(200, 350, 'Hero', opts.heroes || '0');
    stat(320, 350, 'Skin', opts.skins || '0');
    stat(440, 350, 'Match', opts.matches || '0');

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '12px system-ui';
    ctx.fillText('Clan: ' + (opts.clan || '\u2014'), 72, 430);
    ctx.fillText('Fake Profil \u00b7 Kenzie Preset', 72, 452);

    ctx.fillStyle = 'rgba(8,20,40,0.4)';
    roundRect(ctx, 560, 24, 316, 472, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,255,0.2)';
    roundRect(ctx, 560, 24, 316, 472, 18);
    ctx.stroke();

    if (av) {
      ctx.save();
      roundRect(ctx, 580, 48, 276, 276, 12);
      ctx.clip();
      var sc2 = Math.max(276 / av.width, 276 / av.height);
      var dw2 = av.width * sc2, dh2 = av.height * sc2;
      ctx.drawImage(av, 580 + (276 - dw2) / 2, 48 + (276 - dh2) / 2, dw2, dh2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, 580, 48, 276, 276, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Tambah foto profil', 718, 190);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px system-ui';
    ctx.fillText('Kartu Nama', 580, 360);
    ctx.fillText('Info', 580, 400);
    ctx.fillText('Model', 580, 440);

    return c.toDataURL('image/png');
  }

  function enhanceModal() {
    var modal = document.getElementById('mpModal');
    if (!modal || modal.getAttribute('data-mp-enhanced') === '1') return;
    modal.setAttribute('data-mp-enhanced', '1');

    var rankInput = document.getElementById('mpRank');
    if (rankInput && !document.getElementById('mpStars')) {
      var box = rankInput.closest('.form-group') || rankInput.parentElement;
      var extra = document.createElement('div');
      extra.innerHTML =
        '<div class="form-group"><label>ID (opsional)</label><input class="form-input" id="mpId" maxlength="16" placeholder="826666065" /></div>' +
        '<div class="form-group"><label>Bintang rank</label><input class="form-input" id="mpStars" maxlength="6" placeholder="24" /></div>' +
        '<div class="form-group"><label>Region</label><input class="form-input" id="mpRegion" maxlength="40" placeholder="Indonesia/Jawa Tengah" /></div>';
      if (box && box.parentNode) {
        box.parentNode.insertBefore(extra, box.nextSibling);
      }
    }

    var h3 = modal.querySelector('h3');
    if (h3) h3.textContent = 'Fake Profil ML';
  }

  window.mpMake = async function () {
    enhanceModal();
    var nameEl = document.getElementById('mpName');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      if (typeof toast === 'function') toast('Username wajib diisi', 'err');
      return;
    }
    var go = document.getElementById('mpGo');
    var out = document.getElementById('mpOut');
    if (go) { go.disabled = true; go.textContent = 'Membuat\u2026'; }
    try {
      var rank = (document.getElementById('mpRank') || {}).value || 'mythic';
      var stars = (document.getElementById('mpStars') || {}).value || '24';
      var id = (document.getElementById('mpId') || {}).value || String(800000000 + Math.floor(Math.random() * 99999999));
      var region = (document.getElementById('mpRegion') || {}).value || 'Indonesia';
      var avatar = window.mpAvatar || '';

      var src = await drawProfile({
        username: name,
        rank: rank,
        rankStars: stars,
        rankMax: String(Math.max(parseInt(stars, 10) || 24, 50)),
        id: id,
        zone: '12280',
        region: region,
        likes: String(1000 + Math.floor(Math.random() * 9000)),
        heroes: String(80 + Math.floor(Math.random() * 60)),
        skins: String(100 + Math.floor(Math.random() * 250)),
        matches: String(5000 + Math.floor(Math.random() * 20000)),
        clan: 'KENZIE',
        avatar: avatar
      });

      if (out) {
        out.hidden = false;
        out.innerHTML =
          '<img class="zoomable" alt="Hasil" onclick="imgView(this.src)" src="' + src + '" />' +
          '<div class="ml-hint">Tap gambar untuk memperbesar · edit nama/rank/foto lalu Buat lagi</div>' +
          '<a class="btn btn-outline" style="display:inline-block;text-decoration:none" download="fake-profil-ml.png" href="' + src + '">Simpan gambar</a>';
      }
      if (typeof imgView === 'function') imgView(src);
      if (typeof toast === 'function') toast('Profil dibuat', 'ok');
    } catch (e) {
      if (typeof toast === 'function') toast('Gagal: ' + (e && e.message || 'error'), 'err');
    } finally {
      if (go) { go.disabled = false; go.textContent = 'Buat'; }
    }
  };

  var prevOpen = window.mpOpen;
  window.mpOpen = function () {
    if (typeof prevOpen === 'function') prevOpen();
    else if (typeof openStoreModal === 'function') openStoreModal('mpModal');
    setTimeout(enhanceModal, 50);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(enhanceModal, 300); });
  } else {
    setTimeout(enhanceModal, 300);
  }
})();
