import { useEffect, useState } from "react";
import { Filters } from "./Filters";
import type { ICard, ISession, ISubject } from "../../../types";
import { api } from "../../../api";
import styles from "./AllCards.module.css";
import EditModal from "../EditModal";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";
import { CardItem } from "../../../components/card/CardItem";
import { TagInput } from "../../../components/TagInput";
import { CardGroupPicker } from "../groups/CardGroupPicker";
import { GroupManager } from "../groups/GroupManager";
import { ManageModal } from "../manage/ManageModal";

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
  const { subjects, reload } = useSubjects();
  const [filterTopics, setFilterTopics] = useState<ISubject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [cards, setCards] = useState<ICard[]>([]);
  const [stale, setStale] = useState(false);
  const [filterTag, setFilterTag] = useState("");
  const [groupMgrOpen, setGroupMgrOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

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

  useEffect(() => {
    if (filterSubjectId) {
      api
        .getTopics(filterSubjectId)
        .then(setFilterTopics)
        .catch(() => setFilterTopics([]));
    } else {
      setFilterTopics([]);
    }
  }, [filterSubjectId]);

  const filtered = cards.filter((c) => {
    if (filterSubjectId && c.subjectId !== filterSubjectId) return false;
    if (filterTopicId && c.topicId !== filterTopicId) return false;
    if (filterTag && !(c.tagIds ?? []).includes(filterTag)) return false;
    return true;
  });

  function shuffle() {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
  }

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

      {filterSubjectId && filterTopicId && (
        <div className={styles.groupsBtnRow}>
          <button
            className={styles.groupsBtn}
            onClick={() => setGroupMgrOpen(true)}
          >
            {t.groups}
          </button>
        </div>
      )}

      <p className={styles.countLine}>{t.cardCount(filtered.length)}</p>

      {/* Cards */}
      <div className={styles.cards} id="cards">
        {filtered.length === 0 && (
          <div className={styles.emptyMsg}>{t.noCards}</div>
        )}
        {filtered.map((card) => (
          <_CardItem
            key={card._id}
            card={card}
            onEdit={() => setEditCard(card)}
            onDelete={() => deleteCard(card._id)}
            onTagsChange={(ids) => updateCardTags(card._id, ids)}
          />
        ))}
      </div>

      <p className={styles.hint}>{t.hintFlip}</p>
      <p style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={shuffle}
          style={{
            background: "none",
            border: "none",
            color: "#4a7c59",
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "underline",
          }}
        >
          {t.btnShuffle}
        </button>
        &nbsp;·&nbsp;
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

      {groupMgrOpen && (
        <GroupManager
          subjectId={filterSubjectId}
          topicId={filterTopicId}
          cards={cards.filter(
            (c) =>
              c.subjectId === filterSubjectId && c.topicId === filterTopicId
          )}
          onClose={() => setGroupMgrOpen(false)}
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
    </div>
  );
}

function _CardItem({
  card,
  onEdit,
  onDelete,
  onTagsChange,
}: {
  card: ICard;
  onEdit: () => void;
  onDelete: () => void;
  onTagsChange: (_ids: string[]) => void;
}) {
  return (
    <div className={styles.cardWrapper}>
      <CardItem card={card} />
      <div className={styles.cardTags}>
        <TagInput
          tagIds={card.tagIds ?? []}
          subjectId={card.subjectId}
          topicId={card.topicId}
          onChange={onTagsChange}
        />
        <CardGroupPicker card={card} />
      </div>
      <div className={styles.cardActions}>
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
