import { useState, useEffect } from 'react';
import type { Card, Color, Session } from '../types';
import { api } from '../api';
import CardFace from '../components/CardFace';
import SemDot from '../components/SemDot';

const COLORS: Color[] = [null, 'red', 'yellow', 'green'];

interface Props {
  session: Session;
  onExit: () => void;
}

type LearnMode = 'config' | 'single' | 'grid';

export default function Learn({ session, onExit }: Props) {
  const [mode, setMode] = useState<LearnMode>('config');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [subject, setSubject] = useState(session.subject || '');
  const [random, setRandom] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [activeColors, setActiveColors] = useState<Color[]>([null, 'red', 'yellow']);
  const [learnCards, setLearnCards] = useState<Card[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    api.getSubjects(session.name).then(setSubjects).catch(() => {});
  }, [session.name]);

  async function startLearn() {
    let all = await api.getCards(session.name);
    if (subject) all = all.filter((c) => c.subject === subject);
    all = all.filter((c) => activeColors.includes(c.progress?.[session.name] ?? null));
    if (random) all = all.sort(() => Math.random() - 0.5);
    setLearnCards(all);
    setIdx(0);
    setFlipped(false);
    setMode(viewMode);
  }

  function toggleColor(c: Color) {
    setActiveColors((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function setProgress(card: Card, color: Color) {
    card.progress = { ...card.progress, [session.name]: color };
    await api.setProgress(card._id, session.name, color);
    if (!activeColors.includes(color)) {
      const next = learnCards.filter((c) => c._id !== card._id);
      if (!next.length) { onExit(); return; }
      setLearnCards(next);
      setIdx((i) => Math.min(i, next.length - 1));
      setFlipped(false);
    } else {
      setLearnCards([...learnCards]);
    }
  }

  if (mode === 'config') {
    return (
      <div className="learn-overlay">
        <div className="learn-config-box">
          <h2>Õpi</h2>

          <div className="learn-config-row">
            <label>Teema</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">Kõik teemad</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="learn-config-row">
            <label>Semafor</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {COLORS.map((c) => (
                <SemDot key={String(c)} color={c} selected={activeColors.includes(c)} onClick={() => toggleColor(c)} />
              ))}
            </div>
          </div>

          <div className="learn-config-row">
            <label>
              <input type="checkbox" checked={random} onChange={(e) => setRandom(e.target.checked)} />
              {' '}Juhuslik järjekord
            </label>
          </div>

          <div className="learn-config-row">
            <label>Vaade</label>
            <label><input type="radio" name="vm" value="single" checked={viewMode === 'single'} onChange={() => setViewMode('single')} /> Üks kaart korraga</label>
            <label><input type="radio" name="vm" value="grid" checked={viewMode === 'grid'} onChange={() => setViewMode('grid')} /> Kõik kaardid</label>
          </div>

          <div className="form-buttons">
            <button className="btn-save" onClick={startLearn}>Alusta</button>
            <button className="btn-cancel" onClick={onExit}>Tagasi</button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className="learn-overlay" style={{ overflowY: 'auto', justifyContent: 'flex-start' }}>
        <div className="learn-top">
          <button className="btn-learn-exit" onClick={() => setMode('config')}>← Seaded</button>
          <span className="learn-counter">{learnCards.length} kaarti</span>
        </div>
        <div className="cards" id="learn-grid-cards" style={{ padding: 24 }}>
          {learnCards.map((card) => (
            <GridCard key={card._id} card={card} session={session} onProgress={(c) => setProgress(card, c)} />
          ))}
        </div>
      </div>
    );
  }

  // Single card mode
  const card = learnCards[idx];
  if (!card) return <div className="learn-overlay"><p>Kaarte ei leitud.</p><button onClick={onExit}>Tagasi</button></div>;

  const prog = card.progress?.[session.name] ?? null;

  return (
    <div className="learn-overlay">
      <div className="learn-top">
        <button className="btn-learn-exit" onClick={() => setMode('config')}>← Seaded</button>
        <span className="learn-counter">{idx + 1} / {learnCards.length}</span>
      </div>

      <div className="learn-card-area">
        <div className={`card-scene${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
          <div className="card">
            <CardFace side={card.s1 || { text: '', text2: '', photo: '' }} faceNum={1} />
            <CardFace side={card.s2 || { text: '', text2: '', photo: '' }} faceNum={2} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 10 }}>
        {COLORS.map((c) => (
          <SemDot key={String(c)} color={c} selected={prog === c} onClick={() => setProgress(card, c)} />
        ))}
      </div>

      <div className="learn-nav">
        <button className="btn-learn-nav" onClick={() => { setIdx((i) => Math.max(0, i - 1)); setFlipped(false); }}>←</button>
        <div className="learn-progress-dots">
          {learnCards.map((_, i) => (
            <div
              key={i}
              className={`learn-dot${i === idx ? ' active' : ''}`}
              onClick={() => { setIdx(i); setFlipped(false); }}
            />
          ))}
        </div>
        <button className="btn-learn-nav" onClick={() => { setIdx((i) => Math.min(learnCards.length - 1, i + 1)); setFlipped(false); }}>→</button>
      </div>
    </div>
  );
}

function GridCard({ card, session, onProgress }: { card: Card; session: Session; onProgress: (c: Color) => void }) {
  const [flipped, setFlipped] = useState(false);
  const prog = card.progress?.[session.name] ?? null;

  return (
    <div className="card-wrapper">
      <div className={`card-scene${flipped ? ' flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
        <div className={`card${prog ? ` prog-${prog}` : ''}`}>
          <CardFace side={card.s1 || { text: '', text2: '', photo: '' }} faceNum={1} />
          <CardFace side={card.s2 || { text: '', text2: '', photo: '' }} faceNum={2} />
        </div>
      </div>
      <div className="grid-sem-dots">
        {COLORS.map((c) => (
          <SemDot key={String(c)} color={c} selected={prog === c} onClick={() => onProgress(c)} />
        ))}
      </div>
    </div>
  );
}
