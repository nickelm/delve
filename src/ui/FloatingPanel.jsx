import { useState, useRef, useEffect, useCallback } from 'react';
import { getTheme, subscribeTheme } from './theme.js';

let topZ = 100;
const TOP_LAYER = 500; // for alwaysOnTop panels

export default function FloatingPanel({
  title, defaultX = 0, defaultY = 0,
  defaultWidth = 300, defaultHeight = 200,
  minWidth = 100, minHeight = 60,
  resizable = true, alwaysOnTop = false,
  children,
}) {
  const [pos, setPos] = useState({ x: defaultX, y: defaultY });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [zIdx, setZIdx] = useState(() => alwaysOnTop ? TOP_LAYER : ++topZ);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => subscribeTheme(() => setTheme(getTheme())), []);

  const bringToFront = useCallback(() => {
    if (!alwaysOnTop) setZIdx(++topZ);
  }, [alwaysOnTop]);

  // Drag by title bar
  const onDragStart = useCallback((e) => {
    e.preventDefault();
    bringToFront();
    const sx = e.clientX - pos.x, sy = e.clientY - pos.y;
    const onMove = (ev) => setPos({ x: ev.clientX - sx, y: ev.clientY - sy });
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [pos.x, pos.y, bringToFront]);

  // Resize by corner handle
  const onResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront();
    const sw = size.w, sh = size.h, sx = e.clientX, sy = e.clientY;
    const onMove = (ev) => setSize({
      w: Math.max(minWidth, sw + ev.clientX - sx),
      h: Math.max(minHeight, sh + ev.clientY - sy),
    });
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [size.w, size.h, minWidth, minHeight, bringToFront]);

  const t = theme;
  return (
    <div
      onPointerDown={bringToFront}
      style={{
        position: 'absolute', left: pos.x, top: pos.y,
        width: size.w, height: size.h,
        zIndex: alwaysOnTop ? TOP_LAYER : zIdx,
        display: 'flex', flexDirection: 'column',
        border: `2px solid ${t.panelBorder}`,
        borderRadius: 4,
        boxShadow: '2px 4px 16px rgba(0,0,0,0.4)',
        overflow: 'hidden',
        background: t.panelBg,
      }}
    >
      {/* Title bar */}
      <div
        onPointerDown={onDragStart}
        style={{
          background: t.panelHeader,
          borderBottom: `1px solid ${t.panelBorder}`,
          padding: '2px 8px',
          cursor: 'move',
          userSelect: 'none', WebkitUserSelect: 'none',
          fontSize: 11,
          fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
          color: t.text,
          fontWeight: 'bold',
          flexShrink: 0,
          display: 'flex', alignItems: 'center',
          minHeight: 20,
        }}
      >
        {title}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>

      {/* Resize handle */}
      {resizable && (
        <div
          onPointerDown={onResizeStart}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 18, height: 18, cursor: 'nwse-resize',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.textFaint, fontSize: 10, lineHeight: 1,
            userSelect: 'none',
          }}
        >&#x25E2;</div>
      )}
    </div>
  );
}
