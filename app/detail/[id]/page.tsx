import { notFound } from "next/navigation";

import { CustomerFoodDetailScreen } from "@/components/customer-food-detail-screen";
import { menuItemToFood, type ApiMenuItem } from "@/lib/food-mapper";
import { prisma } from "@/lib/prisma";

interface DetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const menuItem = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      restaurant: true,
    },
  });

  if (!menuItem || menuItem.status !== "ACTIVE") {
    notFound();
  }

  const food = menuItemToFood(menuItem satisfies ApiMenuItem);

  return <CustomerFoodDetailScreen food={food} />;
}
