import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ISubject } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";
import { TextSelectWithLabel } from "../components/TextSelectWithLabel";
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
  const { tagsForTopic, ensureSubject: ensureTags } = useTags();
  const [subjects, setSubjects] = useState<ISubject[]>([]);
  const [loaderMsg, setLoaderMsg] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [topicId, setTopicId] = useState("");
  const [tagId, setTagId] = useState("");

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
    setTopicId("");
    setTagId("");
  }, [subjectId]);

  useEffect(() => {
    setTagId("");
  }, [topicId]);

  useEffect(() => {
    if (ready) ensureTags(subjectId);
  }, [ready, subjectId, ensureTags]);

  const topics = useMemo(
    () => allTopics.filter((tp) => tp.parentId === subjectId),
    [allTopics, subjectId]
  );
  const tags = topicId ? tagsForTopic(subjectId, topicId) : [];

  function seedLearnScope() {
    sessionStorage.setItem(
      TOPICS_KEY,
      JSON.stringify(topicId ? [topicId] : [])
    );
    sessionStorage.setItem(TAGS_KEY, JSON.stringify(tagId ? [tagId] : []));
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
          <button
            className={styles.userSeaded}
            onClick={() => navigate("/settings")}
          >
            {t.hubSettingsTitle}
          </button>
        </div>
      )}

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
              <TextSelectWithLabel
                label={t.addTopic}
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                options={topics}
                noneLabel={t.placeholderTopic}
              />

              {topicId && (
                <TextSelectWithLabel
                  label={t.allTags}
                  value={tagId}
                  onChange={(e) => setTagId(e.target.value)}
                  options={tags.map((tg) => ({ _id: tg._id, label: tg.name }))}
                  noneLabel={t.allTags}
                />
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
          <button className={styles.hubCard} onClick={onEnterPimekiri}>
            <span className={styles.hubCardTitle}>{t.hubPimekiriTitle}</span>
            <span className={styles.hubCardDesc}>{t.hubPimekiriDesc}</span>
          </button>

          {ready && (
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
          )}

          <button className={styles.hubCard} onClick={onEnterAdd}>
            <span className={styles.hubCardTitle}>{t.hubAddEditTitle}</span>
            <span className={styles.hubCardDesc}>{t.hubAddEditDesc}</span>
          </button>

          {ready && (
            <button className={styles.hubCard} onClick={enterOverview}>
              <span className={styles.hubCardTitle}>{t.hubOverviewTitle}</span>
              <span className={styles.hubCardDesc}>{t.hubOverviewDesc}</span>
            </button>
          )}

          {user && (
            <button className={styles.hubCard} onClick={switchUser}>
              <span className={styles.hubCardTitle}>
                {t.hubSwitchUserTitle}
              </span>
              <span className={styles.hubCardDesc}>{t.hubSwitchUserDesc}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
