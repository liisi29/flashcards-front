import { useState, useEffect, useRef } from "react";
import { t } from "../../strings";
import type { ICard, Color, ISession, ISubject } from "../../types";
import { api } from "../../api";
import styles from "./LearnPage.module.css";
import { CardItem } from "../../components/card/CardItem";
import { TextSelect } from "../../components/TextSelect";

const PROGRESS_KEY = "all";

const ALL_COLORS: Color[] = [null, "red", "yellow", "green"];
const COLOR_LABELS: Record<string, string> = {
  null: t.colorNull,
  red: t.colorRed,
  yellow: t.colorYellow,
  green: t.colorGreen,
};
const COLOR_DOT: Record<string, string> = {
  null: "#718096",
  red: "#fc8181",
  yellow: "#f6e05e",
  green: "#68d391",
};

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
  const [topicId, setTopicId] = useState(session.topicId || "");
  const [activeColors, setActiveColors] = useState<Color[]>([
    null,
    "red",
    "yellow",
  ]);
  const [allCards, setAllCards] = useState<ICard[]>([]);
  const [learnCards, setLearnCards] = useState<ICard[]>([]);
  const [idx, setIdx] = useState(0);
  const [, setFlipped] = useState(false);
  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      setTopicId("");
    }
  }, [subjectId]);

  // Load cards when subject/topic changes
  useEffect(() => {
    api
      .getCards(subjectId || undefined, topicId || undefined)
      .then((all) => {
        const shuffled = shuffle(all);
        setAllCards(shuffled);
        setLearnCards(
          shuffled.filter((c) =>
            activeColors.includes(c.progress?.[PROGRESS_KEY] ?? null)
          )
        );
        setIdx(0);
        setFlipped(false);
      })
      .catch(() => {});
  }, [subjectId, topicId]);

  // Re-filter when activeColors changes
  useEffect(() => {
    const filtered = allCards.filter((c) =>
      activeColors.includes(c.progress?.[PROGRESS_KEY] ?? null)
    );
    setLearnCards(filtered);
    setIdx(0);
    setFlipped(false);
  }, [activeColors]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setColorDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function shuffle(cards: ICard[]) {
    return [...cards].sort(() => Math.random() - 0.5);
  }

  function toggleColor(c: Color) {
    setActiveColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function doShuffle() {
    setLearnCards((prev) => shuffle(prev));
    setIdx(0);
    setFlipped(false);
  }

  const subBar = (
    <div className={styles.subBar}>
      <div className={styles.subBarLeft}>
        <TextSelect
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjects}
          noneLabel={t.allSubjects}
          className={styles.subBarSelect}
        />
        {subjectId && topics.length > 0 && (
          <TextSelect
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            options={topics}
            noneLabel={t.allTopics}
            className={styles.subBarSelect}
          />
        )}
      </div>

      <div className={styles.subBarRight}>
        {/* Raskusaste dropdown */}
        <div className={styles.colorDropdown} ref={dropdownRef}>
          <button
            className={styles.colorDropdownTrigger}
            onClick={() => setColorDropdownOpen((o) => !o)}
          >
            Raskusaste
            <span className={styles.colorDots}>
              {ALL_COLORS.filter((c) => activeColors.includes(c)).map((c) => (
                <span
                  key={String(c)}
                  className={styles.colorDotSmall}
                  style={{ background: COLOR_DOT[String(c)] }}
                />
              ))}
            </span>
            <span className={styles.dropdownCaret}>
              {colorDropdownOpen ? "▲" : "▼"}
            </span>
          </button>
          {colorDropdownOpen && (
            <div className={styles.colorDropdownMenu}>
              {ALL_COLORS.map((c) => (
                <label key={String(c)} className={styles.colorDropdownItem}>
                  <input
                    type="checkbox"
                    checked={activeColors.includes(c)}
                    onChange={() => toggleColor(c)}
                  />
                  <span
                    className={styles.colorDotSmall}
                    style={{ background: COLOR_DOT[String(c)] }}
                  />
                  {COLOR_LABELS[String(c)]}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Shuffle — grid only */}
        {mode === "grid" && (
          <button className={styles.subBarBtn} onClick={doShuffle}>
            {t.btnShuffle}
          </button>
        )}

        {/* View toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${mode === "single" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => setMode("single")}
            title="Üks kaart"
          >
            □
          </button>
          <button
            className={`${styles.viewToggleBtn}${mode === "grid" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => setMode("grid")}
            title="Kõik kaardid"
          >
            ⊞
          </button>
        </div>
      </div>
    </div>
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
            <CardItem key={card._id} card={card} />
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
      <CardItem card={card} key={card._id} />

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
