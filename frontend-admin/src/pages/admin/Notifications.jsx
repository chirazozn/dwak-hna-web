import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';
const API      = 'http://127.0.0.1:5000/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const emptyForm = {
  titre: '', corps: '', type: 'tous',
  patient_id: '', pharmacie_id: '',
};

const TYPE_CONFIG = {
  patient:   { bg: '#dbeafe', color: '#1d4ed8', label: '👤 Patient'   },
  pharmacie: { bg: '#fce7f3', color: '#9d174d', label: '🏥 Pharmacie' },
  tous:      { bg: '#dcfce7', color: '#15803d', label: '📢 Tous'      },
};

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [stats,         setStats]         = useState({ total: 0, patients: 0, pharmacies: 0, tous: 0 });
  const [loading,       setLoading]       = useState(false);
  const [showForm,      setShowForm]      = useState(false);
  const [form,          setForm]          = useState(emptyForm);
  const [message,       setMessage]       = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [modal,         setModal]         = useState({ show: false, notif: null });

  // Search states
  const [searchPatient,   setSearchPatient]   = useState('');
  const [searchPharmacie, setSearchPharmacie] = useState('');
  const [resultsPatient,  setResultsPatient]  = useState([]);
  const [resultsPharmacie,setResultsPharmacie]= useState([]);
  const [selectedPatient,  setSelectedPatient]  = useState(null);
  const [selectedPharmacie,setSelectedPharmacie]= useState(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/notifications`, { headers: headers() });
      setNotifications(res.data.notifications);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const searchPatients = async (val) => {
    setSearchPatient(val);
    if (val.length < 2) { setResultsPatient([]); return; }
    try {
      const res = await axios.get(`${API}/search/patients`, {
        params: { search: val }, headers: headers()
      });
      setResultsPatient(res.data.results);
    } catch (err) { console.error(err); }
  };

  const searchPharmacies = async (val) => {
    setSearchPharmacie(val);
    if (val.length < 2) { setResultsPharmacie([]); return; }
    try {
      const res = await axios.get(`${API}/search/pharmacies`, {
        params: { search: val }, headers: headers()
      });
      setResultsPharmacie(res.data.results);
    } catch (err) { console.error(err); }
  };

  const handleTypeChange = (type) => {
    setForm({ ...form, type, patient_id: '', pharmacie_id: '' });
    setSelectedPatient(null);
    setSelectedPharmacie(null);
    setSearchPatient('');
    setSearchPharmacie('');
    setResultsPatient([]);
    setResultsPharmacie([]);
  };

  const handleSubmit = async () => {
    if (!form.titre) { showMessage('Le titre est obligatoire', 'error'); return; }
    if (!form.corps) { showMessage('Le message est obligatoire', 'error'); return; }
    setActionLoading(true);
    try {
      await axios.post(`${API}/notifications`, form, { headers: headers() });
      showMessage('Notification envoyée avec succès', 'success');
      setShowForm(false);
      setForm(emptyForm);
      setSelectedPatient(null);
      setSelectedPharmacie(null);
      fetchNotifications();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/notifications/${modal.notif.notif_admin_id}`, { headers: headers() });
      showMessage('Notification supprimée avec succès', 'success');
      setModal({ show: false, notif: null });
      fetchNotifications();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const destinataireLabel = (n) => {
    if (n.type === 'tous') return '📢 Tous les utilisateurs';
    if (n.type === 'patient') {
      return n.patient_id
        ? `👤 ${n.patient_nom}`
        : '👥 Tous les patients';
    }
    if (n.type === 'pharmacie') {
      return n.pharmacie_id
        ? `🏥 ${n.pharmacie_nom}`
        : '🏥 Toutes les pharmacies';
    }
    return '—';
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Notifications" />
      <main style={s.main}>

        {/* MESSAGE */}
        {message.text && (
          <div style={{
            ...s.message,
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color:      message.type === 'success' ? '#065f46' : '#dc2626',
          }}>
            {message.text}
          </div>
        )}

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <StatCard icon="🔔" label="Total envoyées" value={stats.total}      accent="#008339" />
          <StatCard icon="👤" label="Patients"        value={stats.patients}   accent="#1d4ed8" />
          <StatCard icon="🏥" label="Pharmacies"      value={stats.pharmacies} accent="#9d174d" />
          <StatCard icon="📢" label="Tous"            value={stats.tous}       accent="#f59e0b" />
        </div>

        {/* FORMULAIRE ENVOI */}
        {showForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>📨 Nouvelle notification</h3>

            {/* TYPE */}
            <div style={s.formGroup}>
              <label style={s.label}>Destinataire *</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { value: 'tous',      label: '📢 Tous'           },
                  { value: 'patient',   label: '👤 Patient(s)'     },
                  { value: 'pharmacie', label: '🏥 Pharmacie(s)'   },
                ].map(t => (
                  <button key={t.value}
                    onClick={() => handleTypeChange(t.value)}
                    style={{
                      padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
                      border: form.type === t.value ? '2px solid #008339' : '1.5px solid #e5e7eb',
                      background: form.type === t.value ? '#e6f4ec' : '#fff',
                      fontWeight: 600, fontSize: 13,
                      color: form.type === t.value ? '#008339' : '#6b7280',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PATIENT SEARCH */}
            {form.type === 'patient' && (
              <div style={s.formGroup}>
                <label style={s.label}>
                  Patient spécifique <span style={{ color: '#9ca3af', fontWeight: 400 }}>(laisser vide = tous les patients)</span>
                </label>
                {selectedPatient ? (
                  <div style={s.selectedItem}>
                    <span>👤 {selectedPatient.label}</span>
                    <button onClick={() => {
                      setSelectedPatient(null);
                      setForm({ ...form, patient_id: '' });
                      setSearchPatient('');
                    }} style={s.clearBtn}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={searchPatient}
                      onChange={e => searchPatients(e.target.value)}
                      placeholder="Rechercher un patient par nom ou email..."
                      style={s.input}
                    />
                    {resultsPatient.length > 0 && (
                      <div style={s.dropdown}>
                        {resultsPatient.map(r => (
                          <div key={r.id} style={s.dropdownItem}
                            onClick={() => {
                              setSelectedPatient(r);
                              setForm({ ...form, patient_id: r.id });
                              setResultsPatient([]);
                              setSearchPatient('');
                            }}>
                            👤 {r.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PHARMACIE SEARCH */}
            {form.type === 'pharmacie' && (
              <div style={s.formGroup}>
                <label style={s.label}>
                  Pharmacie spécifique <span style={{ color: '#9ca3af', fontWeight: 400 }}>(laisser vide = toutes les pharmacies)</span>
                </label>
                {selectedPharmacie ? (
                  <div style={s.selectedItem}>
                    <span>🏥 {selectedPharmacie.label}</span>
                    <button onClick={() => {
                      setSelectedPharmacie(null);
                      setForm({ ...form, pharmacie_id: '' });
                      setSearchPharmacie('');
                    }} style={s.clearBtn}>✕</button>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={searchPharmacie}
                      onChange={e => searchPharmacies(e.target.value)}
                      placeholder="Rechercher une pharmacie par nom ou email..."
                      style={s.input}
                    />
                    {resultsPharmacie.length > 0 && (
                      <div style={s.dropdown}>
                        {resultsPharmacie.map(r => (
                          <div key={r.id} style={s.dropdownItem}
                            onClick={() => {
                              setSelectedPharmacie(r);
                              setForm({ ...form, pharmacie_id: r.id });
                              setResultsPharmacie([]);
                              setSearchPharmacie('');
                            }}>
                            🏥 {r.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TITRE */}
            <div style={s.formGroup}>
              <label style={s.label}>Titre *</label>
              <input type="text" value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                placeholder="Titre de la notification"
                style={s.input} />
            </div>

            {/* MESSAGE */}
            <div style={s.formGroup}>
              <label style={s.label}>Message *</label>
              <textarea value={form.corps}
                onChange={e => setForm({ ...form, corps: e.target.value })}
                placeholder="Contenu de la notification..."
                rows={4}
                style={{ ...s.input, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => { setShowForm(false); setForm(emptyForm); }}
                style={s.btnCancel} disabled={actionLoading}>
                Annuler
              </button>
              <button onClick={handleSubmit} style={s.btnConfirm} disabled={actionLoading}>
                {actionLoading ? 'Envoi en cours...' : '📨 Envoyer'}
              </button>
            </div>
          </div>
        )}

        {/* TABLE CARD */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Historique des notifications</h3>
            {!showForm && (
              <button onClick={() => setShowForm(true)} style={s.btnAdd}>
                + Nouvelle notification
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Type', 'Destinataire', 'Titre', 'Message', 'Date', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={s.center}>Chargement...</td></tr>
                ) : notifications.length === 0 ? (
                  <tr><td colSpan={6} style={s.center}>Aucune notification envoyée</td></tr>
                ) : notifications.map((n, i) => {
                  const tc = TYPE_CONFIG[n.type] || TYPE_CONFIG.tous;
                  return (
                    <tr key={n.notif_admin_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={s.muted}>{destinataireLabel(n)}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.nom}>{n.titre}</span>
                      </td>
                      <td style={s.td}>
                        <span style={s.muted}>
                          {n.corps.length > 60 ? n.corps.substring(0, 60) + '...' : n.corps}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={s.muted}>{n.date}</span>
                      </td>
                      <td style={s.td}>
                        <ActionBtn
                          label="Supprimer"
                          color="#ef4444"
                          onClick={() => setModal({ show: true, notif: n })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL SUPPRESSION */}
      {modal.show && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, notif: null })}>
          <div style={{ ...s.modalBox, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={s.modalTitle}>Supprimer la notification</h3>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>
              Voulez-vous supprimer la notification <strong>"{modal.notif?.titre}"</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, notif: null })}
                style={s.btnCancel} disabled={actionLoading}>
                Annuler
              </button>
              <button onClick={handleDelete}
                style={{ ...s.btnConfirm, background: '#ef4444' }} disabled={actionLoading}>
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
function StatCard({ icon, label, value, accent }) {
  return (
    <div style={s.statCard}>
      <div style={{ ...s.statIconWrap, background: accent + '18', color: accent }}>{icon}</div>
      <div>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
      </div>
    </div>
  );
}

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

/* ── Styles ── */
const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },
  message: { padding: '12px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600 },

  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
  statCard:     { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  statValue:    { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 13, color: '#6b7280', marginTop: 2 },

  formCard:  { background: '#fff', borderRadius: 16, padding: 28, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', marginBottom: 24 },
  formTitle: { fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 20 },
  formGroup: { marginBottom: 16 },
  label:     { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:     { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },

  selectedItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#e6f4ec', borderRadius: 8, border: '1.5px solid #008339' },
  clearBtn:     { background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700, fontSize: 16 },

  dropdown:     { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' },
  dropdownItem: { padding: '10px 14px', cursor: 'pointer', fontSize: 14, color: '#374151', borderBottom: '1px solid #f3f4f6' },

  card:       { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937' },
  btnAdd:     { padding: '12px 24px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  nom:       { fontWeight: 600, color: '#1f2937' },
  muted:     { color: '#6b7280', fontSize: 13 },
  badge:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:   { display: 'flex', gap: 6 },
  actionBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },

  center: { textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 420, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 12 },
  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};