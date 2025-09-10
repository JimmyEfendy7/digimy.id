/**
 * Script untuk menguji pembuatan ulang invoice
 * 
 * Cara penggunaan:
 * node test-regenerate-invoice.js <transaction_code>
 * 
 * Contoh:
 * node test-regenerate-invoice.js ORDER-1753180212403-5x1318n7
 */

const { pool } = require('./src/config/database');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');

// Import fungsi dari midtransController
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

// Fungsi untuk menghasilkan invoice PDF
const generateInvoicePDF = async (transactionData) => {
  const { 
    transaction_id, 
    transaction_code, 
    customer_name, 
    payment_method, 
    total_amount, 
    payment_status,
    created_at,
    customer_phone, // Termasuk customer_phone
    items = []
  } = transactionData;
  
  // Path tempat menyimpan invoice
  const invoiceDir = path.join(__dirname, './public/invoices');
  
  // Pastikan direktori invoice ada
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }
  
  // Buat nama file invoice unik
  const invoiceFileName = `invoice-${transaction_code}-${Date.now()}.pdf`;
  const invoiceFilePath = path.join(invoiceDir, invoiceFileName);
  
  // Path untuk logo
  const logoPath = path.join(__dirname, './public/stores/digipro-official.png');
  
  // Buat dokumen PDF
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(invoiceFilePath);
      
      doc.pipe(stream);
      
      // Saat PDF selesai dibuat, kembalikan path relatifnya
      stream.on('finish', () => {
        // Path relatif yang akan disimpan di database
        const relativePath = `/public/invoices/${invoiceFileName}`;
        resolve(relativePath);
      });
      
      // Buat kop invoice dengan layout horizontal
      
      // Posisi Y awal untuk header dengan sedikit margin atas
      const headerY = 40;
      
      // Buat background area kop surat
      doc.rect(40, headerY - 10, 520, 125)
         .fillAndStroke('#FAFAFA', '#4338CA')
         .lineWidth(1.5);
      
      // Garis aksen horizontal di bagian atas
      doc.lineWidth(3)
         .strokeColor('#4F46E5')
         .moveTo(40, headerY - 5)
         .lineTo(560, headerY - 5)
         .stroke();
         
      // Garis aksen horizontal di bagian bawah
      doc.lineWidth(3)
         .strokeColor('#4F46E5')
         .moveTo(40, headerY + 110)
         .lineTo(560, headerY + 110)
         .stroke();
      
      // Latar belakang area logo dengan sudut melengkung
      doc.roundedRect(50, headerY, 100, 100, 5)
         .fillAndStroke('#F3F4F6', '#6366F1');
      
      // Tempatkan logo di sebelah kiri dengan bingkai
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 55, headerY + 5, {
          fit: [90, 90],
          align: 'center'
        });
      }
      
      // Tambahkan garis vertikal pemisah dengan gradient effect
      const gradientY = headerY + 5;
      const gradientHeight = 100;
      for (let i = 0; i < gradientHeight; i += 2) {
        const opacity = 0.8 - (i / gradientHeight * 0.6);
        doc.strokeColor(`rgba(99, 102, 241, ${opacity})`)
           .lineWidth(1)
           .moveTo(170, gradientY + i)
           .lineTo(170, gradientY + i + 1)
           .stroke();
      }
      
      // Tempatkan nama perusahaan dan invoice di sebelah kanan logo
      doc.fontSize(26)
         .fillColor('#4338CA')
         .font('Helvetica-Bold')
         .text('DIGIPRO', 190, headerY + 10, { width: 370, align: 'left' });
      
      // Tambah subtitle
      doc.fontSize(10)
         .fillColor('#6B7280')
         .font('Helvetica')
         .text('Platform Digital Profesional Indonesia', 190, headerY + 45);
      
      // INVOICE title dengan background highlight yang lebih modern
      doc.roundedRect(190, headerY + 60, 100, 25, 3)
         .fill('#4338CA');
         
      doc.fontSize(14)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text('INVOICE', 210, headerY + 65);
         
      // Tambahkan alamat dan kontak perusahaan di bawah nama perusahaan
      doc.fontSize(9)
         .fillColor('#4B5563')
         .font('Helvetica')
         .text('Jl. Digital Utama No. 123, Jakarta Selatan', 310, headerY + 65)
         .text('Email: info@digipro.id | Website: www.digipro.id', 310, headerY + 80)
         .text('Telepon: +62-21-1234567', 310, headerY + 95);
      
      // Berikan ruang yang cukup setelah header
      const contentStartY = headerY + 130;
      
      // Garis pembatas dengan desain profesional
      doc.lineWidth(1)
         .strokeColor('#4338CA')
         .dash(5, { space: 5 })
         .moveTo(50, contentStartY)
         .lineTo(550, contentStartY)
         .stroke()
         .undash();
      
      // Buat dua kolom untuk informasi invoice dan informasi pelanggan
      const infoStartY = contentStartY + 20;
      
      // Kolom kiri - Informasi invoice
      doc.fillColor('#4338CA')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('INFORMASI INVOICE', 50, infoStartY);
      
      // Box untuk informasi invoice mulai di bawah judul dengan sudut melengkung
      const boxStartY = infoStartY + 20;
      const boxHeight = 80;
      doc.roundedRect(50, boxStartY, 240, boxHeight, 5)
         .fillAndStroke('#F3F4F6', '#4338CA');
      
      doc.fontSize(10)
         .fillColor('#1F2937')
         .font('Helvetica')
         .text(`No. Invoice: ${transaction_code}`, 60, boxStartY + 15)
         .text(`Tanggal: ${new Date(created_at).toLocaleDateString('id-ID', { 
            day: '2-digit', month: 'long', year: 'numeric' 
         })}`, 60, boxStartY + 35)
         .text(`Status: ${payment_status === 'paid' ? 'LUNAS' : payment_status === 'pending' ? 'MENUNGGU PEMBAYARAN' : 'GAGAL'}`, 60, boxStartY + 55);
      
      // Kolom kanan - Informasi pelanggan
      doc.fillColor('#4338CA')
         .fontSize(12)
         .font('Helvetica-Bold')
         .text('INFORMASI PELANGGAN', 310, infoStartY);
      
      // Box untuk informasi pelanggan mulai di bawah judul
      doc.roundedRect(310, boxStartY, 240, boxHeight, 5)
         .fillAndStroke('#F3F4F6', '#4338CA');
      
      doc.fontSize(10)
         .fillColor('#1F2937')
         .font('Helvetica')
         .text(`Nama: ${customer_name}`, 320, boxStartY + 15)
         .text(`Metode Pembayaran: ${payment_method || 'Pembayaran Online'}`, 320, boxStartY + 35)
         .text(`WhatsApp: ${customer_phone || '-'}`, 320, boxStartY + 55);
      
      // Pindahkan posisi setelah box untuk lanjut ke detail berikutnya
      const afterBoxY = boxStartY + boxHeight + 30;
      
      // Tabel item
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#4338CA')
         .text('DETAIL PEMBELIAN:', 50, afterBoxY);
      
      // Header tabel
      const tableTop = afterBoxY + 25;
      const tableHeaders = ['Produk', 'Harga', 'Jml', 'Subtotal'];
      const columnWidths = [250, 100, 50, 100];
      
      // Buat background header tabel
      doc.roundedRect(50, tableTop, 500, 25, 3)
         .fill('#4338CA');
      
      // Tampilkan header tabel
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
      tableHeaders.forEach((header, i) => {
        doc.text(header, 50 + (columnWidths.slice(0, i).reduce((sum, width) => sum + width, 0)), tableTop + 8, { 
          width: columnWidths[i], 
          align: i === 0 ? 'left' : 'right' 
        });
      });
      
      // Garis setelah header
      let currentTop = tableTop + 25;
      doc.strokeColor('#4338CA')
         .lineWidth(0.5)
         .moveTo(50, currentTop)
         .lineTo(550, currentTop)
         .stroke();
      
      // Tampilkan item transaksi
      doc.font('Helvetica').fontSize(10).fillColor('#1F2937');
      currentTop += 15;
      
      if (items.length > 0) {
        items.forEach((item, index) => {
          const itemName = item.item_name || 'Produk Digital';
          const itemPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.item_price || 0);
          const itemQty = item.quantity || 1;
          const itemSubtotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item.subtotal || (item.item_price * itemQty));
          
          // Tambahkan zebra stripe background untuk memudahkan pembacaan
          if (index % 2 === 0) {
            doc.rect(50, currentTop - 5, 500, 25).fill('#F9FAFB');
          }
          
          // Baris item
          doc.fillColor('#1F2937')
             .text(itemName, 50, currentTop, { width: columnWidths[0], align: 'left' });
          doc.text(itemPrice, 50 + columnWidths[0], currentTop, { width: columnWidths[1], align: 'right' });
          doc.text(itemQty.toString(), 50 + columnWidths[0] + columnWidths[1], currentTop, { width: columnWidths[2], align: 'right' });
          doc.text(itemSubtotal, 50 + columnWidths[0] + columnWidths[1] + columnWidths[2], currentTop, { width: columnWidths[3], align: 'right' });
          
          // Pindah ke baris berikutnya
          currentTop += 25;
          
          // Jika halaman penuh, buat halaman baru
          if (currentTop > doc.page.height - 100) {
            doc.addPage();
            currentTop = 50;
          }
        });
      } else {
        // Jika tidak ada detail item, tampilkan total saja
        const productName = 'Produk Digital';
        const productPrice = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total_amount || 0);
        
        // Background untuk satu item
        doc.rect(50, currentTop - 5, 500, 25).fill('#F9FAFB');
        
        // Baris item
        doc.fillColor('#1F2937')
           .text(productName, 50, currentTop, { width: columnWidths[0], align: 'left' });
        doc.text(productPrice, 50 + columnWidths[0], currentTop, { width: columnWidths[1], align: 'right' });
        doc.text('1', 50 + columnWidths[0] + columnWidths[1], currentTop, { width: columnWidths[2], align: 'right' });
        doc.text(productPrice, 50 + columnWidths[0] + columnWidths[1] + columnWidths[2], currentTop, { width: columnWidths[3], align: 'right' });
        
        currentTop += 25;
      }
      
      // Garis sebelum total
      doc.strokeColor('#4338CA')
         .lineWidth(0.5)
         .moveTo(50, currentTop)
         .lineTo(550, currentTop)
         .stroke();
      
      currentTop += 15;
      
      // Total dengan background yang menonjol
      const grandTotal = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total_amount || 0);
      
      // Background untuk bagian total
      doc.roundedRect(300, currentTop - 5, 250, 30, 3)
         .fillAndStroke('#EEF2FF', '#4338CA');
      
      // Teks TOTAL
      doc.font('Helvetica-Bold')
         .fontSize(12)
         .fillColor('#4338CA')
         .text('TOTAL', 310, currentTop + 5, { width: 80, align: 'left' });
      
      // Nilai total
      doc.text(grandTotal, 390, currentTop + 5, { width: 150, align: 'right' });
      
      currentTop += 40;
      
      // Catatan
      doc.font('Helvetica-Bold')
         .fillColor('#4338CA')
         .text('Catatan:', 50, currentTop)
         .font('Helvetica')
         .fillColor('#1F2937')
         .text('Terima kasih telah berbelanja di DIGIPRO!', 180, currentTop);
      
      currentTop += 15;
      
      doc.text('Invoice ini adalah bukti sah transaksi digital.', 180, currentTop);
      
      // Footer - lebih dekat dengan catatan (hanya 20px gap)
      currentTop += 20;
      
      // Tambahkan background footer
      doc.roundedRect(50, currentTop, 500, 50, 5)
         .fillAndStroke('#F3F4F6', '#4338CA');
      
      // Tambahkan garis
      doc.strokeColor('#4338CA')
         .lineWidth(1)
         .moveTo(50, currentTop)
         .lineTo(550, currentTop)
         .stroke();
      
      currentTop += 15; // Tambahkan sedikit jarak untuk teks footer
      
      // Tambahkan footer text
      doc.fontSize(10)
         .fillColor('#4338CA')
         .text('© ' + new Date().getFullYear() + ' DIGIPRO - Platform Digital Terpercaya', 50, currentTop, { align: 'center' });
      
      // Tambahkan teks tambahan di footer
      currentTop += 15;
      doc.fontSize(8)
         .fillColor('#4B5563')
         .text('Dokumen ini dihasilkan secara digital dan sah tanpa memerlukan tanda tangan', 50, currentTop, { align: 'center' });
      
      // Finalisasi dokumen
      doc.end();
      
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      reject(error);
    }
  });
};

const regenerateInvoice = async (transactionCode) => {
  try {
    console.log(`🔄 Memulai proses regenerasi invoice untuk transaksi code: ${transactionCode}`);
    
    // Dapatkan data transaksi berdasarkan transaction_code
    const [transactions] = await pool.query(
      `SELECT * FROM transactions WHERE transaction_code = ?`,
      [transactionCode]
    );
    
    if (!transactions || transactions.length === 0) {
      console.error(`❌ Transaksi dengan kode ${transactionCode} tidak ditemukan`);
      return null;
    }
    
    console.log(`✅ Data transaksi ditemukan untuk kode: ${transactionCode}`);
    const transaction = transactions[0];
    
    // Log detail transaksi penting untuk debug
    console.log(`📊 Detail transaksi: 
      - ID: ${transaction.id}
      - Transaction Code: ${transaction.transaction_code}
      - Customer: ${transaction.customer_name}
      - Customer Phone: ${transaction.customer_phone || 'Tidak ada'}
      - Amount: ${transaction.total_amount}
      - Payment Status: ${transaction.payment_status}
      - Payment Method: ${transaction.payment_method || 'N/A'}
    `);
    
    // Dapatkan item transaksi
    console.log(`🔍 Mengambil item transaksi...`);
    const items = await getTransactionItems(transaction.id);
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
      customer_phone: transaction.customer_phone, // Termasuk customer_phone
      items: items
    };
    
    // Generate invoice PDF
    console.log(`📄 Menghasilkan PDF invoice...`);
    const invoiceUrl = await generateInvoicePDF(invoiceData);
    
    if (!invoiceUrl) {
      console.error(`❌ Gagal menghasilkan URL invoice`);
      return null;
    }
    
    console.log(`✅ Invoice berhasil dibuat: ${invoiceUrl}`);
    
    // Verifikasi file fisik
    const absolutePath = path.join(__dirname, invoiceUrl);
    if (fs.existsSync(absolutePath)) {
      const fileStats = fs.statSync(absolutePath);
      console.log(`📄 File invoice ukuran: ${fileStats.size} bytes`);
      
      if (fileStats.size === 0) {
        console.error(`⚠️ Warning: File invoice ada tetapi kosong (0 bytes)`);
      }
    } else {
      console.error(`⚠️ Warning: File invoice tidak ditemukan di lokasi fisik: ${absolutePath}`);
    }
    
    return invoiceUrl;
    
  } catch (error) {
    console.error('❌ Error regenerating invoice:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return null;
  }
};

// Function to execute script
const run = async () => {
  // Get transaction code from command line arguments
  const transactionCode = process.argv[2];
  
  if (!transactionCode) {
    console.error('❌ Harap berikan transaction_code sebagai parameter!');
    console.log('ℹ️  Contoh: node test-regenerate-invoice.js ORDER-1753180212403-5x1318n7');
    process.exit(1);
  }
  
  console.log(`🚀 Memulai regenerasi invoice untuk transaction_code: ${transactionCode}`);
  
  try {
    const invoiceUrl = await regenerateInvoice(transactionCode);
    
    if (invoiceUrl) {
      console.log(`✅ Invoice berhasil diregenerasi: ${invoiceUrl}`);
    } else {
      console.error('❌ Gagal meregenerasi invoice!');
    }
  } catch (error) {
    console.error('❌ Error saat meregenerasi invoice:', error);
  }
  
  // Close database connection
  pool.end();
};

// Run the script
run().catch(console.error); 