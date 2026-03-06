import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // 在本地开发时，如果没有配置数据库，也允许应用启动，
  // 但任何访问数据库的 API 会抛出明确错误。
  // 为了保持类型安全，这里仍然创建一个占位连接字符串检查。
  // eslint-disable-next-line no-console
  console.warn("环境变量 DATABASE_URL 未配置，数据库相关 API 将不可用。");
}

const pool =
  connectionString != null && connectionString !== ""
    ? new Pool({
        connectionString
      })
    : null;

export const db = pool ? drizzle(pool) : null;

