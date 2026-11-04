import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FontSize, TextStyle } from "@tiptap/extension-text-style";
import type { LineFmt } from "../types";
import {
  LINE_PX,
  fromDoc,
  rowAlignAt,
  sizedRunAt,
  setRowAlign,
  type Align,
  selectionSize,
  setSelectionSize,
  toDoc,
  toggleMark,
  type Mark,
} from "../utils/richText";
import { t } from "../strings";
import inputStyles from "./TextInput.module.css";
import styles from "./AddSide.module.css";

/* One card text line (rida 1 / 2) as a visual editor — bold looks bold,
   sized words look bigger — built on Tiptap like le-surf-front's editor.
   The card still stores marker text (utils/richText); "</>" shows it. */

const extensions = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    horizontalRule: false,
    strike: false,
    link: false,
    // Enter starts a new row (paragraph) — each row has its own alignment
    hardBreak: false,
  }),
  TextStyle,
  FontSize,
  // rows are centred on cards unless set otherwise
  TextAlign.configure({ types: ["paragraph"], defaultAlignment: "center" }),
];

const ALIGNS: Align[] = ["left", "center", "right"];

/** the usual align-left / center / right icon: four lines, long and short
    alternating, pushed to the chosen side */
function AlignIcon({ align }: { align: Align }) {
  const x = (w: number) =>
    align === "left" ? 2 : align === "right" ? 14 - w : 8 - w / 2;
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      {[12, 8, 12, 8].map((w, i) => (
        <rect
          key={i}
          x={x(w)}
          y={3 + i * 3}
          width={w}
          height={1.6}
          rx={0.8}
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

interface Props {
  placeholder: string;
  value: string;
  onChange: (_text: string) => void;
  fmt: LineFmt;
  onFmt: (_fmt: LineFmt) => void;
}

export default function CardTextEditor({
  placeholder,
  value,
  onChange,
  fmt,
  onFmt,
}: Props) {
  const [source, setSource] = useState(false);
  // the last text this editor produced — an incoming value that differs
  // came from outside (form reset, the </> view) and is loaded in
  const lastOwn = useRef(value);

  const editor = useEditor({
    extensions,
    content: toDoc(value),
    editorProps: { attributes: { class: styles.editorContent } },
    onUpdate: ({ editor }) => {
      const text = fromDoc(editor.getJSON());
      lastOwn.current = text;
      onChange(text);
    },
  });

  useEffect(() => {
    if (value === lastOwn.current) return;
    lastOwn.current = value;
    editor.commands.setContent(toDoc(value), { emitUpdate: false });
  }, [value, editor]);

  // re-render the toolbar when the selection or its marks change
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      hasSel: !editor.state.selection.empty,
      fontSize: String(editor.getAttributes("textStyle").fontSize ?? ""),
      align:
        (["left", "right"] as const).find((a) =>
          editor.isActive({ textAlign: a })
        ) ?? ("center" as Align),
      empty: editor.isEmpty,
    }),
  });

  // ── source (marker) view: the plain textarea, B/I/U and size act on
  // its selection the same way
  const ref = useRef<HTMLTextAreaElement>(null);
  const [srcSel, setSrcSel] = useState({ start: 0, end: 0 });
  const srcHasSel = srcSel.end > srcSel.start;

  function reselect(start: number, end: number) {
    const el = ref.current;
    if (!el) return;
    setSrcSel({ start, end });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start, end);
    });
  }

  function mark(m: Mark) {
    if (!source) {
      const chain = editor.chain().focus();
      if (m === "b") chain.toggleBold().run();
      else if (m === "i") chain.toggleItalic().run();
      else chain.toggleUnderline().run();
      return;
    }
    const el = ref.current;
    if (!el) return;
    const next = toggleMark(value, el.selectionStart, el.selectionEnd, m);
    onChange(next.text);
    reselect(next.start, next.end);
  }

  const hasSel = source ? srcHasSel : state.hasSel;
  const align = source ? rowAlignAt(value, srcSel.start) : state.align;

  /** align the row(s) the cursor / selection is in */
  function alignRows(a: Align) {
    if (!source) {
      editor.chain().focus().setTextAlign(a).run();
      return;
    }
    const next = setRowAlign(value, srcSel.start, srcSel.end, a);
    onChange(next.text);
    reselect(next.start, next.end);
  }

  // What the size dropdown changes, like in a word processor: the selected
  // words; else the sized words the cursor is in; else the whole line.
  // (It used to show the line's size with the cursor in a sized word, so
  // picking Auto there did nothing.)
  const srcRun =
    source && !srcHasSel ? sizedRunAt(value, srcSel.start) : undefined;
  const cursorPx = source
    ? srcRun?.px
    : !state.hasSel
      ? parseInt(state.fontSize, 10) || undefined
      : undefined;
  const target: "sel" | "run" | "line" = hasSel
    ? "sel"
    : cursorPx
      ? "run"
      : "line";

  function size(px: number | undefined) {
    if (target === "line") {
      onFmt({ ...fmt, px });
      return;
    }
    if (!source) {
      const chain = editor.chain().focus();
      if (target === "run") chain.extendMarkRange("textStyle");
      if (px) chain.setFontSize(`${px}px`).run();
      else chain.unsetFontSize().run();
      return;
    }
    const range = srcRun ?? srcSel;
    const next = setSelectionSize(value, range.start, range.end, px);
    onChange(next.text);
    reselect(next.start, next.end);
  }

  const shownPx =
    target === "line"
      ? fmt.px
      : target === "run"
        ? cursorPx
        : source
          ? selectionSize(value, srcSel.start, srcSel.end)
          : parseInt(state.fontSize, 10) || undefined;

  return (
    <div className={styles.line}>
      {/* onMouseDown preventDefault keeps the text selection while a
          toolbar button is clicked */}
      <div className={styles.toolbar} onMouseDown={(e) => e.preventDefault()}>
        <button
          type="button"
          title={t.fmtBold}
          className={!source && state.bold ? styles.on : undefined}
          onClick={() => mark("b")}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          title={t.fmtItalic}
          className={!source && state.italic ? styles.on : undefined}
          onClick={() => mark("i")}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          title={t.fmtUnderline}
          className={!source && state.underline ? styles.on : undefined}
          onClick={() => mark("u")}
        >
          <u>U</u>
        </button>
        <span className={styles.sep} />
        {ALIGNS.map((a) => (
          <button
            key={a}
            type="button"
            title={t.fmtAlign[a]}
            className={`${styles.iconBtn}${align === a ? ` ${styles.on}` : ""}`}
            onClick={() => alignRows(a)}
          >
            <AlignIcon align={a} />
          </button>
        ))}
        <span className={styles.sep} />
        <select
          className={styles.sizeSelect}
          title={target === "line" ? t.fmtSize : t.fmtSizeSelection}
          value={shownPx ?? ""}
          // the toolbar's mousedown guard would stop the dropdown opening
          onMouseDown={(e) => e.stopPropagation()}
          onChange={(e) => size(Number(e.target.value) || undefined)}
        >
          <option value="">
            {target === "line" ? t.fmtSizeAuto : t.fmtSizeAutoSelection}
          </option>
          {LINE_PX.map((px) => (
            <option key={px} value={px}>
              {px} px
            </option>
          ))}
        </select>
        <button
          type="button"
          title={t.fmtSource}
          className={`${styles.sourceBtn}${source ? ` ${styles.on}` : ""}`}
          onClick={() => setSource((v) => !v)}
        >
          {"</>"}
        </button>
      </div>

      {source ? (
        <textarea
          ref={ref}
          className={`${inputStyles["text-input"]} ${styles.sourceArea}`}
          placeholder={placeholder}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onSelect={(e) =>
            setSrcSel({
              start: e.currentTarget.selectionStart,
              end: e.currentTarget.selectionEnd,
            })
          }
        />
      ) : (
        <div
          className={styles.editorBox}
          style={{ fontSize: fmt.px ? `${fmt.px}px` : undefined }}
          data-placeholder={state.empty ? placeholder : undefined}
        >
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
}
