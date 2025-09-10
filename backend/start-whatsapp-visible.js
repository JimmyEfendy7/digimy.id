/**
 * Script untuk menjalankan server dengan browser WhatsApp visible
 */
const { spawn } = require('child_process');
const path = require('path');

console.log('=== MEMULAI SERVER DENGAN BROWSER WHATSAPP VISIBLE ===');
console.log('Mode ini membantu debug masalah autentikasi WhatsApp');

// Environment variables
const env = Object.assign({}, process.env, {
  ENABLE_WHATSAPP: 'true',
  PUPPETEER_HEADLESS: 'false',  // Mode non-headless
  DEBUG_WHATSAPP: 'true',       // Mode debug
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

console.log('🚀 Server dijalankan dengan browser WhatsApp visible');
console.log('🔍 Jika muncul browser, silakan login dengan scan QR code di terminal');
console.log('⚠️ Jangan tutup jendela browser yang muncul!');
console.log('👉 Tekan Ctrl+C untuk menghentikan server'); 