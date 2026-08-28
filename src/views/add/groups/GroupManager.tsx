import { useEffect, useMemo, useState } from "react";
import type { ICard, ITag } from "../../../types";
import { api } from "../../../api";
import { t } from "../../../strings";
import { useGroups } from "../../../contexts/GroupsContext";
import styles from "./GroupManager.module.css";

interface Props {
  subjectId: string;
  topicId: string;
  /** all cards for this subject/topic (already loaded by AllCards) */
  cards: ICard[];
  onClose: () => void;
}

export function GroupManager({ subjectId, topicId, cards, onClose }: Props) {
  const { groupsForTag, learnt, ensureTag, moveCard, setLearnt } = useGroups();
  const [tags, setTags] = useState<ITag[]>([]);
  const [tagId, setTagId] = useState("");
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => {
    if (!topicId) return;
    api
      .getTags(subjectId, topicId)
      .then(setTags)
      .catch(() => {});
  }, [subjectId, topicId]);

  useEffect(() => {
    if (!tagId && tags.length) setTagId(tags[0]._id);
  }, [tags, tagId]);

  useEffect(() => {
    if (tagId) ensureTag(tagId);
  }, [tagId, ensureTag]);

  const groups = groupsForTag(tagId);
  const tagCardCount = useMemo(
    () => cards.filter((c) => (c.tagIds ?? []).includes(tagId)).length,
    [cards, tagId]
  );

  const cardById = useMemo(() => {
    const m = new Map<string, ICard>();
    cards.forEach((c) => m.set(c._id, c));
    return m;
  }, [cards]);

  function cardLabel(id: string) {
    const c = cardById.get(id);
    return c ? c.s1?.text || c.s2?.text || "(pilt)" : id;
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t.groups}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {tags.length === 0 ? (
          <p className={styles.empty}>{t.groupNoTags}</p>
        ) : (
          <>
            <div className={styles.tagRow}>
              <span className={styles.tagRowLabel}>{t.groupPickTag}</span>
              <div className={styles.tagChips}>
                {tags.map((tag) => (
                  <button
                    key={tag._id}
                    className={styles.tagChip}
                    style={
                      tagId === tag._id
                        ? {
                            background: tag.color,
                            color: "#fff",
                            borderColor: tag.color,
                          }
                        : { borderColor: tag.color, color: tag.color }
                    }
                    onClick={() => setTagId(tag._id)}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {groups.length === 0 ? (
              <p className={styles.empty}>{t.groupThreshold(tagCardCount)}</p>
            ) : (
              <div className={styles.groupList}>
                {groups.map((g) => (
                  <div key={g._id} className={styles.group}>
                    <div className={styles.groupHead}>
                      <span className={styles.groupName}>
                        {t.labelGroup} {g.number}
                      </span>
                      <span className={styles.count}>
                        {t.groupCardCount(g.cardIds.length)}
                      </span>
                      <label className={styles.learntLabel}>
                        <input
                          type="checkbox"
                          checked={!!learnt[g._id]}
                          onChange={(e) => setLearnt(g._id, e.target.checked)}
                        />
                        {t.groupLearnt}
                      </label>
                    </div>

                    <div className={styles.cardChips}>
                      {g.cardIds.map((id) => (
                        <span key={id} className={styles.cardChip}>
                          <span>{cardLabel(id)}</span>
                          <button
                            className={styles.moveBtn}
                            title={t.groupMove}
                            onClick={() => setMoving(moving === id ? null : id)}
                          >
                            ⇄
                          </button>
                          {moving === id && (
                            <span className={styles.moveMenu}>
                              {groups
                                .filter((x) => x._id !== g._id)
                                .map((x) => (
                                  <button
                                    key={x._id}
                                    onClick={async () => {
                                      await moveCard(id, tagId, x._id);
                                      setMoving(null);
                                    }}
                                  >
                                    → {t.labelGroup} {x.number}
                                  </button>
                                ))}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
