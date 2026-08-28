import { useEffect, useState } from "react";
import type { ICard, ITag } from "../../../types";
import { api } from "../../../api";
import { t } from "../../../strings";
import { useGroups } from "../../../contexts/GroupsContext";
import styles from "./CardGroupPicker.module.css";

/** One "Grupp · <tag>: [ … ▾]" row per tag the card carries that HAS groups
    (i.e. a tag with > 15 cards). Groups are auto-created; this only moves a
    card between them. */
export function CardGroupPicker({ card }: { card: ICard }) {
  const { groupsForTag, groupOf, ensureTag, moveCard } = useGroups();
  const [tags, setTags] = useState<ITag[]>([]);
  const [busy, setBusy] = useState(false);

  const tagIds = card.tagIds ?? [];

  useEffect(() => {
    if (!tagIds.length || !card.topicId) {
      setTags([]);
      return;
    }
    api
      .getTags(card.subjectId, card.topicId)
      .then((all) => {
        const mine = all.filter((tg) => tagIds.includes(tg._id));
        setTags(mine);
        mine.forEach((tg) => ensureTag(tg._id));
      })
      .catch(() => {});
  }, [card.subjectId, card.topicId, tagIds.join(","), ensureTag]);

  const rows = tags
    .map((tag) => ({ tag, groups: groupsForTag(tag._id) }))
    .filter((r) => r.groups.length > 0);

  if (rows.length === 0) return null;

  async function pick(tagId: string, groupId: string) {
    setBusy(true);
    try {
      await moveCard(card._id, tagId, groupId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {rows.map(({ tag, groups }) => {
        const current = groupOf(card._id, tag._id);
        return (
          <label key={tag._id} className={styles.row}>
            <span className={styles.tagLabel} style={{ color: tag.color }}>
              {t.labelGroup} · {tag.name}
            </span>
            <select
              className={styles.select}
              value={current?._id ?? ""}
              disabled={busy}
              onChange={(e) => pick(tag._id, e.target.value)}
            >
              {!current && <option value="">—</option>}
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {t.labelGroup} {g.number}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}
