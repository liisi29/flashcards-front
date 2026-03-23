import { useState, useEffect } from 'react';
import type { Session } from '../types';
import { USERS } from '../types';
import { api } from '../api';
import { loadSession } from '../session';

const LOADER_MSGS = [
  '🐌 Server ärkab üles...',
  '☕ Server joob kohvi...',
  '🦥 Server venib...',
  '🐢 Kõik head asjad võtavad aega...',
  '🧘 Server mediteerib...',
  '🌀 Bits and bytes teel...',
  '🐠 Server ujub kohal...',
  '🍵 Server keeb teed...',
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
  const [subject, setSubject] = useState(saved.subject);
  const [subjectInput, setSubjectInput] = useState('');
  const [subjects, setSubjects] = useState<string[]>([]);
  const [loaderMsg, setLoaderMsg] = useState('');
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!name) return;
    loadSubjects(name);
  }, [name]);

  async function loadSubjects(forName: string) {
    setLoaderMsg(LOADER_MSGS[0]);
    setLoadError(false);
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % LOADER_MSGS.length;
      setLoaderMsg(LOADER_MSGS[i]);
    }, 3000);

    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        const list = await api.getSubjects(forName);
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

  const activeSubject = subjectInput.trim() || subject;
  const ready = !!name && !!activeSubject;

  function makeSession(): Session {
    return { name, subject: activeSubject, viewers: [name] };
  }

  return (
    <div className="welcome">
      <h1>Flashcards</h1>
      <div className="welcome-box">
        <div>
          <label>Kes sa oled?</label>
          <div className="name-chips">
            {USERS.map((u) => (
              <div
                key={u}
                className={`name-chip${name === u ? ' selected' : ''}`}
                onClick={() => {
                  setName(u);
                  setSubject('');
                  setSubjectInput('');
                }}
              >
                {u}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label>Mida õpid?</label>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSubjectInput('');
            }}
            disabled={!name}
          >
            <option value="">-- Vali teema --</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {loaderMsg && <div className="welcome-loader">{loaderMsg}</div>}
          {loadError && <div className="welcome-loader">Ühendus ebaõnnestus</div>}
          <input
            type="text"
            placeholder="või kirjuta uus teema..."
            value={subjectInput}
            onChange={(e) => {
              setSubjectInput(e.target.value);
              setSubject('');
            }}
            style={{ marginTop: 10 }}
          />
        </div>

        {ready && (
          <div className="welcome-actions">
            <button className="btn-welcome-action" onClick={() => onEnterMain(makeSession())}>
              ✏️ Lisa kaarte
            </button>
            <button
              className="btn-welcome-action btn-welcome-learn"
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
