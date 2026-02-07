
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = await mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'erp_system',
  port: 3306
});

console.log("DB NAME:", process.env.MYSQLDATABASE);


export default db;
