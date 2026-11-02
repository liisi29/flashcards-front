import { useEffect, useState } from "react";
import { api } from "../../api";
import styles from "./AddSection.module.css";
import { t } from "../../strings";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { useTags } from "../../contexts/TagsContext";
import { TAG_COLORS } from "../../tagColors";

interface Props {
  /** topic + tags are picked once on the Lisa page, shared by both forms */
  topicId: string;
  tagIds: string[];
  onCardAdded: () => void;
}

// Split on the FIRST space-padded "-" (or em/en dash), or a tab.
// Everything after it is kept verbatim as side 2, so a card back can
// contain ":", ";", "," etc. Requiring a space on both sides of "-"
// keeps hyphenated words (e-mail) from false-triggering.
const SEPARATOR = /\s+[-–—]\s+|\t/;

// Tags go at the END of a line: "perro - koer #loomad #a1". Only a
// trailing run of space-separated #words counts, so a "#" inside the card
// text itself is left alone. Names are lowercased like in TagInput, and
// "_" stands for a space so multi-word tags work: #salk_4 → "salk 4".
const TRAILING_TAGS = /(?:^|\s+)(#[^\s#]+(?:\s+#[^\s#]+)*)\s*$/;

interface ParsedLine {
  s1: string;
  s2: string;
  tags: string[];
}

function parseLines(text: string): ParsedLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      let tags: string[] = [];
      const tagMatch = TRAILING_TAGS.exec(line);
      if (tagMatch) {
        tags = tagMatch[1]
          .split(/\s+/)
          .map((tg) => tg.slice(1).replace(/_/g, " ").toLowerCase());
        line = line.slice(0, tagMatch.index).trim();
      }
      const match = SEPARATOR.exec(line);
      if (!match) return { s1: line, s2: "", tags };
      const s1 = line.slice(0, match.index).trim();
      const s2 = line.slice(match.index + match[0].length).trim();
      return { s1, s2, tags };
    })
    .filter((p) => p.s1.length > 0);
}

export function BulkAddSection({ topicId, tagIds, onCardAdded }: Props) {
  const { reload: reloadSubjects } = useSubjects();
  const { subjectId } = useCurrentSubject();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const {
    tagsForTopic,
    ensureSubject: ensureTags,
    reloadSubject: reloadTags,
  } = useTags();

  useEffect(() => {
    if (subjectId) ensureTags(subjectId);
  }, [subjectId, ensureTags]);

  // #tags written in the list, split into ones the topic already has and
  // ones that'll be created on add — shown under the textarea as a preview
  const topicTags = topicId ? tagsForTopic(subjectId, topicId) : [];
  const lineTagNames = [...new Set(parseLines(text).flatMap((l) => l.tags))];
  const newTagNames = lineTagNames.filter(
    (n) => !topicTags.some((tg) => tg.name.toLowerCase() === n)
  );

  async function submit() {
    if (!subjectId) {
      setStatus(t.validationSubject);
      return;
    }
    if (!topicId) {
      setStatus(t.validationTopic);
      return;
    }
    const lines = parseLines(text);
    if (lines.length === 0) {
      setStatus(t.bulkNoLines);
      return;
    }

    setBusy(true);
    setStatus(t.bulkAdding);

    // name → id for this topic's tags, creating any #tag that's missing
    const idByName = new Map(
      topicTags.map((tg) => [tg.name.toLowerCase(), tg._id])
    );
    try {
      for (const [i, name] of newTagNames.entries()) {
        const color = TAG_COLORS[(topicTags.length + i) % TAG_COLORS.length];
        const tag = await api.createTag(name, color, subjectId, topicId);
        idByName.set(name, tag._id);
      }
    } catch (e: unknown) {
      setBusy(false);
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
      if (newTagNames.length > 0) reloadTags(subjectId);
      return;
    }
    if (newTagNames.length > 0) reloadTags(subjectId);

    let ok = 0;
    let fail = 0;
    for (const line of lines) {
      const lineTagIds = line.tags.flatMap((n) => idByName.get(n) ?? []);
      try {
        await api.addCard({
          subjectId,
          topicId,
          progress: {},
          tagIds: [...new Set([...tagIds, ...lineTagIds])],
          s1: { text: line.s1, text2: "", photo: "" },
          s2: { text: line.s2, text2: "", photo: "" },
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusy(false);
    if (ok > 0) {
      // success is shown as the transient toast only — no lingering line
      setStatus(fail === 0 ? "" : t.bulkPartial(ok, fail));
      setText("");
      setToastMsg(t.bulkDone(ok));
      setTimeout(() => setToastMsg(""), 2000);
      if (fail > 0) setTimeout(() => setStatus(""), 4000);
      onCardAdded();
      reloadSubjects();
    } else {
      setStatus(t.bulkPartial(ok, fail));
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(t.bulkPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      setStatus(t.statusError + "clipboard");
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const content = await file.text();
    setText((prev) => (prev ? prev + "\n" + content : content));
  }

  return (
    <>
      <div className="side-section" style={{ position: "relative" }}>
        {/* "kopeeri AI prompt" — hidden for now, wiring kept so it's a
            one-line change to bring back. */}
        <button type="button" onClick={copyPrompt} style={{ display: "none" }}>
          {promptCopied ? t.bulkPromptCopied : t.bulkPromptLink}
        </button>
        <p
          className="status"
          style={{
            textAlign: "left",
            color: "#718096",
          }}
        >
          {t.bulkHint}
        </p>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (status) setStatus("");
          }}
          placeholder={t.bulkPlaceholder}
          rows={8}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "1.5px solid #cbd5e0",
            borderRadius: 10,
            fontSize: "1rem",
            fontFamily: "inherit",
            color: "#2d3748",
            background: "#f7fafc",
            resize: "vertical",
          }}
        />
        {lineTagNames.length > 0 && (
          <p className={styles.bulkTags}>
            {t.bulkLineTags}{" "}
            {lineTagNames.map((n) => (
              <span key={n} className={styles.bulkTag}>
                #{n}
                {newTagNames.includes(n) && (
                  <span className={styles.bulkTagNew}> {t.bulkTagNew}</span>
                )}
              </span>
            ))}
          </p>
        )}
        <label className="photo-label">
          {t.bulkChooseFile}
          <input type="file" accept=".txt,.csv,text/plain" onChange={onFile} />
        </label>
      </div>

      {status && <p className="status">{status}</p>}
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}
      <div className="form-buttons">
        <button className="btn-save" onClick={submit} disabled={busy}>
          {t.bulkBtnAdd}
        </button>
      </div>
    </>
  );
}
