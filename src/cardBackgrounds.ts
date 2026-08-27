/* Card background catalog + persisted global choice (localStorage).
   A background is any CSS value valid for `background` (colour, gradient,
   or a layered pattern over a base colour). Card text is always white, so
   every option keeps enough contrast. */

export interface CardBg {
  id: string;
  label: string;
  /** value for the CSS `background` shorthand */
  css: string;
}

export const CARD_BGS: CardBg[] = [
  // ── solids ──
  { id: "slate", label: "Slate", css: "#2d3748" },
  { id: "forest", label: "Forest", css: "#2f5233" },
  { id: "plum", label: "Plum", css: "#4a2545" },
  { id: "navy", label: "Navy", css: "#1e3a5f" },
  { id: "clay", label: "Clay", css: "#8a4a3a" },
  { id: "teal", label: "Teal", css: "#1f5560" },
  { id: "wine", label: "Wine", css: "#5c1f2e" },
  { id: "charcoal", label: "Charcoal", css: "#1a1a1a" },

  // ── gradients ──
  {
    id: "green-grad",
    label: "Green fade",
    css: "linear-gradient(135deg, #2d5016, #4a7c59)",
  },
  {
    id: "sunset",
    label: "Sunset",
    css: "linear-gradient(135deg, #6b2737, #b5651d)",
  },
  {
    id: "ocean",
    label: "Ocean",
    css: "linear-gradient(135deg, #0f2027, #2c5364)",
  },
  {
    id: "purple-haze",
    label: "Purple haze",
    css: "linear-gradient(135deg, #3a1c71, #6d327d)",
  },
  {
    id: "midnight",
    label: "Midnight",
    css: "linear-gradient(160deg, #0b0f1a, #26324a)",
  },

  // ── patterns (over a base colour) ──
  {
    id: "dots",
    label: "Dots",
    css: "radial-gradient(rgba(255,255,255,0.14) 1.4px, transparent 1.4px) 0 0 / 16px 16px, #2d3748",
  },
  {
    id: "stripes",
    label: "Stripes",
    css: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 10px, transparent 10px 20px), #33404f",
  },
  {
    id: "grid",
    label: "Grid",
    css: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 22px 22px, linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px) 0 0 / 22px 22px, #26303c",
  },
  {
    id: "carbon",
    label: "Carbon",
    css: "repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 2px, transparent 2px 6px), repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 6px), #222831",
  },
];

const BY_ID = new Map(CARD_BGS.map((b) => [b.id, b]));

export const DEFAULT_BG_1 = "slate";
export const DEFAULT_BG_2 = "green-grad";

const KEY_1 = "card-bg-1";
const KEY_2 = "card-bg-2";

function read(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(key);
    return v && BY_ID.has(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function getCardBgIds(): { s1: string; s2: string } {
  return { s1: read(KEY_1, DEFAULT_BG_1), s2: read(KEY_2, DEFAULT_BG_2) };
}

export function setCardBgId(side: 1 | 2, id: string): void {
  try {
    localStorage.setItem(side === 1 ? KEY_1 : KEY_2, id);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("card-bg-change"));
}

export function bgCss(id: string, fallback: string): string {
  return (BY_ID.get(id) ?? BY_ID.get(fallback))!.css;
}
