import { useState, useEffect } from "react";
import styles from "./CardItem.module.css";
import { CardScene } from "./CardScene";
import type { ICard, Color, ITag } from "../../types";
import { useSubjects } from "../../contexts/SubjectsContext";
import { SemDot } from "../SemDot";
import { api } from "../../api";

const COLORS: Color[] = [null, "red", "yellow", "green"];
const PROGRESS_KEY = "all";

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
  const [cardTags, setCardTags] = useState<ITag[]>([]);

  useEffect(() => {
    if (!card.tagIds?.length || !topicId) return;
    api.getTags(subjectId, topicId).then((all) =>
      setCardTags(all.filter((t) => card.tagIds!.includes(t._id)))
    ).catch(() => {});
  }, [topicId, subjectId, card.tagIds?.join(",")]);
  const [progress, setProgressState] = useState(initialProgress);

  async function setProgress(id: string, color: Color) {
    setProgressState((prev) => ({ ...prev, [PROGRESS_KEY]: color }));
    api.setProgress(id, PROGRESS_KEY, color);
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
            selected={progress[PROGRESS_KEY] === c}
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
        cornerColor={progress[PROGRESS_KEY] ?? null}
      />
      <div className={styles.cardMeta}>
        {subjectLabel(subjectId)}
        {topicLabel(topicId) ? ` › ${topicLabel(topicId)}` : ""}
      </div>
      {cardTags.length > 0 && (
        <div className={styles.tagList}>
          {cardTags.map((tag) => (
            <span key={tag._id} className={styles.tag} style={{ background: tag.color + "22", color: tag.color, border: `1px solid ${tag.color}` }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
