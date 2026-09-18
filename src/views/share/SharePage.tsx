import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api";
import { t } from "../../strings";
import type { Color, IShareCard } from "../../types";
import { CardScene } from "../../components/card/CardScene";
import { SemDot } from "../../components/SemDot";
import { ColorFilterDropdown } from "../../components/ColorFilterDropdown";
import styles from "./SharePage.module.css";

const COLORS: Color[] = [null, "red", "yellow", "green"];
const SLICE_COLORS: { color: Color; dot: string }[] = [
  { color: null, dot: "#718096" },
  { color: "red", dot: "#fc8181" },
  { color: "yellow", dot: "#f6e05e" },
  { color: "green", dot: "#68d391" },
];

function readLocalProgress(token: string): Record<string, Color> {
  try {
    return JSON.parse(
      localStorage.getItem(`fc-share-progress-${token}`) || "{}"
    );
  } catch {
    return {};
  }
}

function writeLocalProgress(token: string, progress: Record<string, Color>) {
  try {
    localStorage.setItem(
      `fc-share-progress-${token}`,
      JSON.stringify(progress)
    );
  } catch {
    /* ignore */
  }
}

/** Public, read-only study view for a shared topic link. No login, no
    server-side writes — a guest's traffic-light picks live only in their
    own browser. */
export function SharePage() {
  const { token = "" } = useParams();
  const [topicLabel, setTopicLabel] = useState("");
  const [cards, setCards] = useState<IShareCard[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [progress, setProgress] = useState<Record<string, Color>>(() =>
    readLocalProgress(token)
  );
  const [activeColors, setActiveColors] = useState<Color[]>([
    null,
    "red",
    "yellow",
  ]);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    api
      .getShare(token)
      .then((data) => {
        setTopicLabel(data.topicLabel);
        setCards(data.cards);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  const visibleCards = useMemo(
    () =>
      (cards ?? []).filter((c) =>
        activeColors.includes(progress[c._id] ?? null)
      ),
    [cards, activeColors, progress]
  );

  // colour breakdown of the whole shared topic (not just what's currently
  // filtered in) — tapping a count toggles that colour in the filter
  const sliceCounts: Record<string, number> = {
    null: 0,
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const c of cards ?? []) {
    sliceCounts[String(progress[c._id] ?? null)] += 1;
  }

  useEffect(() => {
    setIdx(0);
  }, [activeColors.join(",")]);

  function toggleColor(c: Color) {
    setActiveColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  function setCardColor(cardId: string, color: Color) {
    setProgress((prev) => {
      const next = { ...prev, [cardId]: color };
      writeLocalProgress(token, next);
      return next;
    });
  }

  function goPrev() {
    setIdx((i) => (i === 0 ? visibleCards.length - 1 : i - 1));
  }

  function goNext() {
    setIdx((i) => (i === visibleCards.length - 1 ? 0 : i + 1));
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>{t.shareNotFound}</p>
      </div>
    );
  }

  if (!cards) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>{t.shareLoading}</p>
      </div>
    );
  }

  const card = visibleCards[idx];

  return (
    <div className={styles.page}>
      <h2 className={styles.topicLabel}>{topicLabel}</h2>

      <ColorFilterDropdown
        activeColors={activeColors}
        onToggleColor={toggleColor}
      />

      {!card ? (
        <p className={styles.status}>
          {cards.length === 0 ? t.shareEmpty : t.shareDone}
        </p>
      ) : (
        <>
          <span className={styles.counter}>
            {idx + 1} / {visibleCards.length}
          </span>

          <div className={styles.dotRow} data-no-swipe>
            {COLORS.map((c) => (
              <SemDot
                key={String(c)}
                color={c}
                selected={(progress[card._id] ?? null) === c}
                onClick={() => setCardColor(card._id, c)}
              />
            ))}
          </div>

          <CardScene
            key={card._id}
            s1={card.s1}
            s2={card.s2}
            cornerColor={progress[card._id] ?? null}
          />

          <div className={styles.navRow}>
            <button className={styles.navBtn} onClick={goPrev} aria-label="←">
              ‹
            </button>
            <button className={styles.navBtn} onClick={goNext} aria-label="→">
              ›
            </button>
          </div>

          <div className={styles.sliceCounts}>
            {SLICE_COLORS.map(({ color, dot }) => {
              const on = activeColors.includes(color);
              return (
                <button
                  key={String(color)}
                  type="button"
                  className={`${styles.sliceCount}${on ? "" : ` ${styles.sliceOff}`}`}
                  onClick={() => toggleColor(color)}
                  aria-pressed={on}
                >
                  <span
                    className={styles.sliceDot}
                    style={{ background: dot }}
                    aria-hidden
                  />
                  {sliceCounts[String(color)]}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
