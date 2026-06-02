import { redirect } from "next/navigation";
import { getCurrentMembership } from "@/lib/auth";
import Topbar from "@/components/dashboard/Topbar";
import FormBuilderClient from "@/components/forms/FormBuilderClient";

export default async function NewFormPage() {
  const { user, membership, club } = await getCurrentMembership();
  if (!user) redirect("/auth/login");
  if (!membership || !club) redirect("/club/new");

  return (
    <>
      <Topbar title="Nuevo formulario" subtitle="Completá los datos y agregá preguntas" />
      <FormBuilderClient clubId={club.id} form={null} questions={[]} groups={[]} players={[]} distributions={[]} schedules={[]} />
    </>
  );
}
