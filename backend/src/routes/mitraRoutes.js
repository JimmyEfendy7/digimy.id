const express = require('express');
const router = express.Router();
const mitraAuthController = require('../controllers/mitraAuthController');

/**
 * Routes untuk autentikasi mitra/toko
 * Base URL: /stores
 */

// POST /stores/login - Mengirim OTP untuk login mitra
router.post('/login', mitraAuthController.sendLoginOtp);

// POST /stores/login/verify - Verifikasi OTP dan login mitra
router.post('/login/verify', mitraAuthController.verifyLoginOtp);

// POST /stores/register - Mengirim OTP untuk registrasi mitra
router.post('/register', mitraAuthController.sendRegisterOtp);

// POST /stores/register/verify - Verifikasi OTP dan registrasi mitra
router.post('/register/verify', mitraAuthController.registerStore);

module.exports = router;
