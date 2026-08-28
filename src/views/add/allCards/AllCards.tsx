import { useEffect, useState } from "react";
import { Filters } from "./Filters";
import type { ICard, ISession } from "../../../types";
import { api } from "../../../api";
import styles from "./AllCards.module.css";
import EditModal from "../EditModal";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";
import { TagInput } from "../../../components/TagInput";
import { ManageModal } from "../manage/ManageModal";
import { MoveModal } from "../move/MoveModal";

interface IProps {
  session: ISession;
  onLearn: () => void;
  registerCardAddedNotifier: (_fn: () => void) => void;
}

export function AllCards({
  session,
  onLearn,
  registerCardAddedNotifier,
}: IProps) {
  const { subjects, allTopics, reload } = useSubjects();
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [cards, setCards] = useState<ICard[]>([]);
  const [stale, setStale] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);

  async function loadCards() {
    try {
      const data = await api.getCards();
      setCards([...data].reverse());
      setStale(false);
    } catch {
      console.error("Failed to load cards");
    }
  }

  useEffect(() => {
    registerCardAddedNotifier(() => setStale(true));
  }, [registerCardAddedNotifier]);

  useEffect(() => {
    if (stale) loadCards();
  }, [stale]);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    setFilterSubjectId(session.subjectId || "");
    setFilterTopicId(session.topicId || "");
  }, [session.subjectId, session.topicId]);

  // topics for the picked subject — filtered locally from the already-loaded
  // list, so switching subjects is instant (no per-change server round-trip)
  const filterTopics = filterSubjectId
    ? allTopics.filter((tp) => tp.parentId === filterSubjectId)
    : [];

  const filtered = cards.filter((c) => {
    if (filterSubjectId && c.subjectId !== filterSubjectId) return false;
    if (filterTopicId && c.topicId !== filterTopicId) return false;
    if (filterTag && !(c.tagIds ?? []).includes(filterTag)) return false;
    return true;
  });

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
  const selectedCards = cards.filter((c) => selectedIds.has(c._id));

  async function deleteCard(id: string) {
    if (!confirm(t.confirmDelete)) return;
    await api.deleteCard(id);
    await loadCards();
  }

  async function updateCardTags(id: string, tagIds: string[]) {
    setCards((prev) => prev.map((c) => (c._id === id ? { ...c, tagIds } : c)));
    try {
      await api.updateCard(id, { tagIds });
    } catch {
      loadCards(); // roll back to server state on failure
    }
  }

  return (
    <div className={`allCards ${styles.allCardsArea}`}>
      {/* Manage (desktop only) — always available */}
      <div className={styles.manageRow}>
        <button
          className={styles.groupsBtn}
          onClick={() => setManageOpen(true)}
        >
          {t.manage}
        </button>
      </div>

      {/* Filters */}
      <Filters
        filterSubjectId={filterSubjectId}
        setFilterSubjectId={setFilterSubjectId}
        filterTopicId={filterTopicId}
        setFilterTopicId={setFilterTopicId}
        subjects={subjects}
        topics={filterTopics}
        filterTag={filterTag}
        setFilterTag={setFilterTag}
      />

      <div className={styles.selectRow}>
        <span className={styles.countLine}>{t.cardCount(filtered.length)}</span>
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
          <button className={styles.moveBtn} onClick={() => setMoveOpen(true)}>
            {t.moveSelected(selected.length)}
          </button>
        )}
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
            selected={selectedIds.has(card._id)}
            onToggleSelected={() => toggleSelected(card._id)}
            onEdit={() => setEditCard(card)}
            onDelete={() => deleteCard(card._id)}
            onTagsChange={(ids) => updateCardTags(card._id, ids)}
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

      {editCard && (
        <EditModal
          card={editCard}
          subjects={subjects}
          onClose={() => setEditCard(null)}
          onSaved={() => {
            setEditCard(null);
            loadCards();
            reload();
          }}
        />
      )}

      {manageOpen && (
        <ManageModal
          subjectId={filterSubjectId}
          topicId={filterTopicId}
          cards={cards}
          onClose={() => setManageOpen(false)}
          onChanged={() => {
            loadCards();
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
            loadCards();
            reload();
          }}
        />
      )}
    </div>
  );
}

function cardText(side: ICard["s1"]) {
  return (
    [side?.text, side?.text2].filter(Boolean).join(" · ") ||
    (side?.photo ? "🖼" : "")
  );
}

function _CardItem({
  card,
  selected,
  onToggleSelected,
  onEdit,
  onDelete,
  onTagsChange,
}: {
  card: ICard;
  selected: boolean;
  onToggleSelected: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTagsChange: (_ids: string[]) => void;
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
      <div className={styles.rowText}>
        <span className={styles.rowFront}>{cardText(card.s1)}</span>
        <span className={styles.rowSep}>–</span>
        <span className={styles.rowBack}>{cardText(card.s2)}</span>
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
