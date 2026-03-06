// 数据库配置 - 按需创建连接

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// 全局变量存储连接池（Serverless 环境复用）
declare global {
  var __dbPool: Pool | undefined;
}

// 延迟初始化连接池
export function getDb() {
  // 如果没有数据库配置，返回 null
  if (!connectionString) {
    return null;
  }

  // 复用已有连接池
  if (globalThis.__dbPool) {
    return drizzle(globalThis.__dbPool);
  }

  try {
    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

    pool.on("error", (err) => {
      console.error("[DB] Pool error:", err);
    });

    globalThis.__dbPool = pool;
    return drizzle(pool);
  } catch (error) {
    console.error("[DB] Failed to create pool:", error);
    return null;
  }
}

// 导出便捷的 db 访问
export const db = getDb();
export const isMockDb = !db;
