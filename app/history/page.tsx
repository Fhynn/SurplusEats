import { CustomerHistoryScreen } from "@/components/customer-history-screen";
import { MobileDeviceFrame } from "@/components/mobile-device-frame";

export default function HistoryPage() {
  return (
    <MobileDeviceFrame backgroundClassName="bg-gray-50">
      <CustomerHistoryScreen />
    </MobileDeviceFrame>
  );
}
