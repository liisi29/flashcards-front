import { useEffect, useState } from "react";
import type { ISession, ISubject } from "../../types";
import { api } from "../../api";
import styles from "./AddSection.module.css";
import { t } from "../../strings";
import { SubjectSelect } from "../../components/SubjectSelect";

interface Props {
  session: ISession;
  updateSession: (_updates: Partial<ISession>) => void;
  onCardAdded: () => void;
}

// Split on the FIRST separator: a space-padded "-" or em/en dash, a ":"
// followed by a space, or a tab. Everything after it is kept verbatim as
// side 2, so a card back can contain ";", ",", ":" etc. Requiring a space
// before "-" keeps hyphenated words (e-mail) from false-triggering; the
// colon only needs a trailing space so "kass: cat" works.
const SEPARATOR = /\s+[-–—]\s+|:\s+|\t/;

interface ParsedLine {
  s1: string;
  s2: string;
}

function parseLines(text: string): ParsedLine[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = SEPARATOR.exec(line);
      if (!match) return { s1: line, s2: "" };
      const s1 = line.slice(0, match.index).trim();
      const s2 = line.slice(match.index + match[0].length).trim();
      return { s1, s2 };
    })
    .filter((p) => p.s1.length > 0);
}

export function BulkAddSection({ session, updateSession, onCardAdded }: Props) {
  const [subjectId, setSubjectId] = useState(session.subjectId || "");
  const [topicId, setTopicId] = useState(session.topicId || "");
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [topics, setTopics] = useState<ISubject[]>([]);
  const [text, setText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);

  useEffect(() => {
    api
      .getSubjects()
      .then(setSubjects)
      .catch(() => console.error("Failed to load subjects"));
  }, []);

  useEffect(() => {
    loadTopics(subjectId);
  }, []);

  function loadTopics(id: string) {
    if (!id) {
      setTopics([]);
      return;
    }
    api
      .getTopics(id)
      .then(setTopics)
      .catch(() => setTopics([]));
  }

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
    let ok = 0;
    let fail = 0;
    for (const line of lines) {
      try {
        await api.addCard({
          subjectId,
          topicId,
          progress: {},
          tagIds: [],
          s1: { text: line.s1, text2: "", photo: "" },
          s2: { text: line.s2, text2: "", photo: "" },
        });
        ok += 1;
      } catch {
        fail += 1;
      }
    }
    setBusy(false);
    setStatus(fail === 0 ? t.bulkDone(ok) : t.bulkPartial(ok, fail));
    if (ok > 0) {
      setText("");
      setToastMsg(t.bulkDone(ok));
      setTimeout(() => setToastMsg(""), 2000);
      onCardAdded();
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
    <div className={styles.addForm}>
      <h2>{t.headingBulk}</h2>
      <div className="side-section">
        <SubjectSelect
          label={t.addSubject}
          subjects={subjects}
          value={subjectId}
          onChange={(id) => {
            setSubjectId(id);
            setTopicId("");
            setTopics([]);
            loadTopics(id);
            updateSession({ subjectId: id, topicId: "" });
          }}
          onCreated={(s) => {
            setSubjects((prev) => [...prev, s]);
            setSubjectId(s._id);
            updateSession({ subjectId: s._id, topicId: "" });
          }}
          onCreate={(label) => api.createSubject(label)}
          placeholder={t.placeholderSubject}
          newPlaceholder={t.placeholderNewSubject}
        />
        {subjectId && subjectId !== "__new__" && (
          <SubjectSelect
            label={t.addTopic}
            subjects={topics}
            value={topicId}
            onChange={(id: string) => {
              setTopicId(id);
              updateSession({ topicId: id });
            }}
            onCreated={(s) => {
              setTopics((prev) => [...prev, s]);
              setTopicId(s._id);
              updateSession({ topicId: s._id });
            }}
            onCreate={(label) => api.createSubject(label, subjectId)}
            placeholder={t.placeholderTopic}
            newPlaceholder={t.placeholderNewTopic}
          />
        )}
      </div>

      <div className="side-section" style={{ position: "relative" }}>
        <button
          type="button"
          onClick={copyPrompt}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "none",
            border: "none",
            padding: 0,
            color: "#4a7c59",
            fontSize: "0.75rem",
            fontFamily: "inherit",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {promptCopied ? t.bulkPromptCopied : t.bulkPromptLink}
        </button>
        <p
          className="status"
          style={{
            textAlign: "left",
            color: "#718096",
            paddingRight: 110,
          }}
        >
          {t.bulkHint}
        </p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
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
    </div>
  );
}
