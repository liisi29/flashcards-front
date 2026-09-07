import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { t } from "../../strings";
import styles from "./PimekiriPage.module.css";
import {
  LAYOUT_LIST,
  LAYOUTS,
  activeKeys,
  catchesToReachStage,
  maxStageFor,
  stageForCatches,
  stagesFor,
  type LayoutId,
} from "./keyboardLayouts";

interface Props {
  onExit: () => void;
}

const LAYOUT_KEY = "pimekiri-layout";
const STARS_KEY = "pimekiri-stars"; // + ":" + layout id
const LIVES_START = 10;
const LIVES_MAX = 10;
const CATCHES_PER_LIFE = 5; // regain one life every N catches (up to LIVES_MAX)
const BALL_R = 28; // ball radius in px (keep in sync with .ball in the CSS)

/** falling speed in px/sec, ramps up a little as the score climbs */
function fallSpeed(score: number) {
  return 95 + Math.min(score * 2.5, 145); // 95 → 240 px/s
}

type Phase = "start" | "playing" | "over";

interface Ball {
  id: number;
  ch: string;
  x: number; // px: centre of the target key, relative to the field's left edge
  y: number; // px from the top of the field
  state: "falling" | "caught" | "dropped";
}

function readLayout(): LayoutId {
  const v = localStorage.getItem(LAYOUT_KEY);
  return v === "us" || v === "et" ? v : "et";
}

function readStars(id: LayoutId): number {
  const n = Number(localStorage.getItem(`${STARS_KEY}:${id}`));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
function writeStars(id: LayoutId, n: number) {
  try {
    localStorage.setItem(`${STARS_KEY}:${id}`, String(n));
  } catch {
    /* ignore */
  }
}

export function Pimekiri({ onExit }: Props) {
  const [phase, setPhase] = useState<Phase>("start");
  const [layout, setLayout] = useState<LayoutId>(readLayout);

  const [stars, setStars] = useState<number>(() => readStars(readLayout()));
  const [lives, setLives] = useState(LIVES_START);
  const [score, setScore] = useState(0);
  const [caught, setCaught] = useState(0); // ladder progress (seeded on resume)
  const [runCatches, setRunCatches] = useState(0); // catches made this run
  const [misses, setMisses] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [ball, setBall] = useState<Ball | null>(null);
  const [pressed, setPressed] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [newStar, setNewStar] = useState(false); // brief "new level!" flourish

  const fieldRef = useRef<HTMLDivElement>(null);
  const keyEls = useRef<Map<string, HTMLElement>>(new Map());
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const ballIdRef = useRef(0);
  // live refs so the rAF loop and key handler don't need to re-bind
  const ballRef = useRef<Ball | null>(null);
  const scoreRef = useRef(0);
  const phaseRef = useRef<Phase>("start");
  const stageRef = useRef(0);
  const caughtRef = useRef(0);
  const layoutRef = useRef<LayoutId>(layout);
  const starsRef = useRef(stars);

  ballRef.current = ball;
  scoreRef.current = score;
  phaseRef.current = phase;
  stageRef.current = stageIdx;
  caughtRef.current = caught;
  layoutRef.current = layout;
  starsRef.current = stars;

  // stars are tracked per keyboard layout
  useEffect(() => {
    setStars(readStars(layout));
  }, [layout]);

  const stages = useMemo(() => stagesFor(layout), [layout]);
  const stageKeys = stages[Math.min(stageIdx, stages.length - 1)];
  const activeSet = useMemo(
    () => activeKeys(layout, stageIdx),
    [layout, stageIdx]
  );

  /** x (px from the field's left edge) of a given key's centre */
  const keyCentreX = useCallback((ch: string): number => {
    const field = fieldRef.current;
    const el = keyEls.current.get(ch);
    if (!field || !el) return field ? field.clientWidth / 2 : 0;
    const f = field.getBoundingClientRect();
    const k = el.getBoundingClientRect();
    const x = k.left + k.width / 2 - f.left;
    return Math.max(BALL_R, Math.min(field.clientWidth - BALL_R, x));
  }, []);

  /** y the ball centre stops at — resting on top of the target key */
  const restY = useCallback((ch: string): number => {
    const field = fieldRef.current;
    const el = keyEls.current.get(ch);
    if (!field) return 0;
    if (!el) return field.clientHeight - BALL_R;
    const f = field.getBoundingClientRect();
    const k = el.getBoundingClientRect();
    return k.top - f.top - BALL_R * 0.55; // sit slightly overlapping the key
  }, []);

  const spawnBall = useCallback(() => {
    const s = stagesFor(layoutRef.current);
    const pool = s[Math.min(stageRef.current, s.length - 1)];
    const ch = pool[Math.floor(Math.random() * pool.length)];
    ballIdRef.current += 1;
    const b: Ball = {
      id: ballIdRef.current,
      ch,
      x: keyCentreX(ch),
      y: 0,
      state: "falling",
    };
    ballRef.current = b;
    setBall(b);
  }, [keyCentreX]);

  const startGame = useCallback(() => {
    try {
      localStorage.setItem(LAYOUT_KEY, layout);
    } catch {
      /* ignore */
    }
    // resume near where the stars left off: stars - 1, clamped to the ladder
    const resumeStage = Math.max(
      0,
      Math.min(starsRef.current - 1, maxStageFor(layout))
    );
    const seedCatches = catchesToReachStage(layout, resumeStage);

    setLives(LIVES_START);
    setScore(0);
    setCaught(seedCatches);
    setRunCatches(0);
    setMisses(0);
    setStageIdx(resumeStage);
    scoreRef.current = 0;
    stageRef.current = resumeStage;
    caughtRef.current = seedCatches;
    setPhase("playing");
    phaseRef.current = "playing";
    // let the keyboard paint first so keyCentreX can measure real rects
    requestAnimationFrame(() => spawnBall());
  }, [layout, spawnBall]);

  const registerMiss = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 300);
    setMisses((m) => m + 1);
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) {
        setPhase("over");
        phaseRef.current = "over";
        setBall(null);
        ballRef.current = null;
      }
      return next;
    });
  }, []);

  const dropCurrent = useCallback(() => {
    setBall((b) => (b ? { ...b, state: "dropped" } : b));
    ballRef.current = ballRef.current
      ? { ...ballRef.current, state: "dropped" }
      : null;
    registerMiss();
    window.setTimeout(() => {
      if (phaseRef.current === "playing") spawnBall();
    }, 260);
  }, [registerMiss, spawnBall]);

  const catchCurrent = useCallback(() => {
    setBall((b) => (b ? { ...b, state: "caught" } : b));
    ballRef.current = ballRef.current
      ? { ...ballRef.current, state: "caught" }
      : null;

    const nextScore = scoreRef.current + 1 + stageRef.current;
    scoreRef.current = nextScore;
    setScore(nextScore);

    const nextCaught = caughtRef.current + 1;
    caughtRef.current = nextCaught;
    setCaught(nextCaught);
    setRunCatches((n) => {
      const r = n + 1;
      // regain a life every CATCHES_PER_LIFE catches this run, up to the cap
      if (r % CATCHES_PER_LIFE === 0) {
        setLives((l) => Math.min(LIVES_MAX, l + 1));
      }
      return r;
    });

    // auto-advance: fast at first (3 catches on f/j), slower as keys pile up
    const wantStage = stageForCatches(layoutRef.current, nextCaught);
    if (wantStage !== stageRef.current) {
      stageRef.current = wantStage;
      setStageIdx(wantStage);

      // a new stage = new characters unlocked → earn a star (once per level)
      if (wantStage > starsRef.current) {
        starsRef.current = wantStage;
        setStars(wantStage);
        writeStars(layoutRef.current, wantStage);
        setNewStar(true);
        window.setTimeout(() => setNewStar(false), 1400);
      }
    }

    window.setTimeout(() => {
      if (phaseRef.current === "playing") spawnBall();
    }, 140);
  }, [spawnBall]);

  // ── falling loop ──
  useEffect(() => {
    if (phase !== "playing") return;
    const tick = (ts: number) => {
      if (!lastTsRef.current) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      const b = ballRef.current;
      const field = fieldRef.current;
      if (b && b.state === "falling" && field) {
        // the ball reaches the key without a keypress → missed
        const landY = restY(b.ch);
        const y = b.y + fallSpeed(scoreRef.current) * dt;
        if (y >= landY) {
          dropCurrent();
        } else {
          const nb = { ...b, y };
          ballRef.current = nb;
          setBall(nb);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = 0;
    };
  }, [phase, dropCurrent, restY]);

  // keep a falling ball glued above its key if the layout reflows
  useEffect(() => {
    if (phase !== "playing") return;
    const onResize = () => {
      const b = ballRef.current;
      if (b && b.state === "falling") {
        const nb = { ...b, x: keyCentreX(b.ch) };
        ballRef.current = nb;
        setBall(nb);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [phase, keyCentreX]);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.length !== 1) return; // single printable char only
      const k = e.key.toLowerCase();

      const b = ballRef.current;
      if (!b || b.state !== "falling") return;

      setPressed(k);
      window.setTimeout(() => setPressed(null), 120);

      if (k === b.ch) catchCurrent();
      else registerMiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [catchCurrent, registerMiss]);

  const accuracy = useMemo(() => {
    const total = runCatches + misses;
    return total ? Math.round((runCatches / total) * 100) : 100;
  }, [runCatches, misses]);

  // ── start screen ──
  if (phase === "start") {
    const resumeStage = Math.max(0, Math.min(stars - 1, maxStageFor(layout)));
    const resumeKeys = stagesFor(layout)[resumeStage].join(" ");
    return (
      <div className={styles.page}>
        <div className={styles.startBox}>
          <h1>{t.pimekiriHeading}</h1>
          <p>{t.pimekiriIntro}</p>

          <div className={styles.starRow} aria-label={t.pimekiriStars}>
            {stars > 0 ? (
              <>
                <span className={styles.starList}>{"⭐".repeat(stars)}</span>
                <span className={styles.starCount}>
                  {t.pimekiriStarsHave(stars)}
                </span>
              </>
            ) : (
              <span className={styles.starCount}>{t.pimekiriStarsHave(0)}</span>
            )}
          </div>

          <div>
            <span className={styles.fieldLabel}>{t.pimekiriLayout}</span>
            <div className={styles.layoutChips}>
              {LAYOUT_LIST.map((l) => (
                <button
                  key={l.id}
                  className={
                    l.id === layout
                      ? `${styles.layoutChip} ${styles.selected}`
                      : styles.layoutChip
                  }
                  onClick={() => setLayout(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {stars > 1 && (
            <p className={styles.resumeHint}>
              {t.pimekiriResumeAt(resumeKeys)}
            </p>
          )}

          <button className={styles.btnPrimary} onClick={startGame}>
            {t.pimekiriStart}
          </button>
          <button className={styles.btnGhost} onClick={onExit}>
            {t.btnBack}
          </button>
        </div>
      </div>
    );
  }

  const kb = LAYOUTS[layout];

  return (
    <div className={styles.page}>
      <div className={styles.hud}>
        <div className={styles.hudGroup}>
          <span
            className={`${styles.stars} ${newStar ? styles.starsPop : ""}`}
            aria-label={t.pimekiriStars}
          >
            {stars > 0 ? "⭐".repeat(stars) : "☆"}
          </span>
          {newStar && (
            <span className={styles.newStar}>{t.pimekiriNewStar}</span>
          )}
        </div>
        <div className={styles.hudGroup}>
          <span className={styles.lives} aria-label={t.pimekiriLives}>
            {"❤️".repeat(Math.max(lives, 0))}
          </span>
          <span className={styles.stageBadge}>
            {t.pimekiriStage(stageKeys.join(" "))}
          </span>
        </div>
        <div className={styles.hudGroup}>
          <span className={styles.stat}>
            {t.pimekiriScore} <strong>{score}</strong>
          </span>
          <span className={styles.stat}>
            {t.pimekiriAccuracy} <strong>{accuracy}%</strong>
          </span>
          <button className={styles.btnGhost} onClick={onExit}>
            {t.btnBack}
          </button>
        </div>
      </div>

      {/* one view: the ball falls down through the same box the keyboard
          sits at the bottom of, and lands on the real key */}
      <div className={styles.field} ref={fieldRef}>
        <div className={`${styles.flash} ${flash ? styles.on : ""}`} />
        {ball && (
          <div
            key={ball.id}
            className={`${styles.ball} ${
              ball.state === "caught"
                ? styles.caught
                : ball.state === "dropped"
                  ? styles.dropped
                  : ""
            }`}
            style={{ left: `${ball.x}px`, top: `${ball.y}px` }}
          >
            {ball.ch}
          </div>
        )}

        <div className={styles.keyboard}>
          {kb.rows.map((row, ri) => (
            <div key={ri} className={styles.kbRow}>
              {row.map((key) => {
                const isHome = kb.homeRow.includes(key);
                const isActive = activeSet.has(key);
                const isAnchor = key === "f" || key === "j";
                const isPressed = pressed === key;
                const cls = [
                  styles.key,
                  isHome && styles.home,
                  isActive && styles.active,
                  isAnchor && styles.anchor,
                  isPressed && styles.pressed,
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <div
                    key={key}
                    ref={(el) => {
                      if (el) keyEls.current.set(key, el);
                      else keyEls.current.delete(key);
                    }}
                    className={cls}
                  >
                    {key}
                  </div>
                );
              })}
            </div>
          ))}
          <div className={`${styles.kbRow} ${styles.spaceRow}`}>
            <div className={styles.spaceKey} />
          </div>
        </div>

        {phase === "over" && (
          <div className={styles.overlay}>
            <h2>{t.pimekiriGameOver}</h2>
            <div className={styles.bigScore}>{score}</div>
            <div className={styles.starList}>
              {stars > 0 ? "⭐".repeat(stars) : "☆"}
            </div>
            <div className={styles.stat}>
              {t.pimekiriRecap(runCatches, accuracy)}
            </div>
            <div className={styles.overlayBtns}>
              <button className={styles.btnPrimary} onClick={startGame}>
                {t.pimekiriAgain}
              </button>
              <button
                className={styles.btnGhost}
                onClick={() => {
                  setPhase("start");
                  phaseRef.current = "start";
                }}
              >
                {t.pimekiriChangeLayout}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
