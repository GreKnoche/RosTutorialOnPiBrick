import { AdminGate } from "@/components/admin-gate";
import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return (
    <AdminGate description="Das Lektions-Studio ist nur nach Admin-Anmeldung erreichbar. Melde dich oben mit dem Admin-Konto an.">
      {children}
    </AdminGate>
  );
}