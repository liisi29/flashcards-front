import { useState, useEffect } from 'react';
import type { Session, Subject } from '../types';
import { USERS } from '../types';
import { api } from '../api';
import { loadSession } from '../session';
import styles from './Welcome.module.css';

const LOADER_MSGS = [
  '🐌 Server ärkab üles...',
  '☕ Server joob kohvi...',
  '🦥 Server venib...',
  '🐢 Kõik head asjad võtavad aega...',
  '🧘 Server mediteerib...',
  '🌀 Bitid ja baidid veerevad...',
  '🐠 Server ujub kohale...',
  '🍵 Server keedab teed...',
  '🦔 Server siilub...',
  '🌙 Server oli uinunud, sorry...',
];

interface Props {
  onEnterMain: (session: Session) => void;
  onEnterLearn: (session: Session) => void;
}

export default function Welcome({ onEnterMain, onEnterLearn }: Props) {
  const saved = loadSession();
  const [name, setName] = useState(saved.name);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState(saved.subjectId || '');
  const [topicId, setTopicId] = useState(saved.topicId || '');
  const [newSubject, setNewSubject] = useState('');
  const [loaderMsg, setLoaderMsg] = useState('');
  const [loadError, setLoadError] = useState(false);





  async function handleCreateSubject() {
    const label = newSubject.trim();
    if (!label) return;
    const created = await api.createSubject(label);
    setSubjects((prev) => [...prev, created]);
    setSubjectId(created._id);
    setNewSubject('');
  }

  const ready = !!name && !!subjectId;

  function makeSession(): Session {
    return { name, subjectId, topicId: topicId || '', viewers: [name] };
  }

    useEffect(() => {
      async function loadSubjects() {
        setLoaderMsg(LOADER_MSGS[0]);
        setLoadError(false);
        let i = 0;
        const interval = setInterval(() => {
          i = (i + 1) % LOADER_MSGS.length;
          setLoaderMsg(LOADER_MSGS[i]);
        }, 3000);

        for (let attempt = 0; attempt < 20; attempt++) {
          try {
            const list = await api.getSubjects();
            clearInterval(interval);
            setSubjects(list);
            setLoaderMsg('');
            return;
          } catch {
            await new Promise((r) => setTimeout(r, 5000));
          }
        }
        clearInterval(interval);
        setLoaderMsg('');
        setLoadError(true);
      }
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    api.getTopics(subjectId).then(setTopics).catch(() => setTopics([]));
  }, [subjectId]);

  return (
    <div className={styles.welcome}>
      <h1>Flashcards</h1>
      <div className={styles['welcome-box']}>
        <div>
          <label>Kes sa oled?</label>
          <div className={styles['name-chips']}>
            {USERS.map((u) => (
              <div
                key={u}
                className={`${styles['name-chip']}${name === u ? ` ${styles.selected}` : ''}`}
                onClick={() => setName(u)}
              >
                {u}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label>Teema</label>
          {loaderMsg && <div className={styles['welcome-loader']}>{loaderMsg}</div>}
          {loadError && <div className={styles['welcome-loader']}>Ühendus ebaõnnestus</div>}
          {!loaderMsg && !loadError && (
            <>
              <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); setTopics([]); }}>
                <option value="">-- Vali teema --</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.label}</option>
                ))}
              </select>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <input
                  type="text"
                  placeholder="Lisa uus teema..."
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSubject()}
                  style={{ flex: 1 }}
                />
                <button className="btn-save" style={{ padding: '8px 14px' }} onClick={handleCreateSubject}>+</button>
              </div>
            </>
          )}
        </div>

        {subjectId && topics.length > 0 && (
          <div>
            <label>Alamteema (valikuline)</label>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)}>
              <option value="">-- Kõik --</option>
              {topics.map((t) => (
                <option key={t._id} value={t._id}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {ready && (
          <div className={styles['welcome-actions']}>
            <button className={styles['btn-welcome-action']} onClick={() => onEnterMain(makeSession())}>
              ✏️ Lisa kaarte
            </button>
            <button
              className={`${styles['btn-welcome-action']} ${styles['btn-welcome-learn']}`}
              onClick={() => onEnterLearn(makeSession())}
            >
              📖 Õpi
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
