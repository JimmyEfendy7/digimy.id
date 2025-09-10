const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const otpService = require('../services/otpService');
const { pool } = require('../config/database');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Controller untuk autentikasi mitra/toko
 */
const mitraAuthController = {
  /**
   * Mengirim kode OTP untuk login mitra
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
        // Periksa apakah nomor telepon terdaftar di tabel stores
        const [stores] = await connection.execute(
          'SELECT id, name FROM stores WHERE phone_number = ?',
          [phone_number]
        );
        
        if (stores.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nomor telepon mitra tidak terdaftar. Silakan daftar terlebih dahulu.'
          });
        }
        
        // Generate dan kirim OTP
        const result = await otpService.createAndSendOtp(phone_number, 'login');
        
        if (result.success) {
          return res.json({
            success: true,
            message: 'Kode OTP telah dikirim ke WhatsApp Anda',
            store_name: stores[0].name
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
      console.error('Error sending mitra login OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  /**
   * Verifikasi OTP dan login mitra
   */
  async verifyLoginOtp(req, res) {
    try {
      const { phone_number, otp_code } = req.body;

      if (!phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon dan kode OTP diperlukan',
        });
      }

      // Verifikasi OTP
      const verificationResult = await otpService.verifyOtp(phone_number, otp_code, 'login');

      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Kode OTP tidak valid atau sudah expired',
        });
      }

      const connection = await pool.getConnection();

      try {
        // Ambil data toko
        const [stores] = await connection.execute(
          'SELECT id, name, slug, phone_number, email, address FROM stores WHERE phone_number = ?',
          [phone_number]
        );

        if (stores.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Data mitra tidak ditemukan',
          });
        }

        const store = stores[0];

        // Generate JWT token
        const token = jwt.sign(
          {
            id: store.id,
            phone_number: store.phone_number,
            type: 'mitra',
            store_name: store.name,
            slug: store.slug,
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
          store: {
            id: store.id,
            store_name: store.name,
            slug: store.slug,
            phone_number: store.phone_number,
            email: store.email,
            address: store.address,
          },
          redirect_url: `/stores/mitra/${store.slug}`,
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error verifying mitra login OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server',
      });
    }
  },

  /**
   * Mengirim kode OTP untuk registrasi mitra
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
          'SELECT id FROM stores WHERE phone_number = ?',
          [phone_number]
        );
        
        if (existing.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Nomor telepon sudah terdaftar sebagai mitra'
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
      console.error('Error sending mitra register OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  /**
   * Registrasi mitra baru
   */
  async registerStore(req, res) {
    try {
      const { 
        store_name, 
        phone_number, 
        otp_code, 
        email, 
        address, 
        description 
      } = req.body;
      
      if (!store_name || !phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Nama toko, nomor telepon, dan kode OTP diperlukan'
        });
      }
      
      // Verifikasi OTP
      const otpValid = await otpService.verifyOtp(phone_number, otp_code);
      
      if (!otpValid) {
        return res.status(400).json({
          success: false,
          message: 'Kode OTP tidak valid atau sudah expired'
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Generate slug dari nama toko
        const slug = store_name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim('-');
        
        // Pastikan slug unik
        let finalSlug = slug;
        let counter = 1;
        
        while (true) {
          const [existing] = await connection.execute(
            'SELECT id FROM stores WHERE slug = ?',
            [finalSlug]
          );
          
          if (existing.length === 0) break;
          
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        // Cari apakah nomor telepon sudah terdaftar sebagai customer
        const [users] = await connection.execute(
          'SELECT id FROM users WHERE phone_number = ?',
          [phone_number]
        );
        let userIdForFk;
        if (users.length > 0) {
          userIdForFk = users[0].id;
        } else {
          // Buat user baru otomatis
          const [userResult] = await connection.execute(
            `INSERT INTO users (name, phone_number, created_at) VALUES (?, ?, NOW())`,
            [store_name, phone_number]
          );
          userIdForFk = userResult.insertId;
        }

        // Insert data toko baru (user_id bisa null)
        const [result] = await connection.execute(
          `INSERT INTO stores (user_id, name, slug, phone_number, email, address, description, created_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [userIdForFk, store_name, finalSlug, phone_number, email || null, address || null, description || null]
        );
        
        const storeId = result.insertId;
        
        // Generate JWT token
        const token = jwt.sign(
          { 
            id: storeId, 
            phone_number,
            type: 'mitra',
            store_name,
            slug: finalSlug
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Clear OTP setelah berhasil registrasi
        await otpService.clearOtp(phone_number);
        
        return res.status(201).json({
          success: true,
          message: 'Registrasi mitra berhasil',
          token,
          store: {
            id: storeId,
            store_name,
            slug: finalSlug,
            phone_number,
            email,
            address,
            description
          },
          redirect_url: `/stores/mitra/${finalSlug}`
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error registering mitra:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }
};

module.exports = mitraAuthController;
