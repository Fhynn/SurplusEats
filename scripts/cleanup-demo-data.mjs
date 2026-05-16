import "dotenv/config";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

neonConfig.webSocketConstructor = ws;

const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const deleted = {
    notifications: 0,
    walletTransactions: 0,
    vouchers: 0,
    reviews: 0,
    refunds: 0,
    orderItems: 0,
    orders: 0,
    menuItems: 0,
    restaurants: 0,
    applications: 0,
    addresses: 0,
    users: 0,
  };

  const seedRestaurant = await prisma.restaurant.findUnique({
    where: { slug: "bakehouse-bakery" },
    select: { id: true },
  });
  const seedOrders = await prisma.order.findMany({
    where: {
      OR: [
        { orderCode: "SFM-99A2X" },
        seedRestaurant ? { restaurantId: seedRestaurant.id } : undefined,
      ].filter(Boolean),
    },
    select: { id: true },
  });
  const seedOrderIds = seedOrders.map((order) => order.id);

  deleted.notifications += (
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { title: "Pesanan siap diambil" },
          { title: "Order baru masuk", body: { contains: "Paket Roti Artisan" } },
          { title: "Seed backend aktif" },
        ],
      },
    })
  ).count;

  if (seedRestaurant) {
    deleted.walletTransactions += (
      await prisma.walletTransaction.deleteMany({
        where: {
          restaurantId: seedRestaurant.id,
          reference: { in: ["SFM-99A2X", "PAYOUT-SEED-001"] },
        },
      })
    ).count;
  }

  deleted.vouchers += (
    await prisma.voucher.deleteMany({ where: { code: "ALFHIN" } })
  ).count;

  if (seedOrderIds.length > 0) {
    deleted.reviews += (
      await prisma.review.deleteMany({
        where: { orderId: { in: seedOrderIds } },
      })
    ).count;
    deleted.refunds += (
      await prisma.refundRequest.deleteMany({
        where: { orderId: { in: seedOrderIds } },
      })
    ).count;
    deleted.orderItems += (
      await prisma.orderItem.deleteMany({ where: { orderId: { in: seedOrderIds } } })
    ).count;
    deleted.orders += (
      await prisma.order.deleteMany({ where: { id: { in: seedOrderIds } } })
    ).count;
  }

  if (seedRestaurant) {
    deleted.menuItems += (
      await prisma.menuItem.deleteMany({
        where: { restaurantId: seedRestaurant.id },
      })
    ).count;
    deleted.restaurants += (
      await prisma.restaurant.deleteMany({
        where: { id: seedRestaurant.id },
      })
    ).count;
  }

  deleted.applications += (
    await prisma.restaurantApplication.deleteMany({
      where: {
        email: "owner@surpluseats.local",
        businessName: "Bakehouse Bakery",
      },
    })
  ).count;

  deleted.addresses += (
    await prisma.address.deleteMany({
      where: { id: "seed-address-customer-primary" },
    })
  ).count;

  deleted.users += (
    await prisma.user.deleteMany({
      where: {
        email: { in: ["owner@surpluseats.local", "customer@surpluseats.local"] },
      },
    })
  ).count;

  console.log("Demo data cleanup complete", deleted);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
