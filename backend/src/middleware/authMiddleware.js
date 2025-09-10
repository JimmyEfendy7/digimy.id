const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Middleware untuk autentikasi berdasarkan jenis pengguna
 */
const authMiddleware = {
  /**
   * Middleware untuk memverifikasi token JWT
   */
  verifyToken: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1]; // Bearer <token>
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  },

  /**
   * Middleware untuk memverifikasi admin
   */
  verifyAdmin: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya admin yang diizinkan.'
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  },

  /**
   * Middleware untuk memverifikasi mitra/toko
   */
  verifyMitra: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'mitra') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya mitra yang diizinkan.'
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  },

  /**
   * Middleware untuk memverifikasi customer
   */
  verifyCustomer: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'customer') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya customer yang diizinkan.'
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  },

  /**
   * Middleware untuk memverifikasi token admin dan menambahkan data admin ke req.admin
   */
  verifyAdminToken: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya admin yang diizinkan.'
        });
      }
      
      // Get admin data from database
      const db = require('../db/connection');
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
      
      req.admin = adminRows[0];
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  },

  /**
   * Middleware untuk memverifikasi mitra atau admin
   */
  verifyMitraOrAdmin: (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Token tidak ditemukan'
        });
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      
      if (decoded.type !== 'mitra' && decoded.type !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Akses ditolak. Hanya mitra atau admin yang diizinkan.'
        });
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }
  }
};

module.exports = authMiddleware;
