import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ISubject } from "../types";
import { api } from "../api";
import styles from "./WelcomePage.module.css";
import { t } from "../strings";
import { SubjectSelect } from "../components/SubjectSelect";
import { CheckDropdown } from "../components/CheckDropdown";
import { useCurrentSubject } from "../contexts/CurrentSubjectContext";
import { useSubjects } from "../contexts/SubjectsContext";
import { useTags } from "../contexts/TagsContext";
import { useSettings } from "../contexts/SettingsContext";
import { useUser } from "../useUser";
import { clearUser } from "../user";
import {
  TAGS_KEY,
  TOPICS_KEY,
  readScopeIds,
  writeScopeIds,
} from "../utils/learnScope";

const NEW_VALUE = "__new__";

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
  // the choice is kept for the session and shared with Õpi, Ülevaade and
  // Lisa (utils/learnScope) — written as you tick, so every button and
  // the header's links get it
  const [topicIds, setTopicIds] = useState<string[]>(() =>
    readScopeIds(TOPICS_KEY)
  );
  const [tagIds, setTagIds] = useState<string[]>(() => readScopeIds(TAGS_KEY));

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

  // topic/tag choices don't survive a subject *change* — but not on the
  // first render, so coming back here keeps them (same as Õpi)
  const prevSubject = useRef(subjectId);
  useEffect(() => {
    if (prevSubject.current === subjectId) return;
    prevSubject.current = subjectId;
    setTopicIds([]);
    setTagIds([]);
  }, [subjectId]);

  useEffect(() => writeScopeIds(TOPICS_KEY, topicIds), [topicIds]);
  useEffect(() => writeScopeIds(TAGS_KEY, tagIds), [tagIds]);

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
    const next = topicIds.includes(id)
      ? topicIds.filter((x) => x !== id)
      : [...topicIds, id];
    setTopicIds(next);
    // drop tag selections that no longer belong to any selected topic
    const kept = new Set(next);
    setTagIds((prev) =>
      prev.filter((tg) =>
        kept.has(
          (tagsFor(subjectId) ?? []).find((x) => x._id === tg)?.topicId ?? ""
        )
      )
    );
  }

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

      <div className={styles.pickerCol}>
        <h2 className={styles.pickerHeading}>{t.hubWhatToday}</h2>

        {/* aine | teema | sildid side by side (stacked on phones) */}
        <div className={styles.pickRow}>
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
            <CheckDropdown
              label={t.addTopic}
              placeholder={t.allTopicsPick}
              options={topics.map((tp) => ({ id: tp._id, label: tp.label }))}
              selected={topicIds}
              onToggle={toggleTopic}
              empty={t.noTopicsYet}
            />
          )}

          {ready && (
            <CheckDropdown
              label={t.labelTags}
              placeholder={t.allTagsPick}
              options={tags.map((tag) => ({
                id: tag._id,
                label: tag.name,
                color: tag.color,
                hint:
                  topicIds.length > 1
                    ? topics.find((tp) => tp._id === tag.topicId)?.label
                    : undefined,
              }))}
              selected={tagIds}
              onToggle={toggleTag}
              empty={topicIds.length ? t.topicNoTags : t.tagsPickTopicFirst}
            />
          )}
        </div>

        {/* what to do with that choice — every button uses it */}
        {ready ? (
          <div className={styles.actions}>
            <button
              className={`${styles.hubCard} ${styles.hubCardMain}`}
              onClick={onEnterLearn}
            >
              <span className={styles.hubCardTitle}>{t.btnLearn}</span>
              <span className={styles.hubCardDesc}>{t.hubLearnDesc}</span>
            </button>

            <button className={styles.hubCard} onClick={onEnterAdd}>
              <span className={styles.hubCardTitle}>{t.hubAddEditTitle}</span>
              <span className={styles.hubCardDesc}>{t.hubAddEditDesc}</span>
            </button>

            <button
              className={styles.hubCard}
              onClick={() => navigate("/overview")}
            >
              <span className={styles.hubCardTitle}>{t.hubOverviewTitle}</span>
              <span className={styles.hubCardDesc}>{t.hubOverviewDesc}</span>
            </button>

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
          </div>
        ) : (
          <p className={styles.hubHint}>{t.hubPickTopicHint}</p>
        )}
      </div>
    </div>
  );
}
