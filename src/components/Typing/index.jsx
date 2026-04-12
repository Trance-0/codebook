import {useEffect, useRef, useState} from 'react';
import styles from './styles.module.css';

const DEFAULT_SPEED = 55; // ms per character
const DEFAULT_PAUSE = 140; // ms pause on space
const JITTER = 0.4; // +-40% random variation on each keystroke

function extractText(children) {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractText).join('');
  if (children && children.props && children.props.children) {
    return extractText(children.props.children);
  }
  return '';
}

export default function Typing({
  children,
  speed = DEFAULT_SPEED,
  pauseOnSpace = DEFAULT_PAUSE,
  cursor = true,
}) {
  const text = extractText(children);
  const [count, setCount] = useState(0);
  const done = count >= text.length;
  const timerRef = useRef(null);

  useEffect(() => {
    if (done) return;

    const char = text[count];
    // Base delay: longer on spaces to mimic human hesitation
    const base = char === ' ' ? pauseOnSpace : speed;
    // Add random jitter so the rhythm feels organic
    const jitter = base * JITTER * (Math.random() * 2 - 1);
    const delay = Math.max(10, base + jitter);

    timerRef.current = setTimeout(() => {
      setCount((c) => c + 1);
    }, delay);

    return () => clearTimeout(timerRef.current);
  }, [count, text, speed, pauseOnSpace, done]);

  return (
    <span className={styles.typing}>
      {text.slice(0, count)}
      {cursor && (
        <span className={done ? styles.cursorDone : styles.cursor}>|</span>
      )}
    </span>
  );
}
