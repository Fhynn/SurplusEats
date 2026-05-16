import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient, UserRole } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";
import ws from "ws";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");

  return `scrypt:${salt}:${hash}`;
}

async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL || "admin@surpluseats.local"
  ).toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || "admin123";
  const name = process.env.SEED_ADMIN_NAME || "Admin SurplusEats";

  await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: UserRole.ADMIN,
      passwordHash: hashPassword(password),
    },
    create: {
      email,
      name,
      role: UserRole.ADMIN,
      passwordHash: hashPassword(password),
    },
  });

  console.log("Admin bootstrap ready", { email });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
