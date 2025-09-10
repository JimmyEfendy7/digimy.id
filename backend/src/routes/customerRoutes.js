const express = require('express');
const router = express.Router();
const customerAuthController = require('../controllers/customerAuthController');

/**
 * Routes untuk autentikasi customer/pembeli
 * Base URL: /account
 */

// POST /account/login - Mengirim OTP untuk login customer
router.post('/login', customerAuthController.sendLoginOtp);

// POST /account/login/verify - Verifikasi OTP dan login customer
router.post('/login/verify', customerAuthController.verifyLoginOtp);

// POST /account/register - Mengirim OTP untuk registrasi customer
router.post('/register', customerAuthController.sendRegisterOtp);

// POST /account/register/verify - Verifikasi OTP dan registrasi customer
router.post('/register/verify', customerAuthController.registerUser);

module.exports = router;
