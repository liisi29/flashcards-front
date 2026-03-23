import type { CardSide } from '../types';
// CardFace uses global classes from index.css: .card-face, .card-face-1, .card-face-2, .card-text
import './CardFace.module.css';

interface Props {
  side: CardSide;
  faceNum: 1 | 2;
}

export default function CardFace({ side, faceNum }: Props) {
  const hasPhoto = !!side.photo;
  const hasText = !!(side.text || side.text2);

  const bg = hasPhoto
    ? '#1a1a1a'
    : faceNum === 1
      ? '#2d3748'
      : 'linear-gradient(135deg, #2d5016, #4a7c59)';

  return (
    <div
      className={`card-face card-face-${faceNum}${hasPhoto && hasText ? ' has-both' : ''}`}
      style={{ background: bg }}
    >
      {hasPhoto && <img src={side.photo} alt={side.text || ''} />}
      {hasText && (
        <div className="card-text">
          {side.text && <div>{side.text}</div>}
          {side.text2 && (
            <div style={{ fontSize: '1.1rem', fontWeight: 'normal', marginTop: 8, opacity: 0.85 }}>
              {side.text2}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
