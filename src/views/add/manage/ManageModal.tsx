import { useEffect, useMemo, useState } from "react";
import type { ICard, ISubject, ITag } from "../../../types";
import { api } from "../../../api";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";
import { useTags } from "../../../contexts/TagsContext";
import styles from "./ManageModal.module.css";

interface Props {
  subjectId: string;
  topicId: string;
  /** all cards currently loaded by AllCards — used for the "non-empty" check */
  cards: ICard[];
  onClose: () => void;
  onChanged: () => void;
}

type Row =
  | { kind: "subject"; item: ISubject }
  | { kind: "topic"; item: ISubject }
  | { kind: "tag"; item: ITag };

export function ManageModal({
  subjectId,
  topicId,
  cards,
  onClose,
  onChanged,
}: Props) {
  const { subjects, allTopics, reload: reloadSubjects } = useSubjects();
  const { reload: reloadTags } = useTags();
  const [tags, setTags] = useState<ITag[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const topics = useMemo(
    () => allTopics.filter((tp) => tp.parentId === subjectId),
    [allTopics, subjectId]
  );

  // which topic's tags we're managing (defaults to the filter's topic, or
  // the subject's first topic) — switchable in the modal
  const [tagTopicId, setTagTopicId] = useState(
    () => topicId || topics[0]?._id || ""
  );
  useEffect(() => {
    if (!tagTopicId && topics.length) setTagTopicId(topics[0]._id);
  }, [topics, tagTopicId]);

  useEffect(() => {
    if (!subjectId || !tagTopicId) {
      setTags([]);
      return;
    }
    api
      .getTags(subjectId, tagTopicId)
      .then(setTags)
      .catch(() => {});
  }, [subjectId, tagTopicId]);

  const tagTopicLabel = topics.find((tp) => tp._id === tagTopicId)?.label ?? "";

  // "non-empty" checks from the cards we have loaded
  function subjectBlocked(id: string) {
    return (
      allTopics.some((tp) => tp.parentId === id) ||
      cards.some((c) => c.subjectId === id)
    );
  }
  function topicBlocked(id: string) {
    return cards.some((c) => c.topicId === id);
  }
  function tagBlocked(id: string) {
    return cards.some((c) => (c.tagIds ?? []).includes(id));
  }

  async function rename(row: Row) {
    const name = draft.trim();
    if (!name) return;
    setBusy(true);
    setErr("");
    try {
      if (row.kind === "tag") {
        await api.updateTag(row.item._id, name, (row.item as ITag).color);
        reloadTags();
      } else {
        await api.updateSubject(row.item._id, name);
        reloadSubjects();
      }
      setEditing(null);
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    const label =
      row.kind === "tag"
        ? (row.item as ITag).name
        : (row.item as ISubject).label;
    if (!confirm(t.manageDeleteConfirm(label))) return;
    setBusy(true);
    setErr("");
    try {
      if (row.kind === "tag") {
        await api.deleteTag(row.item._id);
        setTags((prev) => prev.filter((x) => x._id !== row.item._id));
        reloadTags();
      } else {
        await api.deleteSubject(row.item._id);
        reloadSubjects();
      }
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function sectionRow(
    row: Row,
    blocked: (_id: string) => boolean,
    blockedMsg: string
  ) {
    const id = row.item._id;
    const name =
      row.kind === "tag"
        ? (row.item as ITag).name
        : (row.item as ISubject).label;
    const isBlocked = blocked(id);
    return (
      <div key={id} className={styles.row}>
        {editing === id ? (
          <>
            <input
              autoFocus
              className={styles.input}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") rename(row);
                if (e.key === "Escape") setEditing(null);
              }}
            />
            <button
              className={styles.saveBtn}
              disabled={busy}
              onClick={() => rename(row)}
            >
              {t.manageSave}
            </button>
          </>
        ) : (
          <>
            <span className={styles.name}>{name}</span>
            <button
              className={styles.linkBtn}
              onClick={() => {
                setEditing(id);
                setDraft(name);
              }}
            >
              {t.manageRename}
            </button>
            <button
              className={styles.delBtn}
              disabled={isBlocked || busy}
              title={isBlocked ? blockedMsg : t.manageDelete}
              onClick={() => remove(row)}
            >
              {t.manageDelete}
            </button>
          </>
        )}
      </div>
    );
  }

  function section(
    title: string,
    rows: Row[],
    blocked: (_id: string) => boolean,
    blockedMsg: string
  ) {
    return (
      <div className={styles.section}>
        <h3>{title}</h3>
        {rows.length === 0 && <p className={styles.dim}>—</p>}
        {rows.map((row) => sectionRow(row, blocked, blockedMsg))}
      </div>
    );
  }

  const currentSubject = subjects.find((s) => s._id === subjectId);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{t.manageHeading}</h2>
          <button className={styles.closeBtn} onClick={onClose}>
            ✕
          </button>
        </div>

        {!subjectId ? (
          <p className={styles.dim}>{t.manageEmpty}</p>
        ) : (
          <>
            {currentSubject &&
              section(
                t.manageSubjects,
                [{ kind: "subject", item: currentSubject }],
                subjectBlocked,
                t.manageDeleteBlockedSubject
              )}
            {section(
              t.manageTopics,
              topics.map((tp) => ({ kind: "topic", item: tp })),
              topicBlocked,
              t.manageDeleteBlockedTopic
            )}

            <div className={styles.section}>
              <h3>
                {t.manageTags}
                {topics.length > 1 ? (
                  <select
                    className={styles.topicSelect}
                    value={tagTopicId}
                    onChange={(e) => setTagTopicId(e.target.value)}
                  >
                    {topics.map((tp) => (
                      <option key={tp._id} value={tp._id}>
                        {tp.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  tagTopicLabel && ` · ${tagTopicLabel}`
                )}
              </h3>
              {tags.length === 0 && <p className={styles.dim}>—</p>}
              {tags.map((tg) => {
                const row = { kind: "tag" as const, item: tg };
                return sectionRow(row, tagBlocked, t.manageDeleteBlockedTag);
              })}
            </div>
          </>
        )}

        {err && <p className={styles.err}>{err}</p>}
      </div>
    </div>
  );
}
