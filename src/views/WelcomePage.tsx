import { useState, useEffect } from "react";
import type { Subject } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";

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

  const ready =
    !!subjectId &&
    subjectId !== NEW_VALUE &&
    !!topicId &&
    topicId !== NEW_VALUE;

  useEffect(() => {
    async function loadSubjects() {
      setLoaderMsg(t.loaderMsgs[0]);
      setLoadError(false);
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % t.loaderMsgs.length;
        setLoaderMsg(t.loaderMsgs[i]);
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
      <div className={styles.welcomeBox}>
        <div>
          <label>{t.labelSubject}</label>
          {loaderMsg && <div>{loaderMsg}</div>}
          {loadError && <div>{t.loaderFailed}</div>}
          {!loaderMsg && !loadError && (
            <SubjectSelect
              label={t.addSubject}
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
              placeholder={t.placeholderSubject}
              newPlaceholder={t.placeholderNewSubject}
            />
          )}
        </div>

        {subjectId && subjectId !== NEW_VALUE && (
          <div>
            <label>{t.labelTopic}</label>
            <SubjectSelect
              label={t.addTopic}
              subjects={topics}
              value={topicId}
              onChange={setTopicId}
              onCreated={(s) => {
                setTopics((prev) => [...prev, s]);
                setTopicId(s._id);
              }}
              onCreate={(label) => api.createSubject(label, subjectId)}
              placeholder={t.placeholderTopic}
              newPlaceholder={t.placeholderNewTopic}
            />
          </div>
        )}

        {ready && (
          <div className={styles.welcomeActions}>
            <button
              className={styles.btnWelcomeAction}
              onClick={() => onEnterAdd(subjectId, topicId)}
            >
              {t.btnAddCards}
            </button>
            <button
              className={`${styles.btnWelcomeAction} ${styles.btnWelcomeLearn}`}
              onClick={() => onEnterLearn(subjectId, topicId)}
            >
              {t.btnLearn}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
