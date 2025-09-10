/**
 * Script untuk reset WhatsApp service dan mematikan silent mode
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== RESET WHATSAPP SERVICE & DISABLE SILENT MODE ===');

// Hapus folder session WhatsApp
const authFolder = path.join(__dirname, '.wwebjs_auth');
if (fs.existsSync(authFolder)) {
  console.log('📱 Menghapus session WhatsApp lama...');
  try {
    fs.rmSync(authFolder, { recursive: true, force: true });
    console.log('✅ Session WhatsApp lama berhasil dihapus');
  } catch (err) {
    console.error('❌ Gagal menghapus session WhatsApp:', err);
  }
}

// Hapus cache WhatsApp jika ada
const cacheFolder = path.join(__dirname, '.wwebjs_cache');
if (fs.existsSync(cacheFolder)) {
  console.log('📱 Menghapus cache WhatsApp...');
  try {
    fs.rmSync(cacheFolder, { recursive: true, force: true });
    console.log('✅ Cache WhatsApp berhasil dihapus');
  } catch (err) {
    console.error('❌ Gagal menghapus cache WhatsApp:', err);
  }
}

console.log('📱 Menjalankan server dengan WhatsApp mode non-silent...');

// Environment variables dengan konfigurasi untuk non-silent mode
const env = Object.assign({}, process.env, {
  ENABLE_WHATSAPP: 'true',
  PUPPETEER_HEADLESS: 'false',  // Mode visible untuk memudahkan scan QR
  DEBUG_WHATSAPP: 'true',       // Mode debug
  WHATSAPP_SILENT_MODE: 'false' // Explicitly disable silent mode
});

// Command untuk menjalankan server
const serverProcess = spawn('node', ['src/server.js'], { 
  env, 
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

// Events
serverProcess.on('error', (err) => {
  console.error('❌ Gagal menjalankan server:', err);
});

// Exit handler
process.on('SIGINT', () => {
  console.log('\n🛑 Menghentikan server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});

console.log('=== PETUNJUK UNTUK MENJALANKAN WHATSAPP SERVICE ===');
console.log('1. Tunggu hingga QR code muncul di terminal');
console.log('2. Scan QR code menggunakan aplikasi WhatsApp di smartphone Anda');
console.log('3. Tunggu hingga proses autentikasi selesai');
console.log('4. WhatsApp service akan aktif dalam mode non-silent (semua notifikasi akan terkirim)');
console.log('5. Jika gagal, pastikan browser Chrome/Edge terinstall di sistem Anda');
console.log('\n👉 Tekan Ctrl+C untuk menghentikan server'); 