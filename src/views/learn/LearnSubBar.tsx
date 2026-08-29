import { useRef, useState, useEffect } from "react";
import { t } from "../../strings";
import type { Color, ISubject, ITag } from "../../types";
import { useTags } from "../../contexts/TagsContext";
import { useGroups } from "../../contexts/GroupsContext";
import { api } from "../../api";
import styles from "./LearnSubBar.module.css";

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
  topics: ISubject[];
  subjectId: string;
  topicIds: string[];
  activeColors: Color[];
  activeTagIds: string[];
  mode: "single" | "grid";
  totalCount: number;
  colorCounts: Record<string, number>;
  onToggleTopic: (_id: string) => void;
  onToggleColor: (_c: Color) => void;
  onToggleTag: (_id: string) => void;
  activeGroupIds: string[];
  onToggleGroup: (_id: string) => void;
  /** the real tag ids for the current topic, so the parent can prune stale ones */
  onTopicTagsLoaded?: (_ids: string[]) => void;
  // runtime groups — size is chosen in the settings modal; the bar only
  // picks which group number to practise
  groupSize: number; // 0 = off
  groupNum: number; // 0 = whole deck
  nGroups: number;
  onGroupNumChange: (_n: number) => void;
  onModeChange: (_m: "single" | "grid") => void;
  onShuffle: () => void;
  /** which side each card opens on: 1 = front, 2 = back */
  startSide: 1 | 2;
  onStartSideChange: (_s: 1 | 2) => void;
  /** "bar" = sticky top bar (desktop), "drawer" = stacked inside mobile menu */
  variant?: "bar" | "drawer";
}

export function LearnSubBar({
  topics,
  subjectId,
  topicIds,
  activeColors,
  activeTagIds,
  mode,
  totalCount,
  colorCounts,
  onToggleTopic,
  onToggleColor,
  onToggleTag,
  activeGroupIds: _activeGroupIds,
  onToggleGroup: _onToggleGroup,
  onTopicTagsLoaded,
  groupSize,
  groupNum,
  nGroups,
  onGroupNumChange,
  onModeChange,
  onShuffle,
  startSide,
  onStartSideChange,
  variant = "bar",
}: Props) {
  void _activeGroupIds;
  void _onToggleGroup;
  const { reloadKey } = useTags();
  const { ensureTag } = useGroups();
  const [tags, setTags] = useState<ITag[]>([]);
  const singleTopicId = topicIds.length === 1 ? topicIds[0] : "";

  useEffect(() => {
    if (!singleTopicId) {
      setTags([]);
      return;
    }
    api
      .getTags(subjectId, singleTopicId)
      .then((all) => {
        setTags(all);
        onTopicTagsLoaded?.(all.map((tg) => tg._id));
        all.forEach((tg) => ensureTag(tg._id));
      })
      .catch(() => {});
  }, [subjectId, singleTopicId, reloadKey, ensureTag]);

  const [colorDropdownOpen, setColorDropdownOpen] = useState(false);
  const [topicDropdownOpen, setTopicDropdownOpen] = useState(false);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const colorDropdownRef = useRef<HTMLDivElement>(null);
  const topicDropdownRef = useRef<HTMLDivElement>(null);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Close any open dropdown on a click anywhere outside it.
  useEffect(() => {
    if (!colorDropdownOpen && !topicDropdownOpen && !tagDropdownOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!colorDropdownRef.current?.contains(target))
        setColorDropdownOpen(false);
      if (!topicDropdownRef.current?.contains(target))
        setTopicDropdownOpen(false);
      if (!tagDropdownRef.current?.contains(target)) setTagDropdownOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [colorDropdownOpen, topicDropdownOpen, tagDropdownOpen]);

  // Only tag ids that actually exist for this topic — anything else in
  // activeTagIds (e.g. stale ids left in sessionStorage) is ignored.
  const topicTagIds = new Set(tags.map((tg) => tg._id));
  const realActiveTagIds = activeTagIds.filter((id) => topicTagIds.has(id));

  const topicLabel =
    topicIds.length === 0
      ? t.pickTopic
      : topicIds.length === 1
        ? (topics.find((t) => t._id === topicIds[0])?.label ?? t.pickTopic)
        : `${topicIds.length} teemat`;

  const tagLabel =
    realActiveTagIds.length === 0
      ? t.allTags
      : realActiveTagIds.length === 1
        ? (tags.find((tg) => tg._id === realActiveTagIds[0])?.name ?? t.allTags)
        : `${realActiveTagIds.length} silti`;

  return (
    <div
      className={`${styles.subBar} ${
        variant === "drawer" ? styles.subBarDrawer : ""
      }`}
    >
      <div className={styles.subBarLeft}>
        {!subjectId && (
          <span className={styles.cardCounts}>{t.pickSubjectFirst}</span>
        )}
        {subjectId && topics.length > 0 && (
          <div className={styles.colorDropdown} ref={topicDropdownRef}>
            <button
              className={styles.colorDropdownTrigger}
              onClick={() => setTopicDropdownOpen((o) => !o)}
            >
              {topicLabel}
              <span className={styles.dropdownCaret}>
                {topicDropdownOpen ? "▲" : "▼"}
              </span>
            </button>
            {topicDropdownOpen && (
              <div className={styles.colorDropdownMenu}>
                {topics.map((topic) => (
                  <label key={topic._id} className={styles.colorDropdownItem}>
                    <input
                      type="checkbox"
                      checked={topicIds.includes(topic._id)}
                      onChange={() => onToggleTopic(topic._id)}
                    />
                    {topic.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {subjectId && singleTopicId && (
          <div className={styles.colorDropdown} ref={tagDropdownRef}>
            <button
              className={styles.colorDropdownTrigger}
              onClick={() => setTagDropdownOpen((o) => !o)}
            >
              {tagLabel}
              <span className={styles.dropdownCaret}>
                {tagDropdownOpen ? "▲" : "▼"}
              </span>
            </button>
            {tagDropdownOpen && (
              <div className={styles.colorDropdownMenu}>
                {tags.length === 0 && (
                  <span className={styles.colorDropdownEmpty}>
                    {t.groupNoTags}
                  </span>
                )}
                {tags.map((tag) => (
                  <label key={tag._id} className={styles.colorDropdownItem}>
                    <input
                      type="checkbox"
                      checked={activeTagIds.includes(tag._id)}
                      onChange={() => onToggleTag(tag._id)}
                    />
                    <span
                      style={{
                        display: "inline-block",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: tag.color,
                        marginRight: 4,
                      }}
                    />
                    {tag.name}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        {groupSize > 0 && nGroups > 0 && (
          <select
            className={styles.subBarSelect}
            value={groupNum}
            onChange={(e) => onGroupNumChange(Number(e.target.value))}
            title={t.labelGroup}
          >
            <option value={0}>{t.allGroups}</option>
            {Array.from({ length: nGroups }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {t.labelGroup} {n}
              </option>
            ))}
          </select>
        )}
        <span className={styles.cardCounts}>
          all: {totalCount}.{" "}
          {ALL_COLORS.map((c, i) => (
            <span key={String(c)} style={{ color: COLOR_DOT[String(c)] }}>
              {colorCounts[String(c)] ?? 0}
              {i < ALL_COLORS.length - 1 ? (
                <span style={{ color: "#a0aec0" }}> / </span>
              ) : null}
            </span>
          ))}
        </span>
      </div>

      <div className={styles.subBarRight}>
        {/* Raskusaste dropdown */}
        <div className={styles.colorDropdown} ref={colorDropdownRef}>
          <button
            className={styles.colorDropdownTrigger}
            onClick={() => setColorDropdownOpen((o) => !o)}
          >
            Raskusaste
            <span className={styles.colorDots}>
              {ALL_COLORS.filter((c) => !!c).map((c) => (
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
                    onChange={() => onToggleColor(c)}
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

        {/* Start side — which face cards open on */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${startSide === 1 ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onStartSideChange(1)}
            title={t.side1}
          >
            1
          </button>
          <button
            className={`${styles.viewToggleBtn}${startSide === 2 ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onStartSideChange(2)}
            title={t.side2}
          >
            2
          </button>
        </div>

        {/* Shuffle — grid only */}
        {mode === "grid" && (
          <button className={styles.subBarBtn} onClick={onShuffle}>
            {t.btnShuffle}
          </button>
        )}

        {/* View toggle — grid option is hidden on small phones (see CSS) */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn}${mode === "single" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onModeChange("single")}
            title="Üks kaart"
          >
            □
          </button>
          <button
            className={`${styles.viewToggleBtn} ${styles.viewToggleGrid}${mode === "grid" ? ` ${styles.viewToggleActive}` : ""}`}
            onClick={() => onModeChange("grid")}
            title="Kõik kaardid"
          >
            ⊞
          </button>
        </div>
      </div>
    </div>
  );
}
