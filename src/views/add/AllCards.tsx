import { useEffect, useState } from "react";
import { Filters } from "./Filters";
import type { Card, Session, Subject } from "../../types";
import { api } from "../../api";
import styles from "./AllCards.module.css";
import CardFace from "../../components/CardFace";
import EditModal from "../EditModal";
import { t } from "../../strings";

interface IProps {
  session: Session;
  onLearn: () => void;
  registerCardAddedNotifier: (fn: () => void) => void;
}

export function AllCards({
  session,
  onLearn,
  registerCardAddedNotifier,
}: IProps) {
  const [filterTopics, setFilterTopics] = useState<Subject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Subject[]>([]);
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

  async function loadSubjects() {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
      const topicLists = await Promise.all(
        data.map((s) => api.getTopics(s._id))
      );
      setAllTopics(topicLists.flat());
    } catch {
      console.error("Failed to load subjects");
    }
  }

  useEffect(() => {
    loadCards();
    loadSubjects();
  }, []);

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

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || id;
  }

  function topicLabel(id?: string) {
    if (!id) return "";
    return allTopics.find((topic) => topic._id === id)?.label || "";
  }

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
          <div className={styles["empty-msg"]}>{t.noCards}</div>
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
            loadSubjects();
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
  card: Card;
  subjectLabel: string;
  topicLabel: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className={styles["card-wrapper"]}>
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
      <div className={styles["card-meta"]}>
        {subjectLabel}
        {topicLabel ? ` › ${topicLabel}` : ""}
      </div>
      <div className={styles["card-actions"]}>
        <button
          className={styles["btn-edit"]}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          {t.btnEdit}
        </button>
        <button
          className={styles["btn-delete"]}
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
