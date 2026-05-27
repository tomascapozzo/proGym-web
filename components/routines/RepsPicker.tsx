"use client";

import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";

const REPS_OPTIONS = [
  "Fallo", "AMRAP",
  "1","2","3","4","5","6","7","8","9","10",
  "11","12","13","14","15","16","17","18","19","20",
  "21","22","23","24","25","26","27","28","29","30",
];
const RANGO_OPTIONS = ["6-8","8-10","10-12","12-15","15-20","20-25","25-30"];
const TIEMPO_OPTIONS = ["10s","20s","30s","45s","60s","90s","2min","3min"];

const TABS = [
  { label: "Reps", options: REPS_OPTIONS },
  { label: "Rango", options: RANGO_OPTIONS },
  { label: "Tiempo", options: TIEMPO_OPTIONS },
];

function detectTab(value: string): number {
  if (RANGO_OPTIONS.includes(value)) return 1;
  if (TIEMPO_OPTIONS.includes(value)) return 2;
  return 0;
}

type AnchorRect = { top: number; bottom: number; left: number; width: number };

export default function RepsPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [anchorRect, setAnchorRect] = useState<AnchorRect | null>(null);
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const computeAnchor = () => {
    if (!buttonRef.current) return null;
    const r = buttonRef.current.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, left: r.left, width: r.width };
  };

  const handleOpen = () => {
    if (disabled) return;
    const rect = computeAnchor();
    setAnchorRect(rect);
    setActiveTab(detectTab(value));
    setOpen(true);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Recompute anchor on scroll/resize while open
  useEffect(() => {
    if (!open) return;
    const update = () => setAnchorRect(computeAnchor());
    window.addEventListener("scroll", update, { capture: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const select = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  const DROPDOWN_H = 260;
  const dropdownStyle: React.CSSProperties = anchorRect
    ? {
        position: "fixed",
        left: anchorRect.left,
        width: 200,
        zIndex: 400,
        background: "var(--pg-card)",
        border: "1px solid var(--pg-border2)",
        borderRadius: 10,
        boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
        overflow: "hidden",
        ...(anchorRect.bottom + DROPDOWN_H > window.innerHeight
          ? { bottom: window.innerHeight - anchorRect.top + 4 }
          : { top: anchorRect.bottom + 4 }),
      }
    : { display: "none" };

  const dropdown = open && anchorRect ? (
    <div ref={dropdownRef} style={dropdownStyle}>
      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--pg-border)" }}>
        {TABS.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 1,
              padding: "8px 0",
              background: "none",
              border: "none",
              borderBottom: `2px solid ${activeTab === i ? "var(--pg-accent)" : "transparent"}`,
              color: activeTab === i ? "var(--pg-accent)" : "var(--pg-muted)",
              fontSize: 11,
              fontWeight: activeTab === i ? 700 : 400,
              cursor: "pointer",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Options */}
      <div style={{ maxHeight: 180, overflowY: "auto" }}>
        {TABS[activeTab].options.map((opt) => {
          const isActive = opt === value;
          const isHovered = hoveredOption === opt;
          return (
            <button
              key={opt}
              onClick={() => select(opt)}
              onMouseEnter={() => setHoveredOption(opt)}
              onMouseLeave={() => setHoveredOption(null)}
              style={{
                width: "100%",
                padding: "8px 12px",
                background: isActive
                  ? "var(--pg-accent-bg)"
                  : isHovered
                  ? "rgba(255,255,255,0.04)"
                  : "transparent",
                border: "none",
                textAlign: "left",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "var(--pg-accent)" : "var(--pg-text)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {opt}
              {isActive && (
                <span style={{ fontSize: 10, color: "var(--pg-accent)" }}>✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        disabled={disabled}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "var(--pg-surface)",
          border: `1px solid ${open ? "var(--pg-accent)" : "var(--pg-border)"}`,
          borderRadius: 7,
          color: value ? "var(--pg-text)" : "var(--pg-disabled)",
          fontSize: 12,
          cursor: disabled ? "default" : "pointer",
          whiteSpace: "nowrap",
          minWidth: 52,
          justifyContent: "space-between",
        }}
      >
        <span>{value || "—"}</span>
        <span style={{ fontSize: 9, color: "var(--pg-muted)", lineHeight: 1 }}>▾</span>
      </button>

      {typeof document !== "undefined" && dropdown
        ? ReactDOM.createPortal(dropdown, document.body)
        : null}
    </>
  );
}
