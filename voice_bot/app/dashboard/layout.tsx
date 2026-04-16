import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import SubscriptionGate from "./SubscriptionGate";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: "Dashboard | AI Dental Voice",
};

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Auth guard — must be logged in
    if (!user) {
        redirect("/login");
    }

    // 2. Fetch clinic status
    const { data: clinic } = await supabase
        .from("clinics")
        .select("onboarding_step, assigned_number, subscription_status, greeting_message")
        .eq("user_id", user.id)
        .single();

    // 3. Onboarding guard — must have completed onboarding
    if (!clinic || !clinic.onboarding_step?.startsWith("completed")) {
        const step = clinic?.onboarding_step || "clinic";
        redirect(`/onboarding/${step}`);
    }

    const subscriptionStatus = clinic?.subscription_status || "inactive";

    // 4. Capability gates
    const hasNumber       = !!(clinic?.assigned_number);
    const hasSubscription = ["active", "cancelling", "trial"].includes(subscriptionStatus);
    const isCancelling    = subscriptionStatus === "cancelling";
    const isAgentSetup    = !!(clinic?.greeting_message?.trim().length > 0);
    const hasDeployed     = clinic?.onboarding_step === "completed_deployed";

    return (
        <div className="flex min-h-screen bg-[#09090B] text-[#e5e1e4] font-['Inter'] relative selection:bg-[#c0c1ff]/30 selection:text-[#1000a9]">
            {/* Background glows */}
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-[#c0c1ff]/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[40%] rounded-full bg-[#4edea3]/5 blur-[120px]" />
            </div>

            <SubscriptionGate subscriptionStatus={subscriptionStatus} />

            {/* Sidebar receives gate states for Go Live button */}
            <Sidebar 
                hasNumber={hasNumber} 
                hasSubscription={hasSubscription} 
                isCancelling={isCancelling} 
                isAgentSetup={isAgentSetup}
                serverHasDeployed={hasDeployed}
            />

            {/* Main content area */}
            <main className="flex-1 w-full relative z-10 lg:ml-64 flex flex-col">
                {children}
            </main>
        </div>
    );
}
