import { useEffect, useMemo, useState } from "react";
import type { ICard, IGroup, ITag } from "../../../types";
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
  const { groups, learnt, reload, setLearnt } = useGroups();
  const [tags, setTags] = useState<ITag[]>([]);
  const [tagId, setTagId] = useState("");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);

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

  const tagGroups = useMemo(
    () =>
      groups.filter((g) => g.tagId === tagId).sort((a, b) => a.order - b.order),
    [groups, tagId]
  );

  // cards that carry the selected tag
  const tagCards = useMemo(
    () => cards.filter((c) => (c.tagIds ?? []).includes(tagId)),
    [cards, tagId]
  );

  const groupedIds = useMemo(() => {
    const s = new Set<string>();
    tagGroups.forEach((g) => g.cardIds.forEach((id) => s.add(id)));
    return s;
  }, [tagGroups]);

  const ungrouped = tagCards.filter((c) => !groupedIds.has(c._id));

  function cardLabel(c: ICard) {
    return c.s1?.text || c.s2?.text || "(pilt)";
  }

  async function createGroup() {
    const name = newName.trim();
    if (!name || !tagId) return;
    setBusy(true);
    try {
      await api.createGroup({ name, subjectId, topicId, tagId });
      setNewName("");
      reload();
    } finally {
      setBusy(false);
    }
  }

  async function rename(g: IGroup, name: string) {
    await api.updateGroup(g._id, { name });
    reload();
  }

  async function remove(g: IGroup) {
    if (!confirm(t.groupDeleteConfirm)) return;
    await api.deleteGroup(g._id);
    reload();
  }

  async function addCard(g: IGroup, cardId: string) {
    await api.setGroupCards(g._id, { add: [cardId] });
    reload();
  }

  async function removeCard(g: IGroup, cardId: string) {
    await api.setGroupCards(g._id, { remove: [cardId] });
    reload();
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
            {/* tag scope */}
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

            {/* groups */}
            <div className={styles.groupList}>
              {tagGroups.map((g) => (
                <div key={g._id} className={styles.group}>
                  <div className={styles.groupHead}>
                    <input
                      className={styles.groupName}
                      defaultValue={g.name}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v && v !== g.name) rename(g, v);
                      }}
                    />
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
                    <button
                      className={styles.delBtn}
                      onClick={() => remove(g)}
                      title={t.btnDelete}
                    >
                      🗑
                    </button>
                  </div>

                  <div className={styles.cardChips}>
                    {g.cardIds.map((id) => {
                      const c = cards.find((x) => x._id === id);
                      return (
                        <span key={id} className={styles.cardChip}>
                          {c ? cardLabel(c) : id}
                          <button
                            className={styles.chipX}
                            onClick={() => removeCard(g, id)}
                          >
                            ✕
                          </button>
                        </span>
                      );
                    })}
                    <button
                      className={styles.addBtn}
                      onClick={() =>
                        setAddingTo(addingTo === g._id ? null : g._id)
                      }
                    >
                      {t.groupAddCards}
                    </button>
                  </div>

                  {addingTo === g._id && (
                    <div className={styles.addPicker}>
                      {ungrouped.length === 0 && (
                        <span className={styles.pickerEmpty}>—</span>
                      )}
                      {ungrouped.map((c) => (
                        <button
                          key={c._id}
                          className={styles.pickCard}
                          onClick={() => addCard(g, c._id)}
                        >
                          {cardLabel(c)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* new group */}
              <div className={styles.newGroup}>
                <input
                  className={styles.groupName}
                  placeholder={t.groupNamePlaceholder}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createGroup()}
                />
                <button
                  className={styles.createBtn}
                  onClick={createGroup}
                  disabled={busy || !newName.trim()}
                >
                  {t.groupNew}
                </button>
              </div>

              {ungrouped.length > 0 && (
                <div className={styles.ungrouped}>
                  <span className={styles.ungroupedLabel}>
                    {t.groupUngrouped} ({ungrouped.length})
                  </span>
                  <div className={styles.cardChips}>
                    {ungrouped.map((c) => (
                      <span key={c._id} className={styles.cardChipMuted}>
                        {cardLabel(c)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
