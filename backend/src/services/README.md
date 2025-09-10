# WhatsApp Service

Layanan ini mengintegrasikan sistem notifikasi WhatsApp untuk DIGIPRO menggunakan library `whatsapp-web.js`.

## Fitur

- Notifikasi otomatis saat order dibuat (status pending)
- Notifikasi dan pengiriman file invoice saat pembayaran berhasil
- Pengiriman pesan dan file PDF via WhatsApp

## Konfigurasi

Tambahkan konfigurasi berikut ke file `.env` Anda:

```
# WhatsApp Configuration
ENABLE_WHATSAPP=true
DEBUG_WHATSAPP=true  # Opsional, untuk melihat error detail

# Puppeteer Options (untuk browser)
PUPPETEER_HEADLESS=false  # Ubah menjadi false untuk melihat browser secara visual
```

## Cara Penggunaan

Saat server dijalankan pertama kali, Anda akan melihat QR code di konsol. Scan QR code tersebut dengan aplikasi WhatsApp di smartphone Anda untuk mengautentikasi sesi WhatsApp Web mengikuti langkah-langkah berikut:

1. Tunggu hingga QR Code muncul di terminal
2. Buka WhatsApp di smartphone Anda
3. Ketuk menu Tiga Titik > WhatsApp Web > Tambah Perangkat
4. Scan QR Code yang muncul di terminal
5. Setelah berhasil terhubung, WhatsApp service akan aktif

Sistem akan secara otomatis mengirim pesan WhatsApp ke nomor pelanggan yang diinputkan saat:
1. Pesanan dibuat (status pending) - berisi informasi pesanan dan link pembayaran
2. Pembayaran berhasil - berisi konfirmasi dan file invoice dalam format PDF

## Metode yang Tersedia

```javascript
// Initialize WhatsApp client
await whatsappService.initialize();

// Send text message
await whatsappService.sendMessage(phoneNumber, message);

// Send PDF file
await whatsappService.sendPdf(phoneNumber, filePath, caption);
```

## Troubleshooting

### Jika QR Code Tidak Muncul

1. Periksa apakah browser Edge/Chrome terinstall dengan benar
2. Jalankan server dengan hak administrator
3. Ubah PUPPETEER_HEADLESS=false di file .env untuk melihat browser secara visual
4. Hapus folder `.wwebjs_auth` dan coba inisialisasi ulang

### Jika Error "Failed to launch the browser process"

1. Pastikan browser yang dideteksi telah terinstall dengan benar (Chrome/Edge)
2. Jalankan server dengan hak administrator
3. Periksa apakah antivirus atau firewall memblokir Puppeteer
4. Coba instal puppeteer lagi dengan perintah:
   ```
   npm install puppeteer@latest --force
   ```
5. Pastikan folder `.wwebjs_auth` memiliki izin read/write

### Jika Gagal Mengirim Pesan

1. Pastikan nomor WhatsApp valid dan aktif
2. Periksa format nomor telepon (harus 62xxxx, bukan 08xxxx)
3. Pastikan koneksi internet aktif dan stabil
4. Periksa apakah session WhatsApp masih aktif

## Silent Mode

Jika WhatsApp tidak dapat terhubung, sistem akan beralih ke "silent mode" secara otomatis:
- Semua operasi WhatsApp akan tetap berjalan tanpa error
- Pesan akan dicatat di log tetapi tidak dikirim ke WhatsApp
- Sistem tetap berjalan normal dan tidak crash

## Dependensi

- whatsapp-web.js
- qrcode-terminal
- puppeteer dan puppeteer-extra
- puppeteer-extra-plugin-stealth untuk menghindari deteksi otomasi 