import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Filters } from "./Filters";
import type { ICard } from "../../../types";
import { api } from "../../../api";
import styles from "./AllCards.module.css";
import EditModal from "../EditModal";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";
import { useCards } from "../../../contexts/CardsContext";
import { useCurrentSubject } from "../../../contexts/CurrentSubjectContext";
import { orderByNewest } from "../../../utils/cardOrder";
import { TagInput } from "../../../components/TagInput";
import { MoveModal } from "../move/MoveModal";

interface IProps {
  onLearn: () => void;
  registerCardAddedNotifier: (_fn: () => void) => void;
}

export function AllCards({ onLearn, registerCardAddedNotifier }: IProps) {
  const { subjects, allTopics, reload } = useSubjects();
  const {
    cardsFor,
    ensureSubject,
    reloadSubject,
    clearAll,
    isLoading,
    patchCard,
  } = useCards();
  const { subjectId } = useCurrentSubject();
  const [filterTopicId, setFilterTopicId] = useState("");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "front" | "back">("new");
  const [promptCopied, setPromptCopied] = useState(false);

  // subject's cards, newest first — same order Õpi shows by default
  const subjectCards = subjectId
    ? orderByNewest(cardsFor(subjectId) ?? [])
    : [];
  const loading = subjectId ? isLoading(subjectId) : false;

  async function refresh() {
    if (subjectId) await reloadSubject(subjectId);
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(t.bulkPrompt);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch {
      /* clipboard denied — link just won't confirm the copy */
    }
  }

  useEffect(() => {
    registerCardAddedNotifier(() => {
      void refresh();
    });
  }, [registerCardAddedNotifier, subjectId]);

  // load the picked subject's cards (cached — a no-op if already loaded)
  useEffect(() => {
    if (subjectId) ensureSubject(subjectId);
  }, [subjectId, ensureSubject]);

  // reset topic/tag filters when the subject changes
  useEffect(() => {
    setFilterTopicId("");
    setFilterTag("");
    setSelectedIds(new Set());
    setQuery("");
  }, [subjectId]);

  // topics for the picked subject
  const filterTopics = subjectId
    ? allTopics.filter((tp) => tp.parentId === subjectId)
    : [];

  // topic + tag scope
  const scoped = subjectCards.filter((c) => {
    if (filterTopicId && c.topicId !== filterTopicId) return false;
    if (filterTag && !(c.tagIds ?? []).includes(filterTag)) return false;
    return true;
  });

  const q = query.trim().toLowerCase();
  const searched = q
    ? scoped.filter(
        (c) =>
          (c.s1.text || "").toLowerCase().includes(q) ||
          (c.s2.text || "").toLowerCase().includes(q) ||
          (c.s1.text2 || "").toLowerCase().includes(q) ||
          (c.s2.text2 || "").toLowerCase().includes(q)
      )
    : scoped;

  const filtered =
    sort !== "new"
      ? [...searched].sort((a, b) => {
          const k = sort === "front" ? "s1" : "s2";
          return (a[k].text || "").localeCompare(b[k].text || "", "et");
        })
      : searched;

  // keep the selection limited to what's currently visible
  const visibleIds = new Set(filtered.map((c) => c._id));
  const selected = [...selectedIds].filter((id) => visibleIds.has(id));
  const allVisibleSelected =
    filtered.length > 0 && selected.length === filtered.length;

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    setSelectedIds(
      allVisibleSelected ? new Set() : new Set(filtered.map((c) => c._id))
    );
  }
  const selectedCards = subjectCards.filter((c) => selectedIds.has(c._id));

  async function deleteCard(id: string) {
    if (!confirm(t.confirmDelete)) return;
    await api.deleteCard(id);
    await refresh();
  }

  async function updateCardTags(id: string, tagIds: string[]) {
    try {
      await api.updateCard(id, { tagIds });
    } finally {
      await refresh();
    }
  }

  // inline text edit from a list row — patch the cache optimistically,
  // fire-and-forget the save
  function updateCardSide(
    card: ICard,
    sideNum: 1 | 2,
    field: "text" | "text2",
    value: string
  ) {
    const key = sideNum === 1 ? "s1" : "s2";
    const side = { ...card[key], [field]: value };
    patchCard(card._id, { [key]: side });
    api.updateCard(card._id, { [key]: side }).catch(() => refresh());
  }

  return (
    <div className={`allCards ${styles.allCardsArea}`}>
      {/* Subject structure page — only meaningful once a subject is picked */}
      {subjectId && (
        <div className={styles.manageRow}>
          <Link className={styles.structureBtn} to={`/structure/${subjectId}`}>
            {t.subjectManage}
          </Link>
        </div>
      )}

      {/* Filters */}
      <Filters
        filterTopicId={filterTopicId}
        setFilterTopicId={setFilterTopicId}
        topics={filterTopics}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
      />

      {!subjectId ? (
        <div className={styles.emptyMsg}>{t.pickSubjectFirst}</div>
      ) : loading ? (
        <div className={styles.emptyMsg}>{t.spinnerLoading}</div>
      ) : (
        <>
          <div className={styles.selectRow}>
            <span className={styles.countLine}>
              {t.cardCount(filtered.length)}
            </span>
            {filtered.length > 0 && (
              <label className={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleSelectAll}
                />
                {t.selectAll}
              </label>
            )}
            {selected.length > 0 && (
              <button
                className={styles.moveBtn}
                onClick={() => setMoveOpen(true)}
              >
                {t.moveSelected(selected.length)}
              </button>
            )}
          </div>

          <div className={styles.findRow}>
            <input
              className={styles.findInput}
              placeholder={t.findPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                className={styles.findClear}
                onClick={() => setQuery("")}
                aria-label={t.btnCancel}
              >
                ✕
              </button>
            )}
            <select
              className={styles.findSort}
              value={sort}
              onChange={(e) =>
                setSort(e.target.value as "new" | "front" | "back")
              }
            >
              <option value="new">{t.sortNew}</option>
              <option value="front">{t.sortFront}</option>
              <option value="back">{t.sortBack}</option>
            </select>
          </div>

          {/* Cards */}
          <div className={styles.cards} id="cards">
            {filtered.length === 0 && (
              <div className={styles.emptyMsg}>{t.noCards}</div>
            )}
            {filtered.map((card) => (
              <CardListRow
                key={card._id}
                card={card}
                selected={selectedIds.has(card._id)}
                onToggleSelected={() => toggleSelected(card._id)}
                onEdit={() => setEditCard(card)}
                onDelete={() => deleteCard(card._id)}
                onTagsChange={(ids) => updateCardTags(card._id, ids)}
                onSideChange={(n, field, value) =>
                  updateCardSide(card, n, field, value)
                }
              />
            ))}
          </div>

          <p style={{ textAlign: "center", marginTop: 16 }}>
            <button
              onClick={onLearn}
              style={{
                background: "none",
                border: "none",
                color: "#4a7c59",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {t.btnLearnShort}
            </button>
            {"  ·  "}
            <button
              onClick={copyPrompt}
              style={{
                background: "none",
                border: "none",
                color: "#4a7c59",
                fontSize: "0.85rem",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              {promptCopied ? t.bulkPromptCopied : t.bulkPromptLink}
            </button>
          </p>
        </>
      )}

      {editCard && (
        <EditModal
          card={editCard}
          subjects={subjects}
          onClose={() => setEditCard(null)}
          onSaved={() => {
            setEditCard(null);
            refresh();
            reload();
          }}
        />
      )}

      {moveOpen && (
        <MoveModal
          cards={selectedCards}
          subjects={subjects}
          allTopics={allTopics}
          onClose={() => setMoveOpen(false)}
          onMoved={() => {
            setMoveOpen(false);
            setSelectedIds(new Set());
            clearAll(); // cards may have gone to another subject
            if (subjectId) ensureSubject(subjectId);
            reload();
          }}
        />
      )}
    </div>
  );
}

// grows to fit its content — long text stays fully visible instead of
// scrolling out of a fixed-width single-line input
function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function SideInput({
  value,
  placeholder,
  align,
  onCommit,
}: {
  value: string;
  placeholder: string;
  align: "left" | "right";
  onCommit: (_text: string) => void;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setText(value), [value]);
  useEffect(() => autoGrow(ref.current), [text]);
  const commit = () => {
    const t = text.trim();
    if (t !== value) onCommit(t);
  };
  return (
    <textarea
      ref={ref}
      className={styles.rowInput}
      style={{ textAlign: align }}
      rows={1}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") setText(value);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

// smaller, dimmer line for the optional "second line" (text2) — same
// auto-grow behaviour, styled to read as secondary
function SideInput2({
  value,
  align,
  onCommit,
}: {
  value: string;
  align: "left" | "right";
  onCommit: (_text: string) => void;
}) {
  const [text, setText] = useState(value);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => setText(value), [value]);
  useEffect(() => autoGrow(ref.current), [text]);
  const commit = () => {
    const t = text.trim();
    if (t !== value) onCommit(t);
  };
  return (
    <textarea
      ref={ref}
      className={`${styles.rowInput} ${styles.rowInput2}`}
      style={{ textAlign: align }}
      rows={1}
      value={text}
      placeholder={t.side2Placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLTextAreaElement).blur();
        }
        if (e.key === "Escape") setText(value);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** One compact, editable card row — inline text, tag chips, edit/delete.
    Shared between the "Lisa" card list and any other view that wants the
    same look (e.g. a tag's expanded word list in Aine struktuur). The
    checkbox is only rendered when selection is wired up. */
export function CardListRow({
  card,
  selected,
  onToggleSelected,
  onEdit,
  onDelete,
  onTagsChange,
  onSideChange,
}: {
  card: ICard;
  selected?: boolean;
  onToggleSelected?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagsChange: (_ids: string[]) => void;
  onSideChange: (
    _side: 1 | 2,
    _field: "text" | "text2",
    _value: string
  ) => void;
}) {
  // an empty text2 stays hidden behind a small "+" until either it has
  // content or the user asks to add one — most cards don't have a second
  // line, and showing an empty box on every row would bloat the list
  const [show2, setShow2] = useState({
    1: !!card.s1.text2,
    2: !!card.s2.text2,
  });

  return (
    <div
      className={`${styles.cardRow}${selected ? ` ${styles.cardSelected}` : ""}`}
    >
      {onToggleSelected && (
        <input
          type="checkbox"
          className={styles.rowCheck}
          checked={!!selected}
          onChange={onToggleSelected}
        />
      )}
      <div className={styles.rowText}>
        <div className={styles.rowSide}>
          {card.s1.photo && (
            <span className={styles.rowPhoto} title={t.rowHasPhoto}>
              🖼
            </span>
          )}
          <SideInput
            value={card.s1.text}
            placeholder={t.side1}
            align="right"
            onCommit={(text) => onSideChange(1, "text", text)}
          />
          {show2[1] ? (
            <SideInput2
              value={card.s1.text2}
              align="right"
              onCommit={(text) => onSideChange(1, "text2", text)}
            />
          ) : (
            <button
              type="button"
              className={styles.addLine2}
              style={{ alignSelf: "flex-end" }}
              onClick={(e) => {
                e.stopPropagation();
                setShow2((s) => ({ ...s, 1: true }));
              }}
            >
              {t.rowAddLine2}
            </button>
          )}
        </div>
        <span className={styles.rowSep}>–</span>
        <div className={styles.rowSide}>
          <SideInput
            value={card.s2.text}
            placeholder={t.side2}
            align="left"
            onCommit={(text) => onSideChange(2, "text", text)}
          />
          {card.s2.photo && (
            <span className={styles.rowPhoto} title={t.rowHasPhoto}>
              🖼
            </span>
          )}
          {show2[2] ? (
            <SideInput2
              value={card.s2.text2}
              align="left"
              onCommit={(text) => onSideChange(2, "text2", text)}
            />
          ) : (
            <button
              type="button"
              className={styles.addLine2}
              onClick={(e) => {
                e.stopPropagation();
                setShow2((s) => ({ ...s, 2: true }));
              }}
            >
              {t.rowAddLine2}
            </button>
          )}
        </div>
      </div>
      <div className={styles.rowTags}>
        <TagInput
          compact
          tagIds={card.tagIds ?? []}
          subjectId={card.subjectId}
          topicId={card.topicId}
          onChange={onTagsChange}
        />
      </div>
      <div className={styles.rowActions}>
        <button
          className={styles.btnEdit}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {t.btnEdit}
        </button>
        <button
          className={styles.btnDelete}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          {t.btnDelete}
        </button>
      </div>
    </div>
  );
}
