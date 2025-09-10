const otpService = require('./src/services/otpService');

// Fungsi untuk inisialisasi tabel OTP
async function initializeOtpTable() {
  try {
    console.log('Memulai inisialisasi tabel OTP...');
    await otpService.createOtpTableIfNotExists();
    console.log('✅ Tabel OTP berhasil dibuat atau sudah ada');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error saat inisialisasi tabel OTP:', error);
    process.exit(1);
  }
}

// Jalankan inisialisasi
initializeOtpTable(); 