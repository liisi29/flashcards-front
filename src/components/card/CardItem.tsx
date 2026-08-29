import { useState, useEffect } from "react";
import styles from "./CardItem.module.css";
import { CardScene } from "./CardScene";
import type { ICard, Color } from "../../types";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useTags } from "../../contexts/TagsContext";
import { SemDot } from "../SemDot";
import { api } from "../../api";
import { currentUserId } from "../../user";

const COLORS: Color[] = [null, "red", "yellow", "green"];

/** The card's difficulty for the current user, falling back to the legacy
    shared "all" value so pre-existing progress still shows up. */
function readProgress(progress: Record<string, Color>): Color {
  const uid = currentUserId();
  return progress[uid] ?? progress["all"] ?? null;
}

interface IProps {
  card: ICard;
  onProgressChange?: (_id: string, _color: Color) => void;
  /** extra class(es) on the flip scene only (used for the swipe animation) */
  sceneClassName?: string;
  /** inline style on the flip scene only */
  sceneStyle?: React.CSSProperties;
  /** open on side 2 (back) instead of side 1 */
  startFlipped?: boolean;
}

export function CardItem({
  card,
  onProgressChange,
  sceneClassName = "",
  sceneStyle,
  startFlipped = false,
}: IProps) {
  const { _id, subjectId, topicId, progress: initialProgress, s1, s2 } = card;
  const { subjectLabel, topicLabel } = useSubjects();
  const { tagsFor, ensureSubject } = useTags();

  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  const ids = new Set(card.tagIds ?? []);
  const cardTags = (tagsFor(subjectId) ?? []).filter((tg) => ids.has(tg._id));
  const [progress, setProgressState] = useState(initialProgress);
  const uid = currentUserId();
  const myColor = readProgress(progress);

  async function setProgress(id: string, color: Color) {
    setProgressState((prev) => ({ ...prev, [uid]: color }));
    api.setProgress(id, uid, color);
    onProgressChange?.(id, color);
  }

  return (
    <div className={`cardItem ${styles.learnCardArea}`}>
      <div
        data-no-swipe
        style={{ display: "flex", justifyContent: "center", gap: 10 }}
      >
        {COLORS.map((c) => (
          <SemDot
            key={String(c)}
            color={c}
            selected={myColor === c}
            onClick={() => setProgress(_id, c)}
          />
        ))}
      </div>
      <CardScene
        s1={s1}
        s2={s2}
        className={sceneClassName}
        style={sceneStyle}
        initialFlipped={startFlipped}
        cornerColor={myColor}
      />
      <div className={styles.cardMeta}>
        {subjectLabel(subjectId)}
        {topicLabel(topicId) ? ` › ${topicLabel(topicId)}` : ""}
      </div>
      {/* always rendered so the card doesn't jump when tags load / are absent */}
      <div className={styles.tagList}>
        {cardTags.map((tag) => (
          <span
            key={tag._id}
            className={styles.tag}
            style={{
              background: tag.color + "22",
              color: tag.color,
              border: `1px solid ${tag.color}`,
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
}
