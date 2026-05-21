import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const emptyForm = { nom: '', site_web: '', description: '' };

export default function AdminPartenaires() {
  const [partenaires,   setPartenaires]   = useState([]);
  const [total,         setTotal]         = useState(0);
  const [actifs,        setActifs]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState({ show: false, type: '', partenaire: null });
  const [form,          setForm]          = useState(emptyForm);
  const [toast,         setToast]         = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPartenaires = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/partenaires`, { headers: headers() });
      setPartenaires(res.data.partenaires);
      setTotal(res.data.total);
      setActifs(res.data.actifs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPartenaires(); }, [fetchPartenaires]);

  const showMessage = (text, type) => setToast({ text, type });

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ show: true, type: 'form', partenaire: null });
  };

  const openEdit = (p) => {
    setForm({ nom: p.nom, site_web: p.site_web, description: p.description });
    setModal({ show: true, type: 'form', partenaire: p });
  };

  const handleSubmit = async () => {
    if (!form.nom) { showMessage('Le nom est obligatoire', 'error'); return; }
    setActionLoading(true);
    try {
      if (modal.partenaire) {
        await axios.put(
          `${API}/partenaires/${modal.partenaire.partenaire_id}`,
          form,
          { headers: headers() }
        );
        showMessage('Partenaire modifié avec succès', 'success');
      } else {
        await axios.post(`${API}/partenaires`, form, { headers: headers() });
        showMessage('Partenaire ajouté avec succès', 'success');
      }
      setModal({ show: false, type: '', partenaire: null });
      fetchPartenaires();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await axios.put(
        `${API}/partenaires/${p.partenaire_id}/toggle`,
        {},
        { headers: headers() }
      );
      showMessage('Statut mis à jour avec succès', 'success');
      fetchPartenaires();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(
        `${API}/partenaires/${modal.partenaire.partenaire_id}`,
        { headers: headers() }
      );
      showMessage('Partenaire supprimé avec succès', 'success');
      setModal({ show: false, type: '', partenaire: null });
      fetchPartenaires();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Partenaires" />

      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <div style={s.statCard}>
            <div style={{ ...s.statIconWrap, background: '#008339' + '18', color: '#008339' }}>🤝</div>
            <div>
              <div style={s.statValue}>{total}</div>
              <div style={s.statLabel}>Total Partenaires</div>
            </div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statIconWrap, background: '#15803d' + '18', color: '#15803d' }}>✅</div>
            <div>
              <div style={s.statValue}>{actifs}</div>
              <div style={s.statLabel}>Partenaires Actifs</div>
            </div>
          </div>
          <div style={s.statCard}>
            <div style={{ ...s.statIconWrap, background: '#c2410c' + '18', color: '#c2410c' }}>⛔</div>
            <div>
              <div style={s.statValue}>{total - actifs}</div>
              <div style={s.statLabel}>Partenaires Inactifs</div>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>

          {/* HEADER */}
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Liste des partenaires</h3>
            <button onClick={openAdd} style={s.btnAdd}>
              + Ajouter partenaire
            </button>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Logo', 'Nom', 'Site Web', 'Description', 'Publicités', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={s.center}>Chargement...</td></tr>
                ) : partenaires.length === 0 ? (
                  <tr><td colSpan={8} style={s.center}>Aucun partenaire trouvé</td></tr>
                ) : partenaires.map((p, i) => (
                  <tr key={p.partenaire_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                    <td style={s.td}>
                      <div style={{ ...s.avatar, background: stringToColor(p.nom) }}>
                        {p.nom.charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td style={s.td}><span style={s.nom}>{p.nom}</span></td>
                    <td style={s.td}>
                      {p.site_web ? (
                        <a href={p.site_web} target="_blank" rel="noreferrer"
                          style={{ color: '#008339', fontWeight: 600, fontSize: 13 }}>
                          {p.site_web.replace('https://', '').replace('http://', '')}
                        </a>
                      ) : '—'}
                    </td>
                    <td style={s.td}>
                      <span style={s.muted}>
                        {p.description
                          ? p.description.substring(0, 50) + (p.description.length > 50 ? '...' : '')
                          : '—'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.nb_publicites > 0 ? '#dbeafe' : '#f3f4f6',
                        color:      p.nb_publicites > 0 ? '#1d4ed8' : '#6b7280',
                      }}>
                        📢 {p.nb_publicites} pub{p.nb_publicites > 1 ? 's' : ''}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.est_actif ? '#dcfce7' : '#fee2e2',
                        color:      p.est_actif ? '#15803d' : '#dc2626',
                      }}>
                        {p.est_actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={s.td}><span style={s.muted}>{p.date}</span></td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <ActionBtn label="Modifier" color="#3b82f6" onClick={() => openEdit(p)} />
                        <ActionBtn
                          label={p.est_actif ? 'Désactiver' : 'Activer'}
                          color="#f59e0b"
                          onClick={() => handleToggle(p)}
                        />
                        <ActionBtn
                          label="Supprimer"
                          color="#ef4444"
                          onClick={() => setModal({ show: true, type: 'supprimer', partenaire: p })}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL FORMULAIRE */}
      {modal.show && modal.type === 'form' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', partenaire: null })}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {modal.partenaire ? '✏️ Modifier le partenaire' : '➕ Ajouter un partenaire'}
            </h3>

            {[
              { label: 'Nom *',    key: 'nom',      placeholder: 'ex: Saidal'              },
              { label: 'Site Web', key: 'site_web', placeholder: 'https://www.exemple.com' },
            ].map(field => (
              <div key={field.key} style={s.formGroup}>
                <label style={s.label}>{field.label}</label>
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={s.input}
                />
              </div>
            ))}

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description du partenaire..."
                rows={3}
                style={{ ...s.input, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => setModal({ show: false, type: '', partenaire: null })}
                style={s.btnCancel}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button onClick={handleSubmit} style={s.btnConfirm} disabled={actionLoading}>
                {actionLoading ? 'En cours...' : modal.partenaire ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {modal.show && modal.type === 'supprimer' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', partenaire: null })}>
          <div style={{ ...s.modal, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={s.modalTitle}>Supprimer le partenaire</h3>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>
              Êtes-vous sûr de vouloir supprimer <strong>{modal.partenaire?.nom}</strong> ?
              {modal.partenaire?.nb_publicites > 0 && (
                <span style={{ color: '#dc2626', display: 'block', marginTop: 8 }}>
                  ⚠️ Ce partenaire a {modal.partenaire.nb_publicites} publicité(s) associée(s).
                </span>
              )}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setModal({ show: false, type: '', partenaire: null })}
                style={s.btnCancel}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                style={{ ...s.btnConfirm, background: '#ef4444' }}
                disabled={actionLoading}
              >
                {actionLoading ? 'En cours...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ ...s.actionBtn, background: color + '12', color, border: `1px solid ${color}30` }}
      onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = '#fff'; }}
      onMouseLeave={e => { e.currentTarget.style.background = color + '12'; e.currentTarget.style.color = color; }}>
      {label}
    </button>
  );
}

/* ── Utility ── */
function stringToColor(str = '') {
  const colors = ['#008339', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

/* ── Styles ── */
const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },

  statsRow:     { display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap' },
  statCard:     { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', flex: 1, minWidth: 180 },
  statIconWrap: { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  statValue:    { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 13, color: '#6b7280', marginTop: 2 },

  card:       { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937' },
  btnAdd:     { padding: '12px 24px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  avatar:    { width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 },
  nom:       { fontWeight: 600, color: '#1f2937' },
  muted:     { color: '#6b7280' },
  badge:     { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:   { display: 'flex', gap: 6, flexWrap: 'wrap' },
  actionBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },

  center: { textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modal:      { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 },
  formGroup:  { marginBottom: 16 },
  label:      { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:      { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
