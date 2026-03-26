import { useState, useEffect } from "react";
import type { Session, Subject } from "../../types";
import { api } from "../../api";
import styles from "./AddSection.module.css";
import { AddSide } from "../../components/AddSide";
import { t } from "../../strings";
import { SubjectSelect } from "../../components/SubjectSelect";

interface Props {
  session: Session;
  updateSession: (_updates: Partial<Session>) => void;
}

export function AddSection({ session, updateSession }: Props) {
  const [subjectId, setSubjectId] = useState(session.subjectId || "");
  const [topicId, setTopicId] = useState(session.topicId || "");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [s1Text, setS1Text] = useState("");
  const [s1Text2, setS1Text2] = useState("");
  const [s1File, setS1File] = useState<File | null>(null);
  const [s1Preview, setS1Preview] = useState("");
  const [s2Text, setS2Text] = useState("");
  const [s2Text2, setS2Text2] = useState("");
  const [s2File, setS2File] = useState<File | null>(null);
  const [s2Preview, setS2Preview] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    api
      .getSubjects()
      .then(setSubjects)
      .catch(() => console.error("Failed to load subjects"));
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
    } catch (e: unknown) {
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className={styles.addForm}>
      <h2>{t.headingAddCard}</h2>
      <div className="side-section">
        <SubjectSelect
          label={t.addSubject}
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
        {subjectId && subjectId !== "__new__" && (
          <SubjectSelect
            label={t.addTopic}
            subjects={topics}
            value={topicId}
            onChange={(id: any) => {
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
        )}
      </div>

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
  );
}
