import React, { useEffect } from 'react';

export default function Toast({ message, type, onClose }) {
useEffect(() => {
  if (!message) return;

  // Son notification
  const audio = new Audio('https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg');
  audio.volume = 0.3;
  audio.play().catch(() => {}); // catch si navigateur bloque

  const timer = setTimeout(onClose, 4000);
  return () => clearTimeout(timer);
}, [message]);

  if (!message) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      right: '32px',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      background: type === 'success' ? '#008339' : '#ef4444',
      color: '#fff',
      fontSize: '14px',
      fontWeight: '600',
      minWidth: '280px',
      maxWidth: '400px',
      animation: 'slideIn 0.3s ease',
    }}>
      <span style={{ fontSize: 20 }}>
        {type === 'success' ? '✅' : '❌'}
      </span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{
        background: 'rgba(255,255,255,0.2)',
        border: 'none', borderRadius: '6px',
        color: '#fff', cursor: 'pointer',
        padding: '4px 8px', fontSize: '14px',
        fontWeight: '700',
      }}>
        ✕
      </button>

      {/* Barre de progression */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0,
        height: '3px',
        borderRadius: '0 0 12px 12px',
        background: 'rgba(255,255,255,0.4)',
        animation: 'progress 4s linear forwards',
        width: '100%',
      }} />

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes progress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  );
}