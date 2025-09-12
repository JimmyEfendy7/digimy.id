const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.sessionInitialized = false;
    // Check environment variable for silent mode
    this.silentMode = process.env.WHATSAPP_SILENT_MODE === 'true';
    // Logging initial mode
    console.log(`📱 WhatsApp service initialized with silent mode: ${this.silentMode ? 'enabled' : 'disabled'}`);
  }

  async initialize() {
    // Jika sudah dalam silent mode, jangan coba inisialisasi lagi
    if (this.silentMode) {
      console.log('📱 WhatsApp service berjalan dalam silent mode (tidak mengirim notifikasi)');
      return;
    }

    if (this.sessionInitialized) {
      console.log('📱 WhatsApp service sudah diinisialisasi sebelumnya');
      return;
    }

    try {
      console.log('📱 Inisialisasi WhatsApp Web service...');
      
      // Cek versi Chrome yang terinstall di sistem
      console.log('Mencari browser Chrome/Edge di sistem...');
      
      // Gunakan mode visible (non-headless) untuk debug
      const isHeadless = process.env.PUPPETEER_HEADLESS === 'false' ? false : 'new';
      console.log(`📱 Mode headless: ${isHeadless}`);
      
      // Konfigurasi client dengan opsi yang kompatibel untuk Edge/Chrome
      const puppeteerOptions = {
        headless: isHeadless,
        ignoreHTTPSErrors: true,
        ignoreDefaultArgs: ['--disable-extensions', '--disable-default-apps'],
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--no-first-run',
          '--no-default-browser-check',
          '--window-size=1366,768'
        ],
        defaultViewport: { width: 1366, height: 768 }
      };
      
      // Tambahkan argumen dari ENV jika disediakan (dipisah koma)
      if (process.env.PUPPETEER_ARGS) {
        try {
          const extraArgs = process.env.PUPPETEER_ARGS.split(',').map(a => a.trim()).filter(Boolean);
          puppeteerOptions.args.push(...extraArgs);
          console.log('📱 Menambahkan PUPPETEER_ARGS dari ENV:', extraArgs);
        } catch (e) {
          console.warn('⚠️ Gagal mem-parsing PUPPETEER_ARGS, melewati.');
        }
      }
      
      // Prioritaskan Chrome dengan pencarian yang lebih lengkap
      const envBrowserPath = process.env.PUPPETEER_EXECUTABLE_PATH;
      const chromePaths = [
        // ENV override — prioritas utama bila diset dan valid
        ...(envBrowserPath ? [envBrowserPath] : []),
        // Windows Chrome paths (standard)
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        // Windows Chrome paths (user-specific)
        `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
        `${process.env.APPDATA}\\..\\Local\\Google\\Chrome\\Application\\chrome.exe`,
        // Linux Chrome paths
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/opt/google/chrome/google-chrome',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      ];
      
      const edgePaths = [
        // Windows Edge paths (hanya sebagai fallback)
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ];
      
      // Gabungkan dengan prioritas Chrome first
      const possibleChromePaths = [...chromePaths, ...edgePaths];
      
      // Cek ketersediaan browser dan tampilkan semua yang ditemukan
      let browserFound = false;
      let selectedBrowser = null;
      const foundBrowsers = [];
      
      console.log('📱 Mencari browser Chrome di sistem...');
      
      // Cek semua path Chrome terlebih dahulu (termasuk ENV jika ada)
      for (const browserPath of chromePaths) {
        if (fs.existsSync(browserPath)) {
          foundBrowsers.push({ path: browserPath, type: 'Chrome' });
          if (!selectedBrowser) {
            selectedBrowser = browserPath;
            console.log(`✅ Chrome ditemukan dan dipilih: ${browserPath}`);
            puppeteerOptions.executablePath = browserPath;
            browserFound = true;
          }
        }
      }
      
      // Jika tidak ada Chrome, cek Edge sebagai fallback
      if (!browserFound) {
        console.log('⚠️ Chrome tidak ditemukan, mencari Edge sebagai fallback...');
        for (const browserPath of edgePaths) {
          if (fs.existsSync(browserPath)) {
            foundBrowsers.push({ path: browserPath, type: 'Edge' });
            if (!selectedBrowser) {
              selectedBrowser = browserPath;
              console.log(`📱 Edge ditemukan dan dipilih sebagai fallback: ${browserPath}`);
              puppeteerOptions.executablePath = browserPath;
              browserFound = true;
            }
          }
        }
      }
      
      // Tampilkan ringkasan browser yang ditemukan
      if (foundBrowsers.length > 0) {
        console.log(`📱 Browser yang tersedia di sistem:`);
        foundBrowsers.forEach(browser => {
          const isSelected = browser.path === selectedBrowser ? ' (DIPILIH)' : '';
          console.log(`   ${browser.type}: ${browser.path}${isSelected}`);
        });
      }
      
      if (!browserFound) {
        console.log('⚠️ Tidak menemukan browser Chrome/Edge di lokasi umum');
        throw new Error('Browser not found. Please install Chrome or Edge browser');
      }
      
      // Coba hapus folder .wwebjs_auth jika ada error sebelumnya
      const authFolder = path.join(process.cwd(), '.wwebjs_auth');
      if (process.env.RESET_WHATSAPP_SESSION === 'true' && fs.existsSync(authFolder)) {
        console.log('📱 Menghapus session WhatsApp lama untuk reset...');
        try {
          fs.rmSync(authFolder, { recursive: true, force: true });
          console.log('📱 Session WhatsApp lama berhasil dihapus');
        } catch (err) {
          console.error('❌ Gagal menghapus session WhatsApp:', err);
        }
      }
      
      // Buat folder auth jika belum ada
      if (!fs.existsSync(authFolder)) {
        try {
          fs.mkdirSync(authFolder, { recursive: true });
          console.log(`📱 Folder autentikasi dibuat: ${authFolder}`);
        } catch (err) {
          console.error('❌ Gagal membuat folder auth:', err);
        }
      } else {
        console.log(`📱 Folder autentikasi sudah ada: ${authFolder}`);
      }
      
      // Coba tes browser terlebih dahulu dengan puppeteer langsung
      try {
        console.log('📱 Mencoba meluncurkan browser dengan puppeteer langsung...');
        const testBrowser = await puppeteer.launch({
          headless: isHeadless,
          executablePath: puppeteerOptions.executablePath,
          args: puppeteerOptions.args
        });
        
        console.log('✅ Browser berhasil diluncurkan dengan puppeteer!');
        const version = await testBrowser.version();
        console.log(`📱 Versi browser: ${version}`);
        
        // Tutup browser test
        await testBrowser.close();
      } catch (browserError) {
        console.error('❌ Gagal meluncurkan browser langsung:', browserError);
        // Jika gagal, coba cara lain atau throw error
      }

      console.log('📱 Mengkonfigurasi whatsapp-web.js dengan browser yang ditemukan');
      
      // Menggunakan LocalAuth untuk menyimpan session
      this.client = new Client({
        authStrategy: new LocalAuth({ 
          clientId: "digipro-whatsapp",
          dataPath: authFolder 
        }),
        puppeteer: puppeteerOptions
      });

      // Event saat QR Code tersedia
      this.client.on('qr', (qr) => {
        console.log('\n\n📱 QR Code WhatsApp tersedia. Scan untuk login:');
        qrcode.generate(qr, { small: true });
        console.log('\nSilahkan scan QR code di atas dengan aplikasi WhatsApp di smartphone Anda.\n');
      });

      // Event saat client siap
      this.client.on('ready', () => {
        this.isReady = true;
        console.log('✅ WhatsApp client siap dan terautentikasi!');
      });

      // Event saat client terputus
      this.client.on('disconnected', (reason) => {
        this.isReady = false;
        console.log('❌ WhatsApp client terputus:', reason);
      });

      // Event saat authentication failure
      this.client.on('auth_failure', (msg) => {
        console.error('❌ WhatsApp autentikasi gagal:', msg);
      });

      // Event loading screen
      this.client.on('loading_screen', (percent, message) => {
        console.log(`📱 WhatsApp loading: ${percent}% - ${message}`);
      });

      // Inisialisasi client WhatsApp
      console.log('📱 Memulai inisialisasi WhatsApp...');
      await this.client.initialize();
      this.sessionInitialized = true;
      
    } catch (error) {
      console.error('❌ Error saat inisialisasi WhatsApp service:', error);
      // Hanya aktifkan silent mode jika diperintahkan melalui environment variable
      if (process.env.WHATSAPP_SILENT_MODE_FALLBACK === 'true') {
        this.enableSilentMode();
      } else {
        console.error('❌ WhatsApp service gagal diinisialisasi dan silent mode tidak diaktifkan! Notifikasi tidak akan terkirim.');
        console.error('❌ Untuk mengaktifkan silent mode, set WHATSAPP_SILENT_MODE=true atau WHATSAPP_SILENT_MODE_FALLBACK=true');
        // Throw error untuk ditangani oleh caller
        throw error;
      }
    }
  }

  /**
   * Mengaktifkan silent mode (tidak mengirim notifikasi)
   */
  enableSilentMode() {
    // Hanya aktifkan silent mode jika diizinkan via environment
    if (process.env.WHATSAPP_SILENT_MODE !== 'false') {
      this.silentMode = true;
      console.log('📱 WhatsApp service diaktifkan dalam silent mode (tidak mengirim notifikasi)');
    } else {
      console.log('⚠️ Permintaan untuk mengaktifkan silent mode ditolak karena WHATSAPP_SILENT_MODE=false');
    }
  }

  /**
   * Mematikan silent mode dan mencoba re-inisialisasi client
   */
  async disableSilentMode() {
    if (this.silentMode) {
      console.log('📱 Mematikan silent mode dan mencoba inisialisasi WhatsApp client...');
      this.silentMode = false;
      this.sessionInitialized = false;
      this.isReady = false;
      await this.initialize();
      return this.isReady;
    }
    return true;
  }

  /**
   * Mengirim pesan WhatsApp
   * @param {string} phoneNumber - Nomor telepon penerima (format: 628xxxxxxxxxx)
   * @param {string} message - Pesan yang akan dikirim
   * @returns {Promise<boolean>} - Status pengiriman
   */
  async sendMessage(phoneNumber, message) {
    // Jika dalam silent mode, log saja tapi tidak benar-benar mengirim
    if (this.silentMode) {
      console.log(`📱 [SILENT MODE] Pesan yang akan dikirim ke ${phoneNumber}:`);
      console.log(message);
      return true; // Anggap sukses untuk tidak mengganggu flow program
    }
    
    try {
      if (!this.isReady) {
        console.log('📱 WhatsApp client belum siap. Mencoba inisialisasi...');
        await this.initialize();
        
        // Jika masih belum ready setelah initialize, dan bukan silent mode
        if (!this.isReady && !this.silentMode) {
          console.log('❌ WhatsApp client tidak siap setelah inisialisasi');
          return false;
        } else if (this.silentMode) {
          // Dalam silent mode, log saja pesan
          console.log(`📱 [SILENT MODE] Pesan yang akan dikirim ke ${phoneNumber}:`);
          console.log(message);
          return true;
        }
      }

      // Format nomor telepon (pastikan format 628xxxxxxxxxx)
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Kirim pesan
      console.log(`📱 Mengirim WhatsApp ke ${formattedNumber}`);
      
      try {
        const response = await this.client.sendMessage(`${formattedNumber}@c.us`, message);
        // Jika sukses sampai di sini, pesan sudah terkirim ke WhatsApp
        console.log(`✅ Pesan terkirim ke ${formattedNumber}`);
        return true;
      } catch (innerError) {
        // Error saat serialisasi respons (tapi pesan mungkin sudah terkirim)
        console.error(`❌ Error saat mengirim pesan WhatsApp ke ${phoneNumber}:`, innerError);
        
        // Cek jenis error, jika error serialisasi tetapi pesan mungkin sudah terkirim
        if (innerError.message && innerError.message.includes('serialize') || 
            innerError.message && innerError.message.includes('Cannot read properties')) {
          console.log(`⚠️ Error serialisasi tetapi pesan mungkin sudah terkirim ke ${formattedNumber}`);
          // Return true karena kemungkinan pesan terkirim meskipun ada error serialisasi
          return true;
        }
        
        // Untuk error lainnya, kembalikan false
        return false;
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim pesan WhatsApp ke ${phoneNumber}:`, error);
      
      // Hanya aktifkan silent mode jika diizinkan via environment
      if (process.env.WHATSAPP_SILENT_MODE_FALLBACK === 'true' && !this.silentMode) {
        this.enableSilentMode();
        // Log pesan dalam silent mode
        console.log(`📱 [SILENT MODE] Pesan yang akan dikirim ke ${phoneNumber}:`);
        console.log(message);
        return true; // Anggap sukses dalam silent mode
      }
      
      return false;
    }
  }

  /**
   * Mengirim file PDF melalui WhatsApp
   * @param {string} phoneNumber - Nomor telepon penerima (format: 628xxxxxxxxxx)
   * @param {string} filePath - Path file PDF yang akan dikirim
   * @param {string} caption - Caption untuk file
   * @returns {Promise<boolean>} - Status pengiriman
   */
  async sendPdf(phoneNumber, filePath, caption = '') {
    // Jika dalam silent mode, log saja tapi tidak benar-benar mengirim
    if (this.silentMode) {
      console.log(`📱 [SILENT MODE] File PDF yang akan dikirim ke ${phoneNumber}:`);
      console.log(`File: ${filePath}`);
      console.log(`Caption: ${caption}`);
      return true; // Anggap sukses untuk tidak mengganggu flow program
    }
    
    try {
      if (!this.isReady) {
        console.log('📱 WhatsApp client belum siap. Mencoba inisialisasi...');
        await this.initialize();
        
        // Jika masih belum ready setelah initialize, dan bukan silent mode
        if (!this.isReady && !this.silentMode) {
          console.log('❌ WhatsApp client tidak siap setelah inisialisasi');
          return false;
        } else if (this.silentMode) {
          // Dalam silent mode, log saja
          console.log(`📱 [SILENT MODE] File PDF yang akan dikirim ke ${phoneNumber}:`);
          console.log(`File: ${filePath}`);
          console.log(`Caption: ${caption}`);
          return true;
        }
      }

      // Format nomor telepon
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // Cek keberadaan file
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File tidak ditemukan: ${filePath}`);
        return false;
      }
      
      // Buat media dari file
      const media = MessageMedia.fromFilePath(filePath);
      
      // Kirim file
      console.log(`📱 Mengirim file PDF ke ${formattedNumber}`);
      await this.client.sendMessage(`${formattedNumber}@c.us`, media, { caption });
      
      console.log(`✅ File terkirim ke ${formattedNumber}`);
      return true;
    } catch (error) {
      console.error(`❌ Error saat mengirim file PDF ke ${phoneNumber}:`, error);
      
      // Hanya aktifkan silent mode jika diizinkan via environment
      if (process.env.WHATSAPP_SILENT_MODE_FALLBACK === 'true' && !this.silentMode) {
        this.enableSilentMode();
        // Log file dalam silent mode
        console.log(`📱 [SILENT MODE] File PDF yang akan dikirim ke ${phoneNumber}:`);
        console.log(`File: ${filePath}`);
        console.log(`Caption: ${caption}`);
        return true; // Anggap sukses dalam silent mode
      }
      
      return false;
    }
  }

  /**
   * Format nomor telepon ke format WhatsApp (628xxxxxxxxxx)
   * @param {string} phoneNumber - Nomor telepon yang akan diformat
   * @returns {string} - Nomor telepon yang sudah diformat
   */
  formatPhoneNumber(phoneNumber) {
    // Hapus semua karakter non-digit
    let number = phoneNumber.replace(/\D/g, '');
    
    // Pastikan diawali dengan kode negara 62
    if (number.startsWith('0')) {
      number = '62' + number.substring(1);
    } else if (!number.startsWith('62')) {
      number = '62' + number;
    }
    
    return number;
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService; 
