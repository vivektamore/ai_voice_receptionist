import Sidebar from "./Sidebar";

export const metadata = {
    title: "Dashboard | AI Dental Voice",
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-background text-foreground relative selection:bg-primary/30">
            <div className="pointer-events-none fixed inset-0 z-0">
                <div className="absolute top-[-20%] left-[20%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[10%] w-[30%] h-[40%] rounded-full bg-secondary/5 blur-[120px]" />
            </div>

            <Sidebar />

            <main className="flex-1 w-full relative z-10">
                <div className="mx-auto max-w-7xl p-6 md:p-8 lg:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
