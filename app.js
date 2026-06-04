/**
 * ================================================================
 * PAPAN JUARA — app.js (Plan B)
 * ================================================================
 * Semua logika dalam satu file:
 *   BAGIAN 1  — Konfigurasi (EDIT DI SINI)
 *   BAGIAN 2  — State aplikasi
 *   BAGIAN 3  — Router halaman (?page=)
 *   BAGIAN 4  — Konfigurasi persisten (localStorage)
 *   BAGIAN 5  — Auth admin
 *   BAGIAN 6  — Data peserta (CRUD)
 *   BAGIAN 7  — Score log & kalkulasi poin
 *   BAGIAN 8  — Leaderboard render
 *   BAGIAN 9  — Deteksi rank change + animasi
 *   BAGIAN 10 — Halaman peserta (daftar + profil + QR)
 *   BAGIAN 11 — Halaman panitia (scanner QR)
 *   BAGIAN 12 — Admin panel (tabel peserta, log, QR daftar)
 *   BAGIAN 13 — Audio & efek
 *   BAGIAN 14 — Utilitas
 * ================================================================
 */

/* ================================================================
   BAGIAN 1 — KONFIGURASI
   Ubah nilai di bawah sesuai kebutuhan event Anda
   ================================================================ */
const CONFIG = {
  // ── Info event ─────────────────────────────────────────────────
  eventTitle  : "NAMA EVENT",
  eventTagline: "Tagline Event · Tahun",

  // ── Google Sheet ───────────────────────────────────────────────
  // Isi dengan Sheet ID Anda (lihat README untuk cara mendapatkannya)
  // Sheet harus dipublikasikan ke web sebagai CSV
  sheetId         : "GANTI_DENGAN_SHEET_ID_ANDA",
  sheetJawara     : "Jawara",
  sheetPenjelajah : "Penjelajah",

  // ── Auto-refresh leaderboard ───────────────────────────────────
  refreshInterval : 30000, // dalam milidetik

  // ── Jumlah peserta tampil di leaderboard ───────────────────────
  topN : 10,

  // ── Kredensial admin ───────────────────────────────────────────
  // WAJIB GANTI sebelum deploy!
  adminUser : "admin",
  adminPass : "papanjuara2025",

  // ── Musik ──────────────────────────────────────────────────────
  musicAutoplay : false,

  // ── Daftar nama murid (dropdown pendaftaran peserta) ───────────
  // Tambahkan semua nama murid di sini
  daftarNama : [
    "Adi Pratama", "Amelia Sari", "Bagas Wicaksono", "Bella Kusuma",
    "Candra Wijaya", "Dea Permata", "Eko Santoso", "Farah Nadia",
    "Galih Purnama", "Hana Safitri", "Ilham Maulana", "Jeni Rahayu",
    // ... tambahkan nama lainnya di sini
  ],

  // ── Daftar kelas (dropdown pendaftaran peserta) ─────────────────
  daftarKelas : [
    "X IPA 1", "X IPA 2", "X IPS 1", "X IPS 2",
    "XI IPA 1", "XI IPA 2", "XI IPS 1", "XI IPS 2",
    "XII IPA 1", "XII IPA 2", "XII IPS 1", "XII IPS 2",
    // ... tambahkan kelas lainnya di sini
  ],

  // ── Daftar 12 lomba ────────────────────────────────────────────
  // Sesuaikan dengan lomba yang ada di event Anda
  daftarLomba : [
    "Lomba 1", "Lomba 2", "Lomba 3", "Lomba 4",
    "Lomba 5", "Lomba 6", "Lomba 7", "Lomba 8",
    "Lomba 9", "Lomba 10", "Lomba 11", "Lomba 12",
  ],
};

/* ================================================================
   BAGIAN 2 — STATE APLIKASI
   ================================================================ */
const STATE = {
  // Data leaderboard (untuk deteksi rank change)
  jawara        : [],
  penjelajah    : [],
  prevJawara    : [],
  prevPenjelajah: [],

  // Status UI
  musicOn       : CONFIG.musicAutoplay,
  refreshTimer  : null,

  // Panitia scanner
  lombaAktif    : null,   // nama lomba yang dipilih
  modeAktif     : null,   // 'jawara' atau 'penjelajah'
  qrScanner     : null,   // instance html5-qrcode
  scanLog       : [],     // log scan sesi ini

  // Peserta aktif (tersimpan di localStorage)
  pesertaAktif  : null,
};

/* ================================================================
   BAGIAN 3 — ROUTER HALAMAN
   Menggunakan query parameter ?page=
   ================================================================ */

/**
 * Tampilkan halaman sesuai ?page= di URL.
 * Jika tidak ada parameter, tampilkan leaderboard.
 */
function router() {
  const params = new URLSearchParams(window.location.search);
  const page   = params.get('page') || 'leaderboard';

  // Sembunyikan semua halaman
  document.querySelectorAll('.page').forEach(p => p.style.display = 'none');

  // Tampilkan halaman yang sesuai
  const el = document.getElementById(`page-${page}`);
  if (el) el.style.display = 'block';

  // Inisialisasi per halaman
  switch (page) {
    case 'leaderboard': initLeaderboard(); break;
    case 'peserta':     initPeserta();     break;
    case 'panitia':     initPanitia();     break;
    case 'admin':       initAdmin();       break;
  }
}

// Jalankan router saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  spawnParticles();
  router();
});

/* ================================================================
   BAGIAN 4 — KONFIGURASI PERSISTEN
   ================================================================ */

/** Muat konfigurasi dari localStorage dan terapkan ke halaman */
function loadConfig() {
  const saved = localStorage.getItem('papanJuaraConfig');
  if (saved) Object.assign(CONFIG, JSON.parse(saved));

  // Update teks header
  const elTitle   = document.getElementById('event-title');
  const elTagline = document.getElementById('event-tagline');
  if (elTitle)   elTitle.textContent   = CONFIG.eventTitle;
  if (elTagline) elTagline.textContent = CONFIG.eventTagline;
}

/** Simpan konfigurasi dari form admin ke localStorage */
function saveConfig() {
  CONFIG.eventTitle      = document.getElementById('cfg-title')?.value   || CONFIG.eventTitle;
  CONFIG.eventTagline    = document.getElementById('cfg-tagline')?.value || CONFIG.eventTagline;
  CONFIG.sheetId         = document.getElementById('cfg-sheet-id')?.value || CONFIG.sheetId;
  CONFIG.refreshInterval = (parseInt(document.getElementById('cfg-refresh')?.value) || 30) * 1000;
  localStorage.setItem('papanJuaraConfig', JSON.stringify(CONFIG));
  showToast('✅ Pengaturan berhasil disimpan!');
}

/** Isi form admin dengan nilai CONFIG saat ini */
function populateConfigForm() {
  const fields = {
    'cfg-title'    : CONFIG.eventTitle,
    'cfg-tagline'  : CONFIG.eventTagline,
    'cfg-sheet-id' : CONFIG.sheetId,
    'cfg-refresh'  : CONFIG.refreshInterval / 1000,
  };
  for (const [id, val] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }
}

/* ================================================================
   BAGIAN 5 — AUTH ADMIN
   ================================================================ */

/** Inisialisasi halaman admin */
function initAdmin() {
  checkAdminSession();
  populateConfigForm();
}

/** Proses login — bandingkan dengan CONFIG.adminUser/Pass */
function doLogin() {
  const user  = document.getElementById('inp-user')?.value.trim();
  const pass  = document.getElementById('inp-pass')?.value;
  const errEl = document.getElementById('login-error');

  if (user === CONFIG.adminUser && pass === CONFIG.adminPass) {
    sessionStorage.setItem('adminLoggedIn', 'true');
    showAdminPanel();
  } else {
    if (errEl) errEl.textContent = '❌ Username atau password salah!';
    const box = document.querySelector('.login-box');
    if (box) { box.style.animation = 'none'; setTimeout(() => box.style.animation = 'shake .4s ease', 10); }
  }
}

/** Cek apakah admin sudah login di session ini */
function checkAdminSession() {
  if (sessionStorage.getItem('adminLoggedIn') === 'true') showAdminPanel();
}

/** Tampilkan panel admin setelah login */
function showAdminPanel() {
  const overlay = document.getElementById('login-overlay');
  const panel   = document.getElementById('admin-panel');
  if (overlay) overlay.style.display = 'none';
  if (panel)   panel.style.display   = 'block';
  renderPesertaTable();
  renderLogTable();
  generateAdminQR();
  populateLombaFilter();
}

/** Logout admin */
function doLogout() {
  sessionStorage.removeItem('adminLoggedIn');
  location.reload();
}

/* ================================================================
   BAGIAN 6 — DATA PESERTA (CRUD)
   Data disimpan di localStorage key: 'papanJuaraPeserta'
   Format: [ { id, nama, kelas, foto, createdAt } ]
   ================================================================ */

/**
 * Ambil semua peserta dari localStorage
 * @returns {Array<{id,nama,kelas,foto,createdAt}>}
 */
function getAllPeserta() {
  return JSON.parse(localStorage.getItem('papanJuaraPeserta') || '[]');
}

/** Simpan array peserta ke localStorage */
function savePeserta(list) {
  localStorage.setItem('papanJuaraPeserta', JSON.stringify(list));
}

/**
 * Daftarkan peserta baru.
 * @param {string} nama
 * @param {string} kelas
 * @returns {{id,nama,kelas,foto,createdAt}} Peserta yang baru dibuat
 */
function tambahPeserta(nama, kelas) {
  const list = getAllPeserta();

  // Cek apakah nama sudah terdaftar
  if (list.find(p => p.nama === nama)) return null;

  const peserta = {
    id       : `p_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    nama,
    kelas,
    foto     : '',
    createdAt: new Date().toISOString(),
  };
  list.push(peserta);
  savePeserta(list);
  return peserta;
}

/**
 * Hapus peserta berdasarkan ID (untuk disqualifikasi).
 * Juga menghapus semua log score peserta tersebut.
 * @param {string} id - ID peserta
 */
function hapusPeserta(id) {
  if (!confirm('⚠️ Hapus peserta ini? Semua data score-nya juga akan dihapus!')) return;

  // Hapus dari daftar peserta
  const list = getAllPeserta().filter(p => p.id !== id);
  savePeserta(list);

  // Hapus log score peserta ini
  const log = getAllLog().filter(l => l.pesertaId !== id);
  saveLog(log);

  renderPesertaTable();
  renderLogTable();
  showToast('🗑️ Peserta berhasil dihapus');
}

/**
 * Update foto peserta
 * @param {string} id - ID peserta
 * @param {string} fotoBase64 - Data URL foto (base64)
 */
function updateFotoPeserta(id, fotoBase64) {
  const list = getAllPeserta();
  const idx  = list.findIndex(p => p.id === id);
  if (idx !== -1) { list[idx].foto = fotoBase64; savePeserta(list); }
}

/** Reset semua peserta */
function resetSemuaPeserta() {
  if (!confirm('⚠️ Hapus SEMUA peserta dan score? Tidak dapat dibatalkan!')) return;
  localStorage.removeItem('papanJuaraPeserta');
  localStorage.removeItem('papanJuaraLog');
  renderPesertaTable();
  renderLogTable();
  showToast('🗑️ Semua data berhasil dihapus');
}

/* ================================================================
   BAGIAN 7 — SCORE LOG & KALKULASI POIN
   Data disimpan di localStorage key: 'papanJuaraLog'
   Format: [ { id, pesertaId, nama, kelas, lomba, mode, waktu } ]
   ================================================================ */

/** Ambil semua log dari localStorage */
function getAllLog() {
  return JSON.parse(localStorage.getItem('papanJuaraLog') || '[]');
}

/** Simpan log ke localStorage */
function saveLog(log) {
  localStorage.setItem('papanJuaraLog', JSON.stringify(log));
}

/**
 * Tambah entry score log (dipanggil saat panitia scan QR).
 * Cek duplikat: 1 peserta hanya bisa +1 poin per lomba per mode.
 *
 * @param {string} pesertaId
 * @param {string} lomba     - Nama lomba
 * @param {'jawara'|'penjelajah'} mode
 * @returns {'ok'|'duplikat'|'tidak_ditemukan'} Status
 */
function tambahScore(pesertaId, lomba, mode) {
  const peserta = getAllPeserta().find(p => p.id === pesertaId);
  if (!peserta) return 'tidak_ditemukan';

  const log = getAllLog();

  // Cek duplikat: kombinasi pesertaId + lomba + mode harus unik
  const sudahAda = log.find(l => l.pesertaId === pesertaId && l.lomba === lomba && l.mode === mode);
  if (sudahAda) return 'duplikat';

  const entry = {
    id       : `l_${Date.now()}`,
    pesertaId,
    nama     : peserta.nama,
    kelas    : peserta.kelas,
    lomba,
    mode,
    waktu    : new Date().toISOString(),
  };
  log.push(entry);
  saveLog(log);
  return 'ok';
}

/**
 * Hapus satu entry log (admin bisa koreksi kesalahan scan)
 * @param {string} logId
 */
function hapusLog(logId) {
  if (!confirm('Hapus entry score ini?')) return;
  const log = getAllLog().filter(l => l.id !== logId);
  saveLog(log);
  renderLogTable();
  showToast('🗑️ Entry dihapus');
}

/** Reset semua score (log dikosongkan, peserta tetap) */
function resetSemuaScore() {
  if (!confirm('⚠️ Reset SEMUA score? Peserta tetap ada tapi poin jadi 0!')) return;
  localStorage.removeItem('papanJuaraLog');
  renderLogTable();
  renderPesertaTable();
  showToast('🗑️ Semua score berhasil direset');
}

/**
 * Hitung poin setiap peserta dari log.
 * @param {'jawara'|'penjelajah'} mode
 * @returns {Array<{nama,kelas,foto,skor}>} diurutkan descending
 */
function hitungSkor(mode) {
  const log     = getAllLog().filter(l => l.mode === mode);
  const peserta = getAllPeserta();
  const map     = {};

  // Hitung dari log
  log.forEach(l => {
    if (!map[l.pesertaId]) map[l.pesertaId] = 0;
    map[l.pesertaId]++;
  });

  // Gabungkan dengan data peserta, filter skor > 0
  return peserta
    .filter(p => (map[p.id] || 0) > 0)
    .map(p => ({ nama: p.nama, kelas: p.kelas, foto: p.foto, skor: map[p.id] || 0 }))
    .sort((a, b) => b.skor - a.skor)
    .slice(0, CONFIG.topN);
}

/**
 * Ambil poin peserta tertentu
 * @param {string} pesertaId
 * @returns {{jawara:number, penjelajah:number}}
 */
function getPoinPeserta(pesertaId) {
  const log = getAllLog().filter(l => l.pesertaId === pesertaId);
  return {
    jawara    : log.filter(l => l.mode === 'jawara').length,
    penjelajah: log.filter(l => l.mode === 'penjelajah').length,
  };
}

/* ================================================================
   BAGIAN 8 — LEADERBOARD RENDER
   ================================================================ */

/** Inisialisasi leaderboard: render + mulai auto-refresh */
async function initLeaderboard() {
  await refreshLeaderboard();
  scheduleRefresh();
  if (CONFIG.musicAutoplay) setTimeout(playBGM, 1000);
}

/** Refresh kedua papan leaderboard */
async function refreshLeaderboard() {
  setRefreshIndicator('loading');
  try {
    const jawaraData     = hitungSkor('jawara');
    const penjelajahData = hitungSkor('penjelajah');

    const jChanges = detectRankChanges(STATE.prevJawara, jawaraData);
    const pChanges = detectRankChanges(STATE.prevPenjelajah, penjelajahData);

    STATE.prevJawara      = [...STATE.jawara];
    STATE.prevPenjelajah  = [...STATE.penjelajah];
    STATE.jawara          = jawaraData;
    STATE.penjelajah      = penjelajahData;

    renderBoard('jawara',     jawaraData,     jChanges);
    renderBoard('penjelajah', penjelajahData, pChanges);
    handleRankChanges(jChanges, pChanges);
    updateFooter(getAllPeserta().length);
    setRefreshIndicator('live');
  } catch(e) {
    console.error('[PapanJuara] Error refresh:', e);
    setRefreshIndicator('error');
  }
}

/**
 * Render satu papan (podium + list)
 * @param {'jawara'|'penjelajah'} type
 * @param {Array} data
 * @param {Map} changes
 */
function renderBoard(type, data, changes) {
  const podiumEl = document.getElementById(`podium-${type}`);
  const listEl   = document.getElementById(`list-${type}`);
  if (!podiumEl || !listEl) return;

  const scoreUnit = type === 'jawara' ? 'Point' : 'Point';

  // ── Podium top 3 ──
  const top3 = data.slice(0, 3);
  podiumEl.innerHTML = top3.map((p, i) => {
    const rank = i + 1;
    // Tampilkan foto jika ada, jika tidak tampilkan inisial
    const avatarContent = p.foto
      ? `<img src="${p.foto}" alt="${escHtml(p.nama)}" />`
      : p.nama.charAt(0).toUpperCase();

    return `
      <div class="podium-item rank-${rank}" title="${escHtml(p.kelas)}">
        <div class="podium-avatar">${avatarContent}</div>
        <div class="podium-name">${escHtml(p.nama)}</div>
        <div class="podium-score">${p.skor} ${scoreUnit}</div>
        <div class="podium-base">#${rank}</div>
      </div>`;
  }).join('');

  // ── List rank 4–10 ──
  const rest = data.slice(3);
  const anim = type === 'jawara' ? 'slideInLeft' : 'slideInRight';
  listEl.innerHTML = rest.map((p, i) => {
    const rank   = i + 4;
    const change = changes.get(p.nama) || 'same';
    const arrow  = change === 'up' ? '▲' : (change === 'down' ? '▼' : '');
    const color  = change === 'up' ? '#4CAF50' : '#F44336';
    return `
      <li class="rank-item ${change !== 'same' ? 'changed' : ''}"
          style="animation:${anim} ${0.3 + i * 0.07}s var(--ease-bounce) both"
          title="${escHtml(p.kelas)}">
        <div class="rank-change ${change}"></div>
        <div class="rank-num">${rank}</div>
        <div class="rank-info">
          <div class="rank-name">${escHtml(p.nama)}</div>
          <div class="rank-origin">${escHtml(p.kelas)}</div>
        </div>
        <div class="rank-score">
          ${p.skor} ${scoreUnit}
          ${arrow ? `<span style="font-size:.6rem;color:${color}">${arrow}</span>` : ''}
        </div>
      </li>`;
  }).join('');

  // Confetti saat pertama kali leaderboard tampil
  if (top3.length > 0 && STATE.prevJawara.length === 0 && type === 'jawara') {
    setTimeout(fireConfetti, 800);
  }
}

/* ================================================================
   BAGIAN 9 — DETEKSI RANK CHANGE + ANIMASI
   ================================================================ */

function detectRankChanges(prev, curr) {
  const changes  = new Map();
  if (!prev.length) return changes;
  const prevRanks = new Map(prev.map((p, i) => [p.nama, i + 1]));
  curr.forEach((p, i) => {
    const c = i + 1, pr = prevRanks.get(p.nama);
    if (pr === undefined) changes.set(p.nama, 'up');
    else if (c < pr)      changes.set(p.nama, 'up');
    else if (c > pr)      changes.set(p.nama, 'down');
    else                  changes.set(p.nama, 'same');
  });
  return changes;
}

function handleRankChanges(jc, pc) {
  const all  = [...jc.entries(), ...pc.entries()];
  const ups  = all.filter(([,d]) => d === 'up');
  const downs= all.filter(([,d]) => d === 'down');
  if (ups.length)   { playSound('sfx-rank-up');   showRankToast('⬆️', `${ups[0][0]} naik posisi!`); }
  else if (downs.length) { playSound('sfx-rank-down'); showRankToast('⬇️', `${downs[0][0]} turun posisi`); }
}

function showRankToast(icon, msg) {
  const toast = document.getElementById('rank-toast');
  if (!toast) return;
  document.getElementById('rank-toast-icon').textContent = icon;
  document.getElementById('rank-toast-msg').textContent  = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function setRefreshIndicator(state) {
  const dot   = document.querySelector('.refresh-dot');
  const label = document.querySelector('.refresh-label');
  if (!dot) return;
  const map = { live:['#4CAF50','Live'], loading:['#FFC107','Refresh...'], error:['#F44336','Error'] };
  const [color, text] = map[state] || ['#888','—'];
  dot.style.background = color;
  if (label) label.textContent = text;
}

function updateFooter(total) {
  const elU = document.getElementById('last-update');
  const elT = document.getElementById('total-peserta');
  if (elU) elU.textContent = new Date().toLocaleTimeString('id-ID');
  if (elT) elT.textContent = total;
}

function scheduleRefresh() {
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  STATE.refreshTimer = setInterval(refreshLeaderboard, CONFIG.refreshInterval);
}

/* ================================================================
   BAGIAN 10 — HALAMAN PESERTA
   ================================================================ */

/** Inisialisasi halaman peserta */
function initPeserta() {
  populateDropdownNama();
  populateDropdownKelas();

  // Cek apakah peserta sudah login sebelumnya di device ini
  const savedId = localStorage.getItem('pesertaAktifId');
  if (savedId) {
    const peserta = getAllPeserta().find(p => p.id === savedId);
    if (peserta) { tampilkanProfil(peserta); return; }
  }
  document.getElementById('peserta-form-section').style.display = 'block';
  document.getElementById('peserta-profile-section').style.display = 'none';
}

/** Isi dropdown nama dari CONFIG.daftarNama */
function populateDropdownNama() {
  const sel = document.getElementById('peserta-nama');
  if (!sel) return;
  const terdaftar = getAllPeserta().map(p => p.nama);
  CONFIG.daftarNama.forEach(nama => {
    // Tandai nama yang sudah terdaftar
    const opt = document.createElement('option');
    opt.value = nama;
    opt.textContent = terdaftar.includes(nama) ? `${nama} ✓ (sudah daftar)` : nama;
    opt.disabled = terdaftar.includes(nama);
    sel.appendChild(opt);
  });
}

/** Isi dropdown kelas dari CONFIG.daftarKelas */
function populateDropdownKelas() {
  const sel = document.getElementById('peserta-kelas');
  if (!sel) return;
  CONFIG.daftarKelas.forEach(kelas => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = kelas;
    sel.appendChild(opt);
  });
}

/** Proses pendaftaran peserta */
function daftarPeserta() {
  const nama  = document.getElementById('peserta-nama')?.value;
  const kelas = document.getElementById('peserta-kelas')?.value;
  const errEl = document.getElementById('peserta-error');

  if (!nama)  { if (errEl) errEl.textContent = '❌ Pilih nama dulu!'; return; }
  if (!kelas) { if (errEl) errEl.textContent = '❌ Pilih kelas dulu!'; return; }

  const peserta = tambahPeserta(nama, kelas);
  if (!peserta) {
    if (errEl) errEl.textContent = '❌ Nama ini sudah terdaftar!';
    return;
  }

  // Simpan ID peserta aktif di device ini
  localStorage.setItem('pesertaAktifId', peserta.id);
  tampilkanProfil(peserta);
}

/**
 * Tampilkan halaman profil peserta setelah daftar/login
 * @param {{id,nama,kelas,foto}} peserta
 */
function tampilkanProfil(peserta) {
  STATE.pesertaAktif = peserta;
  document.getElementById('peserta-form-section').style.display    = 'none';
  document.getElementById('peserta-profile-section').style.display = 'block';

  // Isi data profil
  document.getElementById('profile-name-display').textContent  = peserta.nama;
  document.getElementById('profile-kelas-display').textContent = peserta.kelas;
  document.getElementById('profile-initial').textContent       = peserta.nama.charAt(0).toUpperCase();

  // Tampilkan foto jika ada
  if (peserta.foto) {
    const img = document.getElementById('profile-photo-img');
    img.src = peserta.foto;
    img.style.display = 'block';
    document.getElementById('profile-initial').style.display = 'none';
  }

  // Generate QR unik peserta (berisi peserta.id)
  const qrContainer = document.getElementById('profile-qr-canvas');
  if (qrContainer) {
    qrContainer.innerHTML = '';
    QRCode.toCanvas(peserta.id, { width: 180, margin: 1 }, (err, canvas) => {
      if (!err) qrContainer.appendChild(canvas);
    });
  }

  // Tampilkan statistik poin
  const poin = getPoinPeserta(peserta.id);
  document.getElementById('stat-jawara').textContent     = poin.jawara;
  document.getElementById('stat-penjelajah').textContent = poin.penjelajah;
}

/**
 * Handle upload foto peserta.
 * Foto di-crop ke rasio 1:1 menggunakan canvas sebelum disimpan.
 */
function handleFotoUpload(event) {
  const file = event.target.files[0];
  if (!file || !STATE.pesertaAktif) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Crop ke 1:1 menggunakan canvas
      const size   = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 200; // output 200x200px
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img,
        (img.width  - size) / 2, (img.height - size) / 2, size, size,
        0, 0, 200, 200
      );
      const fotoBase64 = canvas.toDataURL('image/jpeg', 0.85);

      // Simpan ke data peserta
      updateFotoPeserta(STATE.pesertaAktif.id, fotoBase64);
      STATE.pesertaAktif.foto = fotoBase64;

      // Update tampilan
      const imgEl = document.getElementById('profile-photo-img');
      imgEl.src = fotoBase64;
      imgEl.style.display = 'block';
      document.getElementById('profile-initial').style.display = 'none';

      showToast('✅ Foto berhasil diperbarui!');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/** Logout peserta dari device ini */
function logoutPeserta() {
  if (!confirm('Keluar dari profil ini di perangkat ini?')) return;
  localStorage.removeItem('pesertaAktifId');
  STATE.pesertaAktif = null;
  location.reload();
}

/* ================================================================
   BAGIAN 11 — HALAMAN PANITIA (SCANNER QR)
   ================================================================ */

/** Inisialisasi halaman panitia */
function initPanitia() {
  renderLombaGrid();
}

/** Render 12 tombol lomba */
function renderLombaGrid() {
  const grid = document.getElementById('lomba-grid');
  if (!grid) return;
  grid.innerHTML = CONFIG.daftarLomba.map((lomba, i) => `
    <button class="lomba-btn" onclick="pilihLomba('${escHtml(lomba)}', this)">
      <div style="font-size:1.3rem;margin-bottom:.3rem">${getLombaEmoji(i)}</div>
      ${escHtml(lomba)}
    </button>
  `).join('');
}

/** Emoji per nomor lomba */
function getLombaEmoji(i) {
  const emojis = ['🎯','🏃','🎨','🎭','🎵','🏆','⚡','🌟','🎪','🎲','🌺','🎋'];
  return emojis[i % emojis.length];
}

/**
 * Pilih lomba → tampilkan step 2 (pilih mode)
 * @param {string} lomba
 * @param {HTMLElement} btn
 */
function pilihLomba(lomba, btn) {
  STATE.lombaAktif = lomba;

  // Highlight tombol terpilih
  document.querySelectorAll('.lomba-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  // Tampilkan step 2
  document.getElementById('step-pilih-lomba').style.display  = 'none';
  document.getElementById('step-pilih-mode').style.display   = 'block';
  document.getElementById('lomba-terpilih-label').textContent = lomba;
}

/**
 * Mulai scanner QR untuk mode tertentu
 * @param {'jawara'|'penjelajah'} mode
 */
function mulaiScan(mode) {
  STATE.modeAktif = mode;

  document.getElementById('step-pilih-mode').style.display = 'none';
  document.getElementById('step-scanner').style.display    = 'block';
  document.getElementById('scan-lomba-label').textContent  = STATE.lombaAktif;
  document.getElementById('scan-mode-label').textContent   = mode === 'jawara' ? '👑 Jawara' : '🗺️ Penjelajah';
  document.getElementById('scan-result').style.display     = 'none';

  // Mulai kamera QR scanner
  STATE.qrScanner = new Html5Qrcode('qr-reader');
  STATE.qrScanner.start(
    { facingMode: 'environment' }, // pakai kamera belakang
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decodedText) => onQRScan(decodedText),
    () => {} // abaikan error frame
  ).catch(err => {
    showToast('⚠️ Tidak bisa akses kamera: ' + err);
  });
}

/**
 * Callback saat QR berhasil di-scan
 * @param {string} pesertaId - Isi QR (ID peserta)
 */
function onQRScan(pesertaId) {
  // Pause scanner sebentar agar tidak scan berkali-kali
  if (STATE.qrScanner) STATE.qrScanner.pause();

  const status = tambahScore(pesertaId, STATE.lombaAktif, STATE.modeAktif);
  const peserta = getAllPeserta().find(p => p.id === pesertaId);
  const resultEl = document.getElementById('scan-result');

  resultEl.style.display = 'block';
  resultEl.className     = 'scan-result';

  if (status === 'ok') {
    resultEl.classList.add('ok');
    document.getElementById('scan-result-icon').textContent = '✅';
    document.getElementById('scan-result-name').textContent = peserta?.nama || pesertaId;
    document.getElementById('scan-result-msg').textContent  = `+1 Point ${STATE.modeAktif === 'jawara' ? 'Jawara' : 'Penjelajah'} berhasil!`;
    playSound('sfx-scan-ok');

    // Tambah ke log sesi
    STATE.scanLog.unshift({ nama: peserta?.nama, status: 'OK', waktu: new Date().toLocaleTimeString('id-ID') });
    renderScanLog();

  } else if (status === 'duplikat') {
    resultEl.classList.add('err');
    document.getElementById('scan-result-icon').textContent = '⚠️';
    document.getElementById('scan-result-name').textContent = peserta?.nama || '—';
    document.getElementById('scan-result-msg').textContent  = 'Sudah di-scan di lomba ini!';
    playSound('sfx-scan-err');

  } else {
    resultEl.classList.add('err');
    document.getElementById('scan-result-icon').textContent = '❌';
    document.getElementById('scan-result-name').textContent = '—';
    document.getElementById('scan-result-msg').textContent  = 'QR tidak dikenali / peserta tidak ditemukan';
    playSound('sfx-scan-err');
  }

  // Resume scanner setelah 2.5 detik
  setTimeout(() => {
    if (STATE.qrScanner) STATE.qrScanner.resume();
  }, 2500);
}

/** Render log scan sesi ini di UI panitia */
function renderScanLog() {
  const ul = document.getElementById('scan-log-list');
  if (!ul) return;
  ul.innerHTML = STATE.scanLog.slice(0, 15).map(l => `
    <li>
      <span>${escHtml(l.nama || '—')}</span>
      <span style="color:${l.status==='OK'?'#4CAF50':'#F44336'}">${l.status} · ${l.waktu}</span>
    </li>
  `).join('');
}

/** Stop scanner dan kembali ke pilih lomba */
function stopScan() {
  if (STATE.qrScanner) {
    STATE.qrScanner.stop().catch(() => {});
    STATE.qrScanner = null;
  }
  resetPanitia();
}

/** Reset tampilan panitia ke step 1 */
function resetPanitia() {
  STATE.lombaAktif = null;
  STATE.modeAktif  = null;
  document.getElementById('step-pilih-lomba').style.display = 'block';
  document.getElementById('step-pilih-mode').style.display  = 'none';
  document.getElementById('step-scanner').style.display     = 'none';
  document.querySelectorAll('.lomba-btn').forEach(b => b.classList.remove('selected'));
}

/* ================================================================
   BAGIAN 12 — ADMIN PANEL
   ================================================================ */

/** Switch tab di admin panel */
function switchAdminTab(tabId) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  // Aktifkan tombol tab yang sesuai
  document.querySelectorAll('.admin-tab').forEach(btn => {
    if (btn.getAttribute('onclick')?.includes(tabId)) btn.classList.add('active');
  });
}

/** Render tabel peserta di admin */
function renderPesertaTable() {
  const tbody   = document.getElementById('tbody-peserta');
  const counter = document.getElementById('total-count');
  if (!tbody) return;

  const query   = document.getElementById('search-peserta')?.value.toLowerCase() || '';
  const peserta = getAllPeserta().filter(p =>
    p.nama.toLowerCase().includes(query) || p.kelas.toLowerCase().includes(query)
  );

  if (counter) counter.textContent = getAllPeserta().length;

  if (!peserta.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--cream-dark);padding:1.5rem">Belum ada peserta terdaftar</td></tr>';
    return;
  }

  tbody.innerHTML = peserta.map(p => {
    const poin   = getPoinPeserta(p.id);
    const avatar = p.foto
      ? `<div class="tbl-avatar"><img src="${p.foto}" alt="${escHtml(p.nama)}" /></div>`
      : `<div class="tbl-avatar">${p.nama.charAt(0).toUpperCase()}</div>`;
    return `
      <tr>
        <td>${avatar}</td>
        <td>${escHtml(p.nama)}</td>
        <td>${escHtml(p.kelas)}</td>
        <td style="color:var(--gold)">${poin.jawara}</td>
        <td style="color:#A8E6CF">${poin.penjelajah}</td>
        <td>
          <button class="tbl-del-btn" onclick="hapusPeserta('${p.id}')" title="Hapus / Diskualifikasi">🗑️</button>
        </td>
      </tr>`;
  }).join('');
}

/** Render tabel log score di admin */
function renderLogTable() {
  const tbody     = document.getElementById('tbody-log');
  if (!tbody) return;

  const filterLomba = document.getElementById('filter-lomba')?.value || '';
  const filterMode  = document.getElementById('filter-mode')?.value  || '';

  let log = getAllLog();
  if (filterLomba) log = log.filter(l => l.lomba === filterLomba);
  if (filterMode)  log = log.filter(l => l.mode  === filterMode);

  // Urutkan terbaru dulu
  log = log.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));

  if (!log.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--cream-dark);padding:1.5rem">Belum ada data scan</td></tr>';
    return;
  }

  tbody.innerHTML = log.map(l => `
    <tr>
      <td style="font-size:.7rem">${new Date(l.waktu).toLocaleString('id-ID')}</td>
      <td>${escHtml(l.nama)}</td>
      <td>${escHtml(l.kelas)}</td>
      <td>${escHtml(l.lomba)}</td>
      <td><span style="color:${l.mode==='jawara'?'var(--gold)':'#A8E6CF'}">${l.mode==='jawara'?'👑 Jawara':'🗺️ Penjelajah'}</span></td>
      <td><button class="tbl-del-btn" onclick="hapusLog('${l.id}')" title="Hapus entry">🗑️</button></td>
    </tr>`
  ).join('');
}

/** Isi filter dropdown lomba di tab log */
function populateLombaFilter() {
  const sel = document.getElementById('filter-lomba');
  if (!sel) return;
  sel.innerHTML = '<option value="">Semua Lomba</option>';
  CONFIG.daftarLomba.forEach(l => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = l;
    sel.appendChild(opt);
  });
}

/**
 * Generate QR pendaftaran di tab admin.
 * QR berisi URL ke halaman ?page=peserta
 */
function generateAdminQR() {
  const container = document.getElementById('admin-qr-pendaftaran');
  const urlEl     = document.getElementById('admin-qr-url');
  if (!container) return;

  const url = `${location.origin}${location.pathname}?page=peserta`;
  if (urlEl) urlEl.textContent = url;

  container.innerHTML = '';
  QRCode.toCanvas(url, { width: 220, margin: 2 }, (err, canvas) => {
    if (!err) container.appendChild(canvas);
  });
}

/** Print QR pendaftaran */
function printQR() {
  const canvas = document.querySelector('#admin-qr-pendaftaran canvas');
  if (!canvas) return;
  const win = window.open('');
  win.document.write(`
    <html><body style="text-align:center;padding:2rem;font-family:sans-serif">
      <h2>QR Pendaftaran Peserta</h2>
      <p>${CONFIG.eventTitle}</p>
      <img src="${canvas.toDataURL()}" style="width:300px"/>
      <p style="margin-top:1rem;font-size:.8rem">Scan untuk mendaftar</p>
      <script>window.onload=()=>{window.print();window.close()}<\/script>
    </body></html>
  `);
}

/* ================================================================
   BAGIAN 13 — AUDIO & EFEK
   ================================================================ */

function playSound(id) {
  try {
    const el = document.getElementById(id);
    if (!el) return;
    el.currentTime = 0; el.volume = 0.5;
    el.play().catch(() => {});
  } catch(e) {}
}

function toggleMusic() {
  const bgm = document.getElementById('bgm-loop');
  const btn = document.getElementById('btn-music');
  if (!bgm) return;
  if (STATE.musicOn) { bgm.pause(); STATE.musicOn = false; if (btn) btn.textContent = '🔇'; }
  else               { playBGM();   STATE.musicOn = true;  if (btn) btn.textContent = '🎵'; }
}

function playBGM() {
  const bgm = document.getElementById('bgm-loop');
  if (!bgm) return;
  bgm.volume = 0.15;
  bgm.play().catch(() => {});
}

function fireConfetti() {
  if (typeof confetti === 'undefined') return;
  confetti({ particleCount:120, spread:80, origin:{y:.6}, colors:['#F5C842','#FFE68A','#9B1B30','#1A6B4A','#FDF3DC'], scalar:1.2 });
  setTimeout(() => {
    confetti({ particleCount:60, angle:60,  spread:55, origin:{x:0}, colors:['#F5C842','#9B1B30'] });
    confetti({ particleCount:60, angle:120, spread:55, origin:{x:1}, colors:['#1A6B4A','#FFE68A'] });
  }, 600);
  playSound('sfx-confetti');
}

function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const icons = ['🍃','🌺','✨','🌸','🎋','⭐','🌿','💫'];
  for (let i = 0; i < 18; i++) {
    const el = document.createElement('div');
    el.className = 'particle';
    el.textContent = icons[Math.floor(Math.random() * icons.length)];
    el.style.left = `${Math.random()*100}%`;
    el.style.fontSize = `${.8 + Math.random()*1.2}rem`;
    el.style.animationDuration = `${12 + Math.random()*18}s`;
    el.style.animationDelay    = `${Math.random()*20}s`;
    container.appendChild(el);
  }
}

/* ================================================================
   BAGIAN 14 — UTILITAS
   ================================================================ */

/** Escape HTML untuk keamanan (mencegah XSS) */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/** Toast notifikasi global */
function showToast(msg) {
  let toast = document.getElementById('global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'global-toast';
    toast.style.cssText = `
      position:fixed;bottom:2rem;right:2rem;z-index:9999;
      background:linear-gradient(135deg,#2A1000,#4A2000);
      border:1.5px solid var(--gold-dark);border-radius:10px;
      padding:.7rem 1.3rem;color:var(--gold-light);
      font-family:var(--font-ui);font-size:.82rem;
      box-shadow:0 8px 30px rgba(0,0,0,.7);
      opacity:0;transform:translateY(20px);
      transition:all .3s ease;pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1'; toast.style.transform = 'translateY(0)';
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; }, 3000);
}

/* ================================================================
   BAGIAN 15 — MODAL BANTUAN (HELP)
   Menampilkan panduan singkat per halaman.
   Ubah teks panduan di objek HELP_CONTENT di bawah.
   ================================================================ */

// Konten bantuan per halaman — silakan edit teksnya sesuai kebutuhan
const HELP_CONTENT = {
  peserta: {
    icon  : '🎭',
    title : 'Panduan Peserta',
    steps : [
      '<strong>Pilih nama & kelas</strong> kamu dari daftar, lalu tekan tombol Daftar.',
      '<strong>Upload foto</strong> dengan mengetuk lingkaran foto di profil. Foto ini tampil di leaderboard kalau kamu masuk Top 3.',
      '<strong>Tunjukkan QR Code kamu</strong> ke panitia setiap selesai ikut/menang lomba.',
      'Cek <strong>poin kamu</strong> kapan saja di halaman profil ini.',
    ],
    note  : '💡 Satu nama hanya bisa daftar sekali. QR code kamu adalah identitas unik — jangan dibagikan ke orang lain ya!',
  },
  panitia: {
    icon  : '⚡',
    title : 'Panduan Panitia',
    steps : [
      '<strong>Pilih lomba</strong> yang sedang berlangsung dari 12 tombol lomba.',
      '<strong>Pilih mode:</strong> "Jawara" untuk peserta yang MENANG, atau "Penjelajah" untuk peserta yang IKUT lomba.',
      '<strong>Scan QR code</strong> peserta menggunakan kamera. Poin otomatis bertambah +1.',
      'Kalau peserta sudah pernah di-scan di lomba & mode yang sama, sistem akan <strong>menolak otomatis</strong> (anti curang).',
    ],
    note  : '💡 Izinkan akses kamera saat diminta browser. Arahkan kamera ke QR peserta hingga terbaca. Cek log scan di bawah untuk memastikan data masuk.',
  },
};

/**
 * Tampilkan modal bantuan untuk halaman tertentu
 * @param {'peserta'|'panitia'} page
 */
function showHelp(page) {
  const data = HELP_CONTENT[page];
  if (!data) return;

  document.getElementById('help-icon').textContent  = data.icon;
  document.getElementById('help-title').textContent = data.title;

  const content = document.getElementById('help-content');
  content.innerHTML = `
    <ol>${data.steps.map(s => `<li>${s}</li>`).join('')}</ol>
    ${data.note ? `<div class="help-note">${data.note}</div>` : ''}
  `;

  document.getElementById('help-overlay').style.display = 'flex';
}

/**
 * Tutup modal bantuan.
 * @param {Event} [event] - Jika diklik di area luar box, juga tutup
 */
function closeHelp(event) {
  // Jika event ada & yang diklik bukan overlay langsung, jangan tutup
  // (mencegah modal tertutup saat klik di dalam box)
  if (event && event.target.id !== 'help-overlay') return;
  document.getElementById('help-overlay').style.display = 'none';
}
