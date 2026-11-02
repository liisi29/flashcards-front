import { useState } from "react";
import { api } from "../../api";
import styles from "./AddSection.module.css";
import pageStyles from "./AddPage.module.css";
import { AddSide } from "../../components/AddSide";
import { TextInput } from "../../components/TextInput";
import { t } from "../../strings";
import { useSubjects } from "../../contexts/SubjectsContext";
import { useCurrentSubject } from "../../contexts/CurrentSubjectContext";
import { currentUserId } from "../../user";

interface Props {
  /** topic + tags are picked once on the Lisa page, shared by both forms */
  topicId: string;
  tagIds: string[];
  onCardAdded: () => void;
}

export function AddSection({ topicId, tagIds, onCardAdded }: Props) {
  const { reload: reloadSubjects } = useSubjects();
  const { subjectId } = useCurrentSubject();
  const [s1Text, setS1Text] = useState("");
  const [s1Text2, setS1Text2] = useState("");
  const [s1File, setS1File] = useState<File | null>(null);
  const [s1Preview, setS1Preview] = useState("");
  const [s2Text, setS2Text] = useState("");
  const [s2Text2, setS2Text2] = useState("");
  const [s2File, setS2File] = useState<File | null>(null);
  const [s2Preview, setS2Preview] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  function resetForm() {
    setS1Text("");
    setS1Text2("");
    setS1File(null);
    setS1Preview("");
    setS2Text("");
    setS2Text2("");
    setS2File(null);
    setS2Preview("");
    setNotes("");
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
      const trimmedNotes = notes.trim();
      await api.addCard({
        subjectId,
        topicId,
        progress: {},
        tagIds,
        notes: trimmedNotes ? { [currentUserId()]: trimmedNotes } : {},
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

  return (
    <>
      {/* front and back side by side, like the card's two faces */}
      <div className={pageStyles.sides}>
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
      </div>
      <div className="side-section">
        <h3>{t.notesLabel}</h3>
        <TextInput
          placeholder={t.notesPlaceholder}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
        />
      </div>
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
