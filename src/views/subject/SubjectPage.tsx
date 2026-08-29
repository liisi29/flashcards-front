import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { ICard, ISubject, ITag } from "../../types";
import { api } from "../../api";
import { t } from "../../strings";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useTags } from "../../contexts/TagsContext";
import { useCards } from "../../contexts/CardsContext";
import { TAG_COLORS, DEFAULT_TAG_COLOR } from "../../tagColors";
import styles from "./SubjectPage.module.css";

/** Full structural view of one subject: its topics and the tags under each.
    Create / rename / recolour / delete in place. No card moving (that
    lives in Lisa's move dialog), no reparenting. */
export function SubjectPage() {
  const { id: subjectId = "" } = useParams();
  const navigate = useNavigate();
  const { subjects, allTopics, reload: reloadSubjects } = useSubjects();
  const { reload: reloadTags } = useTags();
  const { cardsFor, ensureSubject } = useCards();

  const [tags, setTags] = useState<ITag[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [addTagFor, setAddTagFor] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [colorFor, setColorFor] = useState<string | null>(null);

  const subject = subjects.find((s) => s._id === subjectId);
  const topics = useMemo(
    () => allTopics.filter((tp) => tp.parentId === subjectId),
    [allTopics, subjectId]
  );

  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  const cards: ICard[] = cardsFor(subjectId) ?? [];

  function loadTags() {
    if (!subjectId) return;
    api
      .getTags(subjectId)
      .then(setTags)
      .catch(() => {});
  }
  useEffect(() => {
    loadTags();
  }, [subjectId]);

  const tagsByTopic = useMemo(() => {
    const m = new Map<string, ITag[]>();
    for (const tg of tags) {
      const list = m.get(tg.topicId) ?? [];
      list.push(tg);
      m.set(tg.topicId, list);
    }
    for (const list of m.values())
      list.sort((a, b) => a.name.localeCompare(b.name));
    return m;
  }, [tags]);

  // "non-empty" guards from the subject's cached cards
  const topicHasCards = (tid: string) => cards.some((c) => c.topicId === tid);
  const tagHasCards = (gid: string) =>
    cards.some((c) => (c.tagIds ?? []).includes(gid));

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const renameSubject = (label: string) =>
    run(async () => {
      await api.updateSubject(subjectId, label.trim());
      reloadSubjects();
      setEditing(null);
    });

  const renameTopic = (tp: ISubject, label: string) =>
    run(async () => {
      await api.updateSubject(tp._id, label.trim());
      reloadSubjects();
      setEditing(null);
    });

  const deleteTopic = (tp: ISubject) =>
    run(async () => {
      if (!confirm(t.manageDeleteConfirm(tp.label))) return;
      await api.deleteSubject(tp._id);
      reloadSubjects();
    });

  const addTopic = () =>
    run(async () => {
      const label = newTopic.trim();
      if (!label) return;
      await api.createSubject(label, subjectId);
      reloadSubjects();
      setNewTopic("");
    });

  const createTag = (topicId: string) =>
    run(async () => {
      const name = newTag.trim().toLowerCase();
      if (!name) return;
      await api.createTag(name, DEFAULT_TAG_COLOR, subjectId, topicId);
      loadTags();
      reloadTags();
      setNewTag("");
      setAddTagFor(null);
    });

  const renameTag = (tg: ITag, name: string) =>
    run(async () => {
      await api.updateTag(tg._id, name.trim().toLowerCase(), tg.color);
      loadTags();
      reloadTags();
      setEditing(null);
    });

  const recolorTag = (tg: ITag, color: string) =>
    run(async () => {
      await api.updateTag(tg._id, tg.name, color);
      setTags((prev) =>
        prev.map((x) => (x._id === tg._id ? { ...x, color } : x))
      );
      reloadTags();
      setColorFor(null);
    });

  const deleteTag = (tg: ITag) =>
    run(async () => {
      if (!confirm(t.manageDeleteConfirm(tg.name))) return;
      await api.deleteTag(tg._id);
      setTags((prev) => prev.filter((x) => x._id !== tg._id));
      reloadTags();
    });

  if (!subject) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <p className={styles.dim}>{t.subjectNotFound}</p>
          <button className={styles.doneBtn} onClick={() => navigate("/add")}>
            {t.settingsClose}
          </button>
        </div>
      </div>
    );
  }

  const nameCell = (
    id: string,
    label: string,
    onRename: (_v: string) => void
  ) =>
    editing === id ? (
      <input
        autoFocus
        className={styles.input}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onRename(draft);
          if (e.key === "Escape") setEditing(null);
        }}
        onBlur={() => setEditing(null)}
      />
    ) : (
      <button
        className={styles.nameBtn}
        title={t.manageRename}
        onClick={() => {
          setEditing(id);
          setDraft(label);
        }}
      >
        {label}
      </button>
    );

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.crumbs}>
            <button
              className={styles.backLink}
              onClick={() => navigate("/add")}
            >
              ← {t.navAdd}
            </button>
          </div>
          <h1>
            {nameCell(subjectId, subject.label, renameSubject)}
            <span className={styles.subjectTag}>{t.subjectStructure}</span>
          </h1>
        </div>

        {err && <p className={styles.err}>{err}</p>}

        <div className={styles.tree}>
          {topics.length === 0 && (
            <p className={styles.dim}>{t.subjectNoTopics}</p>
          )}

          {topics.map((tp) => {
            const topicTags = tagsByTopic.get(tp._id) ?? [];
            const tBlocked = topicHasCards(tp._id);
            return (
              <div key={tp._id} className={styles.topic}>
                <div className={styles.topicHead}>
                  <span className={styles.topicIcon} aria-hidden>
                    📂
                  </span>
                  {nameCell(tp._id, tp.label, (v) => renameTopic(tp, v))}
                  <span className={styles.count}>
                    {t.subjectCardCount(
                      cards.filter((c) => c.topicId === tp._id).length
                    )}
                  </span>
                  <span className={styles.spacer} />
                  <button
                    className={styles.smallBtn}
                    onClick={() => {
                      setAddTagFor(tp._id);
                      setNewTag("");
                    }}
                  >
                    {t.subjectAddTag}
                  </button>
                  <button
                    className={styles.delBtn}
                    disabled={tBlocked || busy}
                    title={
                      tBlocked ? t.manageDeleteBlockedTopic : t.manageDelete
                    }
                    onClick={() => deleteTopic(tp)}
                  >
                    {t.manageDelete}
                  </button>
                </div>

                <div className={styles.tags}>
                  {topicTags.length === 0 && addTagFor !== tp._id && (
                    <span className={styles.dimSmall}>{t.subjectNoTags}</span>
                  )}
                  {topicTags.map((tg) => {
                    const gBlocked = tagHasCards(tg._id);
                    return (
                      <div key={tg._id} className={styles.tagRow}>
                        <div className={styles.swatchWrap}>
                          <button
                            className={styles.swatch}
                            style={{ background: tg.color }}
                            title={t.tagColorChange}
                            onClick={() =>
                              setColorFor((v) => (v === tg._id ? null : tg._id))
                            }
                          />
                          {colorFor === tg._id && (
                            <div className={styles.swatchMenu}>
                              {TAG_COLORS.map((c) => (
                                <button
                                  key={c}
                                  className={styles.swatchOption}
                                  style={{
                                    background: c,
                                    outline:
                                      tg.color === c
                                        ? "2px solid #2d3748"
                                        : "none",
                                  }}
                                  onClick={() => recolorTag(tg, c)}
                                />
                              ))}
                              <label
                                className={styles.swatchOption}
                                style={{
                                  background: tg.color,
                                  display: "grid",
                                  placeItems: "center",
                                  cursor: "pointer",
                                }}
                                title={t.tagColorCustom}
                              >
                                <span style={{ fontSize: 9 }}>🎨</span>
                                <input
                                  type="color"
                                  value={tg.color}
                                  onChange={(e) =>
                                    recolorTag(tg, e.target.value)
                                  }
                                  style={{
                                    position: "absolute",
                                    width: 0,
                                    height: 0,
                                    opacity: 0,
                                  }}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                        {nameCell(tg._id, tg.name, (v) => renameTag(tg, v))}
                        <span className={styles.count}>
                          {t.subjectCardCount(
                            cards.filter((c) =>
                              (c.tagIds ?? []).includes(tg._id)
                            ).length
                          )}
                        </span>
                        <span className={styles.spacer} />
                        <button
                          className={styles.delBtn}
                          disabled={gBlocked || busy}
                          title={
                            gBlocked ? t.manageDeleteBlockedTag : t.manageDelete
                          }
                          onClick={() => deleteTag(tg)}
                        >
                          {t.manageDelete}
                        </button>
                      </div>
                    );
                  })}

                  {addTagFor === tp._id && (
                    <div className={styles.addRow}>
                      <input
                        autoFocus
                        className={styles.input}
                        placeholder={t.placeholderTags}
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createTag(tp._id);
                          if (e.key === "Escape") setAddTagFor(null);
                        }}
                      />
                      <button
                        className={styles.smallBtn}
                        disabled={busy}
                        onClick={() => createTag(tp._id)}
                      >
                        {t.manageSave}
                      </button>
                      <button
                        className={styles.linkBtn}
                        onClick={() => setAddTagFor(null)}
                      >
                        {t.btnCancel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.addTopic}>
          <input
            className={styles.input}
            placeholder={t.placeholderNewTopic}
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addTopic();
            }}
          />
          <button
            className={styles.doneBtn}
            disabled={busy || !newTopic.trim()}
            onClick={addTopic}
          >
            {t.subjectAddTopic}
          </button>
        </div>
      </div>
    </div>
  );
}
