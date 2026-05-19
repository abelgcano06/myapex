"use client";

interface DeepContent {
  headline: string;
  tipo_de_dia: string;
  insight_principal: string;
  que_esta_pasando: string;
  que_significa_para_ti: string;
  impacto_rendimiento: string;
  recomendacion: string;
  key_takeaways: string[];
}

interface DeepAnalysisModalProps {
  content: DeepContent | null;
  onClose: () => void;
}

const FIELDS: { key: keyof DeepContent; label: string }[] = [
  { key: "tipo_de_dia", label: "Tipo de día" },
  { key: "insight_principal", label: "Insight principal" },
  { key: "que_esta_pasando", label: "¿Qué está pasando?" },
  { key: "que_significa_para_ti", label: "¿Qué significa para ti?" },
  { key: "impacto_rendimiento", label: "Impacto en rendimiento" },
  { key: "recomendacion", label: "Recomendación" },
];

export function DeepAnalysisModal({ content, onClose }: DeepAnalysisModalProps) {
  if (!content) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex-1 overflow-y-auto mx-auto w-full max-w-md"
        style={{ background: "#1a1a1a" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors"
          style={{
            background: "#2a2a2a",
            color: "#888888",
            border: "1px solid #333333",
          }}
          aria-label="Cerrar"
        >
          ✕
        </button>

        <div className="px-5 pt-6 pb-10">
          {/* Headline */}
          <div className="mb-6 pr-10">
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#22c55e" }}>
              Análisis Completo
            </p>
            <h2 className="text-xl font-bold text-white leading-snug">
              {content.headline}
            </h2>
          </div>

          {/* Fields */}
          <div className="flex flex-col gap-5">
            {FIELDS.map(({ key, label }) => {
              const value = content[key];
              if (!value) return null;
              return (
                <div key={key}>
                  <p
                    className="text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: "#888888" }}
                  >
                    {label}
                  </p>
                  <p className="text-sm text-white leading-relaxed">
                    {String(value)}
                  </p>
                </div>
              );
            })}

            {/* Key Takeaways */}
            {content.key_takeaways && content.key_takeaways.length > 0 && (
              <div>
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#888888" }}
                >
                  Puntos clave
                </p>
                <ul className="flex flex-col gap-2">
                  {content.key_takeaways.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span style={{ color: "#22c55e" }} className="text-sm mt-0.5">
                        •
                      </span>
                      <span className="text-sm text-white leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
