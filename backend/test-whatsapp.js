/**
 * Script untuk melakukan test pengiriman WhatsApp 
 * Pastikan WhatsApp Web sudah terotentikasi sebelum menjalankan script ini
 */
const dotenv = require('dotenv');
const readline = require('readline');
const whatsappService = require('./src/services/whatsappService');

// Load environment variables
dotenv.config();

// Buat interface readline untuk input dari konsol
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi utama test WhatsApp
async function testWhatsApp() {
  console.log('=== TEST PENGIRIMAN WHATSAPP ===');
  console.log('Memastikan WhatsApp service berjalan dalam mode NON-SILENT');
  
  // Force disable silent mode
  process.env.WHATSAPP_SILENT_MODE = 'false';

  try {
    console.log('Menginisialisasi WhatsApp service...');
    await whatsappService.initialize();
    
    // Jika masih dalam silent mode, coba matikan
    if (whatsappService.silentMode) {
      console.log('WhatsApp service masih dalam silent mode, mencoba mematikan...');
      await whatsappService.disableSilentMode();
      
      if (whatsappService.silentMode) {
        console.error('❌ Gagal mematikan silent mode, WhatsApp akan tetap dalam silent mode');
        console.error('❌ Coba reset WhatsApp service dengan menjalankan: node reset-whatsapp-silent.js');
        process.exit(1);
      }
    }
    
    console.log('✅ WhatsApp service siap dalam mode NON-SILENT');
    
    // Minta nomor telepon dan pesan yang akan dikirim
    rl.question('Masukkan nomor telepon penerima (format: 08xxxxxxxxxx): ', async (phoneNumber) => {
      if (!phoneNumber || phoneNumber.trim().length < 10) {
        console.error('❌ Nomor telepon tidak valid');
        rl.close();
        process.exit(1);
      }
      
      // Pesan test
      const testMessage = `*DIGIPRO - Test Pesan WhatsApp*\n\n` +
        `Halo,\n` +
        `Ini adalah pesan test dari aplikasi DIGIPRO.\n\n` +
        `Waktu: ${new Date().toLocaleString('id-ID')}\n` +
        `Status: Aktif dan berfungsi dengan baik\n\n` +
        `Jika Anda menerima pesan ini, berarti fitur notifikasi WhatsApp berfungsi dengan normal.\n\n` +
        `Terima kasih,\n` +
        `Tim DIGIPRO`;
      
      console.log(`\nMengirim pesan test ke ${phoneNumber}...`);
      
      // Kirim pesan
      const success = await whatsappService.sendMessage(phoneNumber, testMessage);
      
      if (success) {
        console.log(`✅ Pesan test berhasil terkirim ke ${phoneNumber}`);
        
        // Konfirmasi untuk mengirim file PDF test
        rl.question('\nApakah ingin mengirim file PDF test? (y/n): ', async (answer) => {
          if (answer.toLowerCase() === 'y') {
            // Cek apakah ada invoice di folder public/invoices
            const fs = require('fs');
            const path = require('path');
            
            const invoiceDir = path.join(__dirname, 'public/invoices');
            if (fs.existsSync(invoiceDir)) {
              const files = fs.readdirSync(invoiceDir);
              const pdfFiles = files.filter(file => file.endsWith('.pdf'));
              
              if (pdfFiles.length > 0) {
                // Ambil invoice terakhir
                const latestPdf = pdfFiles[pdfFiles.length - 1];
                const pdfPath = path.join(invoiceDir, latestPdf);
                
                console.log(`\nMengirim file PDF: ${latestPdf} ke ${phoneNumber}...`);
                
                // Kirim file PDF
                const pdfSuccess = await whatsappService.sendPdf(phoneNumber, pdfPath, 'Test PDF WhatsApp');
                
                if (pdfSuccess) {
                  console.log(`✅ File PDF berhasil terkirim ke ${phoneNumber}`);
                } else {
                  console.error('❌ Gagal mengirim file PDF');
                }
              } else {
                console.log('❌ Tidak ada file PDF yang tersedia di folder public/invoices');
              }
            } else {
              console.log('❌ Folder public/invoices tidak ditemukan');
            }
          }
          
          console.log('\n=== TEST WHATSAPP SELESAI ===');
          rl.close();
          process.exit(0);
        });
        
      } else {
        console.error('❌ Gagal mengirim pesan test');
        console.error('❌ Pastikan WhatsApp Web sudah terotentikasi dan tidak dalam silent mode');
        rl.close();
        process.exit(1);
      }
    });
    
  } catch (error) {
    console.error('❌ Error saat test WhatsApp:', error);
    console.error('❌ Pastikan WhatsApp Web sudah terotentikasi dan browser Chrome/Edge terinstall di sistem');
    console.error('❌ Untuk re-otentikasi, jalankan: node reset-whatsapp-silent.js');
    process.exit(1);
  }
}

// Jalankan test
testWhatsApp(); 