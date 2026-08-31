import { useEffect, useState } from "react";
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
import { useSettings } from "../../../contexts/SettingsContext";
import { orderByNewest, groupOfIndex } from "../../../runtimeGroups";
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
  const { settings } = useSettings();
  const groupSize = settings.groupSize;
  const [filterTopicId, setFilterTopicId] = useState("");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"new" | "front" | "back">("new");

  // subject's cards, newest first — same order Õpi groups from
  const subjectCards = subjectId
    ? orderByNewest(cardsFor(subjectId) ?? [])
    : [];
  const loading = subjectId ? isLoading(subjectId) : false;

  async function refresh() {
    if (subjectId) await reloadSubject(subjectId);
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

  // group number is by the canonical newest-first order, not the sorted
  // view — precompute id -> group once so a big list stays O(n)
  const groupById = new Map<string, number>();
  if (groupSize) {
    scoped.forEach((c, i) => groupById.set(c._id, groupOfIndex(i, groupSize)));
  }
  const groupOf = (card: ICard) => groupById.get(card._id) ?? 0;

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
  function updateCardSide(card: ICard, sideNum: 1 | 2, text: string) {
    const key = sideNum === 1 ? "s1" : "s2";
    const side = { ...card[key], text };
    patchCard(card._id, { [key]: side });
    api.updateCard(card._id, { [key]: side }).catch(() => refresh());
  }

  return (
    <div className={`allCards ${styles.allCardsArea}`}>
      {/* Subject structure page — only meaningful once a subject is picked */}
      {subjectId && (
        <div className={styles.manageRow}>
          <Link className={styles.groupsBtn} to={`/subject/${subjectId}`}>
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
              <_CardItem
                key={card._id}
                card={card}
                group={groupOf(card)}
                selected={selectedIds.has(card._id)}
                onToggleSelected={() => toggleSelected(card._id)}
                onEdit={() => setEditCard(card)}
                onDelete={() => deleteCard(card._id)}
                onTagsChange={(ids) => updateCardTags(card._id, ids)}
                onSideChange={(n, text) => updateCardSide(card, n, text)}
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

function _SideInput({
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
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const t = text.trim();
    if (t !== value) onCommit(t);
  };
  return (
    <input
      className={styles.rowInput}
      style={{ textAlign: align }}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setText(value);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function _CardItem({
  card,
  group,
  selected,
  onToggleSelected,
  onEdit,
  onDelete,
  onTagsChange,
  onSideChange,
}: {
  card: ICard;
  group: number;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagsChange: (_ids: string[]) => void;
  onSideChange: (_side: 1 | 2, _text: string) => void;
}) {
  return (
    <div
      className={`${styles.cardRow}${selected ? ` ${styles.cardSelected}` : ""}`}
    >
      <input
        type="checkbox"
        className={styles.rowCheck}
        checked={selected}
        onChange={onToggleSelected}
      />
      {group > 0 && <span className={styles.groupBadge}>G{group}</span>}
      <div className={styles.rowText}>
        <_SideInput
          value={card.s1.text}
          placeholder={card.s1.photo ? "🖼" : t.side1}
          align="right"
          onCommit={(text) => onSideChange(1, text)}
        />
        <span className={styles.rowSep}>–</span>
        <_SideInput
          value={card.s2.text}
          placeholder={card.s2.photo ? "🖼" : t.side2}
          align="left"
          onCommit={(text) => onSideChange(2, text)}
        />
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
