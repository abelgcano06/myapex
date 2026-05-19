"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "Cruzando tus métricas de sueño, estrés y carga física...",
  "Analizando patrones fisiológicos de los últimos 30 días...",
  "Calculando el impacto real en tu rendimiento como atleta...",
  "Correlacionando HRV, body battery y recuperación neural...",
  "Construyendo tu análisis personalizado con toda tu data...",
  "Identificando los limitantes que más te afectan hoy...",
  "Comparando tu estado actual contra tu baseline histórico...",
  "Preparando recomendaciones específicas para tu fisiología...",
];

interface ApexLoaderProps {
  type: "quick" | "deep";
}

export function ApexLoader({ type }: ApexLoaderProps) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 gap-5">
      {/* Logo */}
      <div className="flex flex-col items-center gap-1">
        <div
          className="text-2xl font-black tracking-[0.25em] select-none"
          style={{
            background: "linear-gradient(135deg, #22c55e 0%, #16a34a 50%, #86efac 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          APEX
        </div>
        <div
          className="text-[9px] font-semibold tracking-[0.3em] uppercase"
          style={{ color: "#3a7a3a" }}
        >
          {type === "deep" ? "Análisis Completo" : "Análisis Rápido"}
        </div>
      </div>

      {/* Pulsing dots */}
      <div className="flex gap-2 items-center">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              width: i === 1 || i === 2 ? 6 : 4,
              height: i === 1 || i === 2 ? 6 : 4,
              backgroundColor: "#22c55e",
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              opacity: 0.4,
            }}
          />
        ))}
      </div>

      {/* Rotating message */}
      <p
        key={msgIndex}
        className="text-xs text-center leading-relaxed max-w-xs"
        style={{
          color: "#888888",
          animation: "fadeIn 0.5s ease-in",
        }}
      >
        {MESSAGES[msgIndex]}
      </p>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
