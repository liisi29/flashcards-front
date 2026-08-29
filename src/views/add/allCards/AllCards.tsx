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
  const { cardsFor, ensureSubject, reloadSubject, clearAll, isLoading } =
    useCards();
  const { subjectId } = useCurrentSubject();
  const { settings } = useSettings();
  const groupSize = settings.groupSize;
  const [filterTopicId, setFilterTopicId] = useState("");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [filterTag, setFilterTag] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveOpen, setMoveOpen] = useState(false);

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
  }, [subjectId]);

  // topics for the picked subject
  const filterTopics = subjectId
    ? allTopics.filter((tp) => tp.parentId === subjectId)
    : [];

  const filtered = subjectCards.filter((c) => {
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

          {/* Cards */}
          <div className={styles.cards} id="cards">
            {filtered.length === 0 && (
              <div className={styles.emptyMsg}>{t.noCards}</div>
            )}
            {filtered.map((card, i) => (
              <_CardItem
                key={card._id}
                card={card}
                group={groupSize ? groupOfIndex(i, groupSize) : 0}
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

function cardText(side: ICard["s1"]) {
  return (
    [side?.text, side?.text2].filter(Boolean).join(" · ") ||
    (side?.photo ? "🖼" : "")
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
}: {
  card: ICard;
  group: number;
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
      {group > 0 && <span className={styles.groupBadge}>G{group}</span>}
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
