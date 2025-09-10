const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Routes untuk autentikasi admin
 * Base URL: /admin
 */

// POST /admin/send-login-otp - Kirim OTP untuk login admin
router.post('/send-login-otp', adminAuthController.sendLoginOtp);

// POST /admin/verify-login-otp - Verifikasi OTP dan login admin
router.post('/verify-login-otp', adminAuthController.verifyLoginOtp);

// POST /admin/verify-token - Verifikasi JWT token
router.post('/verify-token', adminAuthController.verifyToken);

// POST /admin/create-admin - Buat akun admin baru (hanya super_admin)
router.post('/create-admin', authMiddleware.verifyAdminToken, adminAuthController.createAdmin);

module.exports = router;
