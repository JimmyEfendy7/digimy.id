# DIGIPRO Backend

Backend API untuk platform DIGIPRO.

## Instalasi

```bash
# Menggunakan npm
npm install

# Atau menggunakan pnpm
pnpm install
```

## Konfigurasi

Salin file `.env.example` menjadi `.env` dan sesuaikan dengan kebutuhan Anda:

```bash
cp .env.example .env
```

### Konfigurasi WhatsApp

Untuk mengaktifkan fitur notifikasi WhatsApp, tambahkan beberapa konfigurasi berikut di file `.env` Anda:

```
# WhatsApp Configuration
ENABLE_WHATSAPP=true
DEBUG_WHATSAPP=true  # Opsional, untuk menampilkan detail error

# Puppeteer Options (untuk browser)
PUPPETEER_HEADLESS=true  # true untuk mode headless, false untuk melihat browser
```

## Menjalankan Server

```bash
# Mode development
npm run dev

# Mode production
npm start
```

## Menggunakan Fitur WhatsApp

Ketika server pertama kali dijalankan dengan `ENABLE_WHATSAPP=true`, WhatsApp-web.js akan menampilkan QR Code di terminal. Ikuti langkah-langkah berikut:

1. Tunggu hingga QR Code muncul di terminal
2. Buka WhatsApp di smartphone Anda
3. Ketuk menu Tiga Titik > WhatsApp Web > Tambah Perangkat
4. Scan QR Code yang muncul di terminal
5. Setelah berhasil terhubung, WhatsApp service akan aktif dan siap mengirim notifikasi

Jika mengalami masalah dengan browser Edge atau Chrome, coba salah satu solusi berikut:

1. Pastikan browser Edge atau Chrome terinstall di sistem Anda
2. Jalankan server dengan hak administrator
3. Ubah `PUPPETEER_HEADLESS=false` di file `.env` untuk melihat browser secara visual
4. Atur option `DEBUG_WHATSAPP=true` untuk melihat detail error

## Troubleshooting WhatsApp

Jika muncul error "Failed to launch browser process", coba langkah berikut:

1. Pastikan folder `.wwebjs_auth` ada dan memiliki izin read/write
2. Hapus folder `.wwebjs_auth` dan coba lagi untuk membuat session baru
3. Pastikan anti-virus atau firewall tidak memblokir Puppeteer/Chrome
4. Jika menggunakan Microsoft Edge, pastikan versi terbaru terinstall

## API Endpoints

Dokumentasi API tersedia di [dokumentasi API](docs/api.md). 