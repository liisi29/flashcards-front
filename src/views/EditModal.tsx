import { useState, useEffect } from 'react';
import type { Card, Color, Session, Subject } from '../types';
import { USERS } from '../types';
import { api } from '../api';
import SemDot from '../components/SemDot';
// EditModal uses global classes from index.css:
// .learn-overlay, .learn-config-box, .learn-config-row, .side-section,
// .photo-label, .photo-preview, .remove-photo, .viewers-row, .viewer-chip,
// .form-buttons, .btn-save, .btn-cancel, .status
import './EditModal.module.css';
import { TextInput } from '../components/TextInput';
import { TextSelect } from '../components/TextSelect';
import { AddSide } from '../components/AddSide';

const COLORS: Color[] = [null, 'red', 'yellow', 'green'];

interface Props {
  card: Card;
  session: Session;
  subjects: Subject[];
  onClose: () => void;
  onSaved: () => void;
}

export default function EditModal({ card, session, subjects, onClose, onSaved }: Props) {
  const [s1Text, setS1Text] = useState(card.s1?.text || '');
  const [s1Text2, setS1Text2] = useState(card.s1?.text2 || '');
  const [s1Photo, setS1Photo] = useState(card.s1?.photo || '');
  const [s1File, setS1File] = useState<File | null>(null);
  const [s2Text, setS2Text] = useState(card.s2?.text || '');
  const [s2Text2, setS2Text2] = useState(card.s2?.text2 || '');
  const [s2Photo, setS2Photo] = useState(card.s2?.photo || '');
  const [s2File, setS2File] = useState<File | null>(null);
  const [subjectId, setSubjectId] = useState(card.subjectId || '');
  const [topicId, setTopicId] = useState(card.topicId || '');
  const [topics, setTopics] = useState<Subject[]>([]);
  const [viewers, setViewers] = useState<string[]>(card.viewers || []);
  const [progress, setProgress] = useState<Color>(card.progress?.[session.name] ?? null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (subjectId) {
      api.getTopics(subjectId).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
    }
  }, [subjectId]);

  function toggleViewer(name: string) {
    setViewers((prev) =>
      prev.includes(name) ? prev.filter((v) => v !== name) : [...prev, name]
    );
  }

  async function save() {
    setStatus('Salvestan...');
    try {
      let s1p = s1Photo;
      let s2p = s2Photo;
      if (s1File) s1p = await api.uploadPhoto(s1File);
      if (s2File) s2p = await api.uploadPhoto(s2File);

      await api.updateCard(card._id, {
        subjectId,
        topicId: topicId || undefined,
        viewers,
        s1: { text: s1Text, text2: s1Text2, photo: s1p },
        s2: { text: s2Text, text2: s2Text2, photo: s2p },
      });

      if (progress !== (card.progress?.[session.name] ?? null)) {
        await api.setProgress(card._id, session.name, progress);
      }

      onSaved();
    } catch (e: unknown) {
      setStatus('Viga: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  return (
    <div className="learn-overlay" style={{ overflowY: 'auto' }} onClick={onClose}>
      <div className="learn-config-box" style={{ maxWidth: 500, width: '100%' }} onClick={(e) => e.stopPropagation()}>
        <h2>Muuda kaarti</h2>
        <AddSide
        title="Külg 1 (ees)"
        text1={s1Text}
        setText1={setS1Text}
        text2={s1Text2}
        setText2={setS1Text2}
        photo={s1Photo}
        setPhoto={setS1Photo}
        setFile={setS1File}
        />

        <AddSide
        title="Külg 2 (taga)"
        text1={s2Text}
        setText1={setS2Text}
        text2={s2Text2}
        setText2={setS2Text2}
        photo={s2Photo}
        setPhoto={setS2Photo}
        setFile={setS2File}
        />

        <div className="learn-config-row">
          <label>Teema</label>
          <TextSelect
            value={subjectId}
            onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}
            options={subjects}
            noneLabel="-- Vali teema --"
          />
        </div>

        {subjectId && (
          <div className="learn-config-row">
            <label>Alamteema</label>
            <TextSelect
              value={topicId}
              onChange={(e) => setTopicId(e.target.value)}
              options={topics}
              noneLabel="-- Ilma alamteemata --"
            />
          </div>
        )}

        <div className="learn-config-row">
          <label>Nähtav</label>
          <div className="viewers-row">
            {USERS.map((u) => (
              <div
                key={u}
                className={`viewer-chip${viewers.includes(u) ? ' selected' : ''}`}
                onClick={() => toggleViewer(u)}
              >
                {u}
              </div>
            ))}
          </div>
        </div>

        <div className="learn-config-row">
          <label>Semafor</label>
          <div style={{ display: 'flex', gap: 10 }}>
            {COLORS.map((c) => (
              <SemDot key={String(c)} color={c} selected={progress === c} onClick={() => setProgress(c)} />
            ))}
          </div>
        </div>

        {status && <p className="status">{status}</p>}

        <div className="form-buttons">
          <button className="btn-save" onClick={save}>Salvesta</button>
          <button className="btn-cancel" onClick={onClose}>Tühista</button>
        </div>
      </div>
    </div>
  );
}
