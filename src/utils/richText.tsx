import type { CSSProperties, ReactNode } from "react";
import type { LineFmt } from "../types";

/* Card text formatting.
   Inline: **bold**, //italic//, __underline__ — inserted by the B/I/U
   buttons in the add/edit form, stored right in the text. A single "*"
   is left alone (bioloogia uses it for bullets); only paired markers
   count, and they can nest (bold around italic etc.).
   Sized words: {{24|word}} — an exact px size for just those words, set
   from the size dropdown while words are selected.
   Rows: every row (text between line breaks) can start with an alignment
   marker {{left}} / {{right}}; rows without one are centred, as cards
   always were.
   Per line (rida 1 / rida 2): an exact px size, ICardSide.fmt1 / fmt2. */

export type Mark = "b" | "i" | "u";
export const MARKERS: Record<Mark, string> = { b: "**", i: "//", u: "__" };

const INLINE =
  /\*\*([\s\S]+?)\*\*|\/\/([\s\S]+?)\/\/|__([\s\S]+?)__|\{\{(\d+)\|([\s\S]+?)\}\}/;

/** text with markers → React nodes (no HTML injection, just elements) */
export function renderRich(text: string, keyPrefix = "r"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const key = `${keyPrefix}${n++}`;
    if (m[1] !== undefined)
      out.push(<strong key={key}>{renderRich(m[1], key)}</strong>);
    else if (m[2] !== undefined)
      out.push(<em key={key}>{renderRich(m[2], key)}</em>);
    else if (m[3] !== undefined)
      out.push(<u key={key}>{renderRich(m[3], key)}</u>);
    else
      out.push(
        <span key={key} style={{ fontSize: pxSize(Number(m[4])) }}>
          {renderRich(m[5], key)}
        </span>
      );
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

/** plain text for search, sorting, list rows */
export function stripMarks(text: string): string {
  let prev;
  let s = text.replace(/^\{\{(left|center|right)\}\}/gm, "");
  do {
    prev = s;
    s = s.replace(INLINE, (_m, b, i, u, _px, sized) => b ?? i ?? u ?? sized);
  } while (s !== prev);
  return s;
}

/** any **bold** words — rida 1 is bold by default, so a line that bolds
    some words drops the rest to normal weight to make them stand out */
export function hasBold(text: string): boolean {
  return /\*\*[\s\S]+?\*\*/.test(text);
}

/** exact sizes offered per line, in px. The device's Teksti suurus
    (--card-text-scale) scales them, and portrait auto-fit shrinks them by
    the same ratio as the rest of the card (--fit-scale, see useFitText). */
export const LINE_PX = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48] as const;

/** CSS for an exact px size: scaled by the device setting and by the
    card's auto-fit shrink */
function pxSize(px: number) {
  return `calc(${px}px * var(--card-text-scale, 1) * var(--fit-scale, 1))`;
}

export type Align = "left" | "center" | "right";
const ROW_ALIGN = /^\{\{(left|center|right)\}\}/;

interface Row {
  align?: Align;
  body: string;
}

/** a line's text → its rows, each with its alignment marker taken off */
function splitRows(text: string): Row[] {
  return text.split("\n").map((row) => {
    const m = ROW_ALIGN.exec(row);
    return m
      ? { align: m[1] as Align, body: row.slice(m[0].length) }
      : { body: row };
  });
}

/** style for a line's block on a card face: rows with their own alignment
    need the full width (.cardText centres its lines as a flex column) */
export function lineStyle(text: string): CSSProperties {
  return splitRows(text).some((r) => r.align) ? { alignSelf: "stretch" } : {};
}

/** one line's content: rows (each with its alignment), all in the line's
    exact size if it has one. The size goes on an inner element, not the
    line block, so it overrides whatever size the card's CSS gives it */
export function renderLine(text: string, fmt: LineFmt | undefined) {
  const rows = splitRows(text);
  const aligned = rows.some((r) => r.align);
  const nodes = aligned
    ? rows.map((r, i) => (
        <div key={i} style={{ textAlign: r.align ?? "center" }}>
          {r.body ? renderRich(r.body, `row${i}-`) : "\u00a0"}
        </div>
      ))
    : renderRich(text);
  if (!fmt?.px) return nodes;
  const style = { fontSize: pxSize(fmt.px) };
  return aligned ? (
    <div style={style}>{nodes}</div>
  ) : (
    <span style={style}>{nodes}</span>
  );
}

/** the alignment of the row the cursor is in */
export function rowAlignAt(text: string, pos: number): Align {
  const row = text.slice(text.lastIndexOf("\n", pos - 1) + 1).split("\n")[0];
  return (ROW_ALIGN.exec(row)?.[1] as Align) ?? "center";
}

/** set the alignment of every row the selection touches (center = the
    default, so no marker) */
export function setRowAlign(
  text: string,
  start: number,
  end: number,
  align: Align
): { text: string; start: number; end: number } {
  const marker = align === "center" ? "" : `{{${align}}}`;
  // each row: where it started, and how much its marker changed its length
  const changes: { rowStart: number; rowEnd: number; delta: number }[] = [];
  let pos = 0;
  const rows = text.split("\n").map((row) => {
    const rowStart = pos;
    const rowEnd = pos + row.length;
    pos = rowEnd + 1;
    const touched = rowStart <= end && rowEnd >= start;
    const old = touched ? (ROW_ALIGN.exec(row)?.[0] ?? "") : "";
    const next = touched ? marker + row.slice(old.length) : row;
    changes.push({ rowStart, rowEnd, delta: next.length - row.length });
    return next;
  });
  // an original position → its place in the new text (a position inside
  // a removed marker lands at its row's start)
  const map = (p: number) => {
    let shift = 0;
    for (const c of changes) {
      if (p <= c.rowEnd)
        return Math.max(c.rowStart + shift, p + shift + c.delta);
      shift += c.delta;
    }
    return p + shift;
  };
  return { text: rows.join("\n"), start: map(start), end: map(end) };
}

/** wrap the textarea's selection in a marker, or unwrap if it's already
    wrapped; returns the new text + where the selection should end up */
export function toggleMark(
  text: string,
  start: number,
  end: number,
  mark: Mark
): { text: string; start: number; end: number } {
  const mk = MARKERS[mark];
  const L = mk.length;
  // already wrapped right around the selection → unwrap
  if (text.slice(start - L, start) === mk && text.slice(end, end + L) === mk) {
    return {
      text:
        text.slice(0, start - L) + text.slice(start, end) + text.slice(end + L),
      start: start - L,
      end: end - L,
    };
  }
  // selection includes the markers themselves → unwrap
  const sel = text.slice(start, end);
  if (sel.length >= 2 * L && sel.startsWith(mk) && sel.endsWith(mk)) {
    const inner = sel.slice(L, -L);
    return {
      text: text.slice(0, start) + inner + text.slice(end),
      start,
      end: start + inner.length,
    };
  }
  return {
    text: text.slice(0, start) + mk + sel + mk + text.slice(end),
    start: start + L,
    end: end + L,
  };
}

const SIZED_OPEN = /\{\{\d+\|$/;

/** give the selected words an exact size ({{px|…}}), change the size of
    an already-sized selection, or (px undefined = Auto) remove it */
export function setSelectionSize(
  text: string,
  start: number,
  end: number,
  px: number | undefined
): { text: string; start: number; end: number } {
  const open = (n: number) => `{{${n}|`;
  // selection is exactly the words inside {{n|…}}
  const before = SIZED_OPEN.exec(text.slice(0, start));
  if (before && text.slice(end, end + 2) === "}}") {
    const from = start - before[0].length;
    const inner = text.slice(start, end);
    const head = px ? open(px) : "";
    const tail = px ? "}}" : "";
    return {
      text: text.slice(0, from) + head + inner + tail + text.slice(end + 2),
      start: from + head.length,
      end: from + head.length + inner.length,
    };
  }
  // selection includes the {{n|…}} markers themselves
  const whole = /^\{\{\d+\|([\s\S]*)\}\}$/.exec(text.slice(start, end));
  if (whole) {
    const inner = whole[1];
    const head = px ? open(px) : "";
    const tail = px ? "}}" : "";
    return {
      text: text.slice(0, start) + head + inner + tail + text.slice(end),
      start: start + head.length,
      end: start + head.length + inner.length,
    };
  }
  if (!px) return { text, start, end };
  const head = open(px);
  return {
    text:
      text.slice(0, start) +
      head +
      text.slice(start, end) +
      "}}" +
      text.slice(end),
    start: start + head.length,
    end: end + head.length,
  };
}

/** the sized run ({{px|…}}) the cursor is in, if any: its size and where
    its words start/end */
export function sizedRunAt(
  text: string,
  pos: number
): { px: number; start: number; end: number } | undefined {
  for (const m of text.matchAll(/\{\{(\d+)\|([\s\S]+?)\}\}/g)) {
    const start = m.index + m[0].length - m[2].length - 2;
    const end = start + m[2].length;
    if (pos >= start && pos <= end) return { px: Number(m[1]), start, end };
  }
  return undefined;
}

/** the exact size of the selected words, if they're one sized run */
export function selectionSize(
  text: string,
  start: number,
  end: number
): number | undefined {
  const before = SIZED_OPEN.exec(text.slice(0, start));
  if (before && text.slice(end, end + 2) === "}}")
    return Number(before[0].slice(2, -1));
  const whole = /^\{\{(\d+)\|[\s\S]*\}\}$/.exec(text.slice(start, end));
  return whole ? Number(whole[1]) : undefined;
}

/* ── Tiptap ↔ markers ──
   The card editor (CardTextEditor) is a visual Tiptap editor, but cards
   keep storing the marker text above. These two convert between them.
   One paragraph per row (Enter = new row), with its alignment. */

type TipMark = { type: string; attrs?: Record<string, unknown> };
type TipNode = {
  type: string;
  text?: string;
  marks?: TipMark[];
  content?: TipNode[];
  attrs?: Record<string, unknown>;
};

/** marker text → Tiptap document */
export function toDoc(text: string): TipNode {
  let content: TipNode[] = [];
  const pushText = (s: string, marks: TipMark[]) =>
    s.split("\n").forEach((part, i) => {
      if (i > 0) content.push({ type: "hardBreak" });
      if (part)
        content.push({
          type: "text",
          text: part,
          ...(marks.length && { marks }),
        });
    });
  const walk = (s: string, marks: TipMark[]) => {
    let rest = s;
    while (rest) {
      const m = INLINE.exec(rest);
      if (!m) {
        pushText(rest, marks);
        break;
      }
      if (m.index > 0) pushText(rest.slice(0, m.index), marks);
      if (m[1] !== undefined) walk(m[1], [...marks, { type: "bold" }]);
      else if (m[2] !== undefined) walk(m[2], [...marks, { type: "italic" }]);
      else if (m[3] !== undefined)
        walk(m[3], [...marks, { type: "underline" }]);
      else
        walk(m[5], [
          ...marks.filter((mk) => mk.type !== "textStyle"),
          { type: "textStyle", attrs: { fontSize: `${m[4]}px` } },
        ]);
      rest = rest.slice(m.index + m[0].length);
    }
  };
  const paragraphs = splitRows(text).map((row) => {
    content = [];
    walk(row.body, []);
    return {
      type: "paragraph",
      ...(row.align && { attrs: { textAlign: row.align } }),
      ...(content.length && { content }),
    };
  });
  return { type: "doc", content: paragraphs };
}

/** Tiptap document → marker text */
export function fromDoc(doc: TipNode): string {
  const lines = (doc.content ?? []).map((block) => {
    const align = block.attrs?.textAlign;
    const prefix = align === "left" || align === "right" ? `{{${align}}}` : "";
    return (
      prefix +
      (block.content ?? [])
        .map((node) => {
          if (node.type === "hardBreak") return "\n";
          let s = node.text ?? "";
          if (!s) return "";
          const has = (type: string) =>
            node.marks?.some((m) => m.type === type);
          // innermost first, so the order is always {{px|**//__…__//**}}
          if (has("underline")) s = `__${s}__`;
          if (has("italic")) s = `//${s}//`;
          if (has("bold")) s = `**${s}**`;
          const px = parseInt(
            String(
              node.marks?.find((m) => m.type === "textStyle")?.attrs
                ?.fontSize ?? ""
            ),
            10
          );
          if (px) s = `{{${px}|${s}}}`;
          return s;
        })
        .join("")
    );
  });
  return lines.join("\n");
}
