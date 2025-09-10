const { pool } = require('../config/database');

// Helper function to convert camelCase to snake_case for DB columns
const camelToSnakeCase = str => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

// Base model class with common CRUD operations
class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async findAll(options = {}) {
    try {
      const { where = {}, orderBy = 'id', order = 'ASC', limit, offset } = options;
      
      // Build WHERE clause
      let whereClause = '';
      const whereParams = [];
      
      if (Object.keys(where).length > 0) {
        whereClause = 'WHERE ';
        Object.entries(where).forEach(([key, value], index) => {
          const columnName = camelToSnakeCase(key);
          whereClause += `${index > 0 ? ' AND ' : ''}${columnName} = ?`;
          whereParams.push(value);
        });
      }
      
      // Build LIMIT clause
      let limitClause = '';
      if (limit) {
        limitClause = 'LIMIT ?';
        if (offset) {
          limitClause += ' OFFSET ?';
        }
      }
      
      // Build query
      const query = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        ORDER BY ${orderBy} ${order}
        ${limitClause}
      `;
      
      // Execute query
      const params = [...whereParams];
      if (limit) {
        params.push(Number(limit));
        if (offset) {
          params.push(Number(offset));
        }
      }
      
      const [rows] = await pool.execute(query, params);
      return rows;
    } catch (error) {
      console.error(`Error in findAll for ${this.tableName}:`, error);
      throw error;
    }
  }

  async findById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (error) {
      console.error(`Error in findById for ${this.tableName}:`, error);
      throw error;
    }
  }

  async findOne(options = {}) {
    try {
      const { where = {} } = options;
      
      // Build WHERE clause
      let whereClause = '';
      const whereParams = [];
      
      if (Object.keys(where).length > 0) {
        whereClause = 'WHERE ';
        Object.entries(where).forEach(([key, value], index) => {
          const columnName = camelToSnakeCase(key);
          whereClause += `${index > 0 ? ' AND ' : ''}${columnName} = ?`;
          whereParams.push(value);
        });
      }
      
      // Build query
      const query = `
        SELECT * FROM ${this.tableName}
        ${whereClause}
        LIMIT 1
      `;
      
      // Execute query
      const [rows] = await pool.execute(query, whereParams);
      return rows[0] || null;
    } catch (error) {
      console.error(`Error in findOne for ${this.tableName}:`, error);
      throw error;
    }
  }

  async create(data) {
    try {
      const columns = Object.keys(data).map(camelToSnakeCase).join(', ');
      const placeholders = Object.keys(data).map(() => '?').join(', ');
      const values = Object.values(data);
      
      const [result] = await pool.execute(
        `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`,
        values
      );
      
      return {
        id: result.insertId,
        ...data
      };
    } catch (error) {
      console.error(`Error in create for ${this.tableName}:`, error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const setClause = Object.keys(data)
        .map(key => `${camelToSnakeCase(key)} = ?`)
        .join(', ');
      
      const values = [...Object.values(data), id];
      
      const [result] = await pool.execute(
        `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`,
        values
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in update for ${this.tableName}:`, error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const [result] = await pool.execute(
        `DELETE FROM ${this.tableName} WHERE id = ?`,
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      console.error(`Error in delete for ${this.tableName}:`, error);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error(`Error in custom query for ${this.tableName}:`, error);
      throw error;
    }
  }
}

// Models
const Admin = new BaseModel('admins');
const User = new BaseModel('users');
const Store = new BaseModel('stores');
const StoreWithdrawal = new BaseModel('store_withdrawals');
const ProductCategory = new BaseModel('product_categories');
const Product = new BaseModel('products');
const ProductReview = new BaseModel('product_reviews');
const ServiceCategory = new BaseModel('service_categories');
const ServiceSubcategory = new BaseModel('service_subcategories');
const Service = new BaseModel('services');
const ServiceAddon = new BaseModel('service_addons');
const Auction = new BaseModel('auctions');
const AuctionBid = new BaseModel('auction_bids');
const Transaction = new BaseModel('transactions');
const TransactionItem = new BaseModel('transaction_items');
const Testimonial = new BaseModel('testimonials');

module.exports = {
  Admin,
  User,
  Store,
  StoreWithdrawal,
  ProductCategory,
  Product,
  ProductReview,
  ServiceCategory,
  ServiceSubcategory,
  Service,
  ServiceAddon,
  Auction,
  AuctionBid,
  Transaction,
  TransactionItem,
  Testimonial
}; 