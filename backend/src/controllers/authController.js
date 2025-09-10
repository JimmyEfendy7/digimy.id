const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const otpService = require('../services/otpService');
const { pool } = require('../config/database');

// Jumlah salt rounds untuk bcrypt
const SALT_ROUNDS = 10;

/**
 * Controller untuk autentikasi dan registrasi
 */
const authController = {
  /**
   * Mengirim kode OTP untuk login
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
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
      
      // Validasi apakah nomor telepon terdaftar
      const connection = await pool.getConnection();
      
      try {
        const [users] = await connection.execute(
          'SELECT id FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        // Periksa juga di tabel stores
        const [stores] = await connection.execute(
          'SELECT id FROM stores WHERE phone_number = ?',
          [phone_number]
        );
        
        if (users.length === 0 && stores.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Nomor telepon tidak terdaftar. Silakan daftar terlebih dahulu.'
          });
        }
      } finally {
        connection.release();
      }
      
      // Buat dan kirim OTP
      const result = await otpService.createAndSendOtp(phone_number, 'login');
      
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('❌ Error saat mengirim OTP login:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      });
    }
  },
  
  /**
   * Memverifikasi login dengan OTP
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
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
      const verification = await otpService.verifyOtp(phone_number, otp_code, 'login');
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message
        });
      }
      
      // Dapatkan data pengguna/toko
      const connection = await pool.getConnection();
      
      try {
        // Cek di tabel users terlebih dahulu
        const [users] = await connection.execute(
          'SELECT id, name, email, phone_number, profile_picture, is_active FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        // Jika tidak ada di users, cek di tabel stores
        if (users.length === 0) {
          const [stores] = await connection.execute(
            'SELECT s.id, s.name, s.slug, s.email, s.phone_number, s.logo, s.is_verified, s.is_active, s.user_id FROM stores s WHERE s.phone_number = ?',
            [phone_number]
          );
          
          if (stores.length === 0) {
            return res.status(404).json({
              success: false,
              message: 'Akun tidak ditemukan. Nomor telepon mungkin telah berubah.'
            });
          }
          
          // Dapatkan data user yang terkait dengan store
          const [storeUsers] = await connection.execute(
            'SELECT id, name, email, phone_number, profile_picture FROM users WHERE id = ?',
            [stores[0].user_id]
          );
          
          const userData = storeUsers.length > 0 ? storeUsers[0] : null;
          const storeData = stores[0];
          
          // Kembalikan data toko dan user terkait
          return res.status(200).json({
            success: true,
            message: 'Login berhasil',
            data: {
              user: userData,
              store: {
                id: storeData.id,
                name: storeData.name,
                slug: storeData.slug,
                email: storeData.email,
                phone_number: storeData.phone_number,
                logo: storeData.logo,
                is_verified: storeData.is_verified,
                is_active: storeData.is_active
              },
              type: 'store',
              accessToken: 'dummy-token-store' // Ganti dengan JWT yang sebenarnya
            }
          });
        }
        
        // Login sebagai user biasa
        return res.status(200).json({
          success: true,
          message: 'Login berhasil',
          data: {
            user: users[0],
            type: 'user',
            accessToken: 'dummy-token-user' // Ganti dengan JWT yang sebenarnya
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('❌ Error saat verifikasi login OTP:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      });
    }
  },
  
  /**
   * Mengirim kode OTP untuk registrasi
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
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
      
      // Validasi apakah nomor telepon sudah terdaftar
      const connection = await pool.getConnection();
      
      try {
        const [users] = await connection.execute(
          'SELECT id FROM users WHERE phone_number = ?',
          [phone_number]
        );
        
        const [stores] = await connection.execute(
          'SELECT id FROM stores WHERE phone_number = ?',
          [phone_number]
        );
        
        if (users.length > 0 || stores.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Nomor telepon sudah terdaftar. Silakan gunakan nomor lain atau login.'
          });
        }
      } finally {
        connection.release();
      }
      
      // Buat dan kirim OTP
      const result = await otpService.createAndSendOtp(phone_number, 'register');
      
      return res.status(result.success ? 200 : 400).json(result);
    } catch (error) {
      console.error('❌ Error saat mengirim OTP registrasi:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      });
    }
  },
  
  /**
   * Registrasi user (customer)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async registerUser(req, res) {
    try {
      const { name, email, phone_number, password, otp_code } = req.body;
      
      // Validasi input
      if (!name || !email || !phone_number || !password || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Semua field diperlukan'
        });
      }
      
      // Verifikasi OTP
      const verification = await otpService.verifyOtp(phone_number, otp_code, 'register');
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message
        });
      }
      
      // Validasi apakah email sudah terdaftar
      const connection = await pool.getConnection();
      
      try {
        const [existingUsers] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [email]
        );
        
        if (existingUsers.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Email sudah terdaftar. Silakan gunakan email lain.'
          });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        
        // Simpan user baru
        const [result] = await connection.execute(
          'INSERT INTO users (name, email, phone_number, password) VALUES (?, ?, ?, ?)',
          [name, email, phone_number, hashedPassword]
        );
        
        const userId = result.insertId;
        
        // Ambil data user yang baru dibuat
        const [users] = await connection.execute(
          'SELECT id, name, email, phone_number, profile_picture, is_active FROM users WHERE id = ?',
          [userId]
        );
        
        return res.status(201).json({
          success: true,
          message: 'Registrasi berhasil',
          data: {
            user: users[0],
            accessToken: 'dummy-token-user' // Ganti dengan JWT yang sebenarnya
          }
        });
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('❌ Error saat registrasi user:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      });
    }
  },
  
  /**
   * Registrasi store (mitra)
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  async registerStore(req, res) {
    try {
      const { name, slug, description, email, phone_number, address, otp_code } = req.body;
      
      // Validasi input
      if (!name || !slug || !email || !phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Semua field wajib diperlukan'
        });
      }
      
      // Verifikasi OTP
      const verification = await otpService.verifyOtp(phone_number, otp_code, 'register');
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.message
        });
      }
      
      const connection = await pool.getConnection();
      
      try {
        // Mulai transaksi
        await connection.beginTransaction();
        
        // Validasi apakah email sudah terdaftar
        const [existingStores] = await connection.execute(
          'SELECT id FROM stores WHERE email = ? OR slug = ?',
          [email, slug]
        );
        
        if (existingStores.length > 0) {
          await connection.rollback();
          return res.status(409).json({
            success: false,
            message: 'Email atau slug toko sudah terdaftar. Silakan gunakan yang lain.'
          });
        }
        
        // Buat user terlebih dahulu dengan password acak (digunakan untuk otentikasi)
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, SALT_ROUNDS);
        
        // Insert user baru
        const [userResult] = await connection.execute(
          'INSERT INTO users (name, email, phone_number, password) VALUES (?, ?, ?, ?)',
          [name, email, phone_number, hashedPassword]
        );
        
        const userId = userResult.insertId;
        
        // Insert store baru
        const [storeResult] = await connection.execute(
          'INSERT INTO stores (user_id, name, slug, description, phone_number, email, address) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, name, slug, description || '', phone_number, email, address || '']
        );
        
        const storeId = storeResult.insertId;
        
        // Ambil data store yang baru dibuat
        const [stores] = await connection.execute(
          'SELECT id, name, slug, description, phone_number, email, address, is_verified, is_active FROM stores WHERE id = ?',
          [storeId]
        );
        
        // Ambil data user yang terkait
        const [users] = await connection.execute(
          'SELECT id, name, email, phone_number FROM users WHERE id = ?',
          [userId]
        );
        
        // Commit transaksi
        await connection.commit();
        
        return res.status(201).json({
          success: true,
          message: 'Registrasi toko berhasil',
          data: {
            user: users[0],
            store: stores[0],
            accessToken: 'dummy-token-store' // Ganti dengan JWT yang sebenarnya
          }
        });
      } catch (error) {
        // Rollback jika ada error
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('❌ Error saat registrasi store:', error);
      return res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server. Silakan coba lagi nanti.'
      });
    }
  }
};

module.exports = authController; 