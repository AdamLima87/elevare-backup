import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/elevare/AppShell";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AllInspections } from "@/components/admin/AllInspections";

export const Route = createFileRoute("/historico")({
  head: () => ({
    meta: [{ title: "Histórico · Elevare" }, { name: "description", content: "Histórico de inspeções sanitárias realizadas." }],
  }),
  component: HistoricoPage,
});

function HistoricoPage() {
  return (
    <ProtectedRoute allowedProfiles={["admin", "consultor"]}>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">Histórico de Inspeções</h1>
          <p className="text-sm text-muted-foreground">Visualize e gerencie todas as inspeções realizadas.</p>
        </div>
        <AllInspections />
      </AppShell>
    </ProtectedRoute>
  );
}
