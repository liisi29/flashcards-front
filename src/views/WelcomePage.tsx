import { useState, useEffect } from "react";
import type { ISubject } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";
import { useCurrentSubject } from "../contexts/CurrentSubjectContext";

const NEW_VALUE = "__new__";

interface Props {
  onEnterAdd: () => void;
  onEnterLearn: () => void;
}

export default function Welcome({ onEnterAdd, onEnterLearn }: Props) {
  const { subjectId, setSubjectId } = useCurrentSubject();
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);

  const ready = !!subjectId && subjectId !== NEW_VALUE;

  useEffect(() => {
    async function loadSubjects() {
      const randomMsg = () =>
        t.loaderMsgs[Math.floor(Math.random() * t.loaderMsgs.length)];
      setLoaderMsg(randomMsg());
      setLoadError(false);
      const interval = setInterval(() => setLoaderMsg(randomMsg()), 3000);

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

  return (
    <div className={styles.welcome}>
      <div className={styles.welcomeBox}>
        <div>
          {loaderMsg && <div>{loaderMsg}</div>}
          {loadError && <div>{t.loaderFailed}</div>}
          {!loaderMsg && !loadError && (
            <SubjectSelect
              label={t.addSubject}
              subjects={subjects}
              value={subjectId}
              onChange={(id) => setSubjectId(id)}
              onCreated={(s) => {
                setSubjects((prev) => [...prev, s]);
                setSubjectId(s._id);
              }}
              onCreate={(label) => api.createSubject(label)}
              placeholder={t.placeholderSubject}
              newPlaceholder={t.placeholderNewSubject}
            />
          )}
        </div>

        {ready && (
          <div className={styles.welcomeActions}>
            <button className={styles.btnWelcomeAction} onClick={onEnterAdd}>
              {t.btnAddCards}
            </button>
            <button
              className={`${styles.btnWelcomeAction} ${styles.btnWelcomeLearn}`}
              onClick={onEnterLearn}
            >
              {t.btnLearn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
