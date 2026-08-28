import { useEffect, useMemo, useState } from "react";
import type { ICard, ISubject, ITag } from "../../../types";
import { api } from "../../../api";
import { t } from "../../../strings";
import { useTags } from "../../../contexts/TagsContext";
import styles from "./MoveModal.module.css";

interface Props {
  cards: ICard[];
  subjects: ISubject[];
  allTopics: ISubject[];
  onClose: () => void;
  onMoved: () => void;
}

const PRESET_COLORS = [
  "#94a3b8",
  "#f87171",
  "#fb923c",
  "#facc15",
  "#4ade80",
  "#60a5fa",
  "#c084fc",
  "#f472b6",
];

export function MoveModal({
  cards,
  subjects,
  allTopics,
  onClose,
  onMoved,
}: Props) {
  const { reload: reloadTags } = useTags();
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [targetTags, setTargetTags] = useState<ITag[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const topics = useMemo(
    () => allTopics.filter((tp) => tp.parentId === subjectId),
    [allTopics, subjectId]
  );

  // tag NAMES shared by every selected card (prefill for the move)
  const sharedTagNamesPromise = useMemo(async () => {
    if (!cards.length) return [];
    // gather all tag ids across the selection, then resolve names
    const bySubjTopic = new Map<string, Set<string>>();
    cards.forEach((c) => {
      const k = `${c.subjectId}|${c.topicId}`;
      const set = bySubjTopic.get(k) ?? new Set<string>();
      (c.tagIds ?? []).forEach((id) => set.add(id));
      bySubjTopic.set(k, set);
    });
    const nameById = new Map<string, string>();
    await Promise.all(
      [...bySubjTopic.keys()].map(async (k) => {
        const [s, tp] = k.split("|");
        try {
          const all = await api.getTags(s, tp);
          all.forEach((tag) => nameById.set(tag._id, tag.name));
        } catch {
          /* ignore */
        }
      })
    );
    // a name is "shared" if every card has some tag with that name
    const namesPerCard = cards.map(
      (c) =>
        new Set(
          (c.tagIds ?? [])
            .map((id) => nameById.get(id))
            .filter((n): n is string => !!n)
        )
    );
    const first = namesPerCard[0] ?? new Set<string>();
    return [...first].filter((n) => namesPerCard.every((s) => s.has(n)));
  }, [cards]);

  const [prefillNames, setPrefillNames] = useState<string[]>([]);
  useEffect(() => {
    sharedTagNamesPromise.then(setPrefillNames);
  }, [sharedTagNamesPromise]);

  // load the target topic's existing tags, and reconcile the prefill/selection
  useEffect(() => {
    if (!subjectId || !topicId) {
      setTargetTags([]);
      setTagIds([]);
      return;
    }
    api
      .getTags(subjectId, topicId)
      .then((all) => {
        setTargetTags(all);
        // preselect target tags whose name matches a shared prefill name
        const wanted = new Set(prefillNames.map((n) => n.toLowerCase()));
        setTagIds(
          all.filter((x) => wanted.has(x.name.toLowerCase())).map((x) => x._id)
        );
      })
      .catch(() => setTargetTags([]));
  }, [subjectId, topicId, prefillNames]);

  function toggleTag(id: string) {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function createTag(name: string) {
    const n = name.trim().toLowerCase();
    if (!n || !subjectId || !topicId) return;
    if (targetTags.some((x) => x.name.toLowerCase() === n)) return;
    const color = PRESET_COLORS[targetTags.length % PRESET_COLORS.length];
    const tag = await api.createTag(n, color, subjectId, topicId);
    setTargetTags((prev) => [...prev, tag]);
    setTagIds((prev) => [...prev, tag._id]);
    reloadTags();
  }

  const [newName, setNewName] = useState("");

  async function move() {
    if (!subjectId || !topicId) {
      setStatus(t.moveNeedTarget);
      return;
    }
    setBusy(true);
    setStatus(t.moveWorking);
    try {
      // ensure any prefill name not yet a target tag is created
      const existing = new Set(targetTags.map((x) => x.name.toLowerCase()));
      const missing = prefillNames.filter(
        (n) => !existing.has(n.toLowerCase())
      );
      let finalTagIds = [...tagIds];
      for (const n of missing) {
        const color =
          PRESET_COLORS[
            (targetTags.length + missing.indexOf(n)) % PRESET_COLORS.length
          ];
        const tag = await api.createTag(
          n.trim().toLowerCase(),
          color,
          subjectId,
          topicId
        );
        finalTagIds.push(tag._id);
      }
      finalTagIds = [...new Set(finalTagIds)];

      const res = await api.bulkMoveCards({
        cardIds: cards.map((c) => c._id),
        subjectId,
        topicId,
        tagIds: finalTagIds,
      });
      setStatus(t.moveDone(res.moved));
      reloadTags();
      onMoved();
    } catch (e) {
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t.moveTitle(cards.length)}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        <label className={styles.field}>
          <span>{t.moveTargetSubject}</span>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setTopicId("");
            }}
          >
            <option value="">{t.placeholderSubject}</option>
            {subjects.map((s) => (
              <option key={s._id} value={s._id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {subjectId && (
          <label className={styles.field}>
            <span>{t.moveTargetTopic}</span>
            <select
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
            >
              <option value="">{t.placeholderTopic}</option>
              {topics.map((tp) => (
                <option key={tp._id} value={tp._id}>
                  {tp.label}
                </option>
              ))}
            </select>
          </label>
        )}

        {subjectId && topicId && (
          <div className={styles.field}>
            <span>{t.labelTags}</span>
            <div className={styles.tagBox}>
              {prefillNames.length > 0 && (
                <p className={styles.prefillHint}>
                  {t.movePrefill(prefillNames.join(", "))}
                </p>
              )}
              <div className={styles.chips}>
                {targetTags.map((tag) => {
                  const active = tagIds.includes(tag._id);
                  return (
                    <button
                      key={tag._id}
                      type="button"
                      className={styles.chip}
                      style={
                        active
                          ? {
                              background: tag.color,
                              color: "#fff",
                              borderColor: tag.color,
                            }
                          : { borderColor: tag.color, color: tag.color }
                      }
                      onClick={() => toggleTag(tag._id)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              <div className={styles.newTag}>
                <input
                  className={styles.newTagInput}
                  placeholder={t.placeholderTags}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createTag(newName);
                      setNewName("");
                    }
                  }}
                />
                <button
                  type="button"
                  className={styles.addBtn}
                  onClick={() => {
                    createTag(newName);
                    setNewName("");
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {status && <p className={styles.status}>{status}</p>}

        <div className={styles.actions}>
          <button
            className={styles.moveConfirm}
            onClick={move}
            disabled={busy || !subjectId || !topicId}
          >
            {t.moveConfirm}
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            {t.btnCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
