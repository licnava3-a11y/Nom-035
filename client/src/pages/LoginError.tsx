import { useEffect, useState } from "react";
import { getLoginUrl } from "@/const";

const ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  missing_params: {
    title: "Parámetros de autenticación faltantes",
    description:
      "El servidor no recibió los parámetros necesarios del portal de autenticación. Esto puede ocurrir si el enlace de inicio de sesión caducó o fue interrumpido. Por favor, intenta iniciar sesión nuevamente.",
  },
  exchange_failed: {
    title: "Error al verificar tu identidad",
    description:
      "No fue posible completar la verificación con el servidor de autenticación. Esto puede deberse a un código de autorización expirado o a un problema temporal de conectividad. Por favor, intenta iniciar sesión nuevamente.",
  },
  missing_openid: {
    title: "Información de usuario incompleta",
    description:
      "El servidor de autenticación no devolvió la información de usuario esperada. Por favor, intenta iniciar sesión nuevamente. Si el problema persiste, contacta al administrador del sistema.",
  },
  default: {
    title: "Error de autenticación",
    description:
      "Ocurrió un error inesperado durante el proceso de inicio de sesión. Por favor, intenta nuevamente. Si el problema persiste, contacta al administrador del sistema.",
  },
};

export default function LoginError() {
  const [loginUrl, setLoginUrl] = useState("#");
  const [reason, setReason] = useState("default");

  useEffect(() => {
    // Get the error reason from the URL query params
    const params = new URLSearchParams(window.location.search);
    const r = params.get("reason") || "default";
    setReason(r in ERROR_MESSAGES ? r : "default");

    // Build the login URL
    try {
      setLoginUrl(getLoginUrl("/"));
    } catch {
      setLoginUrl("#");
    }
  }, []);

  const { title, description } =
    ERROR_MESSAGES[reason] || ERROR_MESSAGES.default;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#f8fafc",
        fontFamily: "'Inter', system-ui, sans-serif",
        padding: "24px",
      }}
    >
      {/* Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(15,23,42,0.10)",
          padding: "40px 36px",
          maxWidth: "480px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#fef2f2",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#0f172a",
            marginBottom: "12px",
            lineHeight: "1.3",
          }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          style={{
            fontSize: "14px",
            color: "#64748b",
            lineHeight: "1.6",
            marginBottom: "28px",
          }}
        >
          {description}
        </p>

        {/* Retry button */}
        <a
          href={loginUrl}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            background: "#22c55e",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "600",
            padding: "13px 32px",
            borderRadius: "10px",
            textDecoration: "none",
            boxShadow: "0 2px 12px rgba(34,197,94,0.3)",
            width: "100%",
            marginBottom: "12px",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          Intentar iniciar sesión nuevamente
        </a>

        {/* Back to home */}
        <a
          href="/"
          style={{
            display: "inline-block",
            fontSize: "13px",
            color: "#94a3b8",
            textDecoration: "none",
          }}
        >
          ← Volver al inicio
        </a>
      </div>

      {/* Error code */}
      <p
        style={{
          marginTop: "20px",
          fontSize: "11px",
          color: "#cbd5e1",
        }}
      >
        Código de error: {reason} · NOM-035-STPS-2018
      </p>
    </div>
  );
}
