import { useState, useEffect } from "react";
import type { Subject } from "../types";
import { api } from "../api";
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
  onEnterAdd: (_subjectId: string, _topicId: string) => void;
  onEnterLearn: (_subjectId: string, _topicId: string) => void;
}

export default function Welcome({ onEnterAdd, onEnterLearn }: Props) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);

  const ready = !!subjectId && subjectId !== NEW_VALUE && !!topicId && topicId !== NEW_VALUE;

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

        {subjectId && subjectId !== NEW_VALUE && (
          <div>
            <label>Alamteema</label>
            <SubjectSelect
              subjects={topics}
              value={topicId}
              onChange={setTopicId}
              onCreated={(t) => {
                setTopics((prev) => [...prev, t]);
                setTopicId(t._id);
              }}
              onCreate={(label) => api.createSubject(label, subjectId)}
              placeholder="-- Vali alamteema --"
              newPlaceholder="Uue alamteema nimi..."
            />
          </div>
        )}

        {ready && (
          <div className={styles["welcome-actions"]}>
            <button
              className={styles["btn-welcome-action"]}
              onClick={() => onEnterAdd(subjectId, topicId)}
            >
              ✏️ Lisa kaarte
            </button>
            <button
              className={`${styles["btn-welcome-action"]} ${styles["btn-welcome-learn"]}`}
              onClick={() => onEnterLearn(subjectId, topicId)}
            >
              📖 Õpi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
