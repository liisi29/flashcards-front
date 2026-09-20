import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../../strings";
import type { Color, ICard } from "../../types";
import { api } from "../../api";
import { useCards } from "../../contexts/CardsContext";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useTags } from "../../contexts/TagsContext";
import { currentUserId } from "../../user";
import { cardColor as colorForProgress } from "../../utils/cardProgress";
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
  return colorForProgress(c.progress);
}

interface Props {
  subjectId: string;
}

/** A standalone glance at every card in the hub's current selection — the
    full-page counterpart to the in-õpi overview modal. */
export function OverviewPage({ subjectId }: Props) {
  const navigate = useNavigate();
  const { cardsFor, ensureSubject, patchCard } = useCards();
  const { allTopics } = useSubjects();
  const { tagsFor, ensureSubject: ensureTags } = useTags();

  useEffect(() => {
    if (subjectId) {
      ensureSubject(subjectId);
      ensureTags(subjectId);
    }
  }, [subjectId, ensureSubject, ensureTags]);

  // sessionStorage keeps whatever topic/tag scope was last picked, which
  // may belong to a different subject if it was changed since (e.g. via
  // the header's subject picker) — drop anything that isn't actually part
  // of the current subject instead of showing "no cards found".
  const subjectTopicIds = useMemo(
    () =>
      new Set(
        allTopics.filter((tp) => tp.parentId === subjectId).map((tp) => tp._id)
      ),
    [allTopics, subjectId]
  );
  const subjectTagIds = useMemo(
    () => new Set((tagsFor(subjectId) ?? []).map((tg) => tg._id)),
    [tagsFor, subjectId]
  );
  const topicIds = readIds(TOPICS_KEY).filter((id) => subjectTopicIds.has(id));
  const tagIds = readIds(TAGS_KEY).filter((id) => subjectTagIds.has(id));
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
                <button
                  key={c._id}
                  type="button"
                  className={styles.row}
                  onClick={() => changeColor(c._id, NEXT_COLOR[key])}
                  aria-label={t.overviewChangeLevel}
                >
                  <span
                    className={styles.dot}
                    style={{ background: DOT[key] }}
                    aria-hidden
                  />
                  <span className={styles.cell}>
                    <span className={styles.main}>{c.s1.text}</span>
                    {c.s1.text2 && (
                      <span className={styles.sub}>{c.s1.text2}</span>
                    )}
                  </span>
                  <span className={styles.cell}>
                    <span className={styles.main}>{c.s2.text}</span>
                    {c.s2.text2 && (
                      <span className={styles.sub}>{c.s2.text2}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
