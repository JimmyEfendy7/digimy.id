const jwt = require('jsonwebtoken');
const db = require('../db/connection');
const otpService = require('../services/otpService');

class AdminAuthController {
  // Send OTP for admin login
  async sendLoginOtp(req, res) {
    try {
      const { phone_number } = req.body;

      if (!phone_number) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon diperlukan'
        });
      }

      // Check if admin exists with this phone number
      const [adminRows] = await db.execute(
        'SELECT id, name, role FROM admins WHERE phone_number = ? AND is_active = TRUE',
        [phone_number]
      );

      if (adminRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Admin dengan nomor telepon ini tidak ditemukan'
        });
      }

      // Send OTP
      const otpResult = await otpService.createAndSendOtp(phone_number, 'login');
      
      if (!otpResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Gagal mengirim OTP'
        });
      }

      res.json({
        success: true,
        message: 'Kode OTP telah dikirim ke WhatsApp Anda',
        admin: {
          name: adminRows[0].name,
          role: adminRows[0].role
        }
      });
    } catch (error) {
      console.error('Send admin login OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Verify OTP and login admin
  async verifyLoginOtp(req, res) {
    try {
      const { phone_number, otp_code } = req.body;

      if (!phone_number || !otp_code) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon dan kode OTP diperlukan'
        });
      }

      // Verify OTP
      const verificationResult = await otpService.verifyOtp(phone_number, otp_code, 'login');
      
      if (!verificationResult.valid) {
        return res.status(400).json({
          success: false,
          message: verificationResult.message || 'Kode OTP tidak valid atau sudah expired'
        });
      }

      // Get admin data
      const [adminRows] = await db.execute(
        'SELECT * FROM admins WHERE phone_number = ? AND is_active = TRUE',
        [phone_number]
      );

      if (adminRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Admin tidak ditemukan'
        });
      }

      const admin = adminRows[0];

      // Clear used OTP
      await otpService.clearOtp(phone_number, 'login');

      // Generate JWT token
      const token = jwt.sign(
        {
          id: admin.id,
          phone_number: admin.phone_number,
          role: admin.role,
          type: 'admin'
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login berhasil',
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          phone_number: admin.phone_number,
          role: admin.role,
          profile_picture: admin.profile_picture
        }
      });
    } catch (error) {
      console.error('Admin login OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Create new admin account (only for super_admin)
  async createAdmin(req, res) {
    try {
      const { name, phone_number, role } = req.body;
      const currentAdmin = req.admin; // From auth middleware

      // Only super_admin can create new admin accounts
      if (currentAdmin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          message: 'Hanya Super Admin yang dapat membuat akun admin baru'
        });
      }

      if (!name || !phone_number || !role) {
        return res.status(400).json({
          success: false,
          message: 'Nama, nomor telepon, dan role diperlukan'
        });
      }

      if (!['admin', 'super_admin'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role harus admin atau super_admin'
        });
      }

      // Check if phone number already exists
      const [existingAdmin] = await db.execute(
        'SELECT id FROM admins WHERE phone_number = ?',
        [phone_number]
      );

      if (existingAdmin.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Nomor telepon sudah terdaftar'
        });
      }

      // Create new admin
      const [result] = await db.execute(
        'INSERT INTO admins (name, phone_number, role, is_active) VALUES (?, ?, ?, TRUE)',
        [name, phone_number, role]
      );

      res.json({
        success: true,
        message: 'Admin baru berhasil dibuat',
        admin: {
          id: result.insertId,
          name,
          phone_number,
          role
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }

  // Verify JWT token
  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get fresh admin data
      const [adminRows] = await db.execute(
        'SELECT id, name, phone_number, role, profile_picture FROM admins WHERE id = ? AND is_active = TRUE',
        [decoded.id]
      );

      if (adminRows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Admin tidak ditemukan'
        });
      }

      res.json({
        success: true,
        admin: adminRows[0]
      });
    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  }
}

module.exports = new AdminAuthController();
