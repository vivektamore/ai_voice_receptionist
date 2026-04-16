import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin_session");
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || session?.value !== adminKey) {
    redirect("/admin-login");
  }

  return (
    <div className="min-h-screen bg-[#09090B] text-[#e5e1e4] font-['Inter'] relative">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-15%] left-[30%] w-[40%] h-[40%] rounded-full bg-[#c0c1ff]/4 blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[30%] h-[40%] rounded-full bg-red-500/4 blur-[140px]" />
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
