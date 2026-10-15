/* Fake Profil ML — layar profil in-game (bukan lobby card) */
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
    { k: 'honor', l: 'Mythical Honor', c: '#FF6B6B' },
    { k: 'glory', l: 'Mythical Glory', c: '#FFD700' },
    { k: 'immortal', l: 'Mythical Immortal', c: '#FF3B7A' },
    { k: 'imo', l: 'Mythical Immortal', c: '#FF3B7A' }
  ];

  function rankMeta(name) {
    var n = String(name || '').toLowerCase().trim();
    for (var i = 0; i < RANKS.length; i++) {
      if (n.indexOf(RANKS[i].k) !== -1) return RANKS[i];
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

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function drawProfile(o) {
    var W = 1280, H = 720;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var rm = rankMeta(o.rank);

    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#5BA3D9');
    bg.addColorStop(0.35, '#3D7AB5');
    bg.addColorStop(0.7, '#2A5A8A');
    bg.addColorStop(1, '#1A3A5C');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var lg = ctx.createRadialGradient(W * 0.55, H * 0.2, 10, W * 0.55, H * 0.25, 400);
    lg.addColorStop(0, 'rgba(255,220,150,0.2)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(10,25,45,0.55)';
    ctx.fillRect(0, 0, 200, H);
    ctx.fillStyle = 'rgba(80,160,255,0.9)';
    ctx.fillRect(0, 100, 4, 44);

    var menu = ['Profil', 'Album', 'Koleksi', 'Hasil Pertandingan', 'Battlefield', 'Info Streamer', 'Sosial', 'Pengaturan Akun'];
    ctx.font = '600 15px system-ui,-apple-system,sans-serif';
    for (var i = 0; i < menu.length; i++) {
      var my = 120 + i * 48;
      if (i === 0) {
        ctx.fillStyle = 'rgba(60,140,220,0.35)';
        rr(ctx, 12, my - 22, 176, 40, 10);
        ctx.fill();
        ctx.fillStyle = '#7EC8FF';
      } else {
        ctx.fillStyle = 'rgba(220,235,255,0.75)';
      }
      ctx.fillText(menu[i], 28, my);
    }

    ctx.fillStyle = 'rgba(15,35,60,0.45)';
    rr(ctx, 220, 48, 700, 620, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,190,255,0.22)';
    ctx.lineWidth = 1;
    rr(ctx, 220, 48, 700, 620, 16);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '600 13px system-ui';
    ctx.fillText('PROFIL', 250, 78);

    var av = await loadImg(o.avatar);
    var ax = 250, ay = 100, as = 100;
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 8, 0, Math.PI * 2);
    ctx.strokeStyle = rm.c;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ax + as / 2, ay + as / 2, as / 2 + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,215,100,0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
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
      ctx.fillStyle = '#2a4a6a';
      ctx.fillRect(ax, ay, as, as);
      ctx.fillStyle = '#9bc';
      ctx.font = '36px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText((o.username || '?').charAt(0).toUpperCase(), ax + as / 2, ay + as / 2 + 12);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.font = '700 28px system-ui,-apple-system,sans-serif';
    ctx.fillText(String(o.username || 'Player').slice(0, 22), 370, 130);

    ctx.fillStyle = 'rgba(200,220,255,0.7)';
    ctx.font = '13px system-ui';
    ctx.fillText('ID: ' + (o.id || '000000000') + ' (' + (o.zone || '12280') + ')', 370, 155);

    ctx.fillStyle = 'rgba(180,210,255,0.85)';
    ctx.font = '13px system-ui';
    ctx.fillText((o.region || 'Indonesia'), 370, 178);

    ctx.fillStyle = '#7EC8FF';
    ctx.font = '600 13px system-ui';
    ctx.fillText((o.clan || 'KENZIE'), 370, 200);

    function rankBox(x, y, label, value, sub, color) {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      rr(ctx, x, y, 180, 88, 12);
      ctx.fill();
      ctx.strokeStyle = color || 'rgba(255,200,80,0.4)';
      ctx.lineWidth = 1;
      rr(ctx, x, y, 180, 88, 12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 36, y + 44, 22, 0, Math.PI * 2);
      var mg = ctx.createRadialGradient(x + 36, y + 40, 2, x + 36, y + 44, 22);
      mg.addColorStop(0, color || '#FFD700');
      mg.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = mg;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = '700 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(String(value), x + 36, y + 49);
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '11px system-ui';
      ctx.fillText(label, x + 68, y + 36);
      ctx.fillStyle = '#fff';
      ctx.font = '600 13px system-ui';
      ctx.fillText(sub || '', x + 68, y + 56);
    }

    rankBox(250, 230, 'Rank Saat Ini', o.rankStars || '24', rm.l, rm.c);
    rankBox(450, 230, 'Rank Tertinggi', o.rankMax || '157', o.rankMaxLabel || rm.l, '#FFD700');
    rankBox(650, 230, 'Medali', '*', o.medal || 'Mythical Glory', '#E8B923');

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    rr(ctx, 250, 340, 640, 70, 12);
    ctx.fill();
    var badges = [
      { t: 'Bring the Pain', c: '#E74C3C' },
      { t: 'Best Overall', c: '#F5B041' },
      { t: o.badge3 || 'Elite - Guardian', c: '#5DADE2' }
    ];
    for (var bi = 0; bi < badges.length; bi++) {
      var bx = 270 + bi * 210;
      ctx.beginPath();
      ctx.arc(bx + 16, 375, 14, 0, Math.PI * 2);
      ctx.fillStyle = badges[bi].c;
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 13px system-ui';
      ctx.fillText(badges[bi].t, bx + 40, 380);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    rr(ctx, 250, 430, 300, 70, 12);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px system-ui';
    ctx.fillText('Hero', 280, 455);
    ctx.fillText('Skin', 400, 455);
    ctx.fillStyle = '#fff';
    ctx.font = '700 22px system-ui';
    ctx.fillText(String(o.heroes || '133'), 280, 485);
    ctx.fillText(String(o.skins || '329'), 400, 485);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '13px system-ui';
    ctx.fillText('Total Pertandingan: ' + (o.matches || '16848'), 250, 540);
    ctx.fillText('Like: ' + (o.likes || '5886'), 480, 540);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '11px system-ui';
    ctx.fillText('Pengunjung Terakhir', 250, 575);
    for (var vi = 0; vi < 4; vi++) {
      ctx.beginPath();
      ctx.arc(250 + 16 + vi * 28, 605, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,160,200,0.5)';
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(15,35,60,0.4)';
    rr(ctx, 940, 48, 320, 520, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,190,255,0.18)';
    rr(ctx, 940, 48, 320, 520, 16);
    ctx.stroke();

    if (av) {
      ctx.save();
      rr(ctx, 960, 68, 280, 280, 12);
      ctx.clip();
      var sc2 = Math.max(280 / av.width, 280 / av.height);
      var dw2 = av.width * sc2, dh2 = av.height * sc2;
      ctx.drawImage(av, 960 + (280 - dw2) / 2, 68 + (280 - dh2) / 2, dw2, dh2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      rr(ctx, 960, 68, 280, 280, 12);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Foto profil', 1100, 210);
      ctx.textAlign = 'left';
    }

    for (var ti = 0; ti < 3; ti++) {
      var tx = 960 + ti * 96;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      rr(ctx, tx, 368, 88, 88, 8);
      ctx.fill();
      if (av && ti === 0) {
        ctx.save();
        rr(ctx, tx, 368, 88, 88, 8);
        ctx.clip();
        var sc3 = Math.max(88 / av.width, 88 / av.height);
        ctx.drawImage(av, tx + (88 - av.width * sc3) / 2, 368 + (88 - av.height * sc3) / 2, av.width * sc3, av.height * sc3);
        ctx.restore();
      }
    }

    ctx.fillStyle = 'rgba(220,235,255,0.7)';
    ctx.font = '13px system-ui';
    ctx.fillText('Kartu Nama', 1100, 500);
    ctx.fillText('Info', 1130, 530);
    ctx.fillText('Model', 1125, 560);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px system-ui';
    ctx.fillText('Pengaturan', 1180, 36);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '11px system-ui';
    ctx.fillText('Kenzie Preset · Fake Profil ML', 940, 700);

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
        '<div class="form-group"><label>Bintang rank saat ini</label><input class="form-input" id="mpStars" maxlength="6" placeholder="24" /></div>' +
        '<div class="form-group"><label>Bintang tertinggi</label><input class="form-input" id="mpStarsMax" maxlength="6" placeholder="157" /></div>' +
        '<div class="form-group"><label>Region</label><input class="form-input" id="mpRegion" maxlength="40" placeholder="Indonesia/Jawa Tengah" /></div>' +
        '<div class="form-group"><label>Clan</label><input class="form-input" id="mpClan" maxlength="24" placeholder="KENZIE" /></div>';
      if (box && box.parentNode) box.parentNode.insertBefore(extra, box.nextSibling);
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
    if (go) { go.disabled = true; go.textContent = 'Membuat...'; }
    try {
      var rank = (document.getElementById('mpRank') || {}).value || 'mythic';
      var stars = (document.getElementById('mpStars') || {}).value || '24';
      var starsMax = (document.getElementById('mpStarsMax') || {}).value || '157';
      var id = (document.getElementById('mpId') || {}).value || String(800000000 + Math.floor(Math.random() * 99999999));
      var region = (document.getElementById('mpRegion') || {}).value || 'Indonesia';
      var clan = (document.getElementById('mpClan') || {}).value || 'KENZIE';
      var avatar = window.mpAvatar || '';

      var src = await drawProfile({
        username: name,
        rank: rank,
        rankStars: stars,
        rankMax: starsMax,
        id: id,
        zone: '12280',
        region: region,
        clan: clan,
        likes: String(1000 + Math.floor(Math.random() * 9000)),
        heroes: String(80 + Math.floor(Math.random() * 80)),
        skins: String(100 + Math.floor(Math.random() * 300)),
        matches: String(5000 + Math.floor(Math.random() * 20000)),
        medal: rankMeta(rank).l,
        avatar: avatar
      });

      if (out) {
        out.hidden = false;
        out.innerHTML =
          '<img class="zoomable" alt="Hasil" onclick="imgView(this.src)" src="' + src + '" />' +
          '<div class="ml-hint">Profil ML · edit nama/rank/foto lalu Buat lagi</div>' +
          '<a class="btn btn-outline" style="display:inline-block;text-decoration:none" download="fake-profil-ml.png" href="' + src + '">Simpan gambar</a>';
      }
      if (typeof imgView === 'function') imgView(src);
      if (typeof toast === 'function') toast('Profil ML dibuat', 'ok');
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
