import { useState, useEffect, useRef } from 'react';
import { getTheme, subscribeTheme } from './theme.js';

const MESSAGE_LIFETIME = 3000;
const FADE_START = 2000;
const MAX_VISIBLE = 3;

let messages = [];
let listeners = new Set();

function notifyListeners() {
  for (const fn of listeners) fn();
}

export function log(text) {
  messages.unshift({ text, time: performance.now() });
  if (messages.length > 10) messages.length = 10;
  notifyListeners();
}

export function getVisibleMessages() {
  const now = performance.now();
  const visible = [];
  for (const m of messages) {
    const age = now - m.time;
    if (age > MESSAGE_LIFETIME) break;
    const opacity = age < FADE_START ? 1.0 : 1.0 - (age - FADE_START) / (MESSAGE_LIFETIME - FADE_START);
    visible.push({ text: m.text, opacity });
    if (visible.length >= MAX_VISIBLE) break;
  }
  return visible;
}

export default function MessageLogOverlay() {
  const [, forceUpdate] = useState(0);
  const [theme, setTheme] = useState(getTheme);
  const rafRef = useRef(null);

  useEffect(() => {
    const onUpdate = () => forceUpdate(n => n + 1);
    listeners.add(onUpdate);
    const unsubTheme = subscribeTheme(() => setTheme(getTheme()));

    let running = true;
    function tick() {
      if (!running) return;
      const vis = getVisibleMessages();
      if (vis.length > 0) forceUpdate(n => n + 1);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      listeners.delete(onUpdate);
      unsubTheme();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const visible = getVisibleMessages();
  if (visible.length === 0) return null;

  const t = theme;
  return (
    <div style={{
      position: 'absolute', bottom: 12, right: 16, zIndex: 600,
      pointerEvents: 'none', maxWidth: 'clamp(280px, 25vw, 420px)',
    }}>
      {visible.map((m, i) => (
        <div key={`${m.text}-${i}`} style={{
          background: t.msgBg,
          color: t.msgText,
          fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
          fontSize: 'clamp(14px, 1vw, 19px)',
          fontStyle: 'italic',
          padding: '5px 12px',
          marginBottom: 3,
          borderRadius: 3,
          opacity: m.opacity,
          border: `1px solid ${t.panelBorder}`,
          transition: 'opacity 0.1s',
        }}>{m.text}</div>
      ))}
    </div>
  );
}
