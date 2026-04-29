import { notFound } from "next/navigation";

import { CustomerFoodDetailScreen } from "@/components/customer-food-detail-screen";
import { MOCK_FOODS } from "@/lib/customer-data";

interface DetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const food = MOCK_FOODS.find((item) => item.id === Number(id));

  if (!food) {
    notFound();
  }

  return <CustomerFoodDetailScreen food={food} />;
}
