import { useState, useEffect } from "react";
import { t } from "../strings";
import type { Card, Color, Session, Subject } from "../types";
import { api } from "../api";
import CardFace from "../components/CardFace";
import SemDot from "../components/SemDot";
import styles from "./LearnPage.module.css";

const COLORS: Color[] = [null, "red", "yellow", "green"];
const PROGRESS_KEY = "all";

interface Props {
  session: Session;
  onExit: () => void;
}

type LearnMode = "config" | "single" | "grid";

export default function Learn({ session, onExit }: Props) {
  const [mode, setMode] = useState<LearnMode>("config");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(session.subjectId || "");
  const [topicId, setTopicId] = useState(session.topicId || "");
  const [random, setRandom] = useState(false);
  const [viewMode, setViewMode] = useState<"single" | "grid">("single");
  const [activeColors, setActiveColors] = useState<Color[]>([
    null,
    "red",
    "yellow",
  ]);
  const [learnCards, setLearnCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

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
      setTopicId("");
    } else {
      setTopics([]);
      setTopicId("");
    }
  }, [subjectId]);

  async function startLearn() {
    let all = await api.getCards(subjectId || undefined, topicId || undefined);
    all = all.filter((c) =>
      activeColors.includes(c.progress?.[PROGRESS_KEY] ?? null)
    );
    if (random) all = all.sort(() => Math.random() - 0.5);
    setLearnCards(all);
    setIdx(0);
    setFlipped(false);
    setMode(viewMode);
  }

  function toggleColor(c: Color) {
    setActiveColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function setProgress(card: Card, color: Color) {
    card.progress = { ...card.progress, [PROGRESS_KEY]: color };
    api.setProgress(card._id, PROGRESS_KEY, color);
    if (!activeColors.includes(color)) {
      const next = learnCards.filter((c) => c._id !== card._id);
      if (!next.length) {
        onExit();
        return;
      }
      setLearnCards(next);
      setIdx((i) => Math.min(i, next.length - 1));
      setFlipped(false);
    } else {
      setLearnCards([...learnCards]);
    }
  }

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || "";
  }

  if (mode === "config") {
    return (
      <div className={styles.page}>
        <div className="learn-config-box">
          <h2>{t.headingLearn}</h2>

          <div className="learn-config-row">
            <label>{t.labelSubject}</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">{t.allSubjects}</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {subjectId && topics.length > 0 && (
            <div className="learn-config-row">
              <label>{t.labelTopic}</label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                <option value="">{t.allTopics}</option>
                {topics.map((topic) => (
                  <option key={topic._id} value={topic._id}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="learn-config-row">
            <label>{t.labelSemafor}</label>
            <div style={{ display: "flex", gap: 10 }}>
              {COLORS.map((c) => (
                <SemDot
                  key={String(c)}
                  color={c}
                  selected={activeColors.includes(c)}
                  onClick={() => toggleColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="learn-config-row">
            <label>
              <input
                type="checkbox"
                checked={random}
                onChange={(e) => setRandom(e.target.checked)}
              />{" "}
              {t.labelRandom}
            </label>
          </div>

          <div className="learn-config-row">
            <label>{t.labelView}</label>
            <label>
              <input
                type="radio"
                name="vm"
                value="single"
                checked={viewMode === "single"}
                onChange={() => setViewMode("single")}
              />{" "}
              {t.viewSingle}
            </label>
            <label>
              <input
                type="radio"
                name="vm"
                value="grid"
                checked={viewMode === "grid"}
                onChange={() => setViewMode("grid")}
              />{" "}
              {t.viewGrid}
            </label>
          </div>

          <div className="form-buttons">
            <button className="btn-save" onClick={startLearn}>
              {t.btnStart}
            </button>
            <button className="btn-cancel" onClick={onExit}>
              {t.btnBack}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "grid") {
    return (
      <div className={styles.page} style={{ justifyContent: "flex-start" }}>
        <div className={styles.learnTop}>
          <button
            className={styles.btnLearnExit}
            onClick={() => setMode("config")}
          >
            {t.btnSettings}
          </button>
          <span className={styles.learnCounter}>
            {learnCards.length} kaarti
          </span>
        </div>
        <div className={styles.cards} style={{ padding: 24 }}>
          {learnCards.map((card) => (
            <GridCard
              key={card._id}
              card={card}
              subjectLabel={subjectLabel(card.subjectId)}
              onProgress={(c) => setProgress(card, c)}
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
      <div className={styles.page}>
        <p>{t.noCards}</p>
        <button onClick={onExit}>{t.btnBack}</button>
      </div>
    );

  const prog = card.progress?.[PROGRESS_KEY] ?? null;

  return (
    <div className={styles.page}>
      <div className={styles.learnTop}>
        <button
          className={styles.btnLearnExit}
          onClick={() => setMode("config")}
        >
          ← Seaded
        </button>
        <span className={styles.learnCounter}>
          {idx + 1} / {learnCards.length}
        </span>
      </div>

      <div className={styles.learnCardArea}>
        <div
          className={`card-scene${flipped ? " flipped" : ""}`}
          onClick={() => setFlipped(!flipped)}
        >
          <div className="card">
            <CardFace
              side={card.s1 || { text: "", text2: "", photo: "" }}
              faceNum={1}
            />
            <CardFace
              side={card.s2 || { text: "", text2: "", photo: "" }}
              faceNum={2}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {COLORS.map((c) => (
          <SemDot
            key={String(c)}
            color={c}
            selected={prog === c}
            onClick={() => setProgress(card, c)}
          />
        ))}
      </div>

      <div className={styles.learnNav}>
        <button
          className={styles.btnLearnNav}
          onClick={() => {
            setIdx((i) => Math.max(0, i - 1));
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
            setIdx((i) => Math.min(learnCards.length - 1, i + 1));
            setFlipped(false);
          }}
        >
          →
        </button>
      </div>
    </div>
  );
}

function GridCard({
  card,
  subjectLabel,
  onProgress,
}: {
  card: Card;
  subjectLabel: string;
  onProgress: (_c: Color) => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const prog = card.progress?.[PROGRESS_KEY] ?? null;

  return (
    <div className={styles.cardWrapper}>
      <div
        className={`card-scene${flipped ? " flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`card${prog ? ` prog-${prog}` : ""}`}>
          <CardFace
            side={card.s1 || { text: "", text2: "", photo: "" }}
            faceNum={1}
          />
          <CardFace
            side={card.s2 || { text: "", text2: "", photo: "" }}
            faceNum={2}
          />
        </div>
      </div>
      <div className={styles.cardMeta}>{subjectLabel}</div>
      <div className={styles.gridSemDots}>
        {COLORS.map((c) => (
          <SemDot
            key={String(c)}
            color={c}
            selected={prog === c}
            onClick={() => onProgress(c)}
          />
        ))}
      </div>
    </div>
  );
}
