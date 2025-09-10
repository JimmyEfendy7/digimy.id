# Panduan Troubleshooting Fitur WhatsApp dan Invoice PDF

## Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Mengatasi Masalah WhatsApp Web](#mengatasi-masalah-whatsapp-web)
3. [Mengatasi Masalah Invoice PDF](#mengatasi-masalah-invoice-pdf)
4. [Script Utilitas](#script-utilitas)
5. [Log Debugging](#log-debugging)

## Pengenalan

Dokumen ini berisi petunjuk troubleshooting untuk fitur notifikasi WhatsApp dan pembuatan invoice PDF pada aplikasi DIGIPRO. Fitur ini terintegrasi dengan sistem pembayaran Midtrans untuk mengirim notifikasi saat:

1. Pesanan baru dibuat (status: pending)
2. Pembayaran berhasil (status: paid) beserta invoice PDF

## Mengatasi Masalah WhatsApp Web

### Browser tidak ditemukan atau gagal diluncurkan

Jika muncul error seperti "Failed to launch the browser process" atau "Browser not found":

1. **Pastikan browser Chrome atau Edge terinstall** pada sistem server
2. **Edit file `.env` dan pastikan** konfigurasi berikut:
   ```
   ENABLE_WHATSAPP=true
   PUPPETEER_HEADLESS=true     # Gunakan false untuk debugging
   ```

3. **Jika menggunakan Edge**, tambahkan pada whatsappService.js:
   ```javascript
   const puppeteerOptions = {
     headless: isHeadless,
     ignoreHTTPSErrors: true,
     executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
     // opsi lainnya...
   };
   ```

4. **Reset session WhatsApp** jika terjadi error:
   ```
   node reset-whatsapp.js
   ```

5. **Jalankan mode visible** untuk debugging (non-headless):
   ```
   node start-whatsapp-visible.js
   ```

### QR Code tidak muncul

Jika QR code tidak muncul di konsol:

1. **Periksa apakah browser dapat diluncurkan** dengan script `start-whatsapp-visible.js`
2. **Hapus folder `.wwebjs_auth`** dan restart server untuk mendapatkan QR code baru
3. **Periksa hak akses** folder `.wwebjs_auth` jika terdapat error permission

### Silent Mode Aktif

Jika WhatsApp berjalan dalam "silent mode" (tidak mengirim pesan):

1. **Silent mode adalah fallback** jika terjadi error koneksi WhatsApp
2. **Reset status dengan menghapus file session**:
   ```
   node reset-whatsapp.js
   ```

## Mengatasi Masalah Invoice PDF

### Invoice tidak terbuat

Jika invoice PDF tidak terbuat:

1. **Pastikan folder `/public/invoices` ada dan writeable**
   ```
   mkdir -p backend/public/invoices
   chmod 755 backend/public/invoices  # Untuk Linux/Mac
   ```

2. **Periksa folder logo ada**:
   ```
   mkdir -p backend/public/stores
   ```

3. **Pastikan dependensi PDFKit terinstall**:
   ```
   npm install pdfkit
   ```

### Invoice terbuat tapi tidak terkirim

Jika invoice terbuat tapi tidak terkirim via WhatsApp:

1. **Pastikan path file benar** dengan memeriksa log
2. **Cek apakah WhatsApp service dapat mengakses file** di folder `public/invoices`
3. **Uji dengan script test-invoice.js**:
   ```
   node test-invoice.js <transaction_id>
   ```

## Script Utilitas

Kami menyediakan beberapa script utilitas untuk membantu debugging:

1. **Reset Session WhatsApp**:
   ```
   node reset-whatsapp.js
   ```
   Menghapus session WhatsApp yang mungkin rusak dan memaksa pembuatan QR code baru

2. **Jalankan WhatsApp Visible**:
   ```
   node start-whatsapp-visible.js
   ```
   Menjalankan server dengan browser WhatsApp dalam mode visible (non-headless)

3. **Test Invoice dan Notifikasi**:
   ```
   node test-invoice.js <transaction_id>
   ```
   Menguji pembuatan invoice dan pengiriman notifikasi WhatsApp untuk transaksi tertentu

## Mematikan Silent Mode WhatsApp

Jika notifikasi WhatsApp tidak terkirim dan WhatsApp service berjalan dalam "silent mode", ikuti langkah-langkah berikut untuk mematikan silent mode:

1. Jalankan script reset WhatsApp dengan mode non-silent:
   ```
   node reset-whatsapp-silent.js
   ```

2. Ketika QR code muncul di terminal, scan dengan aplikasi WhatsApp di smartphone Anda.

3. Tunggu hingga proses otentikasi selesai (akan muncul pesan "WhatsApp client siap dan terautentikasi").

4. Setelah otentikasi berhasil, WhatsApp service akan berjalan dalam mode non-silent dan semua notifikasi akan dikirim.

## Testing Notifikasi WhatsApp

Untuk memastikan notifikasi WhatsApp berfungsi dengan baik:

1. Jalankan script test WhatsApp:
   ```
   node test-whatsapp.js
   ```

2. Masukkan nomor telepon yang ingin dikirimi pesan test.

3. Jika pesan berhasil terkirim, berarti WhatsApp service berfungsi dengan normal.

4. Anda juga dapat mengirim file PDF untuk memastikan fitur pengiriman invoice berfungsi.

## Konfigurasi Melalui Environment Variables

WhatsApp service dapat dikonfigurasi melalui environment variables berikut:

- `ENABLE_WHATSAPP=true` - Mengaktifkan WhatsApp service
- `WHATSAPP_SILENT_MODE=false` - Mematikan silent mode (default: false)
- `WHATSAPP_SILENT_MODE_FALLBACK=false` - Mencegah aktivasi otomatis silent mode jika terjadi error (default: false)
- `PUPPETEER_HEADLESS=false` - Menjalankan browser dalam mode visible (membantu debugging)
- `DEBUG_WHATSAPP=true` - Menampilkan informasi debug lebih detail

Tambahkan variabel-variabel ini ke file .env Anda untuk mengonfigurasi WhatsApp service.

## Log Debugging

### Periksa WhatsApp Log

Pada `midtransController.js`, kami telah menambahkan logging komprehensif untuk:
- Status koneksi WhatsApp
- Pembuatan invoice PDF 
- Jalur file invoice
- Status pengiriman invoice

### Tampilkan Debug Info

Tambahkan pada file `.env`:
```
DEBUG_WHATSAPP=true
```

### Pesan Error Umum

1. **"Failed to launch the browser process"**
   - Browser tidak ditemukan atau tidak dapat diakses
   - Solusi: Pastikan browser terinstall dan jalur benar

2. **"Session is not ready"**
   - WhatsApp belum login atau QR code belum di-scan
   - Solusi: Scan QR code atau reset session

3. **"Invoice not found"**
   - File invoice tidak ada atau tidak dapat diakses
   - Solusi: Periksa path dan permission folder `public/invoices`

4. **"Error processing invoice or WhatsApp notification"**
   - Error umum dalam proses pengiriman
   - Solusi: Periksa log untuk detail lebih lanjut 