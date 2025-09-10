const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Controller untuk autentikasi customer/pembeli
 */
const customerAuthController = {
  /**
   * Mengirim kode OTP untuk login customer
   */
  async sendLoginOtp(req, res) {
    try {
      const { phone_number } = req.body;
      
      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon diperlukan'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Periksa apakah nomor telepon terdaftar di tabel users
        const [users] = await connection.execute(
          'SELECT id, name FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nomor telepon tidak terdaftar. Silakan daftar terlebih dahulu.'
          });
        }
        
        // Generate dan kirim OTP
        const result = await otpService.createAndSendOtp(phone_number, 'login');
        
        if (result.success) {
          return res.json({
            success: true,
            message: 'Kode OTP telah dikirim ke WhatsApp Anda',
            user_name: users[0].name
          });
        } else {
          return res.status(500).json({
            success: false,
            message: result.message || 'Gagal mengirim OTP'
          });
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error sending customer login OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  /**
   * Verifikasi OTP dan login customer
   */
  async verifyLoginOtp(req, res) {
    try {
      const { phone_number, otp_code } = req.body;
      
      if (!phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon dan kode OTP diperlukan'
        });
      }
      
      // Verifikasi OTP
      const verificationResult = await otpService.verifyOtp(phone_number, otp_code, 'login');
      
      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Kode OTP tidak valid atau sudah expired'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Ambil data customer
        const [users] = await connection.execute(
          'SELECT id, name, phone_number, email, profile_picture FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        if (users.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Data customer tidak ditemukan'
          });
        }
        
        const user = users[0];
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: user.id, 
            phone_number: user.phone_number,
            type: 'customer',
            name: user.name
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Clear OTP setelah berhasil login
        await otpService.clearOtp(phone_number, 'login');
        
        return res.json({
          success: true,
          message: 'Login berhasil',
          token,
          user: {
            id: user.id,
            name: user.name,
            phone_number: user.phone_number,
            email: user.email,
            profile_picture: user.profile_picture
          },
          redirect_url: '/' // Redirect ke halaman utama
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error verifying customer login OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  /**
   * Mengirim kode OTP untuk registrasi customer
   */
  async sendRegisterOtp(req, res) {
    try {
      const { phone_number } = req.body;
      
      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon diperlukan'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Periksa apakah nomor telepon sudah terdaftar
        const [existing] = await connection.execute(
          'SELECT id FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Nomor telepon sudah terdaftar'
          });
        }
        
        // Generate dan kirim OTP
        const result = await otpService.createAndSendOtp(phone_number, 'register');
        
        if (result.success) {
          return res.json({
            success: true,
            message: 'Kode OTP telah dikirim ke WhatsApp Anda'
          });
        } else {
          return res.status(500).json({
            success: false,
            message: result.message || 'Gagal mengirim OTP'
          });
        }
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error sending customer register OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  /**
   * Registrasi customer baru
   */
  async registerUser(req, res) {
    try {
      const { 
        name, 
        phone_number, 
        otp_code, 
        email 
      } = req.body;
      
      if (!name || !phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Nama, nomor telepon, dan kode OTP diperlukan'
        });
      }
      
      // Verifikasi OTP
      const verificationResult = await otpService.verifyOtp(phone_number, otp_code, 'register');
      
      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Kode OTP tidak valid atau sudah expired'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Insert data customer baru
        const [result] = await connection.execute(
          `INSERT INTO users (name, phone_number, email, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [name, phone_number, email || null]
        );
        
        const userId = result.insertId;
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: userId, 
            phone_number,
            type: 'customer',
            name
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Clear OTP setelah berhasil registrasi
        await otpService.clearOtp(phone_number, 'register');
        
        return res.status(201).json({
          success: true,
          message: 'Registrasi berhasil',
          token,
          user: {
            id: userId,
            name,
            phone_number,
            email
          },
          redirect_url: '/' // Redirect ke halaman utama
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error registering customer:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }
};

module.exports = customerAuthController;
