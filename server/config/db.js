import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const dbHost = process.env.DB_HOST === 'localhost' ? '127.0.0.1' : (process.env.DB_HOST || '127.0.0.1');

const pool = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'learn_english_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

// Test connection helper
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(`[MySQL] Successfully connected to database: ${process.env.DB_NAME || 'learn_english_db'}`);
    connection.release();
    return true;
  } catch (err) {
    console.warn(`[MySQL Notice] Could not connect to MySQL: ${err.message}`);
    console.warn(`[MySQL Notice] Ensure MySQL is running and your .env credentials match your database.`);
    return false;
  }
}

export { pool };
export default pool;
