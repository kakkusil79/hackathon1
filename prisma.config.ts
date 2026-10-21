import "dotenv/config";
import { defineConfig } from "prisma/config";

// CLI(migrate/studio)는 Supabase direct 연결(5432)을 사용하고,
// 앱 런타임은 src/lib/prisma.ts에서 pooler 연결(DATABASE_URL)을 사용한다.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
