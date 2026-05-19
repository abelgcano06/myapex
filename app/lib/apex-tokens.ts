export const C = {
  bg:          "#F5F4F1",
  card:        "#FFFFFF",
  purple:      "#534AB7",
  purpleLight: "#EEEDFE",
  purpleText:  "#26215C",
  purpleMid:   "#7F77DD",
  purplePale:  "#9D97E8",
  purpleDeep:  "#C5C2F0",
  green:       "#3B6D11",
  greenBg:     "#EAF3DE",
  greenAccent: "#1D9E75",
  amber:       "#854F0B",
  amberBg:     "#FAEEDA",
  red:         "#A32D2D",
  redBg:       "#FCEBEB",
  text:        "#2C2C2A",
  secondary:   "#5F5E5A",
  muted:       "#888780",
  border:      "#E8E7E4",
  shadow:      "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
} as const;

export type CT = typeof C;

export function triColor(
  val: number,
  goodThreshold: number,
  warnThreshold: number,
  higher = true,
): { color: string; bg: string } {
  if (higher) {
    if (val >= goodThreshold) return { color: C.green, bg: C.greenBg };
    if (val >= warnThreshold) return { color: C.amber, bg: C.amberBg };
    return { color: C.red, bg: C.redBg };
  } else {
    if (val <= goodThreshold) return { color: C.green, bg: C.greenBg };
    if (val <= warnThreshold) return { color: C.amber, bg: C.amberBg };
    return { color: C.red, bg: C.redBg };
  }
}

export function semaforo(v: number | null, ok: number, warn: number): string {
  if (v == null) return C.muted;
  if (v >= ok)   return C.green;
  if (v >= warn) return C.amber;
  return C.red;
}

export function semaforoBg(v: number | null, ok: number, warn: number): string {
  if (v == null) return C.bg;
  if (v >= ok)   return C.greenBg;
  if (v >= warn) return C.amberBg;
  return C.redBg;
}
