// 执行数据库初始化脚本
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const connectionString = "postgresql://postgres:uzl1nN6cfjjE1WyY@db.vguzkpqsmnuoiirdoped.supabase.co:5432/postgres";

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  family: 4 // 强制使用 IPv4
});

const sqlFile = path.join(__dirname, "..", "init-db.sql");
const sql = fs.readFileSync(sqlFile, "utf-8");

async function initDb() {
  const client = await pool.connect();
  try {
    console.log("🚀 开始执行数据库初始化...");
    await client.query(sql);
    console.log("✅ 数据库初始化完成！");
  } catch (error) {
    console.error("❌ 执行失败:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initDb();
