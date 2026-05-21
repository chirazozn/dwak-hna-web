import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API = 'http://127.0.0.1:5000/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const initials = (nom, prenom) =>
  ((prenom?.[0] || '') + (nom?.[0] || '')).toUpperCase() || '?';

const STATUS = {
  actif:    { bg: '#dcfce7', color: '#15803d', label: 'Actif'    },
  suspendu: { bg: '#ffedd5', color: '#c2410c', label: 'Suspendu' },
  supprime: { bg: '#fee2e2', color: '#dc2626', label: 'Supprimé' },
};

export default function AdminPatients() {
  const [patients,      setPatients]      = useState([]);
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [stats,         setStats]         = useState({ total: 0, actifs: 0, suspendus: 0 });
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast,         setToast]         = useState({ text: '', type: '' });

  const fetchPatients = useCallback(async (p, s) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/patients`, {
        params: { page: p, search: s },
        headers: headers(),
      });
      setPatients(res.data.patients ?? []);
      setTotalPages(res.data.pages  ?? 1);
      setStats({
        total:     res.data.stats?.total     ?? 0,
        actifs:    res.data.stats?.actifs    ?? 0,
        suspendus: res.data.stats?.suspendus ?? 0,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(page, search); }, [page, fetchPatients]);

  const onSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    setPage(1);
    fetchPatients(1, val);
  };

  const showMessage = (text, type) => setToast({ text, type });

  const confirmAction = async () => {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.type === 'suspendre') {
        await axios.put(
          `${API}/patients/${modal.patient.patient_id}/suspendre`,
          {},
          { headers: headers() }
        );
        showMessage(
          modal.patient.statut === 'suspendu'
            ? 'Patient réactivé avec succès'
            : 'Patient suspendu avec succès',
          'success'
        );
      } else {
        await axios.delete(
          `${API}/patients/${modal.patient.patient_id}`,
          { headers: headers() }
        );
        showMessage('Patient supprimé avec succès', 'success');
      }
      setModal(null);
      fetchPatients(page, search);
    } catch (e) {
      showMessage('Une erreur est survenue', 'error');
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Patients" />

      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <StatCard icon="👥" label="Total Patients"     value={stats.total}     accent="#008339" />
          <StatCard icon="✅" label="Patients Actifs"    value={stats.actifs}    accent="#15803d" />
          <StatCard icon="⛔" label="Patients Suspendus" value={stats.suspendus} accent="#c2410c" />
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>

          {/* Search */}
          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span style={s.searchIcon}>🔍</span>
              <input
                type="text"
                placeholder="Rechercher par nom ou email…"
                value={search}
                onChange={onSearch}
                style={s.searchInput}
              />
            </div>
            <span style={s.resultCount}>{patients.length} résultat(s)</span>
          </div>

          {/* Table */}
          {loading ? (
            <div style={s.center}>Chargement…</div>
          ) : (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['Photo','Nom Prénom','Email','Téléphone','Statut','Date inscription','Actions'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {patients.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={s.noData}>Aucun patient trouvé</td>
                    </tr>
                  ) : patients.map((p, i) => {
                    const sc = STATUS[p.statut] || STATUS.actif;
                    return (
                      <tr key={p.patient_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                        <td style={s.td}>
                          <div style={{ ...s.avatar, background: stringToColor(p.nom) }}>
                            {initials(p.nom, p.prenom)}
                          </div>
                        </td>
                        <td style={s.td}>
                          <span style={s.fullName}>{p.prenom} {p.nom}</span>
                        </td>
                        <td style={s.td}><span style={s.muted}>{p.email}</span></td>
                        <td style={s.td}>{p.telephone || '—'}</td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
                            {sc.label}
                          </span>
                        </td>
                        <td style={s.td}>{p.date || '—'}</td>
                        <td style={s.td}>
                          <div style={s.actions}>
                            <ActionBtn
                              label="Voir"
                              color="#008339"
                              onClick={() => alert(`${p.prenom} ${p.nom}\n${p.email}`)}
                            />
                            <ActionBtn
                              label={p.statut === 'suspendu' ? 'Réactiver' : 'Suspendre'}
                              color="#f97316"
                              onClick={() => setModal({ type: 'suspendre', patient: p })}
                            />
                            <ActionBtn
                              label="Supprimer"
                              color="#ef4444"
                              onClick={() => setModal({ type: 'supprimer', patient: p })}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={s.pagination}>
              <PageBtn
                label="‹"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                active={false}
              />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <PageBtn key={n} label={n} onClick={() => setPage(n)} disabled={false} active={n === page} />
              ))}
              <PageBtn
                label="›"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                active={false}
              />
            </div>
          )}
        </div>
      </main>

      {/* MODAL CONFIRMATION */}
      {modal && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <div style={s.modalIcon}>
              {modal.type === 'supprimer' ? '🗑️' : '⛔'}
            </div>
            <h3 style={s.modalTitle}>
              {modal.type === 'supprimer' ? 'Supprimer le patient' : 'Suspendre / Réactiver'}
            </h3>
            <p style={s.modalText}>
              Voulez-vous vraiment <strong>{modal.type}</strong> le patient{' '}
              <strong>{modal.patient.prenom} {modal.patient.nom}</strong> ?
              {modal.type === 'supprimer' && (
                <span style={{ color: '#dc2626' }}> Cette action est irréversible.</span>
              )}
            </p>
            <div style={s.modalBtns}>
              <button
                style={s.btnCancel}
                onClick={() => setModal(null)}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                style={modal.type === 'supprimer' ? s.btnDanger : s.btnWarn}
                onClick={confirmAction}
                disabled={actionLoading}
              >
                {actionLoading
                  ? 'En cours…'
                  : modal.type === 'supprimer'
                    ? 'Supprimer'
                    : modal.patient.statut === 'suspendu' ? 'Réactiver' : 'Suspendre'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIconWrap, background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ ...s.actionBtn, background: color + '12', color, border: `1px solid ${color}30` }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = color + '12'; e.currentTarget.style.color = color; }}
    >
      {label}
    </button>
  );
}

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...s.pageBtn,
        ...(active   ? s.pageBtnActive   : {}),
        ...(disabled ? s.pageBtnDisabled : {}),
      }}
    >
      {label}
    </button>
  );
}

/* ── Utility ── */
function stringToColor(str = '') {
  const colors = ['#008339','#0ea5e9','#8b5cf6','#f59e0b','#ec4899','#06b6d4'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

/* ── Styles ── */
const s = {
  root: { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main: { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },

  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '28px' },
  statCard: { background: '#fff', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: '54px', height: '54px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  statValue:    { fontSize: '28px', fontWeight: '700', color: '#1f2937' },
  statLabel:    { fontSize: '13px', color: '#6b7280', marginTop: '2px' },

  card: { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },

  searchRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', gap: '16px' },
  searchBox:   { display: 'flex', alignItems: 'center', flex: 1, maxWidth: '440px', background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '0 14px' },
  searchIcon:  { fontSize: '16px', marginRight: '8px', color: '#9ca3af' },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: '14px', color: '#374151' },
  resultCount: { fontSize: '13px', color: '#9ca3af', whiteSpace: 'nowrap' },

  tableWrap: { overflowX: 'auto' },
  table:     { width: '100%', borderCollapse: 'collapse', minWidth: '750px' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td: { padding: '13px 16px', fontSize: '14px', color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  avatar:   { width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '13px' },
  fullName: { fontWeight: '600', color: '#1f2937' },
  muted:    { color: '#6b7280' },
  badge:    { padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' },

  actions:   { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  actionBtn: { padding: '5px 12px', borderRadius: '7px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s' },

  noData: { textAlign: 'center', padding: '48px', color: '#9ca3af', fontSize: '14px' },
  center: { textAlign: 'center', padding: '48px', color: '#9ca3af' },

  pagination:      { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f0f0f0' },
  pageBtn:         { minWidth: '36px', height: '36px', borderRadius: '8px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '14px', fontWeight: '500', cursor: 'pointer' },
  pageBtnActive:   { background: '#008339', borderColor: '#008339', color: '#fff', fontWeight: '700' },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal: { background: '#fff', borderRadius: '20px', padding: '36px 32px', width: '100%', maxWidth: '420px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalIcon:  { fontSize: '44px', marginBottom: '16px' },
  modalTitle: { fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: '0 0 12px' },
  modalText:  { fontSize: '14px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 28px' },
  modalBtns:  { display: 'flex', gap: '12px', justifyContent: 'center' },
  btnCancel:  { padding: '11px 24px', borderRadius: '10px', border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnDanger:  { padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#ef4444', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  btnWarn:    { padding: '11px 24px', borderRadius: '10px', border: 'none', background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
};