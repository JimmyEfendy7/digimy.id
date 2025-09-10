/**
 * Script untuk menguji fitur invoice dan pengiriman WhatsApp
 * 
 * Cara penggunaan:
 * node test-invoice.js <transaction_id>
 */
require('dotenv').config();
const { pool } = require('./src/config/database');
const whatsappService = require('./src/services/whatsappService');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Fungsi yang diambil dari midtransController untuk menguji fitur
const getTransactionItems = async (transactionId) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM transaction_items WHERE transaction_id = ?',
      [transactionId]
    );
    return items;
  } catch (error) {
    console.error('Error fetching transaction items:', error);
    return [];
  }
};

const updateInvoiceUrl = async (transactionId, invoiceUrl) => {
  try {
    const [result] = await pool.query(
      'UPDATE transactions SET invoice_url = ? WHERE id = ?',
      [invoiceUrl, transactionId]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error updating invoice URL:', error);
    return false;
  }
};

const generateInvoicePDF = async (transactionData) => {
  const { 
    transaction_id, 
    transaction_code, 
    customer_name, 
    payment_method, 
    total_amount, 
    payment_status,
    created_at,
    items = []
  } = transactionData;
  
  console.log(`🔍 Generating PDF invoice for transaction ${transaction_code}`);
  
  // Path tempat menyimpan invoice
  const invoiceDir = path.join(__dirname, './public/invoices');
  
  // Pastikan direktori invoice ada
  if (!fs.existsSync(invoiceDir)) {
    console.log(`📁 Membuat direktori invoice: ${invoiceDir}`);
    fs.mkdirSync(invoiceDir, { recursive: true });
  }
  
  // Buat nama file invoice unik
  const invoiceFileName = `invoice-${transaction_code}-${Date.now()}.pdf`;
  const invoiceFilePath = path.join(invoiceDir, invoiceFileName);
  
  console.log(`📄 Nama file invoice: ${invoiceFileName}`);
  console.log(`📄 Path file invoice: ${invoiceFilePath}`);
  
  // Path untuk logo
  const logoPath = path.join(__dirname, './public/stores/digipro-official.png');
  
  // Cek ketersediaan logo
  if (!fs.existsSync(logoPath)) {
    console.warn(`⚠️ File logo tidak ditemukan di ${logoPath}, akan menggunakan fallback`);
  } else {
    console.log(`✅ Logo ditemukan di ${logoPath}`);
  }
  
  // Buat dokumen PDF sederhana untuk tujuan pengujian
  return new Promise((resolve, reject) => {
    try {
      console.log('📄 Mulai membuat dokumen PDF...');
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      
      // Buat writable stream untuk menyimpan PDF
      console.log(`📄 Membuat stream ke file ${invoiceFilePath}`);
      const stream = fs.createWriteStream(invoiceFilePath);
      
      // Handle stream error
      stream.on('error', (err) => {
        console.error(`❌ Error pada stream file invoice:`, err);
        reject(err);
      });
      
      // Pipe dokumen PDF ke file stream
      doc.pipe(stream);
      
      // Saat PDF selesai dibuat, kembalikan path relatifnya
      stream.on('finish', () => {
        // Path relatif yang akan disimpan di database
        const relativePath = `/public/invoices/${invoiceFileName}`;
        console.log(`✅ PDF invoice berhasil dibuat: ${relativePath}`);
        resolve(relativePath);
      });
      
      // Isi dokumen PDF sederhana untuk testing
      doc.fontSize(25).text('INVOICE TEST', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text(`Invoice: ${transaction_code}`, { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`Pelanggan: ${customer_name}`, { align: 'left' });
      doc.fontSize(14).text(`Total: Rp. ${total_amount.toLocaleString('id-ID')}`, { align: 'left' });
      doc.fontSize(14).text(`Status: ${payment_status}`, { align: 'left' });
      doc.moveDown();
      
      // Buat tabel sederhana
      doc.fontSize(12).text('Detail Item:', { align: 'left' });
      doc.moveDown(0.5);
      
      // List item bila ada
      if (items && items.length > 0) {
        items.forEach((item, i) => {
          doc.text(`${i+1}. ${item.item_name} - Rp. ${item.item_price.toLocaleString('id-ID')} x ${item.quantity} = Rp. ${item.subtotal.toLocaleString('id-ID')}`);
        });
      } else {
        doc.text('Tidak ada detail item');
      }
      
      doc.moveDown();
      doc.fontSize(10).text('Dokumen ini adalah tes invoice yang dibuat secara otomatis', { align: 'center' });
      doc.text(`Dibuat pada: ${new Date().toLocaleString('id-ID')}`, { align: 'center' });
      
      // Finalisasi dokumen
      doc.end();
      console.log('📄 Dokumen PDF selesai dibuat dan sedang ditulis ke file');
      
    } catch (error) {
      console.error('❌ Error generating invoice PDF:', error);
      reject(error);
    }
  });
};

const createAndSaveInvoice = async (transactionId) => {
  try {
    console.log(`📄 Memulai proses pembuatan invoice untuk transaksi ID: ${transactionId}`);
    
    // Dapatkan data transaksi
    const [transactions] = await pool.query(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );
    
    if (!transactions || transactions.length === 0) {
      console.error(`❌ Transaksi dengan ID ${transactionId} tidak ditemukan`);
      return null;
    }
    
    console.log(`✅ Data transaksi ditemukan untuk ID: ${transactionId}`);
    const transaction = transactions[0];
    
    // Log detail transaksi penting untuk debug
    console.log(`📊 Detail transaksi: 
      - Transaction Code: ${transaction.transaction_code}
      - Customer: ${transaction.customer_name}
      - Amount: ${transaction.total_amount}
      - Payment Status: ${transaction.payment_status}
      - Payment Method: ${transaction.payment_method || 'N/A'}
    `);
    
    // Dapatkan item transaksi
    console.log(`🔍 Mengambil item transaksi...`);
    const items = await getTransactionItems(transactionId);
    console.log(`✅ Ditemukan ${items.length} item transaksi`);
    
    // Siapkan data untuk invoice
    const invoiceData = {
      transaction_id: transaction.id,
      transaction_code: transaction.transaction_code,
      customer_name: transaction.customer_name,
      payment_method: transaction.payment_method,
      total_amount: transaction.total_amount,
      payment_status: transaction.payment_status,
      created_at: transaction.created_at,
      items: items
    };
    
    // Generate invoice PDF
    console.log(`📄 Menghasilkan PDF invoice...`);
    const invoiceUrl = await generateInvoicePDF(invoiceData);
    
    if (!invoiceUrl) {
      console.error(`❌ Gagal menghasilkan URL invoice`);
      return null;
    }
    
    // Update invoice_url di database
    console.log(`📝 Menyimpan URL invoice ke database: ${invoiceUrl}`);
    const updated = await updateInvoiceUrl(transactionId, invoiceUrl);
    
    if (updated) {
      console.log(`✅ Invoice berhasil dibuat dan disimpan untuk transaksi ID: ${transactionId}`);
    } else {
      console.error(`❌ Gagal mengupdate invoice URL untuk transaksi ID: ${transactionId}`);
    }
    
    return invoiceUrl;
    
  } catch (error) {
    console.error('❌ Error creating invoice:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return null;
  }
};

// Kirim ke WhatsApp
const sendWhatsAppNotification = async (transactionId, invoicePath) => {
  try {
    console.log(`📱 Memulai proses pengiriman notifikasi WhatsApp untuk transaksi ID: ${transactionId}`);
    
    // Dapatkan data transaksi
    const [transactions] = await pool.query(
      `SELECT * FROM transactions WHERE id = ?`,
      [transactionId]
    );
    
    if (!transactions || transactions.length === 0) {
      console.error(`❌ Transaksi tidak ditemukan untuk ID: ${transactionId}`);
      return false;
    }
    
    const transaction = transactions[0];
    
    if (!transaction.customer_phone) {
      console.error(`❌ Tidak ada nomor telepon untuk transaksi ID: ${transactionId}`);
      return false;
    }
    
    // Format harga
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(transaction.total_amount);
    
    // Path lengkap file invoice
    const absoluteInvoicePath = path.join(__dirname, invoicePath);
    
    // Cek keberadaan file invoice
    if (!fs.existsSync(absoluteInvoicePath)) {
      console.error(`❌ File invoice tidak ditemukan di: ${absoluteInvoicePath}`);
      return false;
    }
    
    console.log(`✅ File invoice ditemukan: ${absoluteInvoicePath}`);
    
    // Siapkan pesan WhatsApp
    const message = `*DIGIPRO - Pembayaran Berhasil*\n\n`+
      `Halo *${transaction.customer_name}*,\n`+
      `Pembayaran Anda telah kami terima.\n\n`+
      `*Detail Pembayaran:*\n`+
      `No. Transaksi: *${transaction.transaction_code}*\n`+
      `Total: *${formattedAmount}*\n`+
      `Metode: *${transaction.payment_method || 'Online'}*\n`+
      `Status: *LUNAS*\n\n`+
      `Invoice telah kami lampirkan di pesan ini.\n\n`+
      `Terima kasih telah berbelanja di DIGIPRO.\n\n`+
      `Salam,\n`+
      `Tim DIGIPRO`;
    
    // Inisialisasi dan kirim pesan WhatsApp
    console.log(`📱 Menginisialisasi layanan WhatsApp...`);
    await whatsappService.initialize();
    
    console.log(`📱 Mengirim pesan WhatsApp ke ${transaction.customer_phone}...`);
    await whatsappService.sendMessage(transaction.customer_phone, message);
    
    // Kirim file PDF invoice setelah pesan terkirim
    console.log(`📱 Mengirim file invoice PDF via WhatsApp...`);
    await whatsappService.sendPdf(
      transaction.customer_phone, 
      absoluteInvoicePath, 
      `Invoice #${transaction.transaction_code}`
    );
    
    console.log(`✅ Pesan dan file PDF berhasil dikirim ke ${transaction.customer_phone}`);
    return true;
  } catch (error) {
    console.error('❌ Error mengirim notifikasi WhatsApp:', error);
    return false;
  }
};

// Main function
const main = async () => {
  try {
    // Ambil transaksi ID dari command line
    const transactionId = process.argv[2];
    
    if (!transactionId) {
      console.error('❌ Harus menentukan transaction_id sebagai parameter!');
      console.log('Contoh: node test-invoice.js 123');
      process.exit(1);
    }
    
    console.log(`🚀 Memulai pengujian invoice untuk transaction_id: ${transactionId}`);
    
    // Buat dan simpan invoice
    const invoicePath = await createAndSaveInvoice(transactionId);
    
    if (!invoicePath) {
      console.error('❌ Gagal membuat invoice!');
      process.exit(1);
    }
    
    console.log(`✅ Invoice berhasil dibuat: ${invoicePath}`);
    
    // Kirim notifikasi WhatsApp
    console.log(`📱 Mengirim notifikasi WhatsApp...`);
    const notificationSent = await sendWhatsAppNotification(transactionId, invoicePath);
    
    if (notificationSent) {
      console.log(`✅ Notifikasi WhatsApp berhasil dikirim`);
    } else {
      console.error(`❌ Gagal mengirim notifikasi WhatsApp`);
    }
    
    console.log('🏁 Pengujian selesai!');
    
  } catch (error) {
    console.error('❌ Error dalam proses pengujian:', error);
  } finally {
    // Tutup koneksi database
    pool.end();
    process.exit(0);
  }
};

// Jalankan program
main(); 