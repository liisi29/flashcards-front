import { useState, useEffect, useMemo, useRef } from "react";
import { t } from "../../strings";
import type { ICard, Color, ISubject } from "../../types";
import { api } from "../../api";
import styles from "./LearnPage.module.css";
import { CardItem } from "../../components/card/CardItem";
import { CardScene } from "../../components/card/CardScene";
import { LearnSubBar } from "./LearnSubBar";
import { useMobileMenu } from "../../contexts/MobileMenuContext";
import { useGroups } from "../../contexts/GroupsContext";
import { useCards } from "../../contexts/CardsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { currentUserId } from "../../user";
import {
  groupCount,
  posKey,
  loadGroupPos,
  saveGroupPos,
  sliceGroup,
} from "../../runtimeGroups";
import { useSettings } from "../../contexts/SettingsContext";

/** difficulty for the current user, with the legacy shared "all" as fallback */
function cardColor(c: ICard): Color {
  const uid = currentUserId();
  return c.progress?.[uid] ?? c.progress?.["all"] ?? null;
}

const TOPICS_KEY = "learn-topics";
const TAGS_KEY = "learn-tags";
const GROUPS_KEY = "learn-groups";

function readSavedIds(key: string): string[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

interface Props {
  onExit: () => void;
}

type LearnMode = "single" | "grid";

export function Learn({ onExit: _onExit }: Props) {
  const [mode, setMode] = useState<LearnMode>("single");
  const [topics, setTopics] = useState<ISubject[]>([]);
  const { subjectId } = useCurrentSubject();
  const [topicIds, setTopicIds] = useState<string[]>(() =>
    readSavedIds(TOPICS_KEY)
  );
  const [activeColors, setActiveColors] = useState<Color[]>([
    null,
    "red",
    "yellow",
  ]);
  const [activeTagIds, setActiveTagIds] = useState<string[]>(() =>
    readSavedIds(TAGS_KEY)
  );
  const [activeGroupIds, setActiveGroupIds] = useState<string[]>(() =>
    readSavedIds(GROUPS_KEY)
  );
  const { groups } = useGroups();
  const { cardsFor, ensureSubject, patchCard } = useCards();
  // the deck after color/tag/(old-group) filters, before runtime-group slicing
  const [fullDeck, setFullDeck] = useState<ICard[]>([]);
  const [deckSeed, setDeckSeed] = useState(0); // bump to reshuffle
  const [groupNum, setGroupNum] = useState(0); // 0 = whole deck / no group
  const [idx, setIdx] = useState(0);
  const [, setFlipped] = useState(false);
  const { settings, setSetting } = useSettings();
  const startSide = settings.startSide;
  const groupSize = settings.groupSize; // chosen on the settings page

  function changeStartSide(s: 1 | 2) {
    setSetting("startSide", s);
  }

  // Remember the chosen topics for this browser session.
  useEffect(() => {
    sessionStorage.setItem(TOPICS_KEY, JSON.stringify(topicIds));
  }, [topicIds]);

  // drop topic / tag / group selections when the subject changes
  useEffect(() => {
    setTopicIds([]);
    setActiveTagIds([]);
    setActiveGroupIds([]);
  }, [subjectId]);

  useEffect(() => {
    sessionStorage.setItem(TAGS_KEY, JSON.stringify(activeTagIds));
  }, [activeTagIds]);

  useEffect(() => {
    sessionStorage.setItem(GROUPS_KEY, JSON.stringify(activeGroupIds));
  }, [activeGroupIds]);
  const [leaving, setLeaving] = useState<{
    card: ICard;
    dir: "next" | "prev";
  } | null>(null);
  const [swapTick, setSwapTick] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{
    x: number;
    y: number;
    t: number;
    axis: null | "x" | "y";
  } | null>(null);
  const { setSlot } = useMobileMenu();

  function navigate(nextIdx: number, direction: "next" | "prev") {
    const current = learnCards[idx];
    if (current && nextIdx !== idx) {
      setLeaving({ card: current, dir: direction });
    }
    setIdx(nextIdx);
    setSwapTick((n) => n + 1);
    setFlipped(false);
  }

  function goNext() {
    if (!learnCards.length) return;
    navigate(idx === learnCards.length - 1 ? 0 : idx + 1, "next");
  }

  function goPrev() {
    if (!learnCards.length) return;
    navigate(idx === 0 ? learnCards.length - 1 : idx - 1, "prev");
  }

  // Grid ("all cards") view isn't offered on small phones — force single there.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const apply = () => {
      if (mq.matches) setMode("single");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
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

  // Drop topic ids that don't belong to the loaded subject (e.g. stale ids
  // restored from sessionStorage). Without this a phantom id inflates the
  // count ("2 teemat" with one box checked) and blocks the single-topic
  // tag dropdown.
  useEffect(() => {
    if (!topics.length) return;
    const real = new Set(topics.map((tp) => tp._id));
    setTopicIds((prev) => {
      const next = prev.filter((id) => real.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [topics]);

  function toggleGroup(id: string) {
    setActiveGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Drop tag / group selections that no longer belong to the current topic
  // (e.g. stale ids restored from sessionStorage).
  function pruneToTopicTags(topicTagIds: string[]) {
    const tset = new Set(topicTagIds);
    setActiveTagIds((prev) => {
      const next = prev.filter((id) => tset.has(id));
      return next.length === prev.length ? prev : next;
    });
    setActiveGroupIds((prev) => {
      const next = prev.filter((gid) => {
        const g = groups.find((x) => x._id === gid);
        return g ? tset.has(g.tagId) : true; // keep unknown until groups load
      });
      return next.length === prev.length ? prev : next;
    });
  }

  // ensure the picked subject's cards are cached (shared with the Lisa view)
  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  // deck = cached subject cards, narrowed to the selected topics. The
  // shuffle ORDER is fixed per deckSeed (filter/tag/colour changes don't
  // reshuffle), but the card objects are re-read from the cache every
  // render so an optimistic progress patch is reflected immediately.
  const subjectCards = subjectId ? (cardsFor(subjectId) ?? []) : [];
  const topicSet = new Set(topicIds);
  const scopedCards = topicSet.size
    ? subjectCards.filter((c) => topicSet.has(c.topicId))
    : subjectCards;
  const shuffledIds = useMemo(
    () => shuffle(scopedCards.map((c) => c._id)),

    [subjectId, topicIds.join(","), scopedCards.length, deckSeed]
  );
  const allCards = useMemo(() => {
    const byId = new Map(scopedCards.map((c) => [c._id, c]));
    return shuffledIds.map((id) => byId.get(id)).filter((c): c is ICard => !!c);
  }, [shuffledIds, subjectCards]);

  // runtime groups slice whatever the current filter produced
  const nGroups = groupSize ? groupCount(fullDeck.length, groupSize) : 0;
  const groupPosKey = posKey(subjectId, topicIds, activeTagIds, groupSize);

  function changeGroupNum(n: number) {
    setGroupNum(n);
    saveGroupPos(posKey(subjectId, topicIds, activeTagIds, groupSize), n);
  }

  // restore the saved group position for this filter + size combination;
  // with a size set but nothing saved yet, start on Grupp 1 rather than
  // the whole deck ("Kõik grupid")
  useEffect(() => {
    if (!groupSize) {
      setGroupNum(0);
      return;
    }
    let alive = true;
    loadGroupPos(groupPosKey).then((n) => {
      if (alive) setGroupNum(n || 1);
    });
    return () => {
      alive = false;
    };
  }, [groupPosKey, groupSize]);

  // keep groupNum in range if the deck shrinks
  useEffect(() => {
    if (groupNum > nGroups) setGroupNum(nGroups);
  }, [nGroups, groupNum]);

  const learnCards = sliceGroup(fullDeck, groupSize, groupNum);

  function applyFilters(cards: ICard[]) {
    // ids of cards in any of the selected groups
    const groupCardIds =
      activeGroupIds.length > 0
        ? new Set(
            groups
              .filter((g) => activeGroupIds.includes(g._id))
              .flatMap((g) => g.cardIds)
          )
        : null;

    return cards.filter((c) => {
      if (!activeColors.includes(cardColor(c))) return false;
      if (
        activeTagIds.length > 0 &&
        !activeTagIds.some((id) => (c.tagIds ?? []).includes(id))
      )
        return false;
      if (groupCardIds && !groupCardIds.has(c._id)) return false;
      return true;
    });
  }

  useEffect(() => {
    const next = applyFilters(allCards);
    setFullDeck(next);
    // keep the pointer valid if the current card just filtered out
    setIdx((i) => Math.min(Math.max(0, i), Math.max(0, next.length - 1)));
  }, [allCards]);

  useEffect(() => {
    setFullDeck(applyFilters(allCards));
    setIdx(0);
    setFlipped(false);
  }, [activeColors, activeTagIds, activeGroupIds, groups]);

  // jump to the start of the deck when the GROUP selection changes (not
  // when the deck merely shrinks because a card filtered out)
  useEffect(() => {
    setIdx(0);
    setFlipped(false);
  }, [groupNum, groupSize]);

  // if the current position fell off the end of the sliced deck, pull it back
  useEffect(() => {
    const len = sliceGroup(fullDeck, groupSize, groupNum).length;
    if (idx > 0 && idx >= len) setIdx(Math.max(0, len - 1));
  }, [fullDeck, groupSize, groupNum, idx]);

  function shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
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
    const uid = currentUserId();
    const card = allCards.find((c) => c._id === id);
    patchCard(id, {
      progress: { ...(card?.progress ?? {}), [uid]: color },
    });
  }

  function onDragStart(e: React.PointerEvent) {
    // ignore drags that start on an interactive control (sem-dots)
    if ((e.target as HTMLElement).closest("[data-no-swipe]")) return;
    drag.current = { x: e.clientX, y: e.clientY, t: Date.now(), axis: null };
  }

  function onDragMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;

    if (d.axis === null) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis === "x") {
        setDragging(true);
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      }
    }
    if (d.axis !== "x") return;

    // light resistance at the ends
    const atEnd =
      (dx > 0 && idx === 0) || (dx < 0 && idx === learnCards.length - 1);
    setDragX(atEnd ? dx * 0.3 : dx);
  }

  function onDragEnd(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d || d.axis !== "x") {
      setDragging(false);
      setDragX(0);
      return;
    }
    const dx = e.clientX - d.x;
    const dt = Date.now() - d.t;
    const vx = dx / Math.max(dt, 1); // px per ms
    const width = (e.currentTarget as HTMLElement).offsetWidth || 320;
    const commit = Math.abs(dx) > width * 0.28 || Math.abs(vx) > 0.5;

    setDragging(false);
    setDragX(0);
    if (!commit) return;
    if (dx < 0) goNext();
    else goPrev();
  }

  function jumpTo(i: number) {
    if (i === idx) return;
    navigate(i, i > idx ? "next" : "prev");
  }

  function doShuffle() {
    setDeckSeed((n) => n + 1);
    setIdx(0);
    setFlipped(false);
  }

  const colorCounts: Record<string, number> = {};
  for (const c of allCards) {
    const key = String(cardColor(c));
    colorCounts[key] = (colorCounts[key] ?? 0) + 1;
  }

  const subBarProps = {
    topics,
    subjectId,
    topicIds,
    activeColors,
    mode,
    totalCount: allCards.length,
    colorCounts,
    activeTagIds,
    onToggleTopic: toggleTopic,
    onToggleColor: toggleColor,
    onToggleTag: toggleTag,
    activeGroupIds,
    onToggleGroup: toggleGroup,
    onTopicTagsLoaded: pruneToTopicTags,
    groupSize,
    groupNum,
    nGroups,
    onGroupNumChange: changeGroupNum,
    onModeChange: setMode,
    onShuffle: doShuffle,
    startSide,
    onStartSideChange: changeStartSide,
  };

  const subBar = <LearnSubBar {...subBarProps} />;

  // Feed the same controls into the mobile hamburger drawer.
  useEffect(() => {
    setSlot(<LearnSubBar {...subBarProps} variant="drawer" />);
    return () => setSlot(null);
  }, [
    topics,
    subjectId,
    topicIds.join(","),
    activeColors.join(","),
    activeTagIds.join(","),
    activeGroupIds.join(","),
    groups,
    mode,
    startSide,
    groupSize,
    groupNum,
    nGroups,
    allCards.length,
    JSON.stringify(colorCounts),
  ]);

  if (mode === "grid") {
    return (
      <div
        className={`${styles.pageLearning} ${styles.gridPage}`}
        style={{ justifyContent: "flex-start" }}
      >
        {subBar}
        <div className={styles.cards} style={{ padding: 24 }}>
          {learnCards.map((card) => (
            <CardItem
              key={`${card._id}-${startSide}`}
              card={card}
              startFlipped={startSide === 2}
              onProgressChange={handleProgressChange}
            />
          ))}
        </div>
      </div>
    );
  }

  // Single card mode
  const card = learnCards[idx];
  // The card revealed underneath while you drag the top one away. Only
  // rendered during an active horizontal drag — at rest there is nothing to
  // reveal, and a stacked second CardItem would double the topic line.
  const peekCard =
    dragging && dragX !== 0 && learnCards.length > 1
      ? dragX > 0
        ? learnCards[idx === 0 ? learnCards.length - 1 : idx - 1] // dragging right → prev
        : learnCards[idx === learnCards.length - 1 ? 0 : idx + 1] // dragging left → next
      : undefined;
  if (!card)
    return (
      <div className={styles.pageLearning}>
        {subBar}
        <p className={styles.emptyMsg}>{t.noCards}</p>
      </div>
    );

  return (
    <div className={styles.pageLearning}>
      {subBar}
      <span className={`${styles.learnCounter} ${styles.counterTop}`}>
        {idx + 1} / {learnCards.length}
      </span>

      <div
        className={styles.cardStage}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        {/* The real next/prev card revealed while dragging — SCENE ONLY, so
            it can't double the sem-dots / topic / tag rows behind the active
            card. Just the deck rectangle otherwise. */}
        {peekCard ? (
          <div className={styles.peekCard} aria-hidden>
            <CardScene
              key={`peek-${peekCard._id}`}
              s1={peekCard.s1}
              s2={peekCard.s2}
              interactive={false}
              initialFlipped={startSide === 2}
              className={styles.peekScene}
            />
          </div>
        ) : (
          <div className={styles.deckShadow} aria-hidden />
        )}

        {/* Sem-dots and topic stay put. The active card doesn't animate in —
            it's already sitting in the slot; only the thrown card moves. */}
        <CardItem
          key={`${card._id}-${startSide}`}
          card={card}
          startFlipped={startSide === 2}
          onProgressChange={handleProgressChange}
          sceneClassName={styles.activeScene}
          sceneStyle={
            dragX !== 0
              ? {
                  transform: `translateX(${dragX}px) rotate(${dragX * 0.055}deg)`,
                  transition: dragging ? "none" : undefined,
                }
              : undefined
          }
        />

        {/* outgoing scene only — thrown off then unmounts */}
        {leaving && (
          <CardScene
            key={`leaving-${swapTick}`}
            s1={leaving.card.s1}
            s2={leaving.card.s2}
            interactive={false}
            className={`${styles.cardLeaving} ${
              leaving.dir === "next" ? styles.throwLeft : styles.throwRight
            }`}
            onAnimationEnd={() => setLeaving(null)}
          />
        )}
      </div>

      {/* Mobile: compact counter + arrows directly under the card */}
      <div className={styles.mobileNav}>
        <button
          className={styles.btnLearnNavSm}
          onClick={goPrev}
          aria-label="←"
        >
          ‹
        </button>
        <span className={styles.learnCounter}>
          {idx + 1} / {learnCards.length}
        </span>
        <button
          className={styles.btnLearnNavSm}
          onClick={goNext}
          aria-label="→"
        >
          ›
        </button>
      </div>

      {/* Desktop: arrows + full progress-dot strip */}
      <div className={styles.learnNav}>
        <button className={styles.btnLearnNav} onClick={goPrev}>
          ←
        </button>
        <div className={styles.learnProgressDots}>
          {learnCards.map((_, i) => (
            <div
              key={i}
              className={`${styles.learnDot}${i === idx ? ` ${styles.active}` : ""}`}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
        <button className={styles.btnLearnNav} onClick={goNext}>
          →
        </button>
      </div>
    </div>
  );
}
