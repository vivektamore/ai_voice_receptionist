import { getAllClinics, adminCheckHealth } from "./actions";
import AdminDashboardClient from "./AdminDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin Console | DentoCare",
};

export default async function AdminPage() {
  const [clinics, health] = await Promise.all([
    getAllClinics().catch(() => []),
    adminCheckHealth().catch(() => ({})),
  ]);

  const stats = {
    total: clinics.length,
    active: clinics.filter((c) => c.subscription_status === "active").length,
    trial: clinics.filter((c) => c.subscription_status === "trial").length,
    cancelling: clinics.filter((c) => c.subscription_status === "cancelling").length,
    inactive: clinics.filter((c) => ["inactive", null, ""].includes(c.subscription_status)).length,
    totalWallet: clinics.reduce((sum, c) => sum + parseFloat(c.wallet_balance || "0"), 0),
    autoRechargeEnabled: clinics.filter((c) => c.auto_recharge).length,
    mrr: clinics.filter((c) => ["active", "cancelling"].includes(c.subscription_status)).length * 499,
  };

  return <AdminDashboardClient clinics={clinics} stats={stats} health={health} />;
}
