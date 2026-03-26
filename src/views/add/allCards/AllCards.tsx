import { useEffect, useState } from "react";
import { Filters } from "./Filters";
import type { ICard, ISession, ISubject } from "../../../types";
import { api } from "../../../api";
import styles from "./AllCards.module.css";
import { CardFace } from "../../../components/card/CardFace";
import EditModal from "../EditModal";
import { t } from "../../../strings";
import { useSubjects } from "../../../contexts/SubjectsContext";

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
  const { subjects, subjectLabel, topicLabel, reload } = useSubjects();
  const [filterTopics, setFilterTopics] = useState<ISubject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [editCard, setEditCard] = useState<ICard | null>(null);
  const [cards, setCards] = useState<ICard[]>([]);
  const [stale, setStale] = useState(false);

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
      />

      {/* Cards */}
      <div className={styles.cards} id="cards">
        {filtered.length === 0 && (
          <div className={styles.emptyMsg}>{t.noCards}</div>
        )}
        {filtered.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            subjectLabel={subjectLabel(card.subjectId)}
            topicLabel={topicLabel(card.topicId)}
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

function CardItem({
  card,
  subjectLabel,
  topicLabel,
  onEdit,
  onDelete,
}: {
  card: ICard;
  subjectLabel: string;
  topicLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={styles.cardWrapper}>
      <div
        className={`card-scene${flipped ? " flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
      >
        <div className="card">
          <CardFace
            side={card.s1 || { text: "", text2: "", photo: "" }}
            faceNum={1}
          />
          <CardFace
            side={card.s2 || { text: "", text2: "", photo: "" }}
            faceNum={2}
          />
        </div>
      </div>
      <div className={styles.cardMeta}>
        {subjectLabel}
        {topicLabel ? ` › ${topicLabel}` : ""}
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
