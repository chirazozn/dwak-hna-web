import React from 'react';

export default function StatCard({ icon, label, value, accent, badge }) {
  return (
    <div style={s.card}>
      {badge != null && (
        <span style={s.badge}>{badge} en attente</span>
      )}
      <div style={{ ...s.iconWrap, background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div style={s.body}>
        <div style={s.value}>{value ?? '—'}</div>
        <div style={s.label}>{label}</div>
      </div>
    </div>
  );
}

const s = {
  card: {
    background: '#fff', borderRadius: '16px', padding: '24px 20px',
    display: 'flex', alignItems: 'center', gap: '18px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', position: 'relative',
    overflow: 'hidden',
  },
  iconWrap: {
    width: '56px', height: '56px', borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
  },
  body: { flex: 1 },
  value: { fontSize: '30px', fontWeight: '700', color: '#1f2937', lineHeight: 1.1 },
  label: { fontSize: '13px', color: '#6b7280', marginTop: '5px' },
  badge: {
    position: 'absolute', top: '12px', right: '14px',
    background: '#fef3c7', color: '#d97706',
    fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px',
  },
};
