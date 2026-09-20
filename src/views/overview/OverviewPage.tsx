import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../../strings";
import type { Color, ICard } from "../../types";
import { api } from "../../api";
import { useCards } from "../../contexts/CardsContext";
import { currentUserId } from "../../user";
import styles from "./OverviewPage.module.css";

const DOT: Record<string, string> = {
  null: "#718096",
  red: "#fc8181",
  yellow: "#f6e05e",
  green: "#68d391",
};

const NEXT_COLOR: Record<string, Color> = {
  null: "red",
  red: "yellow",
  yellow: "green",
  green: null,
};

const TOPICS_KEY = "learn-topics";
const TAGS_KEY = "learn-tags";

function readIds(key: string): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function cardColor(c: ICard): Color {
  const uid = currentUserId();
  return c.progress?.[uid] ?? c.progress?.["all"] ?? null;
}

interface Props {
  subjectId: string;
}

/** A standalone glance at every card in the hub's current selection — the
    full-page counterpart to the in-õpi overview modal. */
export function OverviewPage({ subjectId }: Props) {
  const navigate = useNavigate();
  const { cardsFor, ensureSubject, patchCard } = useCards();

  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  const topicIds = readIds(TOPICS_KEY);
  const tagIds = readIds(TAGS_KEY);
  const topicSet = new Set(topicIds);
  const tagSet = new Set(tagIds);

  const allCards = subjectId ? (cardsFor(subjectId) ?? []) : [];
  const cards = allCards.filter((c) => {
    if (topicSet.size && !topicSet.has(c.topicId)) return false;
    if (tagSet.size && !(c.tagIds ?? []).some((id) => tagSet.has(id)))
      return false;
    return true;
  });

  const counts: Record<string, number> = {
    null: 0,
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const c of cards) counts[String(cardColor(c))] += 1;

  function changeColor(id: string, color: Color) {
    const uid = currentUserId();
    const card = allCards.find((c) => c._id === id);
    patchCard(id, {
      progress: { ...(card?.progress ?? {}), [uid]: color },
    });
    api.setProgress(id, uid, color);
  }

  return (
    <div className={styles.page}>
      <div className={styles.box}>
        <div className={styles.head}>
          <h1>{t.overviewHeading}</h1>
          <button className={styles.closeBtn} onClick={() => navigate("/")}>
            ✕
          </button>
        </div>

        <p className={styles.summary}>
          {t.overviewCount(cards.length)}
          {(["null", "red", "yellow", "green"] as const).map((k) => (
            <span key={k} className={styles.sumChip}>
              <span
                className={styles.sumDot}
                style={{ background: DOT[k] }}
                aria-hidden
              />
              {counts[k]}
            </span>
          ))}
        </p>

        {cards.length === 0 ? (
          <p className={styles.empty}>{t.overviewEmpty}</p>
        ) : (
          <div className={styles.list}>
            {cards.map((c) => {
              const key = String(cardColor(c));
              return (
                <div key={c._id} className={styles.row}>
                  <button
                    type="button"
                    className={styles.dot}
                    style={{ background: DOT[key] }}
                    onClick={() => changeColor(c._id, NEXT_COLOR[key])}
                    aria-label={t.overviewChangeLevel}
                  />
                  <div className={styles.cell}>
                    <span className={styles.main}>{c.s1.text}</span>
                    {c.s1.text2 && (
                      <span className={styles.sub}>{c.s1.text2}</span>
                    )}
                  </div>
                  <div className={styles.cell}>
                    <span className={styles.main}>{c.s2.text}</span>
                    {c.s2.text2 && (
                      <span className={styles.sub}>{c.s2.text2}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
