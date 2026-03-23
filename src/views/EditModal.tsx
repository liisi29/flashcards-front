import { useState, useEffect } from 'react';
import type { Card, Color, Session, Subject } from '../types';
import { USERS } from '../types';
import { api } from '../api';
import SemDot from '../components/SemDot';

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

        <div className="side-section">
          <h3>Külg 1</h3>
          <input type="text" value={s1Text} onChange={(e) => setS1Text(e.target.value)} placeholder="Tekst rida 1" />
          <input type="text" value={s1Text2} onChange={(e) => setS1Text2(e.target.value)} placeholder="Tekst rida 2" />
          <label className="photo-label">
            📷 Vali foto
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setS1File(f);
              if (f) setS1Photo(URL.createObjectURL(f));
            }} />
          </label>
          {s1Photo && <img src={s1Photo} className="photo-preview" alt="" />}
          {s1Photo && <button className="remove-photo" onClick={() => { setS1File(null); setS1Photo(''); }}>✕ Eemalda foto</button>}
        </div>

        <div className="side-section">
          <h3>Külg 2</h3>
          <input type="text" value={s2Text} onChange={(e) => setS2Text(e.target.value)} placeholder="Tekst rida 1" />
          <input type="text" value={s2Text2} onChange={(e) => setS2Text2(e.target.value)} placeholder="Tekst rida 2" />
          <label className="photo-label">
            📷 Vali foto
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setS2File(f);
              if (f) setS2Photo(URL.createObjectURL(f));
            }} />
          </label>
          {s2Photo && <img src={s2Photo} className="photo-preview" alt="" />}
          {s2Photo && <button className="remove-photo" onClick={() => { setS2File(null); setS2Photo(''); }}>✕ Eemalda foto</button>}
        </div>

        <div className="learn-config-row">
          <label>Teema</label>
          <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }}>
            <option value="">-- Vali teema --</option>
            {subjects.map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
          </select>
        </div>

        {subjectId && (
          <div className="learn-config-row">
            <label>Alamteema</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">-- Ilma alamteemata --</option>
              {topics.map((t) => <option key={t._id} value={t._id}>{t.label}</option>)}
            </select>
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
