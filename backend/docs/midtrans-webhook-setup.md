# Panduan Konfigurasi Webhook Midtrans

Dokumen ini menjelaskan cara menyiapkan webhook di dashboard Midtrans untuk pembaruan status transaksi secara real-time ke database DIGIPRO.

## Mengapa Webhook Penting?

Webhook memungkinkan Midtrans mengirimkan notifikasi secara otomatis ketika status transaksi berubah. Ini memastikan status pembayaran di database DIGIPRO selalu terkini tanpa perlu pengecekan manual.

## Prasyarat

1. Akun Midtrans (Sandbox atau Production)
2. URL yang bisa diakses dari internet (bukan localhost)
   - Untuk lingkungan production, gunakan domain aktual Anda
   - Untuk pengembangan, gunakan layanan seperti ngrok atau serveo

## Langkah-langkah Konfigurasi

### 1. Buka Dashboard Midtrans

- Sandbox: https://dashboard.sandbox.midtrans.com
- Production: https://dashboard.midtrans.com

### 2. Login ke Akun Midtrans

Masuk dengan kredensial akun Midtrans Anda.

### 3. Akses Pengaturan

1. Klik "Settings" di navigasi atas
2. Pilih "Configuration" di menu dropdown

### 4. Konfigurasi Webhook URL

1. Pada halaman Configuration, cari bagian "Notification URL"
2. Masukkan URL Webhook Anda:
   - Format: `https://yourdomain.com/api/payment-notification`
   - **Penting**: URL harus dapat diakses dari internet dengan HTTPS
   - Jika menggunakan ngrok: `https://your-ngrok-url.ngrok.io/api/payment-notification`

### 5. Verifikasi Webhook

1. Klik "Test Notification" untuk mengirim notifikasi pengujian
2. Periksa log server untuk memastikan notifikasi diterima
3. Periksa database untuk memastikan status pembayaran diperbarui

## Konfigurasi Aplikasi DIGIPRO

Pastikan variabel lingkungan berikut dikonfigurasi di file `.env`:

```
# URL Webhook untuk notifikasi Midtrans (untuk environment production)
MIDTRANS_WEBHOOK_URL=https://yourdomain.com/api

# Server Key Midtrans
MIDTRANS_SERVER_KEY_SANDBOX=SB-Mid-server-xxxxxxxxxxxxxxxxxxx
MIDTRANS_SERVER_KEY_PRODUCTION=Mid-server-xxxxxxxxxxxxxxxxxxx

# Client Key Midtrans
MIDTRANS_CLIENT_KEY_SANDBOX=SB-Mid-client-xxxxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY_PRODUCTION=Mid-client-xxxxxxxxxxxxxxxxxxx
```

## Pengujian Webhook

### Menggunakan Script Pengujian

Anda dapat menggunakan script `test-webhook.js` untuk menguji webhook:

```bash
node test-webhook.js ORDER-ID [settlement|pending|cancel|deny|expire]
```

Contoh:
```bash
node test-webhook.js ORDER-1234567890 settlement
```

### Menggunakan Simulator Midtrans

1. Di dashboard Midtrans, buka "Transaction" -> "Status" 
2. Masukkan Order ID yang ingin diuji
3. Klik "Test Notification" untuk mengirim notifikasi webhook

## Pemecahan Masalah

### Webhook Tidak Diterima

1. **Periksa URL**: Pastikan URL webhook benar dan dapat diakses dari internet
2. **Periksa Firewall**: Pastikan firewall tidak memblokir permintaan dari Midtrans
3. **Periksa Logs**: Lihat logs server untuk informasi tambahan
4. **Periksa HTTP Response**: Midtrans mengharapkan HTTP 200 sebagai respons

### Status Tidak Diperbarui

1. **Periksa Order ID**: Pastikan Order ID dalam notifikasi cocok dengan database
2. **Debug Handler**: Tambahkan logging di fungsi `handleNotification`
3. **Periksa Tabel Payment_Callbacks**: Lihat apakah notifikasi terekam

## Format Payload Notifikasi Midtrans

Contoh payload notifikasi yang dikirim Midtrans:

```json
{
  "transaction_time": "2023-01-15 10:25:00",
  "transaction_status": "settlement",
  "transaction_id": "2996d343-1cfd-47a3-a003-ec95b3429097",
  "status_message": "midtrans payment notification",
  "status_code": "200",
  "signature_key": "fe5f725ea770c451017e9d6300af72b830a668d2f7d5da9b778ec5d1dbea9c46aac1ad5a7be04b191fd5dfd69d3d6140344e6f07f826c34600b9b979df53130a",
  "payment_type": "bank_transfer",
  "order_id": "ORDER-1234567890123",
  "merchant_id": "G12345678",
  "gross_amount": "150000.00",
  "fraud_status": "accept",
  "currency": "IDR"
}
```

## Dukungan Midtrans

Jika mengalami masalah dengan integrasi Midtrans, hubungi dukungan Midtrans:
- Email: support@midtrans.com
- Dokumentasi: https://docs.midtrans.com 