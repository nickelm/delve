import { useState, useEffect } from 'react';
import { party } from '../gameState.js';
import { getTheme, subscribeTheme } from './theme.js';

export default function PartyBar() {
  const [modal, setModal] = useState(null);
  const [theme, setTheme] = useState(getTheme);

  useEffect(() => subscribeTheme(() => setTheme(getTheme())), []);

  const t = theme;

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, padding: '6px 8px', width: '100%', height: '100%',
        boxSizing: 'border-box',
        fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
      }}>
        {party.map((m) => (
          <div key={m.name} onClick={() => setModal(m)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: t.btnBg,
            border: `1px solid ${t.btnBorder}`,
            borderRadius: 4, padding: '4px 8px',
            cursor: 'pointer', userSelect: 'none', flex: '1 1 0',
            maxWidth: 200, minWidth: 0,
          }}>
            {/* Portrait disc */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: m.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 'bold',
              fontFamily: 'monospace',
              border: `2px solid ${t.ink}`,
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            }}>{m.abbr}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 11, color: t.text, fontWeight: 'bold',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{m.name}</div>

              {/* HP bar */}
              <div style={{
                height: 7, background: t.hpBarBg, borderRadius: 3,
                overflow: 'hidden', marginTop: 2,
                border: `1px solid ${t.panelBorder}`,
              }}>
                <div style={{
                  height: '100%', width: `${(m.hp / m.maxHp) * 100}%`,
                  background: 'linear-gradient(180deg, #cc4444 0%, #882222 100%)',
                  borderRadius: 2,
                }} />
              </div>

              {/* Mana bar */}
              <div style={{
                height: 5, background: t.manaBarBg, borderRadius: 3,
                overflow: 'hidden', marginTop: 2,
                border: `1px solid ${t.panelBorder}`,
              }}>
                <div style={{
                  height: '100%', width: `${(m.mana / m.maxMana) * 100}%`,
                  background: 'linear-gradient(180deg, #4466cc 0%, #223388 100%)',
                  borderRadius: 2,
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder modal — uses fixed positioning to escape FloatingPanel */}
      {modal && (
        <div onClick={() => setModal(null)} style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: t.panelBg, border: `3px solid ${t.panelBorder}`,
            borderRadius: 6, padding: '20px 28px',
            fontFamily: '"Palatino Linotype", "Book Antiqua", Palatino, serif',
            color: t.text, minWidth: 200, textAlign: 'center',
            boxShadow: '4px 6px 20px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: modal.color, margin: '0 auto 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 'bold', fontFamily: 'monospace',
              border: `3px solid ${t.panelBorder}`,
              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
            }}>{modal.abbr}</div>
            <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>{modal.name}</div>
            <div style={{ fontSize: 14, fontStyle: 'italic', marginBottom: 12, color: t.textFaint }}>{modal.cls}</div>
            <div style={{ fontSize: 14 }}>HP: {modal.hp} / {modal.maxHp}</div>
            <div style={{ fontSize: 14 }}>Mana: {modal.mana} / {modal.maxMana}</div>
            <button onClick={() => setModal(null)} style={{
              marginTop: 16, padding: '6px 20px',
              background: t.btnBg, border: `1px solid ${t.panelBorder}`,
              borderRadius: 4, color: t.text, fontSize: 13,
              fontFamily: 'inherit', cursor: 'pointer',
            }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
