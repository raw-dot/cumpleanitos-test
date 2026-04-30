/**
 * shared.jsx — Módulo central de exportaciones de Cumpleanitos
 * Re-exporta componentes UI, constantes, utilidades y componentes nuevos.
 */

import { COLORS as BASE_COLORS, ALERT_TYPES, GIFT_AMOUNTS } from "./utils/constants";
import { getInitials, formatUsername, formatCurrency } from "./utils/formatters";
import { daysUntilBirthday, formatBirthday, getAge, getDaysToBirthday } from "./utils/dateHelpers";

import Button from "./components/ui/Button";
import Card from "./components/ui/Card";
import Input from "./components/ui/Input";
import Alert from "./components/ui/Alert";
import Avatar from "./components/ui/Avatar";
import Badge from "./components/ui/Badge";
import Textarea from "./components/ui/Textarea";

// ─── COLORS (extendido con colores de roles) ───────────────────────────────
export const COLORS = {
  ...BASE_COLORS,
  manager: "#F59E0B",
  celebrant: "#7C3AED",
  gifter: "#10B981",
};

// ─── ROLES (con metadata de UI) ────────────────────────────────────────────
export const ROLES = {
  celebrant: {
    label: "Cumpleañero",
    icon: "🎂",
    color: "#7C3AED",
    description: "Creá tu lista de regalos y recibí aportes de tus amigos.",
  },
  gifter: {
    label: "Regalador",
    icon: "💝",
    color: "#10B981",
    description: "Explorá perfiles y regalale algo especial a quien quieras.",
  },
  manager: {
    label: "Gestor",
    icon: "🎁",
    color: "#F59E0B",
    description: "Organizá regalos grupales para los cumpleaños de tus amigos.",
  },
};

// ─── UTILIDADES ────────────────────────────────────────────────────────────
export { getInitials, formatUsername, daysUntilBirthday, formatBirthday, getAge, getDaysToBirthday };
export { GIFT_AMOUNTS, ALERT_TYPES };

/**
 * Formatea un número como moneda argentina
 */
export function formatMoney(amount) {
  if (!amount && amount !== 0) return "$0";
  return "$" + Number(amount).toLocaleString("es-AR");
}

// ─── UI COMPONENTS (re-exportados) ────────────────────────────────────────
export { Button, Card, Input, Alert, Avatar, Badge, Textarea };

// ─── LOGO ─────────────────────────────────────────────────────────────────
export function Logo({ size = 24 }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontWeight: 900,
        fontSize: size,
        letterSpacing: -0.5,
        userSelect: "none",
      }}
    >
      <span>🎂</span>
      <span style={{ color: COLORS.primary }}>cumpleanitos</span>
    </span>
  );
}

// ─── PROGRESS BAR ──────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, max = 100, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const barColor = color || COLORS.primary;

  return (
    <div
      style={{
        background: COLORS.border,
        borderRadius: 8,
        height: 10,
        overflow: "hidden",
        margin: "12px 0",
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: "100%",
          background: `linear-gradient(90deg, #7C3AED, #F59E0B)`,
          borderRadius: 8,
          transition: "width 0.5s ease",
        }}
      />
    </div>
  );
}

// ─── MODAL ─────────────────────────────────────────────────────────────────
export function Modal({ children, onClose, title }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          padding: 28,
          maxWidth: 540,
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          {title && (
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: COLORS.text }}>
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            style={{
              background: COLORS.border,
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.textLight,
              marginLeft: "auto",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── TABS ──────────────────────────────────────────────────────────────────
export function Tabs({ tabs = [], active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        borderBottom: `2px solid ${COLORS.border}`,
        marginBottom: 24,
        overflowX: "auto",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              color: isActive ? COLORS.primary : COLORS.textLight,
              borderBottom: isActive
                ? `2px solid ${COLORS.primary}`
                : "2px solid transparent",
              marginBottom: -2,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              borderRadius: "4px 4px 0 0",
            }}
          >
            {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── STAT CARD ─────────────────────────────────────────────────────────────
export function StatCard({ icon, value, label, color }) {
  return (
    <div
      style={{
        background: COLORS.card,
        borderRadius: 14,
        padding: "20px 16px",
        border: `1px solid ${COLORS.border}`,
        textAlign: "center",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 800,
          color: color || COLORS.text,
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 12,
          color: COLORS.textLight,
          marginTop: 4,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
    </div>
  );
}
