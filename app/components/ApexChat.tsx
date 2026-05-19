"use client";

import { useState, useEffect, useRef } from "react";
import { C } from "@/app/lib/apex-tokens";

type Section = "sleep" | "day" | "activity";
type Msg = { role: "user" | "assistant"; content: string };

const GREETINGS: Record<Section, string> = {
  sleep:    "Tengo tus datos de sueño cargados. ¿Qué quieres saber?",
  day:      "Tengo los datos del día. ¿Qué te preguntas?",
  activity: "Datos de la actividad cargados. ¿Pregúntame lo que quieras.",
};

const SECTION_LABEL: Record<Section, string> = {
  sleep:    "Sueño",
  day:      "Día",
  activity: "Actividad",
};

interface ApexChatProps {
  section:  Section;
  context:  Record<string, unknown>;
  subtitle?: string;
  onClose:  () => void;
}

export function ApexChat({ section, context, subtitle, onClose }: ApexChatProps) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: GREETINGS[section] },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res  = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: next, section, context }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: data.ok ? data.text : "No pude procesar tu pregunta. Intenta de nuevo." },
      ]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Error de conexión. Intenta de nuevo." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const userRounds = messages.filter(m => m.role === "user").length;

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
          zIndex: 1000, animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Bottom sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        height: "78vh", maxWidth: 500, margin: "0 auto",
        background: C.bg, borderRadius: "20px 20px 0 0",
        zIndex: 1001, display: "flex", flexDirection: "column",
        animation: "slideUp 0.25s ease",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
      }}>

        {/* Header */}
        <div style={{
          padding: "16px 20px 12px",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* ApexAI badge */}
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              background: C.purple, color: "#fff",
              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", animation: "apex-pulse 2s infinite" }} />
              ApexAI
            </span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>
                {SECTION_LABEL[section]}
              </div>
              {subtitle && (
                <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.2 }}>{subtitle}</div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Round counter */}
            <span style={{ fontSize: 10, color: C.muted }}>
              {userRounds}/5
            </span>
            <button
              onClick={onClose}
              style={{
                background: C.border, border: "none", borderRadius: "50%",
                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 14, color: C.secondary,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "16px 16px 8px",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}>
              {m.role === "assistant" && (
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: C.purple, flexShrink: 0, marginRight: 8, marginTop: 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontSize: 10, color: "#fff", fontWeight: 800 }}>A</span>
                </div>
              )}
              <div style={{
                maxWidth: "75%",
                background: m.role === "user" ? C.purple : C.card,
                color:      m.role === "user" ? "#fff"   : C.text,
                borderRadius: m.role === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
                padding: "10px 14px",
                fontSize: 13, lineHeight: 1.55,
                boxShadow: C.shadow,
                border: m.role === "assistant" ? `1px solid ${C.border}` : "none",
              }}>
                {m.content}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{
                width: 24, height: 24, borderRadius: "50%",
                background: C.purple, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 10, color: "#fff", fontWeight: 800 }}>A</span>
              </div>
              <div style={{
                background: C.card, borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px", border: `1px solid ${C.border}`,
                display: "flex", gap: 4, alignItems: "center",
              }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: C.purple, opacity: 0.6,
                    animation: `apex-dots 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 16px 20px",
          borderTop: `1px solid ${C.border}`,
          display: "flex", gap: 10, alignItems: "flex-end",
          flexShrink: 0,
          background: C.bg,
        }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={loading || userRounds >= 5}
            placeholder={userRounds >= 5 ? "Máximo 5 preguntas por sesión" : "Escribe tu pregunta…"}
            rows={1}
            style={{
              flex: 1, resize: "none", border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "10px 14px",
              fontSize: 14, fontFamily: "inherit",
              background: userRounds >= 5 ? C.border : C.card,
              color: C.text, outline: "none",
              lineHeight: 1.4, maxHeight: 80, overflowY: "auto",
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || loading || userRounds >= 5}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: !input.trim() || loading || userRounds >= 5 ? C.border : C.purple,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.15s", flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={!input.trim() || loading || userRounds >= 5 ? C.muted : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={!input.trim() || loading || userRounds >= 5 ? C.muted : "#fff"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes apex-pulse { 0%,100%{opacity:1} 50%{opacity:.45} }
        @keyframes apex-dots  { 0%,100%{opacity:.3;transform:scale(.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </>
  );
}
