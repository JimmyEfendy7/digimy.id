/**
 * Script untuk menghapus folder autentikasi WhatsApp Web dan me-reset session
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path ke folder autentikasi WhatsApp
const authFolder = path.join(__dirname, '.wwebjs_auth');

// Fungsi untuk konfirmasi dari user
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== RESET WHATSAPP SESSION ===');
console.log(`Folder autentikasi: ${authFolder}`);

if (fs.existsSync(authFolder)) {
  console.log('📂 Folder autentikasi WhatsApp ditemukan');
  
  rl.question('Apakah Anda yakin ingin menghapus session WhatsApp? (y/n): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        console.log('🗑️ Menghapus folder autentikasi...');
        fs.rmSync(authFolder, { recursive: true, force: true });
        console.log('✅ Folder autentikasi berhasil dihapus!');
        console.log('🔄 Silakan restart server untuk membuat QR code baru.');
      } catch (err) {
        console.error('❌ Gagal menghapus folder:', err);
      }
    } else {
      console.log('⏹️ Operasi dibatalkan');
    }
    
    rl.close();
  });
} else {
  console.log('❌ Folder autentikasi tidak ditemukan');
  console.log('🔄 Silakan jalankan server untuk membuat QR code baru');
  rl.close();
} 