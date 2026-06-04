# 🏆 Papan Juara — Plan B (Sistem QR Scan)

Leaderboard permainan tradisional Indonesia dengan sistem pendaftaran QR, scanner panitia, dan dashboard admin. Semua dalam **satu file `index.html`**.

---

## 📁 Struktur File

```
papan-juara/
├── index.html          ← Semua halaman (1 file)
├── style.css           ← Semua gaya visual
├── app.js              ← Semua logika
├── README.md           ← Dokumentasi ini
├── logo-penabur.png    ← (tambahkan sendiri)
├── logo-indonesia.png  ← (tambahkan sendiri)
└── bgm.mp3             ← (tambahkan sendiri, musik latar)
```

---

## 🔗 Struktur Halaman (1 file, beda URL)

| URL | Halaman | Untuk |
|-----|---------|-------|
| `index.html` | Leaderboard | Publik / layar utama |
| `index.html?page=peserta` | Pendaftaran + Profil | Murid |
| `index.html?page=panitia` | Scanner lomba | Panitia |
| `index.html?page=admin` | Dashboard | Admin |

---

## 🔄 Alur Sistem

```
1. Admin tampilkan QR Pendaftaran (tab QR Daftar)
2. Peserta scan → daftar (Nama + Kelas dropdown) → dapat QR pribadi
3. Peserta upload foto 1:1 di profil
4. Saat lomba: Panitia pilih lomba → pilih mode (Jawara/Penjelajah)
   → scan QR peserta → +1 poin otomatis
5. Leaderboard update otomatis (peserta dengan 0 poin tidak tampil)
```

---

## ⚙️ Konfigurasi (WAJIB diisi di `app.js`)

Buka `app.js`, bagian `CONFIG` di paling atas:

```javascript
const CONFIG = {
  eventTitle  : "NAMA EVENT ANDA",
  eventTagline: "Tagline · Tahun",

  // Admin login (GANTI password!)
  adminUser : "admin",
  adminPass : "password_baru_anda",

  // Daftar nama murid untuk dropdown pendaftaran
  daftarNama : [ "Adi Pratama", "Amelia Sari", /* ...tambah semua nama... */ ],

  // Daftar kelas untuk dropdown
  daftarKelas : [ "X IPA 1", "X IPA 2", /* ...tambah semua kelas... */ ],

  // 12 nama lomba
  daftarLomba : [ "Lomba 1", "Lomba 2", /* ...sampai 12... */ ],
};
```

---

## 👥 3 Role

### PESERTA (`?page=peserta`)
- Daftar pakai dropdown Nama + Kelas (anti typo)
- Otomatis dapat QR pribadi
- Upload foto profil (auto crop 1:1)
- Lihat poin Jawara & Penjelajah sendiri

### PANITIA (`?page=panitia`)
- Tanpa login (akses via URL khusus)
- Pilih 1 dari 12 lomba
- Pilih mode: Jawara (menang) atau Penjelajah (ikut)
- Scan QR peserta pakai kamera HP
- **Anti duplikat**: 1 peserta hanya bisa +1 poin per lomba per mode

### ADMIN (`?page=admin`)
- Login pakai username + password
- **Tab Peserta**: lihat semua peserta, foto, poin, **hapus/diskualifikasi**
- **Tab Log Skor**: lihat semua aktivitas scan, koreksi/hapus entry salah
- **Tab QR Daftar**: tampilkan & print QR pendaftaran
- **Tab Pengaturan**: ubah nama event, reset data

---

## 💾 Penyimpanan Data

Saat ini data disimpan di **localStorage browser**. Cocok untuk testing & event di 1 perangkat utama.

> ⚠️ **Catatan penting:** localStorage bersifat per-browser/per-device. Untuk event multi-device (peserta daftar di HP masing-masing, panitia scan di HP lain), data **tidak otomatis sinkron** antar perangkat.
>
> Integrasi Google Sheet untuk sinkronisasi multi-device adalah **langkah berikutnya** yang perlu kita kerjakan (butuh Google Apps Script sebagai jembatan tulis-baca). Bilang saja kalau sudah siap lanjut ke sana.

---

## 📷 Fitur Foto di Top 3

Top 3 podium sekarang menampilkan **foto peserta** (bukan inisial lagi). Kalau peserta belum upload foto, otomatis fallback ke huruf inisial nama.

---

## 🎨 Kustomisasi

| Yang diubah | Lokasi |
|---|---|
| Nama event | `app.js` → `CONFIG.eventTitle` |
| Password admin | `app.js` → `CONFIG.adminPass` |
| Daftar nama/kelas/lomba | `app.js` → `CONFIG.daftarNama/Kelas/Lomba` |
| Satuan poin ("Point") | `app.js` → cari `scoreUnit` |
| Warna tema | `style.css` → `:root { }` |
| Logo kiri/kanan | `index.html` → `logo-penabur.png` & `logo-indonesia.png` |
| Musik | ganti file `bgm.mp3` |
| Emoji lomba | `app.js` → fungsi `getLombaEmoji()` |

---

## 🚀 Deploy ke GitHub Pages

1. Buat repo baru, upload semua file (+ logo + bgm)
2. **Settings → Pages → Branch: main → /(root) → Save**
3. Akses di `https://[username].github.io/papan-juara/`

> 📱 **Penting:** Scanner QR butuh **HTTPS** untuk akses kamera. GitHub Pages sudah otomatis HTTPS, jadi aman.

---

## 🐛 Troubleshooting

| Masalah | Solusi |
|---|---|
| Kamera tidak jalan | Pastikan akses via HTTPS & izinkan kamera di browser |
| Peserta tidak tampil di leaderboard | Peserta harus punya minimal 1 poin |
| Data hilang | localStorage terhapus jika clear browser data |
| Login admin gagal | Cek `CONFIG.adminUser` & `adminPass` |
| Nama tidak muncul di dropdown | Tambahkan di `CONFIG.daftarNama` |

---

*Dibuat dengan ❤️ untuk merayakan permainan tradisional Indonesia*
