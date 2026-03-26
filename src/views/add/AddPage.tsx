import { useState, useEffect } from "react";
import type { Card, Session, Subject } from "../../types";
import { api } from "../../api";
import CardFace from "../../components/CardFace";
import EditModal from "../EditModal";
import SubjectSelect from "../../components/SubjectSelect";
import styles from "./AddPage.module.css";
import { AddSide } from "../../components/AddSide";
import { Filters } from "./Filters";
import { t } from "../../strings";

interface Props {
  session: Session;
  updateSession: (_updates: Partial<Session>) => void;
  onLearn: () => void;
}

export default function Main({ session, updateSession, onLearn }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTopics, setAllTopics] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [filterTopics, setFilterTopics] = useState<Subject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(
    session.subjectId || ""
  );
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || "");
  const [subjectId, setSubjectId] = useState(session.subjectId || "");
  const [topicId, setTopicId] = useState(session.topicId || "");
  const [s1Text, setS1Text] = useState("");
  const [s1Text2, setS1Text2] = useState("");
  const [s1File, setS1File] = useState<File | null>(null);
  const [s1Preview, setS1Preview] = useState("");
  const [s2Text, setS2Text] = useState("");
  const [s2Text2, setS2Text2] = useState("");
  const [s2File, setS2File] = useState<File | null>(null);
  const [s2Preview, setS2Preview] = useState("");
  const [status, setStatus] = useState("");
  const [editCard, setEditCard] = useState<Card | null>(null);

  async function loadCards() {
    try {
      const data = await api.getCards();
      setCards(data);
    } catch {
      setStatus("Serveriga ühendamine ebaõnnestus.");
    }
  }

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
    api
      .getCards()
      .then(setCards)
      .catch(() => setStatus("Serveriga ühendamine ebaõnnestus."));
    loadSubjects();
  }, []);

  useEffect(() => {
    if (subjectId) {
      api
        .getTopics(subjectId)
        .then(setTopics)
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
      setTopicId("");
    }
  }, [subjectId]);

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

  function resetForm() {
    setS1Text("");
    setS1Text2("");
    setS1File(null);
    setS1Preview("");
    setS2Text("");
    setS2Text2("");
    setS2File(null);
    setS2Preview("");
    setStatus("");
  }

  async function submitForm() {
    if (!subjectId) {
      setStatus(t.validationSubject);
      return;
    }
    if (!topicId) {
      setStatus(t.validationTopic);
      return;
    }
    setStatus(t.statusSaving);
    try {
      let s1Photo = "";
      let s2Photo = "";
      if (s1File) s1Photo = await api.uploadPhoto(s1File);
      if (s2File) s2Photo = await api.uploadPhoto(s2File);
      await api.addCard({
        subjectId,
        topicId,
        progress: {},
        s1: { text: s1Text.trim(), text2: s1Text2.trim(), photo: s1Photo },
        s2: { text: s2Text.trim(), text2: s2Text2.trim(), photo: s2Photo },
      });
      setStatus(t.statusSaved);
      resetForm();
      await loadCards();
    } catch (e: unknown) {
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function deleteCard(id: string) {
    if (!confirm(t.confirmDelete)) return;
    await api.deleteCard(id);
    await loadCards();
  }

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || id;
  }

  function topicLabel(id?: string) {
    if (!id) return "";
    return allTopics.find((t) => t._id === id)?.label || "";
  }

  const filtered = cards.filter((c) => {
    if (filterSubjectId && c.subjectId !== filterSubjectId) return false;
    if (filterTopicId && c.topicId !== filterTopicId) return false;
    return true;
  });

  function shuffle() {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
  }

  return (
    <div id="app">
      {/* Session bar */}
      <div className={styles["session-bar"]}>
        <h2>{t.headingSaveUnder}</h2>
        <div className={styles["session-row"]}>
          <SubjectSelect
            subjects={subjects}
            value={subjectId}
            onChange={(id) => {
              setSubjectId(id);
              setTopicId("");
              setTopics([]);
              updateSession({ subjectId: id, topicId: "" });
            }}
            onCreated={(s) => {
              setSubjects((prev) => [...prev, s]);
              setSubjectId(s._id);
              updateSession({ subjectId: s._id, topicId: "" });
            }}
            onCreate={(label) => api.createSubject(label)}
            placeholder={t.placeholderSubject}
            newPlaceholder={t.placeholderNewSubject}
          />
        </div>

        {subjectId && subjectId !== "__new__" && (
          <div className={styles["session-row"]} style={{ marginTop: 8 }}>
            <SubjectSelect
              subjects={topics}
              value={topicId}
              onChange={(id) => {
                setTopicId(id);
                updateSession({ topicId: id });
              }}
              onCreated={(s) => {
                setTopics((prev) => [...prev, s]);
                setTopicId(s._id);
                updateSession({ topicId: s._id });
              }}
              onCreate={(label) => api.createSubject(label, subjectId)}
              placeholder={t.placeholderTopic}
              newPlaceholder={t.placeholderNewTopic}
            />
          </div>
        )}
      </div>

      {/* Add form */}
      <div className={styles["add-form"]}>
        <h2>{t.headingAddCard}</h2>

        <AddSide
          title={t.side1}
          photo={s1Preview}
          setPhoto={setS1Preview}
          text1={s1Text}
          setText1={setS1Text}
          text2={s1Text2}
          setText2={setS1Text2}
          setFile={setS1File}
        />
        <AddSide
          title={t.side2}
          text1={s2Text}
          setText1={setS2Text}
          text2={s2Text2}
          setText2={setS2Text2}
          photo={s2Preview}
          setPhoto={setS2Preview}
          setFile={setS2File}
        />
        {status && <p className="status">{status}</p>}
        <div className="form-buttons">
          <button className="btn-save" onClick={submitForm}>
            {t.btnAddCard}
          </button>
        </div>
      </div>

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
