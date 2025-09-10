const { Auction, AuctionBid, Product, Store } = require('../models');

/**
 * Get all active auctions
 */
const getActiveAuctions = async (req, res) => {
  try {
    // Query parameters
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    // Current timestamp for comparison
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Get active auctions with highest bid and bid count
    const sql = `
      SELECT 
        a.*, 
        p.name as product_name, 
        p.poster_url as product_poster_url,
        (SELECT COUNT(*) FROM auction_bids WHERE auction_id = a.id) as bid_count,
        (SELECT MAX(bid_amount) FROM auction_bids WHERE auction_id = a.id) as highest_bid
      FROM auctions a
      JOIN products p ON a.product_id = p.id
      WHERE a.status = 'active' 
      AND a.is_verified = 1
      AND a.start_date <= ?
      AND a.end_date >= ?
      ORDER BY a.end_date ASC
      LIMIT ? OFFSET ?
    `;
    
    const values = [now, now, parseInt(limit), parseInt(offset)];
    const auctions = await Auction.query(sql, values);
    
    // Update current_price based on highest bid if available
    const updatedAuctions = auctions.map(auction => {
      // Pastikan semua properti numerik adalah nilai number, bukan string
      auction.current_price = parseFloat(auction.current_price) || 0;
      auction.start_price = parseFloat(auction.start_price) || 0;
      auction.min_bid_increment = parseFloat(auction.min_bid_increment) || 0;
      
      // Konversi highest_bid ke number
      const highestBid = parseFloat(auction.highest_bid) || 0;
      
      // Jika ada penawaran tertinggi dan lebih besar dari current_price, gunakan itu
      if (highestBid > 0 && highestBid > auction.current_price) {
        auction.current_price = highestBid;
      }
      
      // Pastikan bid_count adalah angka yang valid
      auction.bid_count = parseInt(auction.bid_count || 0);
      
      // Log untuk debugging
      console.log(`[DEBUG] Auction #${auction.id}: ${auction.product_name}`);
      console.log(`- Start price: ${auction.start_price} (${typeof auction.start_price})`);
      console.log(`- Current price: ${auction.current_price} (${typeof auction.current_price})`);
      console.log(`- Highest bid: ${highestBid}`);
      console.log(`- Bid count: ${auction.bid_count}`);
      
      return auction;
    });
    
    // Count total active auctions
    const [countResult] = await Auction.query(
      `SELECT COUNT(*) as total FROM auctions 
       WHERE status = 'active' 
       AND is_verified = 1
       AND start_date <= ?
       AND end_date >= ?`,
      [now, now]
    );
    
    const total = countResult.total || 0;
    
    console.log(`📦 Mengambil ${updatedAuctions.length} lelang aktif dari total ${total}`);
    return res.status(200).json({
      success: true,
      data: updatedAuctions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error saat mengambil lelang aktif:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get all pending auctions (scheduled but not started yet)
 */
const getPendingAuctions = async (req, res) => {
  try {
    // Query parameters
    const { limit = 10, page = 1 } = req.query;
    const offset = (page - 1) * limit;
    
    // Current timestamp for comparison
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Get pending auctions (verified but not started yet)
    const sql = `
      SELECT auctions.*, 
             products.name as product_name, 
             products.poster_url as product_poster_url,
             auctions.start_date as scheduled_start_date 
      FROM auctions 
      JOIN products ON auctions.product_id = products.id
      WHERE auctions.status = 'pending' 
      AND auctions.is_verified = 1
      AND auctions.start_date > ?
      ORDER BY auctions.start_date ASC
      LIMIT ? OFFSET ?
    `;
    
    const values = [now, parseInt(limit), parseInt(offset)];
    const auctions = await Auction.query(sql, values);
    
    // Count total pending auctions
    const [countResult] = await Auction.query(
      `SELECT COUNT(*) as total FROM auctions 
       WHERE status = 'pending' 
       AND is_verified = 1
       AND start_date > ?`,
      [now]
    );
    
    const total = countResult.total || 0;
    
    console.log(`📦 Mengambil ${auctions.length} lelang yang akan datang dari total ${total}`);
    return res.status(200).json({
      success: true,
      data: auctions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error saat mengambil lelang yang akan datang:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Get auction by ID
 */
const getAuctionById = async (req, res) => {
  try {
    const { id } = req.params;
    const auction = await Auction.findById(id);
    
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Lelang tidak ditemukan'
      });
    }
    
    // Get related product
    const product = await Product.findById(auction.product_id);
    
    // Get store (if exists)
    let store = null;
    if (auction.store_id) {
      store = await Store.findById(auction.store_id);
    }
    
    // Get product reviews
    const { ProductReview } = require('../models');
    const reviews = await ProductReview.findAll({
      where: { product_id: auction.product_id }
    });
    
    // Get recent bids (top 10 highest)
    const bids = await AuctionBid.findAll({
      where: { auction_id: id },
      orderBy: 'bid_amount',
      order: 'DESC',
      limit: 10
    });
    
    console.log(`📦 Mengambil lelang dengan ID: ${id} dan ${bids.length} penawaran terbaru`);
    return res.status(200).json({
      success: true,
      data: {
        auction,
        product,
        store,
        reviews,
        bids
      }
    });
  } catch (error) {
    console.error(`❌ Error saat mengambil lelang ID ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

/**
 * Submit a bid
 */
const submitBid = async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, bidder_name, bidder_phone, bid_amount } = req.body;
    
    // Validate required fields
    if (!bidder_name || !bidder_phone || !bid_amount) {
      return res.status(400).json({
        success: false,
        message: 'Nama, nomor telepon, dan jumlah bid diperlukan'
      });
    }
    
    // Check if auction exists and is active
    const auction = await Auction.findById(id);
    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'Lelang tidak ditemukan'
      });
    }
    
    // Check if auction is active
    const now = new Date();
    const startDate = new Date(auction.start_date);
    const endDate = new Date(auction.end_date);
    
    if (now < startDate || now > endDate || auction.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Lelang tidak aktif atau sudah berakhir'
      });
    }
    
    // Check if bid amount is valid
    const minBid = auction.current_price + auction.min_bid_increment;
    if (parseFloat(bid_amount) < minBid) {
      return res.status(400).json({
        success: false,
        message: `Penawaran minimal adalah Rp ${minBid.toLocaleString('id-ID')}`
      });
    }
    
    // Create bid
    const newBid = await AuctionBid.create({
      auction_id: id,
      user_id: user_id || null,
      bidder_name,
      bidder_phone,
      bid_amount: parseFloat(bid_amount)
    });
    
    // Update auction current price
    await Auction.update(id, {
      current_price: parseFloat(bid_amount)
    });
    
    console.log(`💰 Penawaran baru untuk lelang ID ${id}: Rp ${bid_amount.toLocaleString('id-ID')} dari ${bidder_name}`);
    return res.status(201).json({
      success: true,
      message: 'Penawaran berhasil diterima',
      data: newBid
    });
  } catch (error) {
    console.error(`❌ Error saat mengajukan penawaran:`, error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan pada server',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

module.exports = {
  getActiveAuctions,
  getPendingAuctions,
  getAuctionById,
  submitBid
}; 