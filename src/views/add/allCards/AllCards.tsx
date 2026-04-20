import { useEffect, useState } from "react";
import { Filters } from "./Filters";
import type { ICard, ISession, ISubject } from "../../../types";
import { useTags } from "../../../contexts/TagsContext";
import { api } from "../../../api";
import styles from "./AllCards.module.css";
import EditModal from "../EditModal";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";
import { CardItem } from "../../../components/card/CardItem";

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
  const { tags } = useTags();
  const [filterTopics, setFilterTopics] = useState<ISubject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [cards, setCards] = useState<ICard[]>([]);
  const [stale, setStale] = useState(false);
  const [filterTag, setFilterTag] = useState("");

  async function loadCards() {
    try {
      const data = await api.getCards();
      setCards(data);
      setStale(false);
    } catch {
      console.error("Failed to load cards");
    }
  }

  useEffect(() => {
    registerCardAddedNotifier(() => setStale(true));
  }, [registerCardAddedNotifier]);

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

  return (
    <div className={`allCards ${styles.allCardsArea}`}>
      {stale && (
        <div className={styles.staleBanner}>
          {t.newCardBanner}{" "}
          <button onClick={loadCards}>{t.btnRefreshList}</button>
        </div>
      )}
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
    </div>
  );
}

function _CardItem({
  card,
  onEdit,
  onDelete,
}: {
  card: ICard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className={styles.cardWrapper}>
      <CardItem card={card} />
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
