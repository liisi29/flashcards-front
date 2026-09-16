import { useState, useEffect } from "react";
import { CardFace } from "./CardFace";
import type { ICardSide, Color } from "../../types";

interface Props {
  s1: ICardSide;
  s2: ICardSide;
  /** class(es) on the OUTER wrapper — put swipe/enter transforms here, never
      on .card-scene itself (it holds a perspective'd 3D child and gets
      render artifacts when transformed). */
  className?: string;
  style?: React.CSSProperties;
  /** start showing the back side (used for the outgoing card so it keeps its face) */
  initialFlipped?: boolean;
  interactive?: boolean;
  onAnimationEnd?: () => void;
  /** difficulty dot shown in the top corner; nothing when null */
  cornerColor?: Color;
  /** study notes for this card; the toggle button always shows so notes
      can be added during study, not just edited when already present */
  notes?: string;
  /** called (debounced by blur) when the notes panel is edited during study */
  onNotesChange?: (_notes: string) => void;
}

const DOT_BG: Record<string, string> = {
  red: "#da1414",
  yellow: "#f6e05e",
  green: "#0a8338",
};

const EMPTY: ICardSide = { text: "", text2: "", photo: "" };

/** Just the 3D flip scene — no sem-dots, no meta. */
export function CardScene({
  s1,
  s2,
  className = "",
  style,
  initialFlipped = false,
  interactive = true,
  onAnimationEnd,
  cornerColor = null,
  notes = "",
  onNotesChange,
}: Props) {
  const [flipped, setFlipped] = useState(initialFlipped);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(notes);

  useEffect(() => {
    setNotesDraft(notes);
  }, [notes]);

  function saveNotesDraft() {
    const trimmed = notesDraft.trim();
    if (trimmed !== notes) onNotesChange?.(trimmed);
  }

  return (
    <div
      className={`card-scene-wrap${className ? ` ${className}` : ""}`}
      style={style}
      onAnimationEnd={onAnimationEnd}
    >
      <div
        className={`card-scene${flipped ? " flipped" : ""}`}
        onClick={interactive ? () => setFlipped((f) => !f) : undefined}
      >
        <div className="card">
          <CardFace side={s1 || EMPTY} faceNum={1} />
          <CardFace side={s2 || EMPTY} faceNum={2} />
        </div>
        {cornerColor && (
          <span
            className="card-corner-dot"
            style={{ background: DOT_BG[cornerColor] }}
            aria-hidden
          />
        )}
        <button
          type="button"
          className={`card-notes-btn${notes ? "" : " card-notes-btn-empty"}`}
          aria-expanded={notesOpen}
          aria-label="Märkmed"
          onClick={(e) => {
            e.stopPropagation();
            setNotesOpen((v) => {
              const next = !v;
              if (v) saveNotesDraft();
              return next;
            });
          }}
        >
          📝
        </button>
        {notesOpen && (
          <div
            className="card-notes-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              className="card-notes-textarea"
              value={notesDraft}
              placeholder="Lisa märkmed…"
              autoFocus
              onChange={(e) => setNotesDraft(e.target.value)}
              onBlur={saveNotesDraft}
            />
          </div>
        )}
      </div>
    </div>
  );
}
