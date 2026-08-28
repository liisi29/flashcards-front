import { useEffect, useState } from "react";
import type { ICard, ITag } from "../../../types";
import { api } from "../../../api";
import { t } from "../../../strings";
import { useGroups } from "../../../contexts/GroupsContext";
import styles from "./CardGroupPicker.module.css";

/** One "Grupp · <tag>: [ … ▾]" row per tag the card carries. Groups always
    belong to a tag, so a card with no tags has nothing to pick. */
export function CardGroupPicker({ card }: { card: ICard }) {
  const { groupsForTag, groupOf, reload } = useGroups();
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
      .then((all) => setTags(all.filter((tg) => tagIds.includes(tg._id))))
      .catch(() => {});
  }, [card.subjectId, card.topicId, tagIds.join(",")]);

  if (!tags.length) return null;

  async function pick(tagId: string, value: string) {
    setBusy(true);
    try {
      const current = groupOf(card._id, tagId);
      if (current && current._id === value) return;
      if (current) {
        await api.setGroupCards(current._id, { remove: [card._id] });
      }
      if (value === "__new__") {
        const name = window.prompt(t.groupNamePlaceholder)?.trim();
        if (name) {
          const g = await api.createGroup({
            name,
            subjectId: card.subjectId,
            topicId: card.topicId,
            tagId,
            cardIds: [card._id],
          });
          void g;
        }
      } else if (value) {
        await api.setGroupCards(value, { add: [card._id] });
      }
      reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      {tags.map((tag) => {
        const groups = groupsForTag(tag._id);
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
              <option value="">{t.groupNone}</option>
              {groups.map((g) => (
                <option key={g._id} value={g._id}>
                  {g.name}
                </option>
              ))}
              <option value="__new__">{t.groupNew}</option>
            </select>
          </label>
        );
      })}
    </div>
  );
}
