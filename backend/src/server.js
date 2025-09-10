const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const path = require('path');
const { testConnection } = require('./config/database');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');
const mitraRoutes = require('./routes/mitraRoutes');
const storeProfileRoutes = require('./routes/storeProfileRoutes');
const storeProductRoutes = require('./routes/storeProductRoutes');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { midtransController } = require('./controllers');
const whatsappService = require('./services/whatsappService');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('dev'));

// Custom request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`📝 ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Serve static files from the public directory
app.use('/public', express.static(path.join(__dirname, '../public')));
console.log(`📁 Serving static files from: ${path.join(__dirname, '../public')}`);

// API Routes
app.use('/api', apiRoutes);

// Authentication Routes
app.use('/stores', mitraRoutes);
app.use('/store-profile', storeProfileRoutes);      // Mitra/Store profile management
app.use('/store-products', storeProductRoutes);     // Mitra/Store product management
app.use('/account', customerRoutes);  // Customer authentication
app.use('/admin', adminRoutes);       // Admin authentication

// Health check route
app.get('/health', (req, res) => {
  console.log('Health check endpoint accessed');
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'DIGIPRO API Server is running',
    status: 'active',
    version: '1.0.0'
  });
});

// Test database connection on server start
testConnection()
  .then(() => {
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`✅ API available at ${process.env.APP_URL || `http://localhost:${PORT}`}/api`);
      console.log(`✅ Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Inisialisasi WhatsApp service setelah server berjalan
      if (process.env.ENABLE_WHATSAPP === 'true' || process.env.NODE_ENV === 'production') {
        console.log('📱 Inisialisasi WhatsApp service...');
        
        // Log the current mode based on environment variables
        const silentMode = process.env.WHATSAPP_SILENT_MODE === 'true';
        console.log(`📱 WhatsApp silent mode: ${silentMode ? 'enabled' : 'disabled'}`);
        
        if (!silentMode) {
          console.log('📱 PENTING: Tunggu QR code muncul, lalu scan dengan aplikasi WhatsApp di smartphone Anda');
          console.log('📱 Setelah QR code di-scan, WhatsApp Web akan terotentikasi');
        }
        
        setTimeout(() => {
          whatsappService.initialize()
            .then(() => {
              console.log('📱 WhatsApp service initialized successfully');
              
              // Check if we need to disable silent mode after initialization
              if (whatsappService.silentMode && process.env.WHATSAPP_SILENT_MODE !== 'true') {
                console.log('📱 Mencoba mematikan silent mode...');
                return whatsappService.disableSilentMode();
              }
            })
            .catch(err => {
              console.error('❌ WhatsApp service initialization error:', err);
              console.log('📱 Server tetap berjalan, tetapi fitur notifikasi WhatsApp mungkin tidak berfungsi dengan benar.');
              console.log('📱 Untuk mengatasi masalah, pastikan Chrome/Chromium terinstall di sistem');
              console.log('📱 Opsi lain: set WHATSAPP_SILENT_MODE=true di file .env untuk mengaktifkan mode silent');
              
              // Opsi untuk debugging
              if (process.env.DEBUG_WHATSAPP === 'true') {
                console.log('📱 DEBUG MODE: Detail error WhatsApp:', err);
              }
            });
        }, 1000); // Beri waktu 1 detik setelah server siap untuk inisialisasi WhatsApp
      } else {
        console.log('📱 WhatsApp service tidak diaktifkan. Set ENABLE_WHATSAPP=true pada file .env untuk mengaktifkan');
      }
    });
  })
  .catch(err => {
    console.error('❌ Failed to start server due to database connection error:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Server error',
    error: process.env.NODE_ENV === 'production' ? {} : err.stack
  });
});

// 404 handler - Keep this as the last route
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`
  });
});

module.exports = app; 