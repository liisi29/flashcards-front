import { useState } from "react";
import styles from "./CardItem.module.css";
import { CardFace } from "./CardFace";
import type { ICard, Color } from "../../types";
import { useSubjects } from "../../contexts/SubjectsContext";
import { SemDot } from "../SemDot";
import { api } from "../../api";

const COLORS: Color[] = [null, "red", "yellow", "green"];
const PROGRESS_KEY = "all";

interface IProps {
  card: ICard;
  onProgressChange?: (_id: string, _color: Color) => void;
}

export function CardItem({ card, onProgressChange }: IProps) {
  const { _id, subjectId, topicId, progress: initialProgress, s1, s2 } = card;
  const { subjectLabel, topicLabel } = useSubjects();
  const [flipped, setFlipped] = useState(false);
  const [progress, setProgressState] = useState(initialProgress);

  async function setProgress(id: string, color: Color) {
    setProgressState((prev) => ({ ...prev, [PROGRESS_KEY]: color }));
    api.setProgress(id, PROGRESS_KEY, color);
    onProgressChange?.(id, color);
  }

  return (
    <div className={`cardItem ${styles.learnCardArea}`}>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        {COLORS.map((c) => (
          <SemDot
            key={String(c)}
            color={c}
            selected={progress[PROGRESS_KEY] === c}
            onClick={() => setProgress(_id, c)}
          />
        ))}
      </div>
      <div
        className={`card-scene${flipped ? " flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
      >
        <div className="card">
          <CardFace
            side={s1 || { text: "", text2: "", photo: "" }}
            faceNum={1}
          />
          <CardFace
            side={s2 || { text: "", text2: "", photo: "" }}
            faceNum={2}
          />
        </div>
      </div>
      <div className={styles.cardMeta}>
        {subjectLabel(subjectId)}
        {topicLabel(topicId) ? ` › ${topicLabel(topicId)}` : ""}
      </div>
      {card.tags && card.tags.length > 0 && (
        <div className={styles.tagList}>
          {card.tags.map((tag) => (
            <span key={tag} className={styles.tag}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
