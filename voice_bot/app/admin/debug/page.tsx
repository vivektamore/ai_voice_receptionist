import { debugGetAllClinicIds } from "./actions";
import DebugClient from "./DebugClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Debug Flow | Admin Console",
};

export default async function DebugPage() {
  const clinicIds = await debugGetAllClinicIds().catch(() => []);
  return <DebugClient clinics={clinicIds} />;
}
