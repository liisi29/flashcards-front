import { useState, useEffect } from "react";
import type { Session, Subject } from "../types";
import { USERS } from "../types";
import { api } from "../api";
import { loadSession } from "../session";
import styles from "./WelcomePage.module.css";
import SubjectSelect from "../components/SubjectSelect";

const LOADER_MSGS = [
  "🐌 Server ärkab üles...",
  "☕ Server joob kohvi...",
  "🦥 Server venib...",
  "🐢 Kõik head asjad võtavad aega...",
  "🧘 Server mediteerib...",
  "🌀 Bitid ja baidid veerevad...",
  "🐠 Server ujub kohale...",
  "🍵 Server keedab teed...",
  "🦔 Server siilub...",
  "🌙 Server oli uinunud, sorry...",
];

const NEW_VALUE = "__new__";

interface Props {
  onEnterMain: (_session: Session) => void;
  onEnterLearn: (_session: Session) => void;
}

export default function Welcome({ onEnterMain, onEnterLearn }: Props) {
  const saved = loadSession();
  const [name, setName] = useState(saved.name);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(saved.subjectId || "");
  const [topicId, setTopicId] = useState(saved.topicId || "");
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);

  const ready = !!name && !!subjectId && subjectId !== NEW_VALUE;

  function makeSession(): Session {
    return {
      name,
      subjectId,
      topicId: topicId === NEW_VALUE ? "" : topicId || "",
      viewers: [name],
    };
  }

  useEffect(() => {
    async function loadSubjects() {
      setLoaderMsg(LOADER_MSGS[0]);
      setLoadError(false);
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % LOADER_MSGS.length;
        setLoaderMsg(LOADER_MSGS[i]);
      }, 3000);

      for (let attempt = 0; attempt < 20; attempt++) {
        try {
          const list = await api.getSubjects();
          clearInterval(interval);
          setSubjects(list);
          setLoaderMsg("");
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
      clearInterval(interval);
      setLoaderMsg("");
      setLoadError(true);
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!subjectId || subjectId === NEW_VALUE) return;
    api
      .getTopics(subjectId)
      .then(setTopics)
      .catch(() => setTopics([]));
  }, [subjectId]);

  return (
    <div className={styles.welcome}>
      <h1>Flashcards</h1>
      <div className={styles["welcome-box"]}>
        <div>
          <label>Kes sa oled?</label>
          <div className={styles["name-chips"]}>
            {USERS.map((u) => (
              <div
                key={u}
                className={`${styles["name-chip"]}${name === u ? ` ${styles.selected}` : ""}`}
                onClick={() => setName(u)}
              >
                {u}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label>Teema</label>
          {loaderMsg && (
            <div className={styles["welcome-loader"]}>{loaderMsg}</div>
          )}
          {loadError && (
            <div className={styles["welcome-loader"]}>Ühendus ebaõnnestus</div>
          )}
          {!loaderMsg && !loadError && (
            <SubjectSelect
              subjects={subjects}
              value={subjectId}
              onChange={(id) => {
                setSubjectId(id);
                setTopicId("");
                setTopics([]);
              }}
              onCreated={(s) => {
                setSubjects((prev) => [...prev, s]);
                setSubjectId(s._id);
              }}
              onCreate={(label) => api.createSubject(label)}
              placeholder="-- Vali teema --"
              newPlaceholder="Uue teema nimi..."
            />
          )}
        </div>

        {subjectId && subjectId !== NEW_VALUE && topics.length > 0 && (
          <div>
            <label>Alamteema (valikuline)</label>
            <SubjectSelect
              subjects={topics}
              value={topicId}
              onChange={setTopicId}
              onCreated={(t) => {
                setTopics((prev) => [...prev, t]);
                setTopicId(t._id);
              }}
              onCreate={(label) => api.createSubject(label, subjectId)}
              placeholder="-- Kõik --"
              newPlaceholder="Uue alamteema nimi..."
            />
          </div>
        )}

        {ready && (
          <div className={styles["welcome-actions"]}>
            <button
              className={styles["btn-welcome-action"]}
              onClick={() => onEnterMain(makeSession())}
            >
              ✏️ Lisa kaarte
            </button>
            <button
              className={`${styles["btn-welcome-action"]} ${styles["btn-welcome-learn"]}`}
              onClick={() => onEnterLearn(makeSession())}
            >
              📖 Õpi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
