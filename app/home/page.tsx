import { CustomerHomeScreen } from "@/components/customer-home-screen";
import { MainShell } from "@/components/main-shell";

export default function HomePage() {
  return (
    <MainShell>
      <CustomerHomeScreen />
    </MainShell>
  );
}
