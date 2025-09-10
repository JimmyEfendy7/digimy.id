const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class QRService {
  constructor() {
    // Ensure QR codes directory exists
    this.qrCodesDir = path.join(__dirname, '../../public/qrcodes');
    if (!fs.existsSync(this.qrCodesDir)) {
      fs.mkdirSync(this.qrCodesDir, { recursive: true });
    }
  }

  /**
   * Generate QR code for appointment transaction
   * @param {string} transactionCode - Transaction code
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<string>} - QR code file path
   */
  async generateAppointmentQR(transactionCode, transactionData) {
    try {
      // Create QR data payload
      const qrData = {
        type: 'appointment',
        transaction_code: transactionCode,
        customer_name: transactionData.customer_name,
        customer_phone: transactionData.customer_phone,
        store_id: transactionData.store_id,
        product_name: transactionData.product_name,
        total_amount: transactionData.total_amount,
        created_at: new Date().toISOString(),
        // Add security hash to prevent QR code forgery
        hash: crypto.createHash('sha256')
          .update(`${transactionCode}${transactionData.customer_phone}${process.env.JWT_SECRET}`)
          .digest('hex')
      };

      // Convert to JSON string for QR code
      const qrString = JSON.stringify(qrData);

      // Generate unique filename
      const filename = `appointment-${transactionCode}-${Date.now()}.png`;
      const filepath = path.join(this.qrCodesDir, filename);

      // Generate QR code as PNG image
      await QRCode.toFile(filepath, qrString, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      // Return relative path for database storage
      return `/public/qrcodes/${filename}`;

    } catch (error) {
      console.error('Error generating appointment QR code:', error);
      throw error;
    }
  }

  /**
   * Verify QR code data for appointment scanning
   * @param {string} qrDataString - QR code data string
   * @returns {Object} - Verification result
   */
  verifyAppointmentQR(qrDataString) {
    try {
      // Parse QR data
      const qrData = JSON.parse(qrDataString);

      // Validate QR data structure
      if (!qrData.type || qrData.type !== 'appointment') {
        return {
          valid: false,
          message: 'QR Code tidak valid untuk appointment'
        };
      }

      // Verify required fields
      const requiredFields = ['transaction_code', 'customer_name', 'customer_phone', 'hash'];
      for (const field of requiredFields) {
        if (!qrData[field]) {
          return {
            valid: false,
            message: 'QR Code data tidak lengkap'
          };
        }
      }

      // Verify security hash
      const expectedHash = crypto.createHash('sha256')
        .update(`${qrData.transaction_code}${qrData.customer_phone}${process.env.JWT_SECRET}`)
        .digest('hex');

      if (qrData.hash !== expectedHash) {
        return {
          valid: false,
          message: 'QR Code tidak valid atau telah dimodifikasi'
        };
      }

      return {
        valid: true,
        data: qrData,
        message: 'QR Code valid'
      };

    } catch (error) {
      console.error('Error verifying QR code:', error);
      return {
        valid: false,
        message: 'Format QR Code tidak valid'
      };
    }
  }

  /**
   * Delete QR code file
   * @param {string} qrCodePath - QR code file path
   */
  async deleteQRCode(qrCodePath) {
    try {
      if (qrCodePath && qrCodePath.startsWith('/public/qrcodes/')) {
        const fullPath = path.join(__dirname, '../..', qrCodePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
          console.log(`QR code deleted: ${qrCodePath}`);
        }
      }
    } catch (error) {
      console.error('Error deleting QR code:', error);
    }
  }
}

// Singleton instance
const qrService = new QRService();

module.exports = qrService;
