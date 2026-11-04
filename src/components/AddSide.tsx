import { Suspense, lazy, useState } from "react";
import { compressImage } from "../utils/compressImage";
import type { LineFmt } from "../types";
import { t } from "../strings";
import inputStyles from "./TextInput.module.css";
import styles from "./AddSide.module.css";

// Tiptap is big — load it only when an add/edit form actually opens
const CardTextEditor = lazy(() => import("./CardTextEditor"));

/** shown for a moment while the editor loads */
function EditorFallback({ value }: { value: string }) {
  return (
    <textarea
      className={inputStyles["text-input"]}
      rows={3}
      value={value}
      readOnly
    />
  );
}

function LineEditor(props: {
  placeholder: string;
  value: string;
  onChange: (_text: string) => void;
  fmt: LineFmt;
  onFmt: (_fmt: LineFmt) => void;
}) {
  return (
    <Suspense fallback={<EditorFallback value={props.value} />}>
      <CardTextEditor {...props} />
    </Suspense>
  );
}

interface IProps {
  title: string;
  text1: string;
  setText1: (_text: string) => void;
  text2: string;
  setText2: (_text: string) => void;
  fmt1: LineFmt;
  setFmt1: (_fmt: LineFmt) => void;
  fmt2: LineFmt;
  setFmt2: (_fmt: LineFmt) => void;
  photo: string;
  setPhoto: (_url: string) => void;
  setFile: (_file: File | null) => void;
}

export function AddSide({
  title,
  text1,
  setText1,
  text2,
  setText2,
  fmt1,
  setFmt1,
  fmt2,
  setFmt2,
  photo,
  setPhoto,
  setFile,
}: IProps) {
  const [showLine2, setShowLine2] = useState(!!text2);
  // open it when text arrives later (e.g. a card loaded into the form)
  if (text2 && !showLine2) setShowLine2(true);

  return (
    <div className="side-section">
      <h3>{title}</h3>
      <LineEditor
        placeholder="Tekst rida 1 (valikuline)"
        value={text1}
        onChange={setText1}
        fmt={fmt1}
        onFmt={setFmt1}
      />
      {/* rida 2 is rarely needed now that rida 1 can be formatted —
          folded away unless it already has text */}
      <button
        type="button"
        className={styles.line2Toggle}
        aria-expanded={showLine2}
        onClick={() => setShowLine2((v) => !v)}
      >
        {showLine2 ? "▾" : "▸"} {t.line2Toggle}
      </button>
      {showLine2 && (
        <LineEditor
          placeholder="Tekst rida 2 (valikuline)"
          value={text2}
          onChange={setText2}
          fmt={fmt2}
          onFmt={setFmt2}
        />
      )}

      <label className="photo-label">
        📷 Vali foto
        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const f = e.target.files?.[0] || null;
            if (!f) return;
            const compressed = await compressImage(f);
            setFile(compressed);
            setPhoto(URL.createObjectURL(compressed));
          }}
        />
      </label>
      {photo && <img src={photo} className="photo-preview" alt="" />}
      {photo && (
        <button
          className="remove-photo"
          onClick={() => {
            setFile(null);
            setPhoto("");
          }}
        >
          ✕ Eemalda foto
        </button>
      )}
    </div>
  );
}
