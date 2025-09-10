// Midtrans controller
const axios = require('axios');
const crypto = require('crypto');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const whatsappService = require('../services/whatsappService'); // Import WhatsApp service
const qrService = require('../services/qrService'); // Import QR service

// Konfigurasi midtrans
const isSandbox = process.env.NODE_ENV !== 'production';

// Mendukung format lama dan format baru konfigurasi Midtrans
const serverKey = isSandbox 
  ? (process.env.MIDTRANS_SERVER_KEY_SANDBOX || process.env.MIDTRANS_SERVER_KEY)
  : (process.env.MIDTRANS_SERVER_KEY_PRODUCTION || process.env.MIDTRANS_SERVER_KEY);

const clientKey = isSandbox 
  ? (process.env.MIDTRANS_CLIENT_KEY_SANDBOX || process.env.MIDTRANS_CLIENT_KEY)
  : (process.env.MIDTRANS_CLIENT_KEY_PRODUCTION || process.env.MIDTRANS_CLIENT_KEY);

const baseUrl = isSandbox 
  ? 'https://app.sandbox.midtrans.com/snap/v1' 
  : 'https://app.midtrans.com/snap/v1';

/**
 * Menyimpan transaksi baru ke database
 */
const saveTransaction = async (transaction) => {
  try {
    console.log('Saving transaction to database:', JSON.stringify(transaction));
    
    const { 
      order_id, 
      gross_amount, 
      payment_type = 'pending', 
      customer_details, 
      item_details,
      payment_token,
      payment_url,
      payment_expiry
    } = transaction;
    
    // Ekstrak data pelanggan jika tersedia
    const customer_name = customer_details?.first_name 
      ? `${customer_details.first_name} ${customer_details.last_name || ''}`.trim()
      : 'Anonymous';
    const customer_email = customer_details?.email || null;
    const customer_phone = customer_details?.phone || null;
    
    console.log('Extracted customer details:', {
      name: customer_name,
      email: customer_email,
      phone: customer_phone
    });
    
    // Generate unique transaction code jika order_id kosong
    const transaction_code = order_id || `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Tentukan tanggal kedaluwarsa jika tidak disediakan
    const expiry_date = payment_expiry || new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 jam dari sekarang
    
    const insertQuery = `INSERT INTO transactions 
      (transaction_code, customer_name, customer_phone, customer_email, payment_status, 
       payment_method, total_amount, midtrans_transaction_id, transaction_type,
       payment_token, payment_url, payment_expiry) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const insertParams = [
      transaction_code, 
      customer_name || 'Anonymous', 
      customer_phone || '08123456789', // nilai default jika kosong
      customer_email || 'anonymous@example.com', // nilai default jika kosong
      'pending', 
      payment_type || 'midtrans', 
      gross_amount || 0, 
      order_id || transaction_code, 
      'product',
      payment_token || null,
      payment_url || null,
      expiry_date
    ];
    
    console.log('Executing query:', insertQuery);
    console.log('Query parameters:', insertParams);
    
    // Simpan data transaksi ke database
    const [result] = await pool.query(insertQuery, insertParams);
    const transactionId = result.insertId;
    
    console.log('Transaction saved successfully. Transaction ID:', transactionId);
    
    // Simpan item transaksi jika tersedia
    if (item_details && Array.isArray(item_details) && item_details.length > 0) {
      await saveTransactionItems(transactionId, item_details);
    }

    // Kirim notifikasi WhatsApp untuk order pending
    if (customer_phone) {
      try {
        // Format harga
        const formattedAmount = new Intl.NumberFormat('id-ID', {
          style: 'currency',
          currency: 'IDR'
        }).format(gross_amount);

        // Siapkan pesan WhatsApp
        const message = `*DIGIPRO - Pesanan Berhasil Dibuat*\n\n`+
          `Halo *${customer_name}*,\n`+
          `Terima kasih telah melakukan pemesanan di DIGIPRO.\n\n`+
          `*Detail Pesanan:*\n`+
          `No. Transaksi: *${transaction_code}*\n`+
          `Total Pembayaran: *${formattedAmount}*\n\n`+
          `Silakan selesaikan pembayaran sebelum:\n`+
          `${new Date(expiry_date).toLocaleDateString('id-ID', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}\n\n`+
          `Link Pembayaran:\n${payment_url}\n\n`+
          `Jika sudah melakukan pembayaran, kami akan memberitahukan kembali melalui WhatsApp ini.\n\n`+
          `Terima kasih,\n`+
          `Tim DIGIPRO`;
        
        // Inisialisasi WhatsApp service jika perlu dan kirim pesan
        await whatsappService.initialize();
        await whatsappService.sendMessage(customer_phone, message);
      } catch (waError) {
        console.error('Error sending WhatsApp notification (order created):', waError);
        // Lanjutkan proses meski pengiriman WhatsApp gagal
      }
    }
    
    return transactionId;
  } catch (error) {
    console.error('Error saving transaction:', error);
    
    // Tambahkan lebih banyak informasi error
    if (error.code) {
      console.error('SQL Error Code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL Error Message:', error.sqlMessage);
    }
    if (error.sql) {
      console.error('SQL Query:', error.sql);
    }
    
    throw error;
  }
};

/**
 * Menyimpan item-item transaksi ke database
 */
const saveTransactionItems = async (transactionId, items) => {
  try {
    console.log(`Saving ${items.length} transaction items for transaction ID ${transactionId}`);
    
    for (const item of items) {
      // Ekstrak data item
      const productId = item.id;
      const itemName = item.name;
      const itemPrice = item.price;
      const quantity = item.quantity || 1;
      const subtotal = itemPrice * quantity;
      const storeId = item.store_id; // Ambil store_id jika ada
      
      console.log('Saving transaction item:', {
        transactionId,
        productId,
        itemName,
        itemPrice,
        quantity,
        subtotal,
        storeId
      });
      
      // Jika store_id tidak ada dalam item, coba ambil dari database berdasarkan product_id
      let finalStoreId = storeId;
      if (!finalStoreId && productId) {
        try {
          const [productResult] = await pool.query(
            'SELECT store_id FROM products WHERE id = ?',
            [productId]
          );
          
          if (productResult && productResult.length > 0 && productResult[0].store_id) {
            finalStoreId = productResult[0].store_id;
            console.log(`Found store_id ${finalStoreId} for product ${productId} from database`);
          }
        } catch (storeIdError) {
          console.error('Error getting store_id from database:', storeIdError);
        }
      }
      
      // Simpan item transaksi ke database
      const insertQuery = `INSERT INTO transaction_items 
        (transaction_id, product_id, store_id, item_name, item_price, quantity, subtotal, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      
      const insertParams = [
        transactionId,
        productId,
        finalStoreId || null,
        itemName,
        itemPrice,
        quantity,
        subtotal,
        'pending'
      ];
      
      const [result] = await pool.query(insertQuery, insertParams);
      
      console.log(`Transaction item saved. Item ID: ${result.insertId}`);
    }
    
    console.log(`All ${items.length} transaction items saved successfully`);
    return true;
  } catch (error) {
    console.error('Error saving transaction items:', error);
    
    // Log more details about the error
    if (error.code) {
      console.error('SQL Error Code:', error.code);
    }
    if (error.sqlMessage) {
      console.error('SQL Error Message:', error.sqlMessage);
    }
    if (error.sql) {
      console.error('SQL Query:', error.sql);
    }
    
    throw error;
  }
};

/**
 * Memperbarui status transaksi di database
 */
const updateTransactionStatus = async (order_id, status, payment_data = {}) => {
  try {
    console.log(`📊 Updating transaction status for order ${order_id} to ${status}`);
    console.log('Payment data:', JSON.stringify(payment_data, null, 2));
    
    // Pemetaan status dari Midtrans ke status aplikasi
    let dbStatus = 'pending';
    const payment_method = payment_data.payment_type || null;
    const transaction_id = payment_data.transaction_id || null;
    
    // Debugging - cek nilai status yang diterima
    console.log(`🔍 Status yang diterima: "${status}"`);
    
    // Perbaikan pemetaan status ke database
    switch (status) {
      case 'capture':
      case 'settlement':
      case 'paid':  // Tambah 'paid' sebagai status yang valid
        dbStatus = 'paid';
        console.log('✅ Menetapkan status sebagai PAID');
        break;
      case 'deny':
      case 'cancel':
      case 'expire':
      case 'failed':  // Tambah 'failed' sebagai status yang valid
        dbStatus = status === 'expire' ? 'expired' : 'canceled';
        console.log(`❌ Menetapkan status sebagai ${dbStatus}`);
        break;
      default:
        dbStatus = 'pending';
        console.log('⏳ Menetapkan status sebagai PENDING');
    }
    
    // Jika payment_data memiliki transaction_status, gunakan juga untuk penentuan status
    if (payment_data.transaction_status) {
      console.log(`🔍 Memeriksa transaction_status dari payment_data: "${payment_data.transaction_status}"`);
      
      if (['capture', 'settlement'].includes(payment_data.transaction_status)) {
        dbStatus = 'paid';
        console.log('✅ Mengubah status menjadi PAID berdasarkan transaction_status');
      } else if (['deny', 'cancel', 'expire'].includes(payment_data.transaction_status)) {
        dbStatus = payment_data.transaction_status === 'expire' ? 'expired' : 'canceled';
        console.log(`❌ Mengubah status menjadi ${dbStatus} berdasarkan transaction_status`);
      }
    }
    
    // Periksa status transaksi saat ini di database sebelum update
    const [currentStatus] = await pool.query(
      'SELECT payment_status FROM transactions WHERE transaction_code = ? OR midtrans_transaction_id = ? LIMIT 1',
      [order_id, order_id]
    );
    
    if (currentStatus.length > 0) {
      console.log(`📝 Status transaksi saat ini di database: ${currentStatus[0].payment_status}`);
      
      // Jika status saat ini paid dan status baru adalah pending, jangan ubah
      if (currentStatus[0].payment_status === 'paid' && dbStatus === 'pending') {
        console.log('⚠️ Transaksi sudah berstatus PAID, tidak mengubah ke PENDING');
        dbStatus = 'paid'; // Tetap gunakan status paid
      }
    }
    
    // Update status transaksi di database
    const updateQuery = `
      UPDATE transactions
      SET payment_status = ?, payment_method = ?, midtrans_transaction_id = ?
      WHERE transaction_code = ? OR midtrans_transaction_id = ?
    `;
    
    const [updateResult] = await pool.query(
      updateQuery,
      [dbStatus, payment_method, transaction_id, order_id, order_id]
    );
    
    console.log(`📝 Transaction status updated: ${updateResult.affectedRows} rows affected`);
    console.log(`📝 Transaksi ${order_id} diupdate ke status: ${dbStatus}`);

    // Verifikasi hasil update
    if (updateResult.affectedRows > 0) {
      const [verifyUpdate] = await pool.query(
        'SELECT payment_status FROM transactions WHERE transaction_code = ? OR midtrans_transaction_id = ? LIMIT 1',
        [order_id, order_id]
      );
      
      if (verifyUpdate.length > 0) {
        console.log(`✅ Verifikasi: Status transaksi sekarang adalah ${verifyUpdate[0].payment_status}`);
      }
    }

    // Kirim invoice jika status sekarang adalah 'paid'
    if (dbStatus === 'paid' && updateResult.affectedRows > 0) {
      try {
        console.log('💰 Status pembayaran PAID: Memulai proses pembuatan invoice dan notifikasi WhatsApp...');
        
        // Get transaction details for WhatsApp notification
        const [transactionResult] = await pool.query(
          `SELECT t.*, i.product_id, p.name as product_name 
           FROM transactions t 
           LEFT JOIN transaction_items i ON t.id = i.transaction_id 
           LEFT JOIN products p ON i.product_id = p.id
           WHERE t.transaction_code = ? OR t.midtrans_transaction_id = ?
           LIMIT 1`,
          [order_id, order_id]
        );
        
        if (transactionResult.length === 0) {
          console.error(`❌ Transaksi dengan ID ${order_id} tidak ditemukan di database`);
      return {
            success: updateResult.affectedRows > 0,
            payment_status: dbStatus,
        payment_type: payment_method,
            transaction_id: transaction_id,
            error: 'Transaction not found in database'
          };
        }
        
        const transaction = transactionResult[0];
        console.log(`📄 Detail transaksi yang ditemukan: ID=${transaction.id}, Code=${transaction.transaction_code}`);
        
        try {
          // Generate invoice
          console.log(`📄 Generating invoice for transaction ID: ${transaction.id}`);
          const invoicePath = await createAndSaveInvoice(transaction.id);
          console.log(`📄 Invoice generated: ${invoicePath}`);
          
          // Send WhatsApp notification with invoice
          if (transaction.customer_phone) {
            console.log(`📱 Mengirim notifikasi WhatsApp ke: ${transaction.customer_phone}`);
            
            try {
              // Format harga
              const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR'
              }).format(transaction.total_amount);
              
              // Path lengkap file invoice
              const absoluteInvoicePath = path.join(__dirname, '../..', invoicePath);
              console.log(`📄 Path absolut invoice: ${absoluteInvoicePath}`);
              
              // Cek keberadaan file invoice
              if (!fs.existsSync(absoluteInvoicePath)) {
                console.error(`❌ File invoice tidak ditemukan di: ${absoluteInvoicePath}`);
              } else {
                console.log(`✅ File invoice ditemukan: ${absoluteInvoicePath}`);
              }
              
              // Siapkan pesan WhatsApp
              const message = `*DIGIPRO - Pembayaran Berhasil*\n\n`+
                `Halo *${transaction.customer_name}*,\n`+
                `Pembayaran Anda telah kami terima.\n\n`+
                `*Detail Pembayaran:*\n`+
                `No. Transaksi: *${transaction.transaction_code}*\n`+
                `Total: *${formattedAmount}*\n`+
                `Metode: *${transaction.payment_method}*\n`+
                `Status: *LUNAS*\n\n`+
                `Invoice telah kami lampirkan di pesan ini.\n\n`+
                `Terima kasih telah berbelanja di DIGIPRO.\n\n`+
                `Salam,\n`+
                `Tim DIGIPRO`;
              
              // Kirim pesan
              console.log(`📱 Menginisialisasi layanan WhatsApp...`);
              await whatsappService.initialize();
              
              console.log(`📱 Mengirim pesan WhatsApp...`);
              await whatsappService.sendMessage(transaction.customer_phone, message);
              console.log(`✅ Pesan WhatsApp terkirim ke ${transaction.customer_phone}`);
              
              // Kirim file PDF invoice setelah pesan terkirim
              console.log(`📱 Mengirim file invoice PDF via WhatsApp...`);
              setTimeout(async () => {
                try {
                  await whatsappService.sendPdf(
                    transaction.customer_phone, 
                    absoluteInvoicePath, 
                    `Invoice #${transaction.transaction_code}`
                  );
                  console.log(`✅ File PDF berhasil dikirim ke ${transaction.customer_phone}`);
                } catch (pdfError) {
                  console.error(`❌ Error mengirim file PDF:`, pdfError);
                }
              }, 1500); // Tambah delay ke 1.5 detik untuk memastikan pesan teks terkirim dahulu
            } catch (waError) {
              console.error('❌ Error sending WhatsApp notification (payment success):', waError);
              // Lanjutkan proses meski pengiriman WhatsApp gagal
            }
          } else {
            console.log(`⚠️ Tidak ada nomor telepon untuk mengirim notifikasi WhatsApp`);
          }
        } catch (processError) {
          console.error('❌ Error processing invoice or WhatsApp notification:', processError);
        }
      } catch (dbError) {
        console.error('❌ Error fetching transaction from database:', dbError);
      }
    }
    
    // Jika status diperlukan untuk verifikasi, ambil dari database
    if (dbStatus === 'paid' && updateResult.affectedRows > 0) {
      // Verifikasi data transaksi setelah update berhasil
    const [verifyUpdate] = await pool.query(
        'SELECT payment_status, payment_method FROM transactions WHERE transaction_code = ? OR midtrans_transaction_id = ? LIMIT 1',
        [order_id, order_id]
    );
    
      if (verifyUpdate.length === 0) {
        throw new Error(`Cannot verify transaction ${order_id} after update`);
      }
      
      return {
        success: true,
        payment_status: verifyUpdate[0].payment_status,
        payment_type: verifyUpdate[0].payment_method,
        transaction_id: transaction_id
      };
    }
    
    return {
      success: updateResult.affectedRows > 0,
      payment_status: dbStatus,
      payment_type: payment_method,
      transaction_id: transaction_id
    };
  } catch (error) {
    console.error('❌ ERROR updating transaction status:', error);
    
    // Log SQL error details if available
    if (error.code) console.error('SQL Error Code:', error.code);
    if (error.sqlState) console.error('SQL State:', error.sqlState);
    if (error.sqlMessage) console.error('SQL Message:', error.sqlMessage);
    if (error.sql) console.error('SQL Query:', error.sql);
    
    throw error;
  }
};

/**
 * Membuat invoice PDF untuk transaksi
 */
const generateInvoicePDF = async (transactionData) => {
  const { 
    transaction_id, 
    transaction_code, 
    customer_name, 
    payment_method, 
    total_amount, 
    payment_status,
    created_at,
    customer_phone, // Tambahkan customer_phone
    items = []
  } = transactionData;
  
  // Path tempat menyimpan invoice
  const invoiceDir = path.join(__dirname, '../../public/invoices');
  
  // Pastikan direktori invoice ada
  if (!fs.existsSync(invoiceDir)) {
    fs.mkdirSync(invoiceDir, { recursive: true });
  }
  
  // Buat nama file invoice unik
  const invoiceFileName = `invoice-${transaction_code}-${Date.now()}.pdf`;
  const invoiceFilePath = path.join(invoiceDir, invoiceFileName);
  
  // Path untuk logo
  const logoPath = path.join(__dirname, '../../public/stores/digipro-official.png');
  
  // Buat dokumen PDF
  return new Promise(async (resolve, reject) => {
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
      
      // Generate QR Code untuk appointment scanning
      try {
        console.log(`📱 Generating QR code for transaction: ${transaction_code}`);
        
        // Generate QR code sebagai buffer
        const qrCodeBuffer = await QRCode.toBuffer(transaction_code, {
          type: 'png',
          width: 80,
          margin: 1,
          color: {
            dark: '#4338CA',
            light: '#FFFFFF'
          }
        });
        
        // Posisi QR code di pojok kanan bawah (digeser sedikit ke atas agar aman)
        const qrX = 470; // 80px dari kanan (550 - 80)
        const qrY = doc.page.height - 160; // 160px dari bawah (lebih tinggi agar tidak mentok bawah)
        
        // Tambahkan background putih untuk QR code
        doc.roundedRect(qrX - 5, qrY - 5, 90, 90, 3)
           .fillAndStroke('#FFFFFF', '#4338CA');
        
        // Tambahkan QR code ke PDF
        doc.image(qrCodeBuffer, qrX, qrY, {
          fit: [80, 80]
        });
        
        // Tambahkan label di bawah QR code
        doc.fontSize(8)
           .fillColor('#4338CA')
           .text('Scan untuk Appointment', qrX - 10, qrY + 90, { 
             width: 100, 
             align: 'center' 
           });
        
        console.log(`✅ QR code added to invoice PDF`);
        
      } catch (qrError) {
        console.error('❌ Error generating QR code for invoice:', qrError);
        // Jika QR code gagal, lanjutkan tanpa QR code
      }
      
      // Finalisasi dokumen
      doc.end();
      
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      reject(error);
    }
  });
};

/**
 * Mengambil item transaksi dari database
 */
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

/**
 * Mengupdate invoice_url di database
 */
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

/**
 * Membuat dan menyimpan invoice untuk transaksi
 */
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
      customer_phone: transaction.customer_phone, // Tambahkan nomor telepon pelanggan
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
      
      // Verifikasi file fisik
      const absolutePath = path.join(__dirname, '../..', invoiceUrl);
      if (fs.existsSync(absolutePath)) {
        const fileStats = fs.statSync(absolutePath);
        console.log(`📄 File invoice ukuran: ${fileStats.size} bytes`);
        
        if (fileStats.size === 0) {
          console.error(`⚠️ Warning: File invoice ada tetapi kosong (0 bytes)`);
        }
    } else {
        console.error(`⚠️ Warning: File invoice tidak ditemukan di lokasi fisik: ${absolutePath}`);
      }
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

/**
 * Generate token untuk pembayaran dengan Midtrans Snap
 */
exports.generateSnapToken = async (req, res) => {
  try {
    console.log('Generating Snap token with data:', JSON.stringify(req.body));
    
    // Validasi parameter yang dibutuhkan
    const { 
      order_id, 
      gross_amount, 
      customer_details, 
      item_details,
      callbacks
    } = req.body;
    
    if (!order_id || !gross_amount) {
      return res.status(400).json({
        status: 'error',
        message: 'Parameter order_id dan gross_amount wajib diisi'
      });
    }
    
    // Periksa apakah ada item yang perlu diverifikasi harga promonya
    let finalItems = [...(item_details || [])];
    let finalGrossAmount = parseInt(gross_amount);
    
    // Proses item_details untuk memeriksa harga promo jika ada
    if (item_details && Array.isArray(item_details) && item_details.length > 0) {
      try {
        const updatedItems = [];
        let totalAmount = 0;
        
        // Proses setiap item dan periksa apakah ada harga promo
        for (const item of item_details) {
          const productId = item.id;
          
          if (productId) {
            // Ambil informasi produk dari database, termasuk harga promo jika ada
            const [productResult] = await pool.query(
              'SELECT price, promo_price FROM products WHERE id = ?',
              [productId]
            );
            
            if (productResult && productResult.length > 0) {
              const dbProduct = productResult[0];
              
              // Gunakan harga promo jika tersedia
              let finalPrice = dbProduct.price;
              if (dbProduct.promo_price !== null) {
                console.log(`Using promo price for product ${productId}: ${dbProduct.promo_price} (original: ${dbProduct.price})`);
                finalPrice = dbProduct.promo_price;
              }
              
              // Buat item baru dengan harga yang benar
              const updatedItem = {
                ...item,
                price: finalPrice,
                subtotal: finalPrice * (item.quantity || 1)
              };
              
              updatedItems.push(updatedItem);
              totalAmount += updatedItem.subtotal;
            } else {
              // Jika produk tidak ditemukan, gunakan data asli
              updatedItems.push(item);
              totalAmount += item.price * (item.quantity || 1);
            }
          } else {
            // Jika tidak ada product_id, gunakan data asli
            updatedItems.push(item);
            totalAmount += item.price * (item.quantity || 1);
          }
        }
        
        // Update nilai finalItems dan finalGrossAmount
        finalItems = updatedItems;
        finalGrossAmount = totalAmount;
        
        console.log('Updated items with correct pricing:', finalItems);
        console.log('Updated gross amount:', finalGrossAmount);
      } catch (dbError) {
        console.error('Error verifying product prices:', dbError);
        // Jika terjadi error, gunakan data asli
      }
    }
    
    // Periksa ketersediaan konfigurasi Midtrans
    if (!serverKey) {
      // Coba log semua environment variable untuk debugging (secara aman)
      console.error('Midtrans configuration is missing. Environment debugging:');
      console.error('NODE_ENV:', process.env.NODE_ENV);
      console.error('MIDTRANS_SERVER_KEY_SANDBOX:', process.env.MIDTRANS_SERVER_KEY_SANDBOX ? 'Set' : 'Not set');
      console.error('MIDTRANS_SERVER_KEY:', process.env.MIDTRANS_SERVER_KEY ? 'Set' : 'Not set');
      console.error('MIDTRANS_CLIENT_KEY_SANDBOX:', process.env.MIDTRANS_CLIENT_KEY_SANDBOX ? 'Set' : 'Not set');
      
      // Mode DEBUG: Untuk pengujian, gunakan data dummy jika tidak ada server key
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PAYMENT === 'true') {
        console.log('Running in DEBUG_PAYMENT mode, returning dummy token');
        
        // Simpan transaksi ke database jika memungkinkan
        try {
          const dummyTransaction = {
            ...req.body,
            payment_token: 'dummy-token-123',
            payment_url: 'https://example.com/dummy-payment'
          };
          await saveTransaction(dummyTransaction);
        } catch (dbErr) {
          console.error('Error saving dummy transaction:', dbErr);
        }
        
        // Kembalikan token dummy
        return res.status(200).json({
          status: 'success',
          token: 'dummy-token-123',
          redirect_url: 'https://example.com/dummy-payment',
          debug_mode: true
        });
      }
      
      // Jika bukan mode debug, kembalikan error
      return res.status(500).json({
        status: 'error',
        message: 'Konfigurasi pembayaran tidak tersedia. Silakan hubungi administrator.'
      });
    }
    
    // Buat data transaksi untuk Midtrans dengan harga yang sudah dikoreksi
    const transactionData = {
      transaction_details: {
        order_id,
        gross_amount: finalGrossAmount
      },
      credit_card: {
        secure: true
      }
    };
    
    // Tambahkan customer_details jika ada
    if (customer_details) {
      transactionData.customer_details = customer_details;
    }
    
    // Tambahkan item_details yang sudah dikoreksi jika ada
    if (finalItems.length > 0) {
      transactionData.item_details = finalItems;
    }
    
    // Tambahkan callbacks jika ada
    if (callbacks) {
      transactionData.callbacks = callbacks;
    }
    
    console.log('Sending request to Midtrans API:', JSON.stringify(transactionData));
    console.log('Midtrans API URL:', `${baseUrl}/transactions`);
    console.log('Using server key:', serverKey.substring(0, 5) + '...');
    console.log('Environment:', isSandbox ? 'SANDBOX' : 'PRODUCTION');
    
    // Persiapkan Basic Auth header
    const auth = Buffer.from(`${serverKey}:`).toString('base64');
    
    try {
      // Kirim request ke Midtrans dengan timeout yang lebih lama
      const response = await axios.post(
        `${baseUrl}/transactions`, 
        transactionData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${auth}`
          },
          timeout: 30000 // Meningkatkan timeout menjadi 30 detik
        }
      );
      
      console.log('Midtrans response status:', response.status);
      console.log('Midtrans response headers:', JSON.stringify(response.headers));
      console.log('Midtrans response data:', JSON.stringify(response.data));
      
      // Simpan transaksi ke database
      try {
        // Tambahkan informasi payment token dan url ke data transaksi
        const transactionToSave = {
          ...req.body,
          // Gunakan item_details yang sudah dikoreksi
          item_details: finalItems,
          // Gunakan gross_amount yang sudah dikoreksi
          gross_amount: finalGrossAmount,
          payment_token: response.data.token,
          payment_url: response.data.redirect_url
        };
        
        await saveTransaction(transactionToSave);
      } catch (dbError) {
        console.error('Error saving transaction to database:', dbError);
        // Lanjutkan meskipun gagal menyimpan ke database
      }
      
      // Kirim response ke client
      return res.status(200).json({
        status: 'success',
        token: response.data.token,
        redirect_url: response.data.redirect_url
      });
    } catch (apiError) {
      console.error('Error calling Midtrans API:', apiError);
      
      // Log lebih detail tentang error
      if (apiError.response) {
        console.error('Midtrans API Response Status:', apiError.response.status);
        console.error('Midtrans API Response Headers:', JSON.stringify(apiError.response.headers));
        
        // Cek apakah respons adalah HTML dan log secara aman
        if (apiError.response.headers && apiError.response.headers['content-type'] && 
            apiError.response.headers['content-type'].includes('text/html')) {
          console.error('Midtrans API Response (HTML detected, showing first 500 chars):');
          console.error(apiError.response.data.substring(0, 500) + '...');
        } else {
          console.error('Midtrans API Response Data:', 
            typeof apiError.response.data === 'string' 
              ? apiError.response.data.substring(0, 500)
              : JSON.stringify(apiError.response.data)
          );
        }
      } else if (apiError.request) {
        console.error('No response received from Midtrans API');
        console.error('Request details:', JSON.stringify(apiError.request._header || {}));
        console.error('Error code:', apiError.code);
        console.error('Error message:', apiError.message);
      } else {
        console.error('Error setting up the request:', apiError.message);
      }
      
      // Cek apakah error karena HTML response (tidak valid JSON)
      if (apiError.response && 
          apiError.response.headers && 
          apiError.response.headers['content-type'] && 
          apiError.response.headers['content-type'].includes('text/html')) {
        return res.status(503).json({
          status: 'error',
          message: 'Layanan pembayaran sedang tidak tersedia. Silakan coba lagi nanti.',
          error_type: 'service_unavailable'
        });
      }
      
      // Cek apakah error terkait dengan koneksi
      if (apiError.code === 'ECONNREFUSED' || apiError.code === 'ECONNABORTED' || apiError.code === 'ETIMEDOUT') {
        return res.status(503).json({
          status: 'error',
          message: 'Tidak dapat terhubung ke layanan pembayaran. Silakan coba lagi nanti.',
          error_type: 'connection_failed'
        });
      }
      
      // Mode DEBUG: Untuk pengujian, kembalikan token dummy jika terjadi error di development
      if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PAYMENT === 'true') {
        console.log('Running in DEBUG_PAYMENT mode after error, returning dummy token');
        
        return res.status(200).json({
          status: 'success',
          token: 'dummy-token-123',
          redirect_url: 'https://example.com/dummy-payment',
          debug_mode: true
        });
      }
      
      // Fallback error message
      return res.status(500).json({
        status: 'error',
        message: 'Gagal melakukan koneksi ke layanan pembayaran',
        details: apiError.message
      });
    }
  } catch (error) {
    console.error('Unexpected error in generateSnapToken:', error);
    
    // Mode DEBUG: Untuk pengujian, kembalikan token dummy jika terjadi error di development
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_PAYMENT === 'true') {
      console.log('Running in DEBUG_PAYMENT mode after unexpected error, returning dummy token');
      
      return res.status(200).json({
        status: 'success',
        token: 'dummy-token-123',
        redirect_url: 'https://example.com/dummy-payment',
        debug_mode: true
      });
    }
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memproses permintaan pembayaran',
      details: error.message
    });
  }
};

/**
 * Menerima notification dari Midtrans
 */
exports.handleNotification = async (req, res) => {
  try {
    console.log('\n========= MIDTRANS NOTIFICATION RECEIVED =========');
    
    // Ambil data notifikasi dari request body
    const notification = req.body;
    
    // Log notifikasi untuk debugging
    console.log('Notification data:', JSON.stringify(notification, null, 2));
    
    // Validasi notifikasi
    if (!notification || !notification.transaction_id) {
      console.error('⚠️ Invalid notification data received');
      return res.status(400).json({
        success: false,
        message: 'Invalid notification data'
      });
    }
    
    // Simpan notifikasi untuk debugging dan audit
    await logWebhookNotification(notification);
    
    // Ambil order_id dan status dari notifikasi
    const { 
      order_id,
      transaction_id,
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount,
      signature_key
    } = notification;
    
    console.log(`🔔 Notification for order_id: ${order_id}`);
    console.log(`🔔 Transaction ID: ${transaction_id}`);
    console.log(`🔔 Transaction Status: ${transaction_status}`);
    console.log(`🔔 Fraud Status: ${fraud_status}`);
    console.log(`🔔 Payment Type: ${payment_type}`);
    
    // Validasi signature jika ada
    if (signature_key) {
      // ToDo: implement signature validation here
    }
    
    // Konversi status transaksi Midtrans ke status internal (PERBAIKAN)
    let paymentStatus;
    
    // Perbaikan: logic penentuan status yang lebih jelas
    if (fraud_status === 'deny') {
      console.log('❌ Fraud detected - setting status to FAILED');
      paymentStatus = 'failed';
    } 
    // Perbaikan: periksa settlement dan capture lebih dulu karena ini adalah status sukses
    else if (['capture', 'settlement'].includes(transaction_status)) {
      console.log('✅ Payment successful - setting status to PAID');
      paymentStatus = 'paid';  // Ini adalah status sukses
    } 
    else if (['deny', 'cancel', 'expire'].includes(transaction_status)) {
      console.log('❌ Payment failed - setting status to FAILED');
      paymentStatus = 'failed';
    } 
    else {
      console.log('⏳ Payment pending - setting status to PENDING');
      paymentStatus = 'pending';
    }
    
    console.log(`📊 Updating transaction status: ${order_id} → ${paymentStatus}`);
    
    try {
      // Pemeriksaan status transaksi saat ini di database
      const [currentTrx] = await pool.query(
        `SELECT id, payment_status, transaction_code FROM transactions 
         WHERE transaction_code = ? OR midtrans_transaction_id = ? LIMIT 1`,
        [order_id, order_id]
      );
      
      if (currentTrx.length > 0) {
        console.log(`📊 Status transaksi saat ini: ${currentTrx[0].payment_status}`);
        
        // Jika status saat ini sudah 'paid', jangan mengubah kecuali untuk kasus fraud
        if (currentTrx[0].payment_status === 'paid' && paymentStatus !== 'failed' && fraud_status !== 'deny') {
          console.log('⚠️ Transaksi sudah PAID, mengabaikan update ke status lain');
          
          return res.status(200).json({
            success: true,
            message: 'Transaction already paid, notification acknowledged',
            data: {
              order_id,
              status: 'paid',
              message: 'Transaction already marked as paid'
            }
          });
        }
      } else {
        console.log(`❌ Tidak menemukan transaksi untuk order_id: ${order_id}`);
    }
    
    // Update status transaksi di database
    const updateResult = await updateTransactionStatus(order_id, paymentStatus, notification);
    
      if (!updateResult || !updateResult.success) {
        console.error(`❌ Failed to update transaction status for ${order_id}`);
    } else {
        console.log(`✅ Transaction status updated successfully to ${paymentStatus}`);
      
        // Jika status pembayaran adalah 'paid', pastikan invoice dibuat
      if (paymentStatus === 'paid') {
        try {
          // Dapatkan ID transaksi dari database
            console.log(`🔍 Mencari ID transaksi untuk order_id: ${order_id}`);
          const [transactionData] = await pool.query(
              'SELECT id, transaction_code, customer_phone FROM transactions WHERE transaction_code = ? OR midtrans_transaction_id = ? LIMIT 1',
              [order_id, order_id]
          );
          
          if (transactionData && transactionData.length > 0) {
            const transactionId = transactionData[0].id;
              const transactionCode = transactionData[0].transaction_code;
              const customerPhone = transactionData[0].customer_phone;
              
              console.log(`✅ Transaction found: ID=${transactionId}, Code=${transactionCode}`);
              
              // Cek apakah invoice sudah dibuat sebelumnya
              const [invoiceCheck] = await pool.query(
                'SELECT invoice_url FROM transactions WHERE id = ? AND invoice_url IS NOT NULL',
                [transactionId]
              );
              
              let invoiceUrl = null;
              if (invoiceCheck && invoiceCheck.length > 0 && invoiceCheck[0].invoice_url) {
                console.log(`📄 Invoice sudah dibuat sebelumnya: ${invoiceCheck[0].invoice_url}`);
                invoiceUrl = invoiceCheck[0].invoice_url;
              } else {
                console.log(`📄 Creating invoice for transaction ID: ${transactionId}`);
                invoiceUrl = await createAndSaveInvoice(transactionId);
                
                if (invoiceUrl) {
                  console.log(`✅ Invoice successfully created: ${invoiceUrl}`);
                } else {
                  console.error('❌ Failed to create invoice');
                }
              }

              // Check for appointment products and generate QR code if needed
              let qrCodePath = null;
              let isAppointmentProduct = false;
              try {
                const [appointmentCheck] = await pool.query(`
                  SELECT p.id, p.name, p.is_appointment, s.id as store_id, s.name as store_name
                  FROM transaction_items ti
                  JOIN products p ON ti.product_id = p.id
                  JOIN stores s ON p.store_id = s.id
                  WHERE ti.transaction_id = ? AND p.is_appointment = 1
                  LIMIT 1
                `, [transactionId]);
                
                if (appointmentCheck && appointmentCheck.length > 0) {
                  isAppointmentProduct = true;
                  const productData = appointmentCheck[0];
                  
                  console.log(`🎫 Generating QR code for appointment product: ${productData.name}`);
                  
                  // Prepare QR data
                  const qrTransactionData = {
                    customer_name: transactionData[0].customer_name || 'Customer',
                    customer_phone: customerPhone,
                    store_id: productData.store_id,
                    product_name: productData.name,
                    total_amount: transactionData[0].total_amount || 0
                  };
                  
                  // Generate QR code
                  qrCodePath = await qrService.generateAppointmentQR(transactionCode, qrTransactionData);
                  
                  if (qrCodePath) {
                    // Update transaction with QR code path
                    await pool.query(
                      'UPDATE transactions SET qr_code = ? WHERE id = ?',
                      [qrCodePath, transactionId]
                    );
                    
                    console.log(`✅ QR code generated and saved: ${qrCodePath}`);
                  }
                }
              } catch (qrError) {
                console.error('❌ Error generating QR code:', qrError);
                // Continue with webhook processing even if QR generation fails
              }

              // Send WhatsApp notification for successful payment
              if (customerPhone && invoiceUrl) {
                try {
                  console.log(`📱 Sending WhatsApp notification for successful payment to: ${customerPhone}`);
                  
                  // Format harga
                  const formattedAmount = new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR'
                  }).format(transactionData[0].total_amount || 0);

                  // Get transaction items for detailed notification
                  const transactionItems = await getTransactionItems(transactionId);
                  let itemsText = '';
                  if (transactionItems && transactionItems.length > 0) {
                    itemsText = transactionItems.map(item => 
                      `- ${item.item_name} (${item.quantity}x)`
                    ).join('\n');
                  }

                  // Siapkan pesan WhatsApp untuk pembayaran berhasil
                  let successMessage = `*DIGIPRO - Pembayaran Berhasil! 🎉*\n\n`+
                    `Halo *${transactionData[0].customer_name}*,\n`+
                    `Pembayaran Anda telah berhasil diverifikasi!\n\n`+
                    `*Detail Transaksi:*\n`+
                    `No. Transaksi: *${transactionCode}*\n`+
                    `Total Pembayaran: *${formattedAmount}*\n`+
                    `Status: *LUNAS* ✅\n\n`+
                    (itemsText ? `*Item yang dibeli:*\n${itemsText}\n\n` : '') +
                    `*Invoice/Kwitansi:*\n`+
                    `Silakan download invoice Anda melalui link berikut:\n`+
                    `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}${invoiceUrl}\n\n`;
                  
                  // Add QR code section for appointment products
                  if (isAppointmentProduct && qrCodePath) {
                    successMessage += `*🎫 KODE QR APPOINTMENT*\n`+
                      `Produk yang Anda beli memerlukan appointment.\n`+
                      `Silakan download dan simpan QR Code berikut:\n`+
                      `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}${qrCodePath}\n\n`+
                      `*PETUNJUK PENGGUNAAN:*\n`+
                      `1. Download dan simpan QR Code di smartphone Anda\n`+
                      `2. Tunjukkan QR Code saat datang ke toko/mitra\n`+
                      `3. Mitra akan melakukan scan untuk verifikasi\n`+
                      `4. QR Code hanya dapat digunakan 1x saja\n\n`;
                  }
                  
                  successMessage += `Terima kasih telah berbelanja di DIGIPRO!\n`+
                    `Jika ada pertanyaan, jangan ragu untuk menghubungi kami.\n\n`+
                    `Salam,\n`+
                    `Tim DIGIPRO`;
                  
                  // Initialize WhatsApp service and send notification
                  await whatsappService.initialize();
                  await whatsappService.sendMessage(customerPhone, successMessage);
                  
                  console.log(`✅ WhatsApp notification sent successfully to ${customerPhone}`);
                } catch (waError) {
                  console.error('❌ Error sending WhatsApp notification (payment success):', waError);
                  // Don't fail the webhook if WhatsApp fails - payment processing is more important
                }
              } else {
                if (!customerPhone) console.log('⚠️ No customer phone number found, skipping WhatsApp notification');
                if (!invoiceUrl) console.log('⚠️ No invoice URL available, skipping WhatsApp notification');
              }
            } else {
              console.error(`❌ Transaction not found for order_id: ${order_id}`);
          }
        } catch (invoiceError) {
            console.error('❌ Error creating invoice:', invoiceError);
            console.error(invoiceError.stack);
        }
      }
      }
    } catch (updateError) {
      console.error('❌ Error updating transaction status:', updateError);
      console.error(updateError.stack);
    }
    
    // Selalu kembalikan HTTP 200 untuk Midtrans
    console.log('======= NOTIFICATION PROCESSING COMPLETED =======\n');
    return res.status(200).json({
      success: true,
      message: 'Notification received and processed'
    });
  } catch (error) {
    console.error('❌ ERROR processing notification:', error);
    console.error(error.stack);
    
    // Selalu kembalikan HTTP 200 untuk Midtrans meskipun terjadi error
    return res.status(200).json({
      success: false,
      message: 'Error processing notification'
    });
  }
};

/**
 * Untuk mencatat notifikasi webhook yang diterima
 */
async function logWebhookNotification(notification) {
  try {
    // Ambil data penting dari notifikasi
    const { 
      order_id, 
      transaction_status, 
      payment_type,
      gross_amount,
      signature_key
    } = notification;
    
    if (!order_id) {
      console.error('Cannot log webhook: Missing order_id');
      return false;
    }
    
    try {
      // Periksa apakah tabel webhook_logs ada
      await pool.query('SHOW TABLES LIKE "webhook_logs"');
      
    // Masukkan ke tabel webhook_logs
    await pool.query(
      `INSERT INTO webhook_logs 
         (order_id, transaction_status, payment_type, amount, raw_notification) 
         VALUES (?, ?, ?, ?, ?)`,
      [
        order_id,
        transaction_status || 'unknown',
        payment_type || 'unknown',
        gross_amount || 0,
        JSON.stringify(notification)
      ]
    );
    
    console.log(`Webhook notification logged for order ID: ${order_id}`);
    } catch (tableError) {
      // Jika tabel tidak ada, coba buat tabel
      console.error('Error logging to webhook_logs table, it might not exist yet:', tableError.message);
      
      try {
        console.log('Attempting to create webhook_logs table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS webhook_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id VARCHAR(100) NOT NULL,
            transaction_status VARCHAR(50),
            payment_type VARCHAR(50),
            amount DECIMAL(15, 2),
            raw_notification TEXT,
            processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        console.log('webhook_logs table created successfully, trying to insert log again');
        
        // Coba insert lagi setelah tabel dibuat
        await pool.query(
          `INSERT INTO webhook_logs 
           (order_id, transaction_status, payment_type, amount, raw_notification) 
           VALUES (?, ?, ?, ?, ?)`,
          [
            order_id,
            transaction_status || 'unknown',
            payment_type || 'unknown',
            gross_amount || 0,
            JSON.stringify(notification)
          ]
        );
        
        console.log(`Webhook notification logged for order ID: ${order_id} after creating table`);
      } catch (createError) {
        console.error('Failed to create webhook_logs table:', createError.message);
        console.log('Will continue without logging to webhook_logs');
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in webhook notification logging flow:', error);
    return false;
  }
}

/**
 * Function helper untuk memeriksa status transaksi
 */
exports.checkAndUpdateStatus = async (order_id) => {
  try {
    console.log(`\n===== CHECKING TRANSACTION STATUS: ${order_id} =====`);
    
    // Periksa apakah transaksi ada di database lokal
    const [transaction] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method, total_amount
       FROM transactions 
       WHERE transaction_code = ?`,
      [order_id]
    );
    
    if (!transaction || transaction.length === 0) {
      console.error(`Transaction not found in database: ${order_id}`);
      throw new Error(`Transaction not found: ${order_id}`);
    }
    
    const transactionData = transaction[0];
    console.log(`Transaction details for ${order_id}:`);
    console.log(`- Current status: ${transactionData.payment_status}`);
    console.log(`- Current payment method: ${transactionData.payment_method || 'unknown'}`);
    console.log(`- Amount: ${transactionData.total_amount}`);
    
    // Jika status sudah 'paid', tidak perlu cek lagi kecuali dipaksa
    if (transactionData.payment_status === 'paid') {
      console.log(`Transaction already marked as paid, skipping status check`);
      return {
        payment_status: 'paid',
        payment_type: transactionData.payment_method,
        transaction_id: transactionData.id
      };
    }
    
    // Siapkan URL Midtrans API yang benar
    // NOTE: Ini adalah perbaikan URL yang benar untuk Midtrans API
    let apiUrl = '';
    
    if (process.env.NODE_ENV === 'production') {
      apiUrl = `https://api.midtrans.com/v2/${order_id}/status`;
    } else {
      apiUrl = `https://api.sandbox.midtrans.com/v2/${order_id}/status`;
    }
    
    console.log(`Calling Midtrans API at: ${apiUrl}`);
    
    // Siapkan authorization
    const auth = `${serverKey}:`;
    const authString = Buffer.from(auth).toString('base64');
    
    try {
      // Panggil API Midtrans
    const response = await axios.get(apiUrl, {
      headers: {
        'Accept': 'application/json',
          'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      }
    });
    
      console.log('Midtrans API response received:', JSON.stringify(response.data, null, 2));
    
      // Ekstrak data respons
    const { 
      transaction_status, 
      payment_type, 
        fraud_status,
        status_code
    } = response.data;
    
      // Perbaikan: Konversi status yang konsisten dengan fungsi lain
    let paymentStatus = 'pending';
    
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
        // Jika ada fraud detection, periksa fraud_status
        if (fraud_status && fraud_status === 'deny') {
          paymentStatus = 'failed';
          console.log(`❌ Payment DENIED by fraud detection`);
        } else {
          paymentStatus = 'paid';
          console.log(`✅ Payment SUCCESSFUL - Transaction status: ${transaction_status}`);
        }
    } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
      paymentStatus = 'failed';
        console.log(`❌ Payment FAILED - Transaction status: ${transaction_status}`);
      } else if (transaction_status === 'pending') {
        paymentStatus = 'pending';
        console.log(`⏳ Payment PENDING - Transaction status: ${transaction_status}`);
    } else {
        paymentStatus = 'pending';
        console.log(`⚠️ UNKNOWN status: ${transaction_status} - defaulting to 'pending'`);
    }
    
      // Jika status saat ini sudah 'paid', jangan ubah kecuali jika status baru adalah 'failed'
      if (transactionData.payment_status === 'paid' && paymentStatus !== 'failed') {
        console.log(`⚠️ Transaction already marked as PAID. Skipping status update to: ${paymentStatus}`);
        return {
          payment_status: 'paid',
          payment_type: transactionData.payment_method || payment_type,
          transaction_id: transactionData.id
        };
      }
      
      // Update status transaksi
      console.log(`Updating status: ${transactionData.payment_status} -> ${paymentStatus}`);
    
      // Update status transaksi
      const updateResult = await updateTransactionStatus(
        order_id, 
        paymentStatus, 
        {
          payment_type: payment_type,
          transaction_status: transaction_status,
          fraud_status: fraud_status
        }
      );
      
      console.log('Update transaction result:', updateResult);
    
    console.log(`===== TRANSACTION STATUS CHECK COMPLETED =====\n`);
    
    return {
      payment_status: paymentStatus,
        payment_type: payment_type,
        transaction_id: transactionData.id
    };
    } catch (apiError) {
      console.error('Error calling Midtrans API:', apiError.message);
      
      // Periksa apakah error dari respons API
      if (apiError.response) {
        console.error('API Response Status:', apiError.response.status);
        console.error('API Response Data:', JSON.stringify(apiError.response.data, null, 2));
        
        // Jika status 404, transaksi mungkin tidak ditemukan di Midtrans
        if (apiError.response.status === 404) {
          console.log(`Transaction not found in Midtrans (404). Keeping current status.`);
          return {
            payment_status: transactionData.payment_status,
            payment_type: transactionData.payment_method,
            transaction_id: transactionData.id,
            error: 'Transaction not found in Midtrans'
          };
        }
      }
      
      // Kembalikan status transaksi saat ini dari database
      console.log(`Returning current transaction status due to API error`);
      return {
        payment_status: transactionData.payment_status,
        payment_type: transactionData.payment_method,
        transaction_id: transactionData.id,
        error: apiError.message
      };
    }
  } catch (error) {
    console.error('Error in checkAndUpdateStatus:', error.message);
    throw error;
  }
};

/**
 * API endpoint untuk men-generate invoice secara manual
 */
exports.generateInvoice = async (req, res) => {
  try {
    const { transaction_id } = req.params;
    
    if (!transaction_id) {
      return res.status(400).json({
        status: 'error',
        message: 'ID transaksi diperlukan'
      });
    }
    
    // Check apakah invoice sudah ada
    const [transaction] = await pool.query(
      'SELECT invoice_url FROM transactions WHERE id = ?',
      [transaction_id]
    );
    
    // Jika invoice sudah ada, kembalikan yang ada
    if (transaction && transaction.length > 0 && transaction[0].invoice_url) {
      return res.status(200).json({
        status: 'success',
        message: 'Invoice sudah ada',
        data: {
          invoice_url: transaction[0].invoice_url
        }
      });
    }
    
    // Jika belum ada, buat invoice baru
    const invoiceUrl = await createAndSaveInvoice(transaction_id);
    
    if (!invoiceUrl) {
      return res.status(500).json({
        status: 'error',
        message: 'Gagal membuat invoice'
      });
    }
    
    return res.status(200).json({
      status: 'success',
      message: 'Invoice berhasil dibuat',
      data: {
        invoice_url: invoiceUrl
      }
    });
    
  } catch (error) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat membuat invoice',
      details: error.message
    });
  }
};

/**
 * Mengecek status transaksi dari Midtrans (Endpoint API)
 */
exports.checkTransactionStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    if (!order_id) {
      return res.status(400).json({
        status: 'error',
        message: 'order_id diperlukan'
      });
    }
    
    console.log(`API request to check transaction status for order_id: ${order_id}`);
    
    // Cek dulu data transaksi di database lokal
    const [localTransaction] = await pool.query(
      `SELECT 
        id, 
        transaction_code, 
        payment_status,
        payment_method,
        payment_token,
        payment_url,
        payment_expiry,
        created_at,
        total_amount,
        updated_at
      FROM transactions 
      WHERE transaction_code = ?`,
      [order_id]
    );
    
    let localData = null;
    if (localTransaction && localTransaction.length > 0) {
      localData = localTransaction[0];
      console.log(`Found local transaction data for order_id ${order_id}:`, JSON.stringify(localData));
    } else {
      return res.status(404).json({
        status: 'error',
        message: 'Transaksi tidak ditemukan'
      });
    }
    
    // Variabel untuk menyimpan status webhook dan callback
    let hasWebhookNotification = false;
    let hasCallbackNotification = false;
    
    // Periksa apakah tabel webhook_logs ada
    try {
    // Periksa apakah ada notifikasi webhook yang pernah diterima untuk transaksi ini
    const [webhookLogs] = await pool.query(
      `SELECT COUNT(*) as webhook_count 
       FROM webhook_logs 
       WHERE order_id = ?`,
      [order_id]
    );
    
      hasWebhookNotification = webhookLogs[0].webhook_count > 0;
    console.log(`Webhook notification status for ${order_id}: ${hasWebhookNotification ? 'Received' : 'Not received'}`);
    } catch (webhookError) {
      console.error('Error checking webhook logs:', webhookError);
      // Jika tabel tidak ada, abaikan error dan lanjutkan
      console.log('Webhook logs table might not exist yet, proceeding without webhook status check');
    }
      
    // Periksa apakah tabel payment_callbacks ada
    try {
    // Periksa apakah ada callback yang pernah diterima untuk transaksi ini
    const [callbackLogs] = await pool.query(
      `SELECT COUNT(*) as callback_count 
       FROM payment_callbacks 
       WHERE order_id = ?`,
      [order_id]
    );
    
      hasCallbackNotification = callbackLogs[0].callback_count > 0;
    console.log(`Payment callback status for ${order_id}: ${hasCallbackNotification ? 'Received' : 'Not received'}`);
    } catch (callbackError) {
      console.error('Error checking payment callbacks:', callbackError);
      // Jika tabel tidak ada, abaikan error dan lanjutkan
      console.log('Payment callbacks might not be properly set up, proceeding without callback status check');
    }
    
    try {
      // Periksa status terkini dari Midtrans
      console.log('Checking status from Midtrans API...');
      const statusData = await exports.checkAndUpdateStatus(order_id);
      
      if (statusData) {
        console.log('Status data received:', statusData);
        
        // Ambil data transaksi terbaru setelah update
        const [updatedTransaction] = await pool.query(
          `SELECT 
            id, 
            transaction_code, 
            payment_status,
            payment_method,
            payment_token,
            payment_url,
            payment_expiry,
            created_at,
            updated_at,
            total_amount
          FROM transactions 
          WHERE transaction_code = ?`,
          [order_id]
        );
        
        if (updatedTransaction && updatedTransaction.length > 0) {
          const freshData = updatedTransaction[0];
          
          // Respons dengan data terbaru
      return res.status(200).json({
            transaction_status: statusData.payment_status,
            payment_status: freshData.payment_status,
            payment_type: freshData.payment_method,
            payment_method: freshData.payment_method,
            order_id: freshData.transaction_code,
            transaction_id: freshData.id,
            payment_token: freshData.payment_token,
            payment_url: freshData.payment_url, 
            snap_token: freshData.payment_token,
            amount: freshData.total_amount,
            transaction_time: freshData.created_at,
            updated_at: freshData.updated_at,
            webhook_notified: hasWebhookNotification,
            callback_received: hasCallbackNotification
          });
        }
      }
      
      // Fallback ke data lokal jika tidak ada data terbaru
      return res.status(200).json({
        transaction_status: localData.payment_status,
        payment_status: localData.payment_status,
        payment_type: localData.payment_method,
        payment_method: localData.payment_method,
        order_id: localData.transaction_code,
        transaction_id: localData.id,
        payment_token: localData.payment_token,
            payment_url: localData.payment_url,
        snap_token: localData.payment_token,
        amount: localData.total_amount,
        transaction_time: localData.created_at,
        updated_at: localData.updated_at,
        webhook_notified: hasWebhookNotification,
        callback_received: hasCallbackNotification
      });
    } catch (error) {
      console.error('Error checking transaction status:', error);
      
      // Jika terjadi error, tetap kembalikan data lokal
        return res.status(200).json({
        transaction_status: localData.payment_status,
            payment_status: localData.payment_status,
        payment_type: localData.payment_method,
            payment_method: localData.payment_method,
        order_id: localData.transaction_code,
        transaction_id: localData.id,
        payment_token: localData.payment_token,
            payment_url: localData.payment_url,
        snap_token: localData.payment_token,
        amount: localData.total_amount,
        transaction_time: localData.created_at,
        updated_at: localData.updated_at,
        webhook_notified: hasWebhookNotification,
        callback_received: hasCallbackNotification,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in checkTransactionStatus endpoint:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memeriksa status transaksi',
      error: error.message
    });
  }
};

/**
 * Memeriksa status pembayaran dari semua transaksi pending secara manual
 * Fungsi ini dapat dipanggil melalui API endpoint
 */
exports.checkPendingTransactions = async (req, res) => {
  try {
    console.log('\n===== CHECKING PENDING TRANSACTIONS =====');
    
    // Mengambil parameter dari query URL jika ada
    const limit = req.query.limit ? parseInt(req.query.limit) : 10; 
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;
    
    // Ambil semua transaksi dengan status pending dalam rentang waktu tertentu
    const [pendingTransactions] = await pool.query(
      `SELECT id, transaction_code, payment_token, payment_url, created_at 
       FROM transactions 
       WHERE payment_status = 'pending' 
       AND created_at > DATE_SUB(NOW(), INTERVAL ? HOUR)
       ORDER BY created_at DESC
       LIMIT ?`,
      [hours, limit]
    );
    
    console.log(`Found ${pendingTransactions.length} pending transactions to check`);
    
    if (pendingTransactions.length === 0) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'Tidak ada transaksi pending yang perlu diperiksa',
        data: {
        checked: 0,
        updated: 0
      }
      });
    }
    
    let updatedCount = 0;
    let errorCount = 0;
    const results = [];
    
    // Proses setiap transaksi
    for (const transaction of pendingTransactions) {
      try {
        console.log(`\nMemeriksa transaksi: ${transaction.transaction_code}`);
        
        // Periksa status transaksi di Midtrans
        const statusResult = await exports.checkAndUpdateStatus(transaction.transaction_code);
        
        // Catat hasil pemeriksaan
        results.push({
          transaction_code: transaction.transaction_code,
          previous_status: 'pending',
          current_status: statusResult.payment_status,
          payment_method: statusResult.payment_type,
          updated: statusResult.payment_status !== 'pending'
        });
        
        if (statusResult.payment_status !== 'pending') {
          updatedCount++;
          console.log(`✅ Transaksi ${transaction.transaction_code} diperbarui ke ${statusResult.payment_status}`);
        } else {
          console.log(`ℹ️ Transaksi ${transaction.transaction_code} masih pending`);
        }
      } catch (transactionError) {
        errorCount++;
        console.error(`❌ Error memeriksa transaksi ${transaction.transaction_code}:`, transactionError.message);
        
        // Catat error
        results.push({
          transaction_code: transaction.transaction_code,
          error: transactionError.message
        });
      }
      
      // Tambahkan jeda kecil antara permintaan untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    console.log(`===== PENDING TRANSACTIONS CHECK COMPLETED =====`);
    console.log(`Diperiksa: ${pendingTransactions.length}, Diperbarui: ${updatedCount}, Error: ${errorCount}`);
    
    // Format respons
    return res.status(200).json({
      status: 'success',
      message: `Berhasil memeriksa ${pendingTransactions.length} transaksi, ${updatedCount} diperbarui`,
      data: {
      checked: pendingTransactions.length,
      updated: updatedCount,
        errors: errorCount,
        details: results
      }
    });
  } catch (error) {
    console.error('Error checking pending transactions:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memeriksa transaksi pending',
      error: error.message
    });
  }
};

/**
 * Menjalankan pengecekan status pembayaran berdasarkan token/url
 */
exports.checkByPaymentToken = async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        status: 'error',
        message: 'Payment token diperlukan'
      });
    }
    
    console.log(`Checking transaction by payment token: ${token}`);
    
    // Cari transaksi berdasarkan payment token
    const [transaction] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method
       FROM transactions
       WHERE payment_token = ? OR payment_url LIKE ?`,
      [token, `%${token}%`]
    );
    
    if (!transaction || transaction.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Transaksi tidak ditemukan dengan token tersebut'
      });
    }
    
    const transactionData = transaction[0];
    console.log(`Found transaction: ${transactionData.transaction_code}`);
    
    // Dapatkan status terbaru dari Midtrans
    try {
      const statusResult = await exports.checkAndUpdateStatus(transactionData.transaction_code);
      
      return res.status(200).json({
        status: 'success',
        message: `Status transaksi berhasil diperbarui`,
        data: {
          transaction_code: transactionData.transaction_code,
          previous_status: transactionData.payment_status,
          current_status: statusResult.payment_status,
          payment_method: statusResult.payment_type || transactionData.payment_method
        }
      });
    } catch (checkError) {
      console.error(`Error checking transaction status for ${transactionData.transaction_code}:`, checkError);
      
      return res.status(500).json({
        status: 'error',
        message: 'Gagal memeriksa status transaksi',
        data: {
          transaction_code: transactionData.transaction_code,
          payment_status: transactionData.payment_status,
          payment_method: transactionData.payment_method
        }
      });
    }
  } catch (error) {
    console.error('Error checking transaction by token:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memeriksa transaksi',
      details: error.message
    });
  }
};

/**
 * Memeriksa status transaksi secara manual berdasarkan transaction_code
 */
exports.checkManualTransaction = async (req, res) => {
  try {
    const { transaction_code } = req.params;
    
    if (!transaction_code) {
      return res.status(400).json({
        status: 'error',
        message: 'Kode transaksi diperlukan'
      });
    }
    
    console.log(`\n===== MANUAL TRANSACTION CHECK: ${transaction_code} =====`);
    
    // Periksa apakah transaksi ada di database
    const [transaction] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method, created_at, total_amount
       FROM transactions 
       WHERE transaction_code = ?`,
      [transaction_code]
    );
    
    if (!transaction || transaction.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Transaksi dengan kode ${transaction_code} tidak ditemukan`
      });
    }
    
    const transactionData = transaction[0];
    console.log(`Found transaction in database: ID ${transactionData.id}`);
    console.log(`Current status: ${transactionData.payment_status}, payment method: ${transactionData.payment_method}`);
    
    // Coba periksa status di Midtrans
    try {
      console.log(`Checking status via Midtrans API...`);
      const statusResult = await exports.checkAndUpdateStatus(transaction_code);
      
      // Periksa apakah ada perubahan
      const statusChanged = statusResult.payment_status !== transactionData.payment_status;
      const methodChanged = statusResult.payment_type !== transactionData.payment_method;
      
      if (statusChanged || methodChanged) {
        console.log(`✅ Transaction updated:`);
        console.log(`- Status: ${transactionData.payment_status} -> ${statusResult.payment_status}`);
        console.log(`- Method: ${transactionData.payment_method} -> ${statusResult.payment_type}`);
      } else {
        console.log(`ℹ️ No changes to transaction status or payment method`);
      }
      
      // Ambil data transaksi terbaru
      const [updatedTransaction] = await pool.query(
        `SELECT id, transaction_code, payment_status, payment_method, created_at, updated_at, total_amount
         FROM transactions 
         WHERE transaction_code = ?`,
        [transaction_code]
      );
      
      // Kembalikan informasi lengkap
      return res.status(200).json({
        status: 'success',
        message: statusChanged 
          ? `Status transaksi berhasil diperbarui ke: ${statusResult.payment_status}` 
          : `Status transaksi tetap: ${statusResult.payment_status}`,
        data: {
          transaction_details: updatedTransaction[0],
          previous_status: transactionData.payment_status,
          current_status: statusResult.payment_status,
          payment_method: statusResult.payment_type,
          status_changed: statusChanged,
          method_changed: methodChanged
        }
      });
    } catch (apiError) {
      console.error('❌ Error querying Midtrans API:', apiError.message);
      
      // Jika error saat memeriksa di Midtrans, kembalikan data dari database lokal
      return res.status(200).json({
        status: 'partial_success',
        message: 'Tidak dapat memeriksa status di Midtrans, mengembalikan data dari database lokal',
        data: {
          transaction_details: transactionData,
          error: apiError.message
        }
      });
    }
  } catch (error) {
    console.error('Error during manual transaction check:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memeriksa status transaksi',
      error: error.message
    });
  }
};

/**
 * Memperbarui status transaksi secara manual (hanya untuk pengujian)
 */
exports.updateTransactionStatusManual = async (req, res) => {
  try {
    const { transaction_code } = req.params;
    const { status, payment_method } = req.body;
    
    if (!transaction_code) {
      return res.status(400).json({
        status: 'error',
        message: 'Kode transaksi diperlukan'
      });
    }
    
    if (!status) {
      return res.status(400).json({
        status: 'error',
        message: 'Status transaksi diperlukan'
      });
    }
    
    console.log(`\n===== MANUAL UPDATE TRANSACTION STATUS: ${transaction_code} =====`);
    console.log(`Setting status to: ${status}, payment_method to: ${payment_method || 'unchanged'}`);
    
    // Periksa apakah transaksi ada di database
    const [transaction] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method
       FROM transactions 
       WHERE transaction_code = ?`,
      [transaction_code]
    );
    
    if (!transaction || transaction.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: `Transaksi dengan kode ${transaction_code} tidak ditemukan`
      });
    }
    
    const transactionData = transaction[0];
    console.log(`Found transaction in database: ID ${transactionData.id}`);
    console.log(`Current status: ${transactionData.payment_status}, payment method: ${transactionData.payment_method}`);
    
    // Validasi status
    const validStatuses = ['pending', 'paid', 'failed', 'canceled', 'refunded', 'expired', 'settlement', 'capture'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: `Status tidak valid. Harus salah satu dari: ${validStatuses.join(', ')}`
      });
    }
    
    // Gunakan fungsi updateTransactionStatus untuk memastikan konsistensi
    const updateResult = await updateTransactionStatus(
      transaction_code,
      status,
      {
        payment_type: payment_method || transactionData.payment_method,
        // Tambahkan data Midtrans yang sesuai untuk simulasi
        transaction_status: status === 'paid' ? 'settlement' : status
      }
    );
    
    if (!updateResult || !updateResult.success) {
      return res.status(500).json({
        status: 'error',
        message: 'Gagal memperbarui status transaksi',
        details: updateResult || {}
      });
    }
    
    console.log(`Transaction updated successfully to status: ${updateResult.payment_status}`);
    
    // Ambil data transaksi yang telah diperbarui
    const [updatedTransaction] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method, created_at, updated_at, total_amount
       FROM transactions 
       WHERE transaction_code = ?`,
      [transaction_code]
    );
    
    return res.status(200).json({
      status: 'success',
      message: `Status transaksi berhasil diperbarui ke: ${updatedTransaction[0].payment_status}`,
      data: {
        transaction_details: updatedTransaction[0],
        previous_status: transactionData.payment_status,
        previous_method: transactionData.payment_method,
        current_status: updatedTransaction[0].payment_status,
        current_method: updatedTransaction[0].payment_method
      }
    });
  } catch (error) {
    console.error('Error updating transaction status manually:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui status transaksi',
      error: error.message
    });
  }
};

/**
 * Admin endpoint untuk memperbarui semua transaksi pending sekaligus
 */
exports.updateAllPendingTransactions = async (req, res) => {
  try {
    console.log('\n===== UPDATING ALL PENDING TRANSACTIONS =====');
    
    // Ambil semua transaksi dengan status pending dalam 30 hari terakhir
    const [pendingTransactions] = await pool.query(
      `SELECT id, transaction_code, payment_status, payment_method, created_at 
       FROM transactions 
       WHERE payment_status = 'pending' 
       AND created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
       ORDER BY created_at DESC`,
      []
    );
    
    console.log(`Found ${pendingTransactions.length} pending transactions to update`);
    
    if (pendingTransactions.length === 0) {
      return res.status(200).json({ 
        status: 'success', 
        message: 'Tidak ada transaksi pending yang perlu diperbarui',
        data: {
          updated: 0,
          total: 0
        }
      });
    }
    
    let successCount = 0;
    let errorCount = 0;
    const updatedTransactions = [];
    const failedTransactions = [];
    
    // Proses setiap transaksi satu per satu
    for (const transaction of pendingTransactions) {
      try {
        console.log(`Processing transaction: ${transaction.transaction_code}`);
        
        // Panggil API Midtrans untuk memeriksa status
        // Gunakan URL yang benar berdasarkan lingkungan
        const apiUrl = process.env.NODE_ENV === 'production'
          ? `https://api.midtrans.com/v2/${transaction.transaction_code}/status`
          : `https://api.sandbox.midtrans.com/v2/${transaction.transaction_code}/status`;
        
        console.log(`Calling Midtrans API: ${apiUrl}`);
        
        // Setup header auth untuk Midtrans
        const auth = `${serverKey}:`;
        const authString = Buffer.from(auth).toString('base64');
        
        // Panggil API Midtrans
        const response = await axios.get(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Basic ${authString}`
          },
          timeout: 10000 // 10 detik timeout
        });
        
        if (!response.data) {
          throw new Error('Empty response from Midtrans API');
        }
        
        // Ambil data status transaksi dari respons Midtrans
        const { 
          transaction_status, 
          transaction_id, 
          payment_type 
        } = response.data;
        
        // Konversi status transaksi
        let paymentStatus = 'pending';
        if (transaction_status === 'capture' || transaction_status === 'settlement') {
          paymentStatus = 'paid';
        } else if (transaction_status === 'deny' || transaction_status === 'cancel' || transaction_status === 'expire') {
          paymentStatus = 'failed';
        }
        
        // Buat objek data pembayaran
        const paymentData = {
          transaction_status,
          transaction_id,
          payment_type: payment_type || 'unknown'
        };
        
        // Update status transaksi di database
        const updated = await updateTransactionStatus(
          transaction.transaction_code,
          paymentStatus,
          paymentData
        );
        
        if (updated.success) {
          successCount++;
          updatedTransactions.push({
            transaction_code: transaction.transaction_code,
            previous_status: transaction.payment_status,
            new_status: paymentStatus,
            payment_method: payment_type || transaction.payment_method
          });
          console.log(`✅ Transaction ${transaction.transaction_code} updated to ${paymentStatus}`);
        } else {
          errorCount++;
          failedTransactions.push({
            transaction_code: transaction.transaction_code,
            error: 'Failed to update in database'
          });
          console.error(`❌ Failed to update transaction ${transaction.transaction_code}`);
        }
      } catch (transactionError) {
        console.error(`Error processing transaction ${transaction.transaction_code}:`, transactionError.message);
        errorCount++;
        failedTransactions.push({
          transaction_code: transaction.transaction_code,
          error: transactionError.message
        });
      }
      
      // Tunggu sebentar antara permintaan untuk menghindari rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`===== UPDATE COMPLETED =====`);
    console.log(`Success: ${successCount}, Failed: ${errorCount}, Total: ${pendingTransactions.length}`);
    
    return res.status(200).json({
      status: 'success',
      message: `Berhasil memperbarui ${successCount} dari ${pendingTransactions.length} transaksi`,
      data: {
        total: pendingTransactions.length,
        updated: successCount,
        failed: errorCount,
        updated_transactions: updatedTransactions,
        failed_transactions: failedTransactions
      }
    });
  } catch (error) {
    console.error('Error updating all pending transactions:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan saat memperbarui transaksi pending',
      error: error.message
    });
  }
};

/**
 * Mendapatkan status transaksi dari database
 */
const getTransactionStatus = async (req, res) => {
  try {
    const { order_id } = req.params;
    
    console.log(`\n===== CHECKING TRANSACTION STATUS: ${order_id} =====`);
    
    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    // Dapatkan data transaksi dari database
    const [transactions] = await pool.query(
      `SELECT 
        id, 
        transaction_code, 
        payment_status, 
        payment_method, 
        total_amount,
        payment_token,
        payment_url,
        created_at,
        updated_at
      FROM transactions
      WHERE transaction_code = ?
      LIMIT 1`,
      [order_id]
    );
    
    if (!transactions || transactions.length === 0) {
      console.log(`Transaction not found: ${order_id}`);
      return res.status(404).json({
        success: false,
        message: `Transaction with order_id ${order_id} not found`
      });
    }
    
    const transaction = transactions[0];
    console.log(`Found transaction: ${JSON.stringify(transaction)}`);
    
    // Dapatkan data callback terakhir jika ada
    const [callbacks] = await pool.query(
      `SELECT 
        id,
        payment_type,
        transaction_status,
        amount,
        transaction_time,
        raw_response
      FROM payment_callbacks
      WHERE order_id = ?
      ORDER BY id DESC
      LIMIT 1`,
      [order_id]
    );
    
    let callbackData = null;
    if (callbacks && callbacks.length > 0) {
      callbackData = callbacks[0];
      console.log(`Found callback data: ${JSON.stringify(callbackData)}`);
    }
    
    // Kompilasi data respons
    const responseData = {
      transaction_id: transaction.id,
      order_id: transaction.transaction_code,
      payment_status: transaction.payment_status,
      payment_type: transaction.payment_method,
      payment_method: transaction.payment_method,
      amount: transaction.total_amount,
      transaction_time: transaction.created_at,
      updated_at: transaction.updated_at,
      payment_token: transaction.payment_token || '',
      payment_url: transaction.payment_url || '',
      snap_token: transaction.payment_token || '',
      webhook_notified: Boolean(callbackData),
      callback_received: Boolean(callbackData),
      status_from_webhook: Boolean(callbackData)
    };
    
    // Tambahkan data dari callback jika ada
    if (callbackData) {
      responseData.transaction_status = callbackData.transaction_status;
      responseData.payment_type = callbackData.payment_type || responseData.payment_type;
      
      // Parse raw_response jika valid JSON
      try {
        const parsedResponse = JSON.parse(callbackData.raw_response || '{}');
        responseData.additional_data = parsedResponse;
      } catch (parseError) {
        console.error('Error parsing raw_response:', parseError);
      }
    }
    
    // Check dengan Midtrans API untuk status terbaru jika status masih pending
    if (transaction.payment_status === 'pending') {
      try {
        console.log('Transaction is pending, checking with Midtrans API');
        const midtransResponse = await checkMidtransStatus(order_id);
        
        if (midtransResponse && midtransResponse.transaction_status) {
          // Update status di database jika berubah
          console.log(`Midtrans API status: ${midtransResponse.transaction_status}`);
          
          if (midtransResponse.transaction_status !== transaction.payment_status) {
            console.log(`Updating transaction status based on Midtrans API`);
            await updateTransactionStatus(order_id, midtransResponse.transaction_status, midtransResponse);
            
            // Update data respons
            responseData.transaction_status = midtransResponse.transaction_status;
            responseData.payment_type = midtransResponse.payment_type || responseData.payment_type;
            responseData.status_from_api = true;
          }
        }
      } catch (midtransError) {
        console.error('Error checking with Midtrans API:', midtransError);
        responseData.api_error = midtransError.message;
      }
    }
    
    console.log(`===== TRANSACTION STATUS CHECK COMPLETED =====\n`);
    
    return res.status(200).json({
      success: true,
      data: responseData
    });
    
  } catch (error) {
    console.error('Error getting transaction status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting transaction status',
      error: error.message
    });
  }
}; 