/**
 * Core Web Vitals — NOM-035 Platform
 * Mide LCP, FID/INP, CLS, FCP y TTFB y los reporta a la consola (dev)
 * y al endpoint de analytics (prod) si está disponible.
 */
import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

type VitalReport = {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
};

const VITALS_ENDPOINT = import.meta.env.VITE_ANALYTICS_ENDPOINT
  ? `${import.meta.env.VITE_ANALYTICS_ENDPOINT}/vitals`
  : null;

function getRating(name: string, value: number): VitalReport["rating"] {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    INP: [200, 500],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
  };
  const [good, poor] = thresholds[name] ?? [0, Infinity];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

function reportMetric(metric: Metric) {
  const report: VitalReport = {
    name: metric.name,
    value: metric.value,
    rating: getRating(metric.name, metric.value),
    delta: metric.delta,
    id: metric.id,
  };

  // Siempre mostrar en consola (dev y prod)
  const color =
    report.rating === "good"
      ? "#22c55e"
      : report.rating === "needs-improvement"
        ? "#f59e0b"
        : "#ef4444";

  console.log(
    `%c[Web Vitals] ${report.name}: ${report.value.toFixed(1)} ms — ${report.rating.toUpperCase()}`,
    `color: ${color}; font-weight: bold;`
  );

  // Enviar al backend tRPC para almacenar en BD
  const payload = {
    name: report.name as "LCP" | "CLS" | "INP" | "FCP" | "TTFB" | "FID",
    value: report.value,
    rating: report.rating,
    delta: report.delta,
    id: report.id,
    page: window.location.pathname,
    userAgent: navigator.userAgent.slice(0, 500),
  };
  const trpcBody = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/trpc/webVitals.record", trpcBody);
  } else {
    fetch("/api/trpc/webVitals.record", {
      method: "POST",
      body: trpcBody,
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    }).catch(() => {});
  }

  // Enviar al endpoint de analytics si está disponible
  if (VITALS_ENDPOINT) {
    const body = JSON.stringify(report);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(VITALS_ENDPOINT, body);
    } else {
      fetch(VITALS_ENDPOINT, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  }
}

/**
 * Inicializar la medición de Core Web Vitals.
 * Llamar una sola vez desde main.tsx.
 */
export function initWebVitals() {
  onLCP(reportMetric);
  onINP(reportMetric);
  onCLS(reportMetric);
  onFCP(reportMetric);
  onTTFB(reportMetric);
}
