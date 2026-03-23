import { useState, useEffect } from 'react';
import type { Card, Session, Subject } from '../types';
import { USERS } from '../types';
import { api } from '../api';
import CardFace from '../components/CardFace';
import EditModal from './EditModal';
import SubjectSelect from '../components/SubjectSelect';
import styles from './Main.module.css';

interface Props {
  session: Session;
  updateSession: (updates: Partial<Session>) => void;
  onChangeUser: () => void;
  onLearn: () => void;
}

export default function Main({ session, updateSession, onChangeUser, onLearn }: Props) {
  const [cards, setCards] = useState<Card[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [filterSubjectId, setFilterSubjectId] = useState(session.subjectId || '');
  const [filterTopicId, setFilterTopicId] = useState(session.topicId || '');
  const [filterOwner, setFilterOwner] = useState(session.name);
  const [filterViewer, setFilterViewer] = useState('');
  const [viewers, setViewers] = useState<string[]>(
    session.viewers.includes(session.name) ? session.viewers : [...session.viewers, session.name]
  );
  const [subjectId, setSubjectId] = useState(session.subjectId || '');
  const [topicId, setTopicId] = useState(session.topicId || '');
  const [s1Text, setS1Text] = useState('');
  const [s1Text2, setS1Text2] = useState('');
  const [s1File, setS1File] = useState<File | null>(null);
  const [s1Preview, setS1Preview] = useState('');
  const [s2Text, setS2Text] = useState('');
  const [s2Text2, setS2Text2] = useState('');
  const [s2File, setS2File] = useState<File | null>(null);
  const [s2Preview, setS2Preview] = useState('');
  const [status, setStatus] = useState('');
  const [editCard, setEditCard] = useState<Card | null>(null);

  async function loadCards() {
    try {
      const data = await api.getCards(session.name);
      setCards(data);
    } catch {
      setStatus('Serveriga ühendamine ebaõnnestus.');
    }
  }

  async function loadSubjects() {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch {
      console.error('Failed to load subjects');
    }
  }

  useEffect(() => {
    api.getCards(session.name).then(setCards).catch(() => setStatus('Serveriga ühendamine ebaõnnestus.'));
    api.getSubjects().then(setSubjects).catch(() => console.error('Failed to load subjects'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (subjectId) {
      api.getTopics(subjectId).then(setTopics).catch(() => setTopics([]));
    } else {
      setTopics([]);
      setTopicId('');
    }
  }, [subjectId]);

  function toggleViewer(name: string) {
    const next = viewers.includes(name) ? viewers.filter((v) => v !== name) : [...viewers, name];
    setViewers(next);
    updateSession({ viewers: next });
  }

  function resetForm() {
    setS1Text(''); setS1Text2(''); setS1File(null); setS1Preview('');
    setS2Text(''); setS2Text2(''); setS2File(null); setS2Preview('');
    setStatus('');
  }

  async function submitForm() {
    if (!subjectId) { setStatus('Palun vali teema.'); return; }
    setStatus('Salvestan...');
    try {
      let s1Photo = '';
      let s2Photo = '';
      if (s1File) s1Photo = await api.uploadPhoto(s1File);
      if (s2File) s2Photo = await api.uploadPhoto(s2File);
      await api.addCard({
        owner: session.name,
        viewers: viewers.length ? viewers : [session.name],
        subjectId,
        topicId: topicId || undefined,
        progress: {},
        s1: { text: s1Text.trim(), text2: s1Text2.trim(), photo: s1Photo },
        s2: { text: s2Text.trim(), text2: s2Text2.trim(), photo: s2Photo },
      });
      setStatus('Kaart lisatud!');
      resetForm();
      await loadCards();
    } catch (e: unknown) {
      setStatus('Viga: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function deleteCard(id: string) {
    if (!confirm('Kustutan kaardi?')) return;
    await api.deleteCard(id);
    await loadCards();
  }

  function subjectLabel(id: string) {
    return subjects.find((s) => s._id === id)?.label || id;
  }

  function topicLabel(id?: string) {
    if (!id) return '';
    return topics.find((t) => t._id === id)?.label || '';
  }

  const filtered = cards.filter((c) => {
    if (filterSubjectId && c.subjectId !== filterSubjectId) return false;
    if (filterTopicId && c.topicId !== filterTopicId) return false;
    if (filterOwner && c.owner !== filterOwner) return false;
    if (filterViewer && !(c.viewers || []).includes(filterViewer)) return false;
    return true;
  });

  function shuffle() {
    setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
  }

  return (
    <div id="app">
      <h1>Flashcards</h1>

      <div className={styles['top-bar']}>
        <span className={styles['user-label']}>{session.name}</span>
        <button className={styles['btn-change-user']} onClick={onChangeUser}>Vaheta kasutajat</button>
      </div>

      {/* Session bar */}
      <div className={styles['session-bar']}>
        <h2>Salvestan teemasse</h2>
        <div className={styles['session-row']}>
          <SubjectSelect
            subjects={subjects}
            value={subjectId}
            onChange={(id) => { setSubjectId(id); setTopicId(''); setTopics([]); updateSession({ subjectId: id, topicId: '' }); }}
            onCreated={(s) => { setSubjects((prev) => [...prev, s]); setSubjectId(s._id); updateSession({ subjectId: s._id, topicId: '' }); }}
            onCreate={(label) => api.createSubject(label)}
            placeholder="-- Vali teema --"
            newPlaceholder="Uue teema nimi..."
          />
        </div>

        {subjectId && subjectId !== '__new__' && (
          <div className={styles['session-row']} style={{ marginTop: 8 }}>
            <SubjectSelect
              subjects={topics}
              value={topicId}
              onChange={(id) => { setTopicId(id); updateSession({ topicId: id }); }}
              onCreated={(t) => { setTopics((prev) => [...prev, t]); setTopicId(t._id); updateSession({ topicId: t._id }); }}
              onCreate={(label) => api.createSubject(label, subjectId)}
              placeholder="-- Alamteema (valikuline) --"
              newPlaceholder="Uue alamteema nimi..."
            />
          </div>
        )}

        <h2>Nähtav</h2>
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

      {/* Add form */}
      <div className={styles['add-form']}>
        <h2>Lisa uus kaart</h2>
        <div className="side-section">
          <h3>Külg 1</h3>
          <input type="text" placeholder="Tekst rida 1 (valikuline)" value={s1Text} onChange={(e) => setS1Text(e.target.value)} />
          <input type="text" placeholder="Tekst rida 2 (valikuline)" value={s1Text2} onChange={(e) => setS1Text2(e.target.value)} />
          <label className="photo-label">
            📷 Vali foto
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setS1File(f);
              if (f) setS1Preview(URL.createObjectURL(f));
            }} />
          </label>
          {s1Preview && <img src={s1Preview} className="photo-preview" alt="" />}
          {s1Preview && <button className="remove-photo" onClick={() => { setS1File(null); setS1Preview(''); }}>✕ Eemalda foto</button>}
        </div>
        <div className="side-section">
          <h3>Külg 2</h3>
          <input type="text" placeholder="Tekst rida 1 (valikuline)" value={s2Text} onChange={(e) => setS2Text(e.target.value)} />
          <input type="text" placeholder="Tekst rida 2 (valikuline)" value={s2Text2} onChange={(e) => setS2Text2(e.target.value)} />
          <label className="photo-label">
            📷 Vali foto
            <input type="file" accept="image/*" onChange={(e) => {
              const f = e.target.files?.[0] || null;
              setS2File(f);
              if (f) setS2Preview(URL.createObjectURL(f));
            }} />
          </label>
          {s2Preview && <img src={s2Preview} className="photo-preview" alt="" />}
          {s2Preview && <button className="remove-photo" onClick={() => { setS2File(null); setS2Preview(''); }}>✕ Eemalda foto</button>}
        </div>
        {status && <p className="status">{status}</p>}
        <div className="form-buttons">
          <button className="btn-save" onClick={submitForm}>Lisa kaart</button>
        </div>
      </div>
      <div>
        <h2>"Minu" lisatud kaardid. </h2>
        <em>(Mina = {session.name})</em>
      </div>

      {/* Filters */}
      <div className={styles['filter-bar']}>
        <select value={filterSubjectId} onChange={(e) => { setFilterSubjectId(e.target.value); setFilterTopicId(''); }}>
          <option value="">Kõik teemad</option>
          {subjects.map((s) => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
        {filterSubjectId && topics.length > 0 && (
          <select value={filterTopicId} onChange={(e) => setFilterTopicId(e.target.value)}>
            <option value="">Kõik alamteemad</option>
            {topics.map((t) => <option key={t._id} value={t._id}>{t.label}</option>)}
          </select>
        )}
        <select value={filterViewer} onChange={(e) => setFilterViewer(e.target.value)}>
          <option value="">Kõik nägijad</option>
          {USERS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>

      {/* Cards */}
      <div className={styles.cards} id="cards">
        {filtered.length === 0 && <div className={styles['empty-msg']}>Kaarte ei leitud.</div>}
        {filtered.map((card) => (
          <CardItem
            key={card._id}
            card={card}
            session={session}
            subjectLabel={subjectLabel(card.subjectId)}
            topicLabel={topicLabel(card.topicId)}
            onEdit={() => setEditCard(card)}
            onDelete={() => deleteCard(card._id)}
          />
        ))}
      </div>

      <p className={styles.hint}>Klõpsa kaardil, et pöörata</p>
      <p style={{ textAlign: 'center', marginTop: 16 }}>
        <button onClick={shuffle} style={{ background: 'none', border: 'none', color: '#4a7c59', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>Sega kaardid</button>
        &nbsp;·&nbsp;
        <button onClick={onLearn} style={{ background: 'none', border: 'none', color: '#4a7c59', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}>Õpi</button>
      </p>

      {editCard && (
        <EditModal
          card={editCard}
          session={session}
          subjects={subjects}
          onClose={() => setEditCard(null)}
          onSaved={() => { setEditCard(null); loadCards(); loadSubjects(); }}
        />
      )}
    </div>
  );
}

function CardItem({
  card, session, subjectLabel, topicLabel, onEdit, onDelete,
}: {
  card: Card; session: Session; subjectLabel: string; topicLabel: string;
  onEdit: () => void; onDelete: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const prog = card.progress?.[session.name] ?? null;

  return (
    <div className={styles['card-wrapper']}>
      <div className={`card-scene${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
        <div className={`card${prog ? ` prog-${prog}` : ''}`}>
          <CardFace side={card.s1 || { text: '', text2: '', photo: '' }} faceNum={1} />
          <CardFace side={card.s2 || { text: '', text2: '', photo: '' }} faceNum={2} />
        </div>
      </div>
      <div className={styles['card-meta']}>
        {subjectLabel}{topicLabel ? ` › ${topicLabel}` : ''} · {(card.viewers || []).join(', ')}
      </div>
      <div className={styles['card-actions']}>
        <button className={styles['btn-edit']} onClick={(e) => { e.stopPropagation(); onEdit(); }}>Muuda</button>
        <button className={styles['btn-delete']} onClick={(e) => { e.stopPropagation(); onDelete(); }}>Kustuta</button>
      </div>
    </div>
  );
}
