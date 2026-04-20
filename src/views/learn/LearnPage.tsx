import { useState, useEffect } from "react";
import { t } from "../../strings";
import type { ICard, Color, ISession, ISubject } from "../../types";
import { api } from "../../api";
import styles from "./LearnPage.module.css";
import { CardItem } from "../../components/card/CardItem";
import { LearnSubBar } from "./LearnSubBar";

const PROGRESS_KEY = "all";

interface Props {
  session: ISession;
  onExit: () => void;
}

type LearnMode = "single" | "grid";

export function Learn({ session, onExit: _onExit }: Props) {
  const [mode, setMode] = useState<LearnMode>("single");
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
  const [activeColors, setActiveColors] = useState<Color[]>([
    null,
    "red",
    "yellow",
  ]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>([]);
  const [allCards, setAllCards] = useState<ICard[]>([]);
  const [learnCards, setLearnCards] = useState<ICard[]>([]);
  const [idx, setIdx] = useState(0);
  const [, setFlipped] = useState(false);

  useEffect(() => {
    api
      .getSubjects()
      .then(setSubjects)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (subjectId) {
      api
        .getTopics(subjectId)
        .then(setTopics)
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [subjectId]);

  function handleSubjectChange(id: string) {
    setSubjectId(id);
    setTopicIds([]);
  }

  useEffect(() => {
    api
      .getCardsByTopics(subjectId, topicIds)
      .then((all) => {
        const shuffled = shuffle(all);
        setAllCards(shuffled);
        setLearnCards(applyFilters(shuffled, activeColors, activeTagIds));
        setIdx(0);
        setFlipped(false);
      })
      .catch(() => {});
  }, [subjectId, topicIds]);

  function applyFilters(cards: ICard[], colors: Color[], tagIds: string[]) {
    return cards.filter((c) => {
      if (!colors.includes(c.progress?.[PROGRESS_KEY] ?? null)) return false;
      if (tagIds.length > 0 && !tagIds.some((id) => (c.tagIds ?? []).includes(id))) return false;
      return true;
    });
  }

  useEffect(() => {
    const filtered = applyFilters(allCards, activeColors, activeTagIds);
    setLearnCards(filtered);
    setIdx((i) => Math.min(i, Math.max(filtered.length - 1, 0)));
  }, [allCards]);

  useEffect(() => {
    const filtered = applyFilters(allCards, activeColors, activeTagIds);
    setLearnCards(filtered);
    setIdx(0);
    setFlipped(false);
  }, [activeColors, activeTagIds]);

  function shuffle(cards: ICard[]) {
    return [...cards].sort(() => Math.random() - 0.5);
  }

  function toggleColor(c: Color) {
    setActiveColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function toggleTopic(id: string) {
    setTopicIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleTag(id: string) {
    setActiveTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleProgressChange(id: string, color: Color) {
    console.log(id, color);
    setAllCards((prev) =>
      prev.map((c) =>
        c._id === id
          ? { ...c, progress: { ...c.progress, [PROGRESS_KEY]: color } }
          : c
      )
    );
  }

  function doShuffle() {
    setLearnCards((prev) => shuffle(prev));
    setIdx(0);
    setFlipped(false);
  }

  const colorCounts: Record<string, number> = {};
  for (const c of allCards) {
    const key = String(c.progress?.[PROGRESS_KEY] ?? null);
    colorCounts[key] = (colorCounts[key] ?? 0) + 1;
  }

  const subBar = (
    <LearnSubBar
      subjects={subjects}
      topics={topics}
      subjectId={subjectId}
      topicIds={topicIds}
      activeColors={activeColors}
      mode={mode}
      totalCount={allCards.length}
      colorCounts={colorCounts}
      onSubjectChange={handleSubjectChange}
      activeTagIds={activeTagIds}
      onToggleTopic={toggleTopic}
      onToggleColor={toggleColor}
      onToggleTag={toggleTag}
      onModeChange={setMode}
      onShuffle={doShuffle}
    />
  );

  if (mode === "grid") {
    return (
      <div
        className={styles.pageLearning}
        style={{ justifyContent: "flex-start" }}
      >
        {subBar}
        <div className={styles.cards} style={{ padding: 24 }}>
          {learnCards.map((card) => (
            <CardItem
              key={card._id}
              card={card}
              onProgressChange={handleProgressChange}
            />
          ))}
        </div>
      </div>
    );
  }

  // Single card mode
  const card = learnCards[idx];
  if (!card)
    return (
      <div className={styles.pageLearning}>
        {subBar}
        <p style={{ color: "#a0aec0", marginTop: 40 }}>{t.noCards}</p>
      </div>
    );

  return (
    <div className={styles.pageLearning}>
      {subBar}
      <span className={styles.learnCounter}>
        {idx + 1} / {learnCards.length}
      </span>
      <CardItem
        key={card._id}
        card={card}
        onProgressChange={handleProgressChange}
      />

      <div className={styles.learnNav}>
        <button
          className={styles.btnLearnNav}
          onClick={() => {
            setIdx((i) => (i === 0 ? learnCards.length - 1 : i - 1));
            setFlipped(false);
          }}
        >
          ←
        </button>
        <div className={styles.learnProgressDots}>
          {learnCards.map((_, i) => (
            <div
              key={i}
              className={`${styles.learnDot}${i === idx ? ` ${styles.active}` : ""}`}
              onClick={() => {
                setIdx(i);
                setFlipped(false);
              }}
            />
          ))}
        </div>
        <button
          className={styles.btnLearnNav}
          onClick={() => {
            setIdx((i) => (i === learnCards.length - 1 ? 0 : i + 1));
            setFlipped(false);
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}
