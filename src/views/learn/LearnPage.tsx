import { useState, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { t } from "../../strings";
import type { ICard, Color, ISubject } from "../../types";
import { api } from "../../api";
import styles from "./LearnPage.module.css";
import { CardItem } from "../../components/card/CardItem";
import { CardScene } from "../../components/card/CardScene";
import { LearnSubBar } from "./LearnSubBar";
import { OverviewModal } from "./OverviewModal";
import { useMobileMenu } from "../../contexts/MobileMenuContext";
import { useCards } from "../../contexts/CardsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { currentUserId } from "../../user";
import { orderByNewest } from "../../utils/cardOrder";
import { useSettings } from "../../contexts/SettingsContext";

/** difficulty for the current user, with the legacy shared "all" as fallback */
function cardColor(c: ICard): Color {
  const uid = currentUserId();
  return c.progress?.[uid] ?? c.progress?.["all"] ?? null;
}

const TOPICS_KEY = "learn-topics";
const TAGS_KEY = "learn-tags";

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
  const location = useLocation();
  const routerNavigate = useNavigate();
  const [mode, setMode] = useState<LearnMode>("single");
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [topics, setTopics] = useState<ISubject[]>([]);
  const { subjectId } = useCurrentSubject();
  const onlyColor = (location.state as { onlyColor?: Color } | null)?.onlyColor;
  const [topicIds, setTopicIds] = useState<string[]>(() =>
    onlyColor !== undefined ? [] : readSavedIds(TOPICS_KEY)
  );
  const [activeColors, setActiveColors] = useState<Color[]>(() =>
    onlyColor !== undefined ? [onlyColor] : [null, "red", "yellow"]
  );

  // a level passed in via navigation (e.g. from Seaded) applies once —
  // clear it (and any topic/tag scope, which would otherwise hide the
  // very cards the level was meant to show) so a later reload/back-nav
  // doesn't keep forcing the filter
  useEffect(() => {
    if (onlyColor === undefined) return;
    routerNavigate(location.pathname, { replace: true, state: null });
  }, []);
  const [activeTagIds, setActiveTagIds] = useState<string[]>(() =>
    onlyColor !== undefined ? [] : readSavedIds(TAGS_KEY)
  );
  const { cardsFor, ensureSubject, patchCard } = useCards();
  const [deckSeed, setDeckSeed] = useState(0); // bump to reshuffle
  const [groupIds, setGroupIds] = useState<string[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [, setFlipped] = useState(false);
  const { settings, setSetting } = useSettings();
  const startSide = settings.startSide;

  function changeStartSide(s: 1 | 2) {
    setSetting("startSide", s);
  }

  // Remember the chosen topics for this browser session.
  useEffect(() => {
    sessionStorage.setItem(TOPICS_KEY, JSON.stringify(topicIds));
  }, [topicIds]);

  // drop topic / tag selections when the subject *changes* — but not on
  // the initial mount, so a reload keeps its saved filters
  const prevSubject = useRef(subjectId);
  useEffect(() => {
    if (prevSubject.current === subjectId) return;
    prevSubject.current = subjectId;
    setTopicIds([]);
    setActiveTagIds([]);
  }, [subjectId]);

  useEffect(() => {
    sessionStorage.setItem(TAGS_KEY, JSON.stringify(activeTagIds));
  }, [activeTagIds]);

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

  // Drop tag selections that no longer belong to the current topic
  // (e.g. stale ids restored from sessionStorage).
  function pruneToTopicTags(topicTagIds: string[]) {
    const tset = new Set(topicTagIds);
    setActiveTagIds((prev) => {
      const next = prev.filter((id) => tset.has(id));
      return next.length === prev.length ? prev : next;
    });
  }

  // ensure the picked subject's cards are cached (shared with the Lisa view)
  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  // "Raw scope" = cached subject cards narrowed to the selected topics
  // AND the selected tags (a tag is part of what you're studying, not a
  // difficulty filter). Difficulty (Raskusaste) is applied afterwards.
  //
  // ORDER: deterministic by default (newest first — same as the Lisa
  // list). "Sega kaardid" bumps deckSeed to reshuffle THIS scope for the
  // session; changing the scope resets it back to the fixed order.
  const subjectCards = subjectId ? (cardsFor(subjectId) ?? []) : [];
  const topicSet = new Set(topicIds);
  const tagSet = new Set(activeTagIds);
  const scopedCards = subjectCards.filter((c) => {
    if (topicSet.size && !topicSet.has(c.topicId)) return false;
    if (tagSet.size && !(c.tagIds ?? []).some((id) => tagSet.has(id)))
      return false;
    return true;
  });
  const orderedIds = useMemo(() => {
    const ids = orderByNewest(scopedCards).map((c) => c._id);
    return deckSeed > 0 ? shuffle(ids) : ids;
  }, [
    subjectId,
    topicIds.join(","),
    activeTagIds.join(","),
    scopedCards.length,
    deckSeed,
  ]);
  const allCards = useMemo(() => {
    const byId = new Map(scopedCards.map((c) => [c._id, c]));
    return orderedIds.map((id) => byId.get(id)).filter((c): c is ICard => !!c);
  }, [orderedIds, subjectCards]);

  // a change of scope drops any session shuffle, and cancels an active
  // group (a group is a fixed slice of a specific scope — stale once the
  // scope changes)
  useEffect(() => {
    setDeckSeed(0);
    setGroupIds(null);
  }, [subjectId, topicIds.join(","), activeTagIds.join(",")]);

  // the difficulty filter applies to the raw scope — it hides cards, it
  // never changes which cards belong to the scope. Derived, so a
  // Raskusaste toggle re-filters immediately.
  const colorFilteredCards = useMemo(
    () => allCards.filter((c) => activeColors.includes(cardColor(c))),
    [allCards, activeColors]
  );

  // When a group is active, narrow further to just that fixed set of card
  // ids (order preserved) — still subject to the Raskusaste filter above.
  const learnCards = useMemo(() => {
    if (!groupIds) return colorFilteredCards;
    const groupSet = new Set(groupIds);
    return colorFilteredCards.filter((c) => groupSet.has(c._id));
  }, [colorFilteredCards, groupIds]);

  // "group": grab the first 10 cards (in current scope + difficulty filter
  // order) not yet grouped — a plain, explicit snapshot, no magic. "+5"
  // appends the next 5 unused cards from that same filtered order.
  function startGroup() {
    setGroupIds(colorFilteredCards.slice(0, 10).map((c) => c._id));
    setIdx(0);
  }

  function endGroup() {
    setGroupIds(null);
  }

  function addFiveToGroup() {
    if (!groupIds) return;
    const used = new Set(groupIds);
    const next = colorFilteredCards
      .filter((c) => !used.has(c._id))
      .slice(0, 5)
      .map((c) => c._id);
    setGroupIds([...groupIds, ...next]);
  }

  // what to say when there's nothing to flip through
  const emptyMessage = (() => {
    if (allCards.length === 0) return t.noCards; // scope genuinely empty
    // scope has cards but the difficulty filter hid them all
    const allGreen = allCards.every((c) => cardColor(c) === "green");
    return allGreen ? t.emptyAllGreen(t.emptyScopeTopic) : t.emptyFiltered;
  })();

  // clamp the pointer if the visible deck shrinks (difficulty toggle, or a
  // card marked mid-session)
  useEffect(() => {
    setIdx((i) => Math.min(Math.max(0, i), Math.max(0, learnCards.length - 1)));
  }, [learnCards.length]);

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
    api.setProgress(id, uid, color);
  }

  function handleNotesChange(id: string, notes: string) {
    const uid = currentUserId();
    const card = allCards.find((c) => c._id === id);
    patchCard(id, {
      notes: { ...(card?.notes ?? {}), [uid]: notes },
    });
    api.setNotes(id, uid, notes);
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

  // colour breakdown of the current scope — shown under the card; tapping
  // a dot toggles that colour in the Raskusaste filter
  const sliceCounts: Record<string, number> = {
    null: 0,
    red: 0,
    yellow: 0,
    green: 0,
  };
  for (const c of allCards) {
    sliceCounts[String(cardColor(c))] += 1;
  }
  const SLICE_COLORS: { color: Color; dot: string }[] = [
    { color: null, dot: "#718096" },
    { color: "red", dot: "#fc8181" },
    { color: "yellow", dot: "#f6e05e" },
    { color: "green", dot: "#68d391" },
  ];

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
    onTopicTagsLoaded: pruneToTopicTags,
    onModeChange: setMode,
    onShuffle: doShuffle,
    startSide,
    onStartSideChange: changeStartSide,
    groupActive: groupIds !== null,
    groupSize: groupIds?.length ?? 0,
    onGroupStart: startGroup,
    onGroupEnd: endGroup,
    onGroupAddFive: addFiveToGroup,
    canAddFive: groupIds !== null && groupIds.length < colorFilteredCards.length,
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
    mode,
    startSide,
    allCards.length,
    JSON.stringify(colorCounts),
    groupIds?.join(","),
  ]);

  const overviewLink = subjectId ? (
    <button
      className={styles.overviewLink}
      onClick={() => setOverviewOpen(true)}
      disabled={learnCards.length === 0}
    >
      {t.overviewLink}
    </button>
  ) : null;

  const overviewModal = overviewOpen ? (
    <OverviewModal
      cards={allCards}
      colorOf={cardColor}
      onColorChange={handleProgressChange}
      onClose={() => setOverviewOpen(false)}
    />
  ) : null;

  if (mode === "grid") {
    return (
      <div
        className={`${styles.pageLearning} ${styles.gridPage}`}
        style={{ justifyContent: "flex-start" }}
      >
        {subBar}
        <div className={styles.overviewRow}>{overviewLink}</div>
        {learnCards.length === 0 ? (
          <p className={styles.emptyMsg}>{emptyMessage}</p>
        ) : (
          <div className={styles.cards} style={{ padding: 24 }}>
            {learnCards.map((card) => (
              <CardItem
                key={`${card._id}-${startSide}`}
                card={card}
                startFlipped={startSide === 2}
                onProgressChange={handleProgressChange}
                onNotesChange={handleNotesChange}
              />
            ))}
          </div>
        )}
        {overviewModal}
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
        <div className={styles.overviewRow}>{overviewLink}</div>
        <p className={styles.emptyMsg}>{emptyMessage}</p>
        {overviewModal}
      </div>
    );

  return (
    <div className={styles.pageLearning}>
      {subBar}
      <span className={`${styles.learnCounter} ${styles.counterTop}`}>
        {idx + 1} / {learnCards.length}
        <span className={styles.overviewInline}>{overviewLink}</span>
      </span>

      <div
        className={styles.cardStage}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        {/* mobile: counter pinned level with the sem-dot row */}
        <span className={styles.counterStage} aria-hidden>
          {idx + 1} / {learnCards.length}
        </span>

        {/* desktop: arrows on the card edges, vertically centred */}
        <button
          className={`${styles.edgeNav} ${styles.edgeNavLeft}`}
          onClick={goPrev}
          aria-label="←"
        >
          ‹
        </button>
        <button
          className={`${styles.edgeNav} ${styles.edgeNavRight}`}
          onClick={goNext}
          aria-label="→"
        >
          ›
        </button>

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
          onNotesChange={handleNotesChange}
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

      {/* colour breakdown of what you're working through — tap to filter */}
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

      {/* Mobile: arrows directly under the card (counter is up top) */}
      <div className={styles.mobileNav}>
        <button
          className={styles.btnLearnNavSm}
          onClick={goPrev}
          aria-label="←"
        >
          ‹
        </button>
        <button
          className={styles.btnLearnNavSm}
          onClick={goNext}
          aria-label="→"
        >
          ›
        </button>
      </div>

      {/* Desktop: progress-dot strip (arrows are on the card edges) */}
      <div className={styles.learnNav}>
        <div className={styles.learnProgressDots}>
          {learnCards.map((_, i) => (
            <div
              key={i}
              className={`${styles.learnDot}${i === idx ? ` ${styles.active}` : ""}`}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
      </div>

      {overviewModal}
    </div>
  );
}
