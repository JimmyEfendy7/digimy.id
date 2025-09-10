const crypto = require('crypto');
const whatsappService = require('./whatsappService');
const mysql = require('mysql2/promise');
const { pool } = require('../config/database');

class OtpService {
  constructor() {
    this.otpLength = 6; // Panjang kode OTP
    this.otpExpiryMinutes = 10; // Masa berlaku OTP dalam menit
    this.maxAttempts = 3; // Jumlah maksimum percobaan verifikasi
  }

  /**
   * Membuat koneksi database
   * @returns {Promise<mysql.Connection>} Koneksi database
   */
  async getConnection() {
    return await pool.getConnection();
  }

  /**
   * Membuat tabel OTP jika belum ada
   * @returns {Promise<void>}
   */
  async createOtpTableIfNotExists() {
    const connection = await this.getConnection();
    
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS otp_records (
          id INT AUTO_INCREMENT PRIMARY KEY,
          phone_number VARCHAR(20) NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          purpose ENUM('login', 'register', 'reset_password') NOT NULL,
          attempts INT DEFAULT 0,
          expires_at TIMESTAMP NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log('✅ Tabel OTP berhasil dibuat atau sudah ada');
    } catch (error) {
      console.error('❌ Error saat membuat tabel OTP:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Menghasilkan kode OTP acak
   * @returns {string} Kode OTP
   */
  generateOtp() {
    // Menghasilkan OTP numerik dengan panjang sesuai konfigurasi
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Menyimpan kode OTP ke database
   * @param {string} phoneNumber Nomor telepon pengguna
   * @param {string} otpCode Kode OTP yang dihasilkan
   * @param {string} purpose Tujuan OTP (login/register/reset_password)
   * @returns {Promise<boolean>} Status penyimpanan
   */
  async saveOtp(phoneNumber, otpCode, purpose) {
    const connection = await this.getConnection();
    
    try {
      // Atur waktu kedaluwarsa
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);
      
      // Format nomor telepon
      const formattedNumber = phoneNumber.startsWith('0') 
        ? '62' + phoneNumber.substring(1) 
        : phoneNumber;
      
      // Nonaktifkan OTP lama untuk nomor ini dengan tujuan yang sama
      await connection.execute(
        'UPDATE otp_records SET is_used = TRUE WHERE phone_number = ? AND purpose = ? AND is_used = FALSE',
        [formattedNumber, purpose]
      );
      
      // Simpan OTP baru
      await connection.execute(
        'INSERT INTO otp_records (phone_number, otp_code, purpose, expires_at) VALUES (?, ?, ?, ?)',
        [formattedNumber, otpCode, purpose, expiresAt]
      );
      
      return true;
    } catch (error) {
      console.error('❌ Error saat menyimpan OTP:', error);
      return false;
    } finally {
      connection.release();
    }
  }

  /**
   * Mengirim OTP melalui WhatsApp
   * @param {string} phoneNumber Nomor telepon tujuan
   * @param {string} otpCode Kode OTP
   * @param {string} purpose Tujuan OTP (login/register/reset_password)
   * @returns {Promise<boolean>} Status pengiriman
   */
  async sendOtpViaWhatsApp(phoneNumber, otpCode, purpose) {
    try {
      // Template pesan berdasarkan tujuan
      let messageTemplate;
      const appName = 'DIGIPRO';
      
      switch (purpose) {
        case 'register':
          messageTemplate = `*KODE VERIFIKASI ${appName}*\n\nHalo! 👋\n\nKode verifikasi untuk pendaftaran akun ${appName} Anda adalah:\n\n*${otpCode}*\n\nKode ini berlaku selama ${this.otpExpiryMinutes} menit.\n\nJangan berikan kode ini kepada siapapun, termasuk pihak yang mengaku sebagai ${appName}.\n\nTerima kasih!`;
          break;
        case 'login':
          messageTemplate = `*KODE LOGIN ${appName}*\n\nHalo! 👋\n\nKode verifikasi untuk login ke akun ${appName} Anda adalah:\n\n*${otpCode}*\n\nKode ini berlaku selama ${this.otpExpiryMinutes} menit.\n\nJangan berikan kode ini kepada siapapun, termasuk pihak yang mengaku sebagai ${appName}.\n\nTerima kasih!`;
          break;
        case 'reset_password':
          messageTemplate = `*RESET PASSWORD ${appName}*\n\nHalo! 👋\n\nKode verifikasi untuk reset password akun ${appName} Anda adalah:\n\n*${otpCode}*\n\nKode ini berlaku selama ${this.otpExpiryMinutes} menit.\n\nJangan berikan kode ini kepada siapapun, termasuk pihak yang mengaku sebagai ${appName}.\n\nTerima kasih!`;
          break;
        default:
          messageTemplate = `*KODE VERIFIKASI ${appName}*\n\nHalo! 👋\n\nKode verifikasi untuk akun ${appName} Anda adalah:\n\n*${otpCode}*\n\nKode ini berlaku selama ${this.otpExpiryMinutes} menit.\n\nJangan berikan kode ini kepada siapapun, termasuk pihak yang mengaku sebagai ${appName}.\n\nTerima kasih!`;
      }
      
      // Kirim pesan melalui WhatsApp service
      const result = await whatsappService.sendMessage(phoneNumber, messageTemplate);
      return result;
    } catch (error) {
      console.error('❌ Error saat mengirim OTP via WhatsApp:', error);
      return false;
    }
  }

  /**
   * Membuat dan mengirim OTP untuk tujuan tertentu
   * @param {string} phoneNumber Nomor telepon pengguna
   * @param {string} purpose Tujuan OTP (login/register/reset_password)
   * @returns {Promise<{success: boolean, message: string}>} Hasil operasi
   */
  async createAndSendOtp(phoneNumber, purpose) {
    try {
      // Validasi format nomor telepon
      if (!this.validatePhoneNumber(phoneNumber)) {
        return {
          success: false,
          message: 'Format nomor telepon tidak valid. Gunakan format: 08xxxxxxxxxx'
        };
      }
      
      // Cek apakah nomor sudah memiliki OTP aktif
      const activeOtp = await this.getActiveOtp(phoneNumber, purpose);
      if (activeOtp) {
        const timeLeft = Math.ceil((new Date(activeOtp.expires_at) - new Date()) / (1000 * 60));
        
        if (timeLeft > 0) {
          // Kirim ulang OTP yang sudah ada
          const sendResult = await this.sendOtpViaWhatsApp(phoneNumber, activeOtp.otp_code, purpose);
          
          if (sendResult) {
            return {
              success: true,
              message: `OTP dikirim ulang ke WhatsApp Anda. Berlaku untuk ${timeLeft} menit.`
            };
          } else {
            return {
              success: false,
              message: 'Gagal mengirim ulang kode OTP ke WhatsApp Anda.'
            };
          }
        }
      }
      
      // Buat OTP baru
      const otpCode = this.generateOtp();
      
      // Simpan ke database
      const saveResult = await this.saveOtp(phoneNumber, otpCode, purpose);
      if (!saveResult) {
        return {
          success: false,
          message: 'Gagal menyimpan kode OTP. Silakan coba lagi.'
        };
      }
      
      // Kirim OTP via WhatsApp
      const sendResult = await this.sendOtpViaWhatsApp(phoneNumber, otpCode, purpose);
      
      if (sendResult) {
        return {
          success: true,
          message: `Kode OTP telah dikirim ke WhatsApp ${phoneNumber}. Berlaku selama ${this.otpExpiryMinutes} menit.`
        };
      } else {
        return {
          success: false,
          message: 'Gagal mengirim kode OTP ke WhatsApp Anda. Silakan coba lagi.'
        };
      }
    } catch (error) {
      console.error('❌ Error dalam createAndSendOtp:', error);
      return {
        success: false,
        message: 'Terjadi kesalahan sistem. Silakan coba lagi nanti.'
      };
    }
  }

  /**
   * Mendapatkan OTP aktif untuk nomor telepon dan tujuan tertentu
   * @param {string} phoneNumber Nomor telepon
   * @param {string} purpose Tujuan OTP
   * @returns {Promise<Object|null>} Data OTP atau null jika tidak ditemukan
   */
  async getActiveOtp(phoneNumber, purpose) {
    const connection = await this.getConnection();
    
    try {
      // Format nomor telepon
      const formattedNumber = phoneNumber.startsWith('0') 
        ? '62' + phoneNumber.substring(1) 
        : phoneNumber;
      
      const [rows] = await connection.execute(
        'SELECT * FROM otp_records WHERE phone_number = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
        [formattedNumber, purpose]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('❌ Error saat mendapatkan OTP aktif:', error);
      return null;
    } finally {
      connection.release();
    }
  }

  /**
   * Memverifikasi kode OTP
   * @param {string} phoneNumber Nomor telepon pengguna
   * @param {string} otpCode Kode OTP yang diinput
   * @param {string} purpose Tujuan OTP (login/register/reset_password)
   * @returns {Promise<{valid: boolean, message: string, otpData?: Object}>} Hasil verifikasi
   */
  async verifyOtp(phoneNumber, otpCode, purpose) {
    const connection = await this.getConnection();
    
    try {
      // Format nomor telepon
      const formattedNumber = phoneNumber.startsWith('0') 
        ? '62' + phoneNumber.substring(1) 
        : phoneNumber;
      
      // Dapatkan data OTP dari database
      const [rows] = await connection.execute(
        'SELECT * FROM otp_records WHERE phone_number = ? AND purpose = ? AND is_used = FALSE ORDER BY created_at DESC LIMIT 1',
        [formattedNumber, purpose]
      );
      
      if (rows.length === 0) {
        return { 
          valid: false, 
          message: 'Kode OTP tidak ditemukan. Silakan minta kode OTP baru.' 
        };
      }
      
      const otpData = rows[0];
      
      // Cek apakah OTP telah kadaluarsa
      if (new Date() > new Date(otpData.expires_at)) {
        return { 
          valid: false, 
          message: 'Kode OTP telah kadaluarsa. Silakan minta kode OTP baru.' 
        };
      }
      
      // Cek jumlah percobaan
      if (otpData.attempts >= this.maxAttempts) {
        // Tandai OTP sebagai used untuk mencegah penggunaan lebih lanjut
        await connection.execute(
          'UPDATE otp_records SET is_used = TRUE WHERE id = ?',
          [otpData.id]
        );
        
        return { 
          valid: false, 
          message: 'Terlalu banyak percobaan. Silakan minta kode OTP baru.' 
        };
      }
      
      // Verifikasi kode OTP
      if (otpData.otp_code !== otpCode) {
        // Tambah jumlah percobaan
        await connection.execute(
          'UPDATE otp_records SET attempts = attempts + 1 WHERE id = ?',
          [otpData.id]
        );
        
        const attemptsLeft = this.maxAttempts - (otpData.attempts + 1);
        
        return { 
          valid: false, 
          message: `Kode OTP tidak valid. Sisa percobaan: ${attemptsLeft > 0 ? attemptsLeft : 'Habis'}.` 
        };
      }
      
      // OTP valid, tandai sebagai used
      await connection.execute(
        'UPDATE otp_records SET is_used = TRUE WHERE id = ?',
        [otpData.id]
      );
      
      return { 
        valid: true, 
        message: 'Kode OTP valid.', 
        otpData 
      };
    } catch (error) {
      console.error('❌ Error saat verifikasi OTP:', error);
      return { 
        valid: false, 
        message: 'Terjadi kesalahan sistem. Silakan coba lagi nanti.' 
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Validasi format nomor telepon
   * @param {string} phoneNumber Nomor telepon yang akan divalidasi
   * @returns {boolean} Hasil validasi
   */
  validatePhoneNumber(phoneNumber) {
    // Validasi format nomor Indonesia (diawali 08, minimal 10 digit, maksimal 13 digit)
    const regex = /^08[0-9]{8,11}$/;
    return regex.test(phoneNumber);
  }

  /**
   * Menandai OTP sebagai sudah digunakan (clear) untuk nomor tertentu
   * @param {string} phoneNumber
   * @param {string|null} purpose Jika diberikan, hanya OTP dengan tujuan tersebut yang di-clear
   */
  async clearOtp(phoneNumber, purpose = null) {
    const connection = await this.getConnection();
    try {
      const formattedNumber = phoneNumber.startsWith('0') ? '62' + phoneNumber.substring(1) : phoneNumber;
      if (purpose) {
        await connection.execute(
          'UPDATE otp_records SET is_used = TRUE WHERE phone_number = ? AND purpose = ? AND is_used = FALSE',
          [formattedNumber, purpose]
        );
      } else {
        await connection.execute(
          'UPDATE otp_records SET is_used = TRUE WHERE phone_number = ? AND is_used = FALSE',
          [formattedNumber]
        );
      }
    } catch (error) {
      console.error('❌ Error saat clear OTP:', error);
    } finally {
      connection.release();
    }
  }

  validatePhoneNumber(phoneNumber) {
    // Validasi format nomor Indonesia (diawali 08, minimal 10 digit, maksimal 13 digit)
    const regex = /^08[0-9]{8,11}$/;
    return regex.test(phoneNumber);
  }
}

const otpService = new OtpService();

module.exports = otpService; 