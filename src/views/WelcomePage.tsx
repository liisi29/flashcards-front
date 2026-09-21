import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ISubject } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";
import { useCurrentSubject } from "../contexts/CurrentSubjectContext";
import { useSubjects } from "../contexts/SubjectsContext";
import { useTags } from "../contexts/TagsContext";
import { useSettings } from "../contexts/SettingsContext";
import { useUser } from "../useUser";
import { clearUser } from "../user";

const NEW_VALUE = "__new__";
const TOPICS_KEY = "learn-topics";
const TAGS_KEY = "learn-tags";

interface Props {
  onEnterAdd: () => void;
  onEnterLearn: () => void;
  onEnterPimekiri: () => void;
}

export default function Welcome({
  onEnterAdd,
  onEnterLearn,
  onEnterPimekiri,
}: Props) {
  const navigate = useNavigate();
  const user = useUser();
  const { lastActive } = useSettings();
  const { subjectId, setSubjectId } = useCurrentSubject();
  const { allTopics } = useSubjects();
  const { tagsFor, ensureSubject: ensureTags } = useTags();
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [topicIds, setTopicIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

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

  // topic/tag choices don't survive a subject change
  useEffect(() => {
    setTopicIds([]);
    setTagIds([]);
  }, [subjectId]);

  // drop tag selections that no longer belong to any selected topic
  useEffect(() => {
    setTagIds([]);
  }, [topicIds.join(",")]);

  useEffect(() => {
    if (ready) ensureTags(subjectId);
  }, [ready, subjectId, ensureTags]);

  const topics = useMemo(
    () => allTopics.filter((tp) => tp.parentId === subjectId),
    [allTopics, subjectId]
  );

  const topicIdSet = useMemo(() => new Set(topicIds), [topicIds]);
  const tags = useMemo(
    () => (tagsFor(subjectId) ?? []).filter((tg) => topicIdSet.has(tg.topicId)),
    [tagsFor, subjectId, topicIdSet]
  );

  function toggleTopic(id: string) {
    setTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function seedLearnScope() {
    sessionStorage.setItem(TOPICS_KEY, JSON.stringify(topicIds));
    sessionStorage.setItem(TAGS_KEY, JSON.stringify(tagIds));
  }

  function enterLearn() {
    seedLearnScope();
    onEnterLearn();
  }

  function enterOverview() {
    seedLearnScope();
    navigate("/overview");
  }

  function switchUser() {
    clearUser(); // re-shows the UserGate picker
  }

  return (
    <div className={styles.welcome}>
      {user && (
        <div className={styles.userHeader}>
          <span className={styles.userName}>{user.label}</span>
          {lastActive && (
            <span className={styles.userLastActive}>
              {t.lastActivePrefix}
              {new Date(lastActive).toLocaleDateString("et-EE")}
            </span>
          )}
          <button className={styles.userSwitch} onClick={switchUser}>
            {t.switchUser}
          </button>
        </div>
      )}

      {/* always available, no subject required */}
      <div className={styles.generalLinks}>
        <button className={styles.hubCard} onClick={onEnterPimekiri}>
          <span className={styles.hubCardTitle}>{t.hubPimekiriTitle}</span>
          <span className={styles.hubCardDesc}>{t.hubPimekiriDesc}</span>
        </button>

        <button
          className={styles.hubCard}
          onClick={() => navigate("/settings")}
        >
          <span className={styles.hubCardTitle}>{t.hubSettingsTitle}</span>
          <span className={styles.hubCardDesc}>{t.hubSettingsDesc}</span>
        </button>
      </div>

      <div className={styles.divider} />
      <p className={styles.sectionLabel}>{t.hubSubjectSectionLabel}</p>

      <div className={styles.hubGrid}>
        <div className={styles.pickerCol}>
          <h2 className={styles.pickerHeading}>{t.hubWhatToday}</h2>

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
            <>
              {topics.length > 0 && (
                <div className={styles.checkGroup}>
                  <label>{t.addTopic}</label>
                  <div className={styles.checkList}>
                    {topics.map((topic) => (
                      <label key={topic._id} className={styles.checkItem}>
                        <input
                          type="checkbox"
                          checked={topicIds.includes(topic._id)}
                          onChange={() => toggleTopic(topic._id)}
                        />
                        {topic.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {topicIds.length > 0 && (
                <div className={styles.checkGroup}>
                  <label>{t.allTags}</label>
                  <div className={styles.checkList}>
                    {tags.length === 0 && (
                      <span className={styles.checkEmpty}>{t.topicNoTags}</span>
                    )}
                    {tags.map((tag) => (
                      <label key={tag._id} className={styles.checkItem}>
                        <input
                          type="checkbox"
                          checked={tagIds.includes(tag._id)}
                          onChange={() => toggleTag(tag._id)}
                        />
                        <span
                          className={styles.checkDot}
                          style={{ background: tag.color }}
                        />
                        {tag.name}
                        {topicIds.length > 1 && (
                          <span className={styles.checkTopicHint}>
                            {topics.find((tp) => tp._id === tag.topicId)?.label}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <button
                className={`${styles.btnWelcomeAction} ${styles.btnWelcomeLearn}`}
                onClick={enterLearn}
              >
                {t.btnLearn}
              </button>
            </>
          )}
        </div>

        <div className={styles.hubLinks}>
          {ready ? (
            <>
              <button
                className={styles.hubCard}
                onClick={() => navigate(`/structure/${subjectId}`)}
              >
                <span className={styles.hubCardTitle}>
                  {t.hubSubjectStructure}
                </span>
                <span className={styles.hubCardDesc}>
                  {t.hubSubjectStructureDesc}
                </span>
              </button>

              <button className={styles.hubCard} onClick={onEnterAdd}>
                <span className={styles.hubCardTitle}>{t.hubAddEditTitle}</span>
                <span className={styles.hubCardDesc}>{t.hubAddEditDesc}</span>
              </button>

              <button className={styles.hubCard} onClick={enterOverview}>
                <span className={styles.hubCardTitle}>
                  {t.hubOverviewTitle}
                </span>
                <span className={styles.hubCardDesc}>{t.hubOverviewDesc}</span>
              </button>
            </>
          ) : (
            <p className={styles.hubHint}>{t.hubPickTopicHint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
