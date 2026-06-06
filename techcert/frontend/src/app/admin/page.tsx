import { AdminDashboard } from "@/components/dashboard/admin-dashboard";

export const metadata = {
  title: "Agent Console — SignalForge AI",
  description: "Sign in or create an account to manage your trading agents, strategy backtests, and trade logs.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
