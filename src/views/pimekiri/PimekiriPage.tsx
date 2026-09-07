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
  stageProgress,
  stagesFor,
  type LayoutId,
} from "./keyboardLayouts";

interface Props {
  onExit: () => void;
}

const LAYOUT_KEY = "pimekiri-layout";
const STARS_KEY = "pimekiri-stars"; // + ":" + layout id
const IGNORE_LIVES_KEY = "pimekiri-ignore-lives";
const LIVES_START = 7;
const LIVES_MAX = 7;
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

function readIgnoreLives(): boolean {
  return localStorage.getItem(IGNORE_LIVES_KEY) === "1";
}
function writeIgnoreLives(on: boolean) {
  try {
    localStorage.setItem(IGNORE_LIVES_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Star tally, always compact so the count stays readable: the locked-in
    multiple of 3 as a number + ⭐, then the current group of 3 tick-stars
    filling grey→gold as you climb. When all three are gold they fold into
    the number. e.g. 2 → "★★☆", 3 → "3⭐ ☆☆☆", 13 → "12⭐ ★☆☆". */
function StarTally({ n, className }: { n: number; className?: string }) {
  if (n <= 0) return <span className={className}>☆</span>;

  const base = Math.floor(n / 3) * 3; // 0, 3, 6, 9 …
  const lit = n - base; // 0..2 gold tick-stars

  return (
    <span className={className}>
      {base > 0 && (
        <>
          <span className={styles.starNum}>{base}</span>
          <span className={styles.starGlyph} aria-hidden>
            ⭐
          </span>
        </>
      )}
      <span className={styles.starTicks} aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={i < lit ? styles.tickOn : styles.tickOff}>
            ★
          </span>
        ))}
      </span>
      <span className={styles.srOnly}>{n}</span>
    </span>
  );
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
  const [paused, setPaused] = useState(false);
  const [ignoreLives, setIgnoreLives] = useState(readIgnoreLives);
  // game-over screen: normal buttons, or the inline "make it easier" picker
  const [easierPicker, setEasierPicker] = useState(false);
  const [pickStars, setPickStars] = useState(0);

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
  const pausedRef = useRef(false);
  const ignoreLivesRef = useRef(ignoreLives);

  ballRef.current = ball;
  scoreRef.current = score;
  phaseRef.current = phase;
  stageRef.current = stageIdx;
  caughtRef.current = caught;
  layoutRef.current = layout;
  starsRef.current = stars;
  pausedRef.current = paused;
  ignoreLivesRef.current = ignoreLives;

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
  // badge text: list the keys while it's short, switch to a count once wide
  const stageLabel = useMemo(() => {
    if (stageKeys.length <= 8) return stageKeys.join(" ");
    return t.pimekiriStageCount(stageKeys.length);
  }, [stageKeys]);

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

  // manual star control on the start screen — set your own level / reset
  const setStarsTo = useCallback(
    (n: number) => {
      const clamped = Math.max(0, Math.min(n, maxStageFor(layout)));
      setStars(clamped);
      starsRef.current = clamped;
      writeStars(layout, clamped);
    },
    [layout]
  );
  const adjustStars = useCallback(
    (delta: number) => setStarsTo(starsRef.current + delta),
    [setStarsTo]
  );

  // ⚙ from the HUD → back to the start screen (layout + star settings).
  // The rAF loop halts on its own once phase leaves "playing".
  const openSettings = useCallback(() => {
    setBall(null);
    ballRef.current = null;
    setPaused(false);
    pausedRef.current = false;
    setEasierPicker(false);
    setPhase("start");
    phaseRef.current = "start";
  }, []);

  const toggleIgnoreLives = useCallback(() => {
    setIgnoreLives((v) => {
      const next = !v;
      ignoreLivesRef.current = next;
      writeIgnoreLives(next);
      return next;
    });
  }, []);

  /** Begin a run. `atStage` overrides where to start; default is one below
      the current stars (a small climb back after a loss). */
  const startGame = useCallback(
    (atStage?: number) => {
      try {
        localStorage.setItem(LAYOUT_KEY, layout);
      } catch {
        /* ignore */
      }
      const resumeStage = Math.max(
        0,
        Math.min(atStage ?? starsRef.current - 1, maxStageFor(layout))
      );
      const seedCatches = catchesToReachStage(layout, resumeStage);

      setLives(LIVES_START);
      setScore(0);
      setCaught(seedCatches);
      setRunCatches(0);
      setMisses(0);
      setStageIdx(resumeStage);
      setPaused(false);
      pausedRef.current = false;
      setEasierPicker(false);
      scoreRef.current = 0;
      stageRef.current = resumeStage;
      caughtRef.current = seedCatches;
      setPhase("playing");
      phaseRef.current = "playing";
      // let the keyboard paint first so keyCentreX can measure real rects
      requestAnimationFrame(() => spawnBall());
    },
    [layout, spawnBall]
  );

  // "Jätka" on game over — same level you died on, full hearts
  const continueSameLevel = useCallback(() => {
    startGame(stageRef.current);
  }, [startGame]);

  // "Tee lihtsamaks" — reveal the inline star picker, default one below death
  const openEasierPicker = useCallback(() => {
    setPickStars(Math.max(0, stageRef.current - 1));
    setEasierPicker(true);
  }, []);

  const registerMiss = useCallback(() => {
    setFlash(true);
    window.setTimeout(() => setFlash(false), 300);
    setMisses((m) => m + 1);
    if (ignoreLivesRef.current) return; // no-stress mode: hearts never drop
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
      if (pausedRef.current) {
        // frozen: don't advance, and don't let dt build up while stopped
        lastTsRef.current = ts;
      } else if (b && b.state === "falling" && field) {
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

  const togglePause = useCallback(() => {
    if (phaseRef.current !== "playing") return;
    setPaused((p) => {
      pausedRef.current = !p;
      return !p;
    });
    lastTsRef.current = 0; // resume without a time jump
  }, []);

  // ── keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current !== "playing") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Space toggles pause — never counts as a catch/miss
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePause();
        return;
      }
      if (pausedRef.current) return; // ignore letters while paused
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
  }, [catchCurrent, registerMiss, togglePause]);

  const accuracy = useMemo(() => {
    const total = runCatches + misses;
    return total ? Math.round((runCatches / total) * 100) : 100;
  }, [runCatches, misses]);

  // how close the current run is to unlocking the next stage (= next star)
  const progress = useMemo(
    () => stageProgress(layout, caught),
    [layout, caught]
  );

  // ── start screen ──
  if (phase === "start") {
    return (
      <div className={styles.page}>
        <div className={styles.startBox}>
          <h1>{t.pimekiriHeading}</h1>
          <p>{t.pimekiriIntro}</p>

          <div className={styles.starRow} aria-label={t.pimekiriStars}>
            <div className={styles.starAdjust}>
              <button
                className={styles.starStep}
                onClick={() => adjustStars(-1)}
                disabled={stars <= 0}
                aria-label={t.pimekiriStarMinus}
              >
                −
              </button>
              <StarTally n={stars} className={styles.starList} />
              <button
                className={styles.starStep}
                onClick={() => adjustStars(1)}
                disabled={stars >= maxStageFor(layout)}
                aria-label={t.pimekiriStarPlus}
              >
                +
              </button>
            </div>
            <span className={styles.starCount}>
              {t.pimekiriStarsHave(stars)}
            </span>
            {stars > 0 && (
              <button
                className={styles.starReset}
                onClick={() => setStarsTo(0)}
              >
                {t.pimekiriStarsReset}
              </button>
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

          <label className={styles.ignoreLives}>
            <input
              type="checkbox"
              checked={ignoreLives}
              onChange={toggleIgnoreLives}
            />
            <span>
              <strong>{t.pimekiriIgnoreLives}</strong> —{" "}
              {t.pimekiriIgnoreLivesHelp}
            </span>
          </label>

          <p className={styles.hintLine}>
            <kbd>{t.pimekiriSpaceKey}</kbd> {t.pimekiriSpaceHint}
          </p>

          <button className={styles.btnPrimary} onClick={() => startGame()}>
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
          <StarTally
            n={stars}
            className={`${styles.stars} ${newStar ? styles.starsPop : ""}`}
          />
          <span className={styles.srOnly}>{t.pimekiriStars}</span>
          {newStar ? (
            <span className={styles.newStar}>{t.pimekiriNewStar}</span>
          ) : (
            <span
              className={styles.nextStar}
              aria-label={t.pimekiriNextStar}
              title={t.pimekiriNextStar}
            >
              {progress.atMax ? (
                <span className={styles.nextStarMax}>{t.pimekiriMaxLevel}</span>
              ) : (
                <>
                  <span className={styles.nextStarBar}>
                    <span
                      className={styles.nextStarFill}
                      style={{
                        width: `${(progress.have / progress.need) * 100}%`,
                      }}
                    />
                  </span>
                  <span className={styles.nextStarText}>
                    {progress.need - progress.have}★
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        <div className={styles.hudGroup}>
          <span className={styles.lives} aria-label={t.pimekiriLives}>
            {ignoreLives ? (
              <>
                <span className={styles.heartFull}>❤️</span>
                <span className={styles.heartInf}>∞</span>
              </>
            ) : (
              Array.from({ length: LIVES_START }, (_, i) => (
                <span
                  key={i}
                  className={i < lives ? styles.heartFull : styles.heartGone}
                >
                  {i < lives ? "❤️" : "🤍"}
                </span>
              ))
            )}
          </span>
          <span className={styles.stageBadge}>
            {t.pimekiriStage(stageLabel)}
          </span>
        </div>
        <div className={styles.hudGroup}>
          <span className={styles.stat}>
            {t.pimekiriScore} <strong>{score}</strong>
          </span>
          <span className={styles.stat}>
            {t.pimekiriAccuracy} <strong>{accuracy}%</strong>
          </span>
          <button
            className={styles.btnIcon}
            onClick={openSettings}
            aria-label={t.pimekiriSettings}
            title={t.pimekiriSettings}
          >
            ⚙
          </button>
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
            <button
              type="button"
              className={`${styles.spaceKey} ${paused ? styles.spaceKeyPaused : ""}`}
              onClick={togglePause}
            >
              {paused ? t.pimekiriResume : t.pimekiriPause}
            </button>
          </div>
        </div>

        {paused && phase === "playing" && (
          <div className={styles.pauseOverlay} onClick={togglePause}>
            <span className={styles.pauseTitle}>{t.pimekiriPaused}</span>
            <span className={styles.pauseHint}>{t.pimekiriResumeHint}</span>
          </div>
        )}

        {phase === "over" && (
          <div className={styles.overlay}>
            <h2>{t.pimekiriGameOver}</h2>
            <div className={styles.bigScore}>{score}</div>
            <StarTally n={stars} className={styles.starList} />
            <div className={styles.stat}>
              {t.pimekiriRecap(runCatches, accuracy)}
            </div>

            {easierPicker ? (
              <div className={styles.easierBox}>
                <span className={styles.stat}>{t.pimekiriEasierHint}</span>
                <div className={styles.starAdjust}>
                  <button
                    className={styles.starStep}
                    onClick={() => setPickStars((n) => Math.max(0, n - 1))}
                    disabled={pickStars <= 0}
                    aria-label={t.pimekiriStarMinus}
                  >
                    −
                  </button>
                  <StarTally n={pickStars} className={styles.starList} />
                  <button
                    className={styles.starStep}
                    onClick={() =>
                      setPickStars((n) => Math.min(maxStageFor(layout), n + 1))
                    }
                    disabled={pickStars >= maxStageFor(layout)}
                    aria-label={t.pimekiriStarPlus}
                  >
                    +
                  </button>
                </div>
                <span className={styles.easierKeys}>
                  {t.pimekiriLevelKeys(stagesFor(layout)[pickStars].join(" "))}
                </span>
                <div className={styles.overlayBtns}>
                  <button
                    className={styles.btnPrimary}
                    onClick={() => startGame(pickStars)}
                  >
                    {t.pimekiriPlay}
                  </button>
                  <button
                    className={styles.btnGhost}
                    onClick={() => setEasierPicker(false)}
                  >
                    {t.btnBack}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.overlayBtns}>
                <button
                  className={styles.btnPrimary}
                  onClick={continueSameLevel}
                >
                  {t.pimekiriContinue}
                </button>
                <button className={styles.btnGhost} onClick={openEasierPicker}>
                  {t.pimekiriMakeEasier}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
