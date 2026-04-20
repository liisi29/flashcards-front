import { useState, useEffect } from "react";
import { t } from "../../strings";
import type { ICard, Color, ISubject } from "../../types";
import { api } from "../../api";
import { SemDot } from "../../components/SemDot";
import styles from "./EditModal.module.css";
import { AddSide } from "../../components/AddSide";
import { TextSelectWithLabel } from "../../components/TextSelectWithLabel";
import { TagInput } from "../../components/TagInput";

const COLORS: Color[] = [null, "red", "yellow", "green"];

interface Props {
  card: ICard;
  subjects: ISubject[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EditModal({ card, subjects, onClose, onSaved }: Props) {
  const [s1Text, setS1Text] = useState(card.s1?.text || "");
  const [s1Text2, setS1Text2] = useState(card.s1?.text2 || "");
  const [s1Photo, setS1Photo] = useState(card.s1?.photo || "");
  const [s1File, setS1File] = useState<File | null>(null);
  const [s2Text, setS2Text] = useState(card.s2?.text || "");
  const [s2Text2, setS2Text2] = useState(card.s2?.text2 || "");
  const [s2Photo, setS2Photo] = useState(card.s2?.photo || "");
  const [s2File, setS2File] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState(card.subjectId || "");
  const [topicId, setTopicId] = useState(card.topicId || "");
  const [topics, setTopics] = useState<ISubject[]>([]);
  const [tags, setTags] = useState<string[]>(card.tags ?? []);
  const [progress, setProgress] = useState<Color>(
    card.progress?.["all"] ?? null
  );
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (subjectId) {
      api
        .getTopics(subjectId)
        .then(setTopics)
        .catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [subjectId]);

  async function save() {
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
      let s1p = s1Photo;
      let s2p = s2Photo;
      if (s1File) s1p = await api.uploadPhoto(s1File);
      if (s2File) s2p = await api.uploadPhoto(s2File);

      await api.updateCard(card._id, {
        subjectId,
        topicId,
        tags,
        s1: { text: s1Text, text2: s1Text2, photo: s1p },
        s2: { text: s2Text, text2: s2Text2, photo: s2p },
      });

      if (progress !== (card.progress?.["all"] ?? null)) {
        await api.setProgress(card._id, "all", progress);
      }

      onSaved();
    } catch (e: unknown) {
      setStatus(t.statusError + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className="learn-config-box"
        style={{ maxWidth: 500, width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t.headingEditCard}</h2>
        <AddSide
          title={t.side1}
          text1={s1Text}
          setText1={setS1Text}
          text2={s1Text2}
          setText2={setS1Text2}
          photo={s1Photo}
          setPhoto={setS1Photo}
          setFile={setS1File}
        />

        <AddSide
          title={t.side2}
          text1={s2Text}
          setText1={setS2Text}
          text2={s2Text2}
          setText2={setS2Text2}
          photo={s2Photo}
          setPhoto={setS2Photo}
          setFile={setS2File}
        />
        <TextSelectWithLabel
          label={t.labelSubject}
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setTopicId("");
          }}
          options={subjects}
          noneLabel={t.placeholderSubject}
        />

        {subjectId && (
          <TextSelectWithLabel
            label={t.labelTopic}
            value={topicId}
            onChange={(e) => setTopicId(e.target.value)}
            options={topics}
            noneLabel={t.placeholderTopic}
          />
        )}

        <TagInput tags={tags} onChange={setTags} />

        <div className="learn-config-row">
          <label>{t.labelSemafor}</label>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map((c) => (
              <SemDot
                key={String(c)}
                color={c}
                selected={progress === c}
                onClick={() => setProgress(c)}
              />
            ))}
          </div>
        </div>

        {status && <p className="status">{status}</p>}

        <div className="form-buttons">
          <button className="btn-save" onClick={save}>
            {t.btnSave}
          </button>
          <button className="btn-cancel" onClick={onClose}>
            {t.btnCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
