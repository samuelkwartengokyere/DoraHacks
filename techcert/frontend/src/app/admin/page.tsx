import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata = {
  title: "Agent Console — SignalForge AI",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
