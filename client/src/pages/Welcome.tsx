import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";

const modules = [
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="9"
          cy="7"
          r="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Gestión de Empleados",
    desc: "Expedientes digitales, RFC/NSS, cédula profesional y estructura organizacional.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <path
          d="M22 10v6M2 10l10-5 10 5-10 5z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 12v5c3 3 9 3 12 0v-5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Capacitación y Desarrollo",
    desc: "Planes anuales, programas de capacitación, seguimiento de avances y certificaciones.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Encuestas NOM-035",
    desc: "Aplicación de cuestionarios de factores de riesgo psicosocial y clima organizacional.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <path d="M3 3v18h18" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d="M18 9l-5 5-4-4-3 3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Reportes y KPIs",
    desc: "Mapa de calor por departamento, semáforo NOM-035, reportes ejecutivos y dictámenes.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <rect
          x="2"
          y="7"
          width="20"
          height="14"
          rx="2"
          ry="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Cumplimiento Normativo",
    desc: "Dictámenes legales, checklist NOM-035, comité de bienestar y actas de sesión.",
  },
  {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="w-6 h-6"
      >
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    title: "Buzón Interno",
    desc: "Canal confidencial para reportes de riesgo psicosocial y seguimiento de casos.",
  },
];

export default function Welcome() {
  const [loginUrl, setLoginUrl] = useState("#");

  useEffect(() => {
    try {
      setLoginUrl(getLoginUrl());
    } catch {
      // getLoginUrl puede fallar si las env vars no están disponibles
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo + Nombre */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex-shrink-0">
              <svg
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <rect width="32" height="32" rx="6" fill="#0f172a" />
                <polygon
                  points="16,22 24,18 16,14 8,18"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="16,18 24,14 16,10 8,14"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="16,14 24,10 16,6 8,10"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold text-white leading-tight">
                NOM-035 STPS 2018
              </div>
              <div className="text-xs text-slate-400 leading-tight">
                Plataforma de Gestión
              </div>
            </div>
          </div>

          {/* Botón de login */}
          <a
            href={loginUrl}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <path
                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="10 17 15 12 10 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="15"
                y1="12"
                x2="3"
                y2="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Iniciar sesión
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
          Plataforma certificada NOM-035-STPS-2018
        </div>

        {/* Título principal */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 max-w-3xl leading-tight">
          Gestión Integral de{" "}
          <span className="text-green-400">Riesgos Psicosociales</span>
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mb-10 leading-relaxed">
          Plataforma todo-en-uno para cumplir con la NOM-035 STPS 2018.
          Administra empleados, aplica encuestas, genera reportes ejecutivos y
          mantén el cumplimiento normativo de tu organización desde un solo
          lugar.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 justify-center">
          <a
            href={loginUrl}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors shadow-lg shadow-green-500/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="10 17 15 12 10 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="15"
                y1="12"
                x2="3"
                y2="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Iniciar sesión
          </a>
          <a
            href="#modules"
            className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-slate-300 hover:text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors"
          >
            Ver módulos
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-4 h-4"
            >
              <polyline
                points="6 9 12 15 18 9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg w-full">
          {[
            { value: "NOM-035", label: "STPS 2018" },
            { value: "12+", label: "Módulos integrados" },
            { value: "100%", label: "Cumplimiento normativo" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stat.value}
              </div>
              <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Módulos */}
      <section
        id="modules"
        className="px-6 py-16 bg-slate-800/30 border-t border-white/5"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-white mb-3">
              Módulos de la plataforma
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Todo lo que necesitas para gestionar el cumplimiento de la NOM-035
              en tu organización.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map(mod => (
              <div
                key={mod.title}
                className="bg-slate-800/60 border border-white/10 rounded-xl p-5 flex gap-4 items-start hover:border-green-500/30 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-500/10 text-green-400 flex items-center justify-center">
                  {mod.icon}
                </div>
                <div>
                  <div className="font-semibold text-white text-sm mb-1">
                    {mod.title}
                  </div>
                  <div className="text-slate-400 text-xs leading-relaxed">
                    {mod.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-14 text-center border-t border-white/5">
        <div className="max-w-xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-3">
            ¿Listo para comenzar?
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            Inicia sesión con tu cuenta institucional para acceder a todos los
            módulos de la plataforma.
          </p>
          <a
            href={loginUrl}
            className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-8 py-3 rounded-xl text-base transition-colors shadow-lg shadow-green-500/20"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="w-5 h-5"
            >
              <path
                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points="10 17 15 12 10 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1="15"
                y1="12"
                x2="3"
                y2="12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Iniciar sesión
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5">
              <svg
                viewBox="0 0 32 32"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
              >
                <rect width="32" height="32" rx="6" fill="#0f172a" />
                <polygon
                  points="16,22 24,18 16,14 8,18"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="16,18 24,14 16,10 8,14"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <polygon
                  points="16,14 24,10 16,6 8,10"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <span>Plataforma NOM-035 STPS 2018</span>
          </div>
          <span>
            Cumplimiento normativo · Gestión de riesgos psicosociales · STPS
            México
          </span>
        </div>
      </footer>
    </div>
  );
}
