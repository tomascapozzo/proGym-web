import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import Topbar from "@/components/dashboard/Topbar";

export default async function SettingsPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Topbar title="Configuración" subtitle="Ajustes del club y la cuenta" />
      <div style={{ flex: 1, padding: "32px 28px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--pg-muted)", fontSize: 13 }}>Próximamente</p>
      </div>
    </div>
  );
}
