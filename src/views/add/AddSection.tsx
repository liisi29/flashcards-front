import { useState, useEffect } from "react";
import type { ISubject } from "../../types";
import { api } from "../../api";
import styles from "./AddSection.module.css";
import { AddSide } from "../../components/AddSide";
import { t } from "../../strings";
import { SubjectSelect } from "../../components/SubjectSelect";
import { TagInput } from "../../components/TagInput";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";

interface Props {
  onCardAdded: () => void;
}

export function AddSection({ onCardAdded }: Props) {
  const { reload: reloadSubjects } = useSubjects();
  const { subjectId } = useCurrentSubject();
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<ISubject[]>([]);
  const [s1Text, setS1Text] = useState("");
  const [s1Text2, setS1Text2] = useState("");
  const [s1File, setS1File] = useState<File | null>(null);
  const [s1Preview, setS1Preview] = useState("");
  const [s2Text, setS2Text] = useState("");
  const [s2Text2, setS2Text2] = useState("");
  const [s2File, setS2File] = useState<File | null>(null);
  const [s2Preview, setS2Preview] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [status, setStatus] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    setTopicId("");
    setTagIds([]);
    if (!subjectId) {
      setTopics([]);
      return;
    }
    api
      .getTopics(subjectId)
      .then(setTopics)
      .catch(() => setTopics([]));
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
    setTagIds([]);
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
        tagIds,
        s1: { text: s1Text.trim(), text2: s1Text2.trim(), photo: s1Photo },
        s2: { text: s2Text.trim(), text2: s2Text2.trim(), photo: s2Photo },
      });
      setStatus(t.statusSaved);
      const msgs = t.toastCardAdded;
      setToastMsg(msgs[Math.floor(Math.random() * msgs.length)]);
      setTimeout(() => setToastMsg(""), 2000);
      resetForm();
      onCardAdded();
      reloadSubjects();
    } catch (e: unknown) {
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
    }
  }

  if (!subjectId) {
    return <p className="status">{t.pickSubjectFirst}</p>;
  }

  return (
    <>
      <div className="side-section">
        <SubjectSelect
          label={t.addTopic}
          subjects={topics}
          value={topicId}
          onChange={(id: string) => setTopicId(id)}
          onCreated={(s) => {
            setTopics((prev) => [...prev, s]);
            setTopicId(s._id);
          }}
          onCreate={(label) => api.createSubject(label, subjectId)}
          placeholder={t.placeholderTopic}
          newPlaceholder={t.placeholderNewTopic}
        />
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
      <TagInput
        tagIds={tagIds}
        subjectId={subjectId}
        topicId={topicId}
        onChange={setTagIds}
      />
      {status && <p className="status">{status}</p>}
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}
      <div className="form-buttons">
        <button className="btn-save" onClick={submitForm}>
          {t.btnAddCard}
        </button>
      </div>
    </>
  );
}
