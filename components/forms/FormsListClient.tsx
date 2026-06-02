"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteForm } from "@/app/(dashboard)/forms/actions";
import type { ClubForm } from "@/types/forms";

type FormRow = ClubForm & { question_count: number; template_type: string | null };

const STATUS_LABEL: Record<string, string> = { draft: "Borrador", active: "Activo", archived: "Archivado" };
const STATUS_COLOR: Record<string, string> = { draft: "var(--pg-muted)", active: "var(--pg-green)", archived: "var(--pg-disabled)" };
const STATUS_BG: Record<string, string> = { draft: "var(--pg-surface)", active: "var(--pg-green-bg)", archived: "var(--pg-surface)" };

const TEMPLATE_LABEL: Record<string, string> = { anamnesis: "Anamnesis", wellness: "Wellness" };
const TEMPLATE_COLOR: Record<string, string> = { anamnesis: "var(--pg-blue)", wellness: "var(--pg-green)" };
const TEMPLATE_BG: Record<string, string> = { anamnesis: "var(--pg-blue-bg)", wellness: "var(--pg-green-bg)" };

export default function FormsListClient({ forms }: { forms: FormRow[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este formulario y todas sus respuestas?")) return;
    setDeleting(id);
    await deleteForm(id);
    setDeleting(null);
    router.refresh();
  };

  const templates = forms.filter((f) => f.template_type);
  const custom = forms.filter((f) => !f.template_type);

  return (
    <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
      {/* Templates always shown at top */}
      {templates.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 8, fontWeight: 600 }}>
            Plantillas del club
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {templates.map((f) => (
              <div
                key={f.id}
                style={{
                  background: "var(--pg-card)",
                  border: `1px solid ${f.template_type ? TEMPLATE_BG[f.template_type] : "var(--pg-border)"}`,
                  borderRadius: 10, padding: "14px 18px",
                  display: "flex", alignItems: "center", gap: 16, cursor: "pointer",
                }}
                onClick={() => router.push(`/forms/${f.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--pg-text)" }}>{f.title}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em",
                      padding: "2px 6px", borderRadius: 4,
                      color: TEMPLATE_COLOR[f.template_type!],
                      background: TEMPLATE_BG[f.template_type!],
                    }}>
                      {TEMPLATE_LABEL[f.template_type!]}
                    </span>
                  </div>
                  {f.description && (
                    <div style={{ fontSize: 11, color: "var(--pg-muted)" }}>{f.description}</div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: "var(--pg-muted)", flexShrink: 0 }}>
                  {f.question_count} pregunta{f.question_count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom forms */}
      {custom.length === 0 && templates.length > 0 ? null : custom.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60, color: "var(--pg-muted)", fontSize: 13 }}>
          No hay formularios todavía. Creá uno para empezar.
        </div>
      ) : (
        <>
          <div style={{ fontSize: 9, letterSpacing: "1.5px", textTransform: "uppercase", color: "var(--pg-muted)", marginBottom: 8, fontWeight: 600 }}>
            Formularios personalizados
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {custom.map((f) => (
            <div
              key={f.id}
              style={{
                background: "var(--pg-card)",
                border: "1px solid var(--pg-border)",
                borderRadius: 10,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                cursor: "pointer",
              }}
              onClick={() => router.push(`/forms/${f.id}`)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pg-text)", marginBottom: 3 }}>
                  {f.title}
                </div>
                {f.description && (
                  <div style={{ fontSize: 11, color: "var(--pg-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.description}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "var(--pg-muted)" }}>
                  {f.question_count} pregunta{f.question_count !== 1 ? "s" : ""}
                </span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.06em", padding: "2px 7px", borderRadius: 5,
                  color: STATUS_COLOR[f.status],
                  background: STATUS_BG[f.status],
                }}>
                  {STATUS_LABEL[f.status]}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                  disabled={deleting === f.id}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--pg-red)", fontSize: 16, padding: "0 4px",
                    opacity: deleting === f.id ? 0.4 : 1,
                  }}
                  title="Eliminar formulario"
                >
                  ×
                </button>
              </div>
            </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
