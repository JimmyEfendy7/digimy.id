// Simple alias to reuse the existing MySQL pool from config/database.js
// Some legacy controllers import this file as ../db/connection
// to call db.execute(...). This wrapper ensures backward compatibility.

const { pool } = require('../config/database');

module.exports = pool;
