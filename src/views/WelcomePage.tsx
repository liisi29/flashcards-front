import { useState, useEffect, useRef } from "react";
import type { ISubject, ISession } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";

const NEW_VALUE = "__new__";

interface Props {
  session: ISession;
  onEnterAdd: (_subjectId: string, _topicId: string) => void;
  onEnterLearn: (_subjectId: string, _topicIds: string[]) => void;
}

export default function Welcome({ session, onEnterAdd, onEnterLearn }: Props) {
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [topics, setTopics] = useState<ISubject[]>([]);
  const [subjectId, setSubjectId] = useState(session.subjectId || "");
  const [topicIds, setTopicIds] = useState<string[]>(
    session.topicIds?.length
      ? session.topicIds
      : session.topicId
        ? [session.topicId]
        : []
  );
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [addingNewTopic, setAddingNewTopic] = useState(false);
  const [newTopicLabel, setNewTopicLabel] = useState("");
  const [showMultiHint, setShowMultiHint] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);
  const topicDropdownRef = useRef<HTMLDivElement>(null);

  const singleTopicId = topicIds.length === 1 ? topicIds[0] : "";
  const readyForLearn =
    !!subjectId && subjectId !== NEW_VALUE && topicIds.length > 0;
  const readyForAdd =
    !!subjectId &&
    subjectId !== NEW_VALUE &&
    topicIds.length === 1 &&
    singleTopicId !== NEW_VALUE;

  useEffect(() => {
    async function loadSubjects() {
      const randomMsg = () => {
        const idx = Math.floor(Math.random() * t.loaderMsgs.length);
        return t.loaderMsgs[idx];
      };
      setLoaderMsg(randomMsg());
      setLoadError(false);
      const interval = setInterval(() => {
        setLoaderMsg(randomMsg());
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

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        topicDropdownRef.current &&
        !topicDropdownRef.current.contains(e.target as Node)
      ) {
        setTopicDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function toggleTopic(id: string) {
    setShowMultiHint(false);
    setTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const topicLabel =
    topicIds.length === 0
      ? t.placeholderTopic
      : topicIds.length === 1
        ? (topics.find((tp) => tp._id === topicIds[0])?.label ??
          t.placeholderTopic)
        : `${topicIds.length} teemat`;

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
              onChange={(id) => {
                setSubjectId(id);
                setTopicIds([]);
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
            <label>{t.addTopic}</label>
            {topics.length === 0 && (
              <div className={styles.newTopicRow}>
                <input
                  type="text"
                  placeholder={t.placeholderNewTopic}
                  value={newTopicLabel}
                  onChange={(e) => setNewTopicLabel(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter" && newTopicLabel.trim()) {
                      const s = await api.createSubject(
                        newTopicLabel.trim(),
                        subjectId
                      );
                      setTopics((prev) => [...prev, s]);
                      setTopicIds([s._id]);
                      setNewTopicLabel("");
                    }
                  }}
                />
                <button
                  className="btn-save"
                  onClick={async () => {
                    if (!newTopicLabel.trim()) return;
                    const s = await api.createSubject(
                      newTopicLabel.trim(),
                      subjectId
                    );
                    setTopics((prev) => [...prev, s]);
                    setTopicIds([s._id]);
                    setNewTopicLabel("");
                  }}
                >
                  +
                </button>
              </div>
            )}
            {topics.length > 0 && (
              <div ref={topicDropdownRef} className={styles.topicDropdown}>
                <button
                  className={styles.topicDropdownTrigger}
                  onClick={() => setTopicDropdownOpen((o) => !o)}
                  type="button"
                >
                  {topicLabel}
                  <span className={styles.dropdownCaret}>
                    {topicDropdownOpen ? "▲" : "▼"}
                  </span>
                </button>
                {topicDropdownOpen && (
                  <div className={styles.topicDropdownMenu}>
                    {topics.map((topic) => (
                      <label
                        key={topic._id}
                        className={styles.topicDropdownItem}
                      >
                        <input
                          type="checkbox"
                          checked={topicIds.includes(topic._id)}
                          onChange={() => toggleTopic(topic._id)}
                        />
                        {topic.label}
                      </label>
                    ))}
                    <label className={styles.topicDropdownItem}>
                      <input
                        type="checkbox"
                        checked={addingNewTopic}
                        onChange={() => {
                          setAddingNewTopic((v) => !v);
                          setNewTopicLabel("");
                        }}
                      />
                      {t.addNew}
                    </label>
                    {addingNewTopic && (
                      <div className={styles.newTopicRow}>
                        <input
                          type="text"
                          placeholder={t.placeholderNewTopic}
                          value={newTopicLabel}
                          autoFocus
                          onChange={(e) => setNewTopicLabel(e.target.value)}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && newTopicLabel.trim()) {
                              const s = await api.createSubject(
                                newTopicLabel.trim(),
                                subjectId
                              );
                              setTopics((prev) => [...prev, s]);
                              setTopicIds([s._id]);
                              setNewTopicLabel("");
                              setAddingNewTopic(false);
                              setTopicDropdownOpen(false);
                            }
                          }}
                        />
                        <button
                          className="btn-save"
                          onClick={async () => {
                            if (!newTopicLabel.trim()) return;
                            const s = await api.createSubject(
                              newTopicLabel.trim(),
                              subjectId
                            );
                            setTopics((prev) => [...prev, s]);
                            setTopicIds([s._id]);
                            setNewTopicLabel("");
                            setAddingNewTopic(false);
                            setTopicDropdownOpen(false);
                          }}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {readyForLearn && (
          <div className={styles.welcomeActions}>
            <button
              className={styles.btnWelcomeAction}
              onClick={() => {
                if (!readyForAdd) {
                  setShowMultiHint(true);
                } else {
                  onEnterAdd(subjectId, singleTopicId);
                }
              }}
            >
              {t.btnAddCards}
            </button>
            <button
              className={`${styles.btnWelcomeAction} ${styles.btnWelcomeLearn}`}
              onClick={() => onEnterLearn(subjectId, topicIds)}
            >
              {t.btnLearn}
            </button>
          </div>
        )}

        {showMultiHint && (
          <p className={styles.multiTopicHint}>
            Kaartide lisamiseks vali ainult üks teema.
          </p>
        )}
      </div>
    </div>
  );
}
