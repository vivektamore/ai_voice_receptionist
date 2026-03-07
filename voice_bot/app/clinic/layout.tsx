import ClinicSidebar from "./ClinicSidebar";

export const metadata = {
    title: "Clinic Portal | AI Receptionist",
};

export default function ClinicLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900 selection:bg-teal-500/20 font-sans">
            <ClinicSidebar />
            <main className="flex-1 w-full relative z-10">
                <div className="mx-auto max-w-7xl p-6 md:p-8 lg:p-10">
                    {children}
                </div>
            </main>
        </div>
    );
}
