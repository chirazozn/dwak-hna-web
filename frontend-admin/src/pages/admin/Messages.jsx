import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';
const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const emptyForm = { contenu: '', type: 'pharmacie_reponse' };

const TYPE_CONFIG = {
  pharmacie_reponse: { bg: '#fce7f3', color: '#9d174d', label: '🏥 Réponse Pharmacie' },
  patient_demande:   { bg: '#dbeafe', color: '#1d4ed8', label: '👤 Note Patient'       },
};

export default function AdminMessages() {
  const [messages,      setMessages]      = useState([]);
  const [stats,         setStats]         = useState({ total: 0, pharmacie: 0, patient: 0, actifs: 0 });
  const [filtre,        setFiltre]        = useState('tous');
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState({ show: false, type: '', message: null });
  const [form,          setForm]          = useState(emptyForm);
  const [msgFeedback,   setMsgFeedback]   = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const params = filtre !== 'tous' ? { type: filtre } : {};
      const res = await axios.get(`${API}/messages`, { params, headers: headers() });
      setMessages(res.data.messages);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filtre]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const showFeedback = (text, type) => {
    setMsgFeedback({ text, type });
    setTimeout(() => setMsgFeedback({ text: '', type: '' }), 3000);
  };

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ show: true, type: 'form', message: null });
  };

  const openEdit = (m) => {
    setForm({ contenu: m.contenu, type: m.type });
    setModal({ show: true, type: 'form', message: m });
  };

  const handleSubmit = async () => {
    if (!form.contenu.trim()) { showFeedback('Le contenu est obligatoire', 'error'); return; }
    setActionLoading(true);
    try {
      if (modal.message) {
        await axios.put(`${API}/messages/${modal.message.message_id}`, form, { headers: headers() });
        showFeedback('Message modifié avec succès', 'success');
      } else {
        await axios.post(`${API}/messages`, form, { headers: headers() });
        showFeedback('Message créé avec succès', 'success');
      }
      setModal({ show: false, type: '', message: null });
      fetchMessages();
    } catch (err) {
      showFeedback('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (m) => {
    try {
      await axios.put(`${API}/messages/${m.message_id}/toggle`, {}, { headers: headers() });
      showFeedback('Statut mis à jour', 'success');
      fetchMessages();
    } catch (err) {
      showFeedback('Une erreur est survenue', 'error');
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/messages/${modal.message.message_id}`, { headers: headers() });
      showFeedback('Message supprimé avec succès', 'success');
      setModal({ show: false, type: '', message: null });
      fetchMessages();
    } catch (err) {
      showFeedback('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const pharmacieMessages = messages.filter(m => m.type === 'pharmacie_reponse');
  const patientMessages   = messages.filter(m => m.type === 'patient_demande');
  const displayMessages   = filtre === 'pharmacie_reponse' ? pharmacieMessages
                          : filtre === 'patient_demande'   ? patientMessages
                          : messages;

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Messages Prédéfinis" />
      <main style={s.main}>

        {/* FEEDBACK */}
        {msgFeedback.text && (
          <div style={{
            ...s.feedback,
            background: msgFeedback.type === 'success' ? '#d1fae5' : '#fee2e2',
            color:      msgFeedback.type === 'success' ? '#065f46' : '#dc2626',
          }}>
            {msgFeedback.text}
          </div>
        )}

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <StatCard icon="💬" label="Total"            value={stats.total}    accent="#008339" />
          <StatCard icon="🏥" label="Réponses Pharmacie" value={stats.pharmacie} accent="#9d174d" />
          <StatCard icon="👤" label="Notes Patient"    value={stats.patient}  accent="#1d4ed8" />
          <StatCard icon="✅" label="Actifs"           value={stats.actifs}   accent="#15803d" />
        </div>

        {/* 2 COLONNES */}
        <div style={s.columnsRow}>

          {/* COLONNE PHARMACIE */}
          <div style={s.column}>
            <div style={s.columnHeader}>
              <div>
                <h3 style={s.columnTitle}>🏥 Réponses Pharmacie</h3>
                <p style={s.columnSub}>Affichés lors d'acceptation/refus d'une demande</p>
              </div>
              <button onClick={() => { setForm({ contenu: '', type: 'pharmacie_reponse' }); setModal({ show: true, type: 'form', message: null }); }}
                style={s.btnAdd}>
                + Ajouter
              </button>
            </div>

            <div style={s.messagesList}>
              {loading ? (
                <div style={s.center}>Chargement...</div>
              ) : pharmacieMessages.length === 0 ? (
                <div style={s.center}>Aucun message</div>
              ) : pharmacieMessages.map(m => (
                <MessageItem
                  key={m.message_id}
                  message={m}
                  onEdit={() => openEdit(m)}
                  onToggle={() => handleToggle(m)}
                  onDelete={() => setModal({ show: true, type: 'supprimer', message: m })}
                />
              ))}
            </div>
          </div>

          {/* COLONNE PATIENT */}
          <div style={s.column}>
            <div style={s.columnHeader}>
              <div>
                <h3 style={s.columnTitle}>👤 Notes Patient</h3>
                <p style={s.columnSub}>Affichés lors de l'envoi d'une demande</p>
              </div>
              <button onClick={() => { setForm({ contenu: '', type: 'patient_demande' }); setModal({ show: true, type: 'form', message: null }); }}
                style={s.btnAdd}>
                + Ajouter
              </button>
            </div>

            <div style={s.messagesList}>
              {loading ? (
                <div style={s.center}>Chargement...</div>
              ) : patientMessages.length === 0 ? (
                <div style={s.center}>Aucun message</div>
              ) : patientMessages.map(m => (
                <MessageItem
                  key={m.message_id}
                  message={m}
                  onEdit={() => openEdit(m)}
                  onToggle={() => handleToggle(m)}
                  onDelete={() => setModal({ show: true, type: 'supprimer', message: m })}
                />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL FORMULAIRE */}
      {modal.show && modal.type === 'form' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', message: null })}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {modal.message ? '✏️ Modifier le message' : '➕ Ajouter un message'}
            </h3>

            <div style={s.formGroup}>
              <label style={s.label}>Type *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'pharmacie_reponse', label: '🏥 Réponse Pharmacie' },
                  { value: 'patient_demande',   label: '👤 Note Patient'      },
                ].map(t => (
                  <button key={t.value}
                    onClick={() => setForm({ ...form, type: t.value })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
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

            <div style={s.formGroup}>
              <label style={s.label}>Contenu *</label>
              <input
                type="text"
                value={form.contenu}
                onChange={e => setForm({ ...form, contenu: e.target.value })}
                placeholder={form.type === 'pharmacie_reponse'
                  ? 'ex: Disponible en générique'
                  : 'ex: Urgent !'}
                style={s.input}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal({ show: false, type: '', message: null })}
                style={s.btnCancel} disabled={actionLoading}>
                Annuler
              </button>
              <button onClick={handleSubmit} style={s.btnConfirm} disabled={actionLoading}>
                {actionLoading ? 'En cours...' : modal.message ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {modal.show && modal.type === 'supprimer' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', message: null })}>
          <div style={{ ...s.modalBox, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={s.modalTitle}>Supprimer le message</h3>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>
              Supprimer <strong>"{modal.message?.contenu}"</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, type: '', message: null })}
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

/* ── MessageItem ── */
function MessageItem({ message, onEdit, onToggle, onDelete }) {
  const tc = TYPE_CONFIG[message.type] || TYPE_CONFIG.pharmacie_reponse;
  return (
    <div style={{
      ...s.messageItem,
      opacity: message.est_actif ? 1 : 0.6,
      borderLeft: `4px solid ${message.est_actif ? '#008339' : '#e5e7eb'}`,
    }}>
      <div style={s.messageContent}>
        <span style={s.messageText}>{message.contenu}</span>
        <span style={{ ...s.badge, background: message.est_actif ? '#dcfce7' : '#fee2e2', color: message.est_actif ? '#15803d' : '#dc2626' }}>
          {message.est_actif ? 'Actif' : 'Inactif'}
        </span>
      </div>
      <div style={s.messageActions}>
        <ActionBtn label="✏️" color="#3b82f6" onClick={onEdit}   title="Modifier"           />
        <ActionBtn label={message.est_actif ? '⏸️' : '▶️'} color="#f59e0b" onClick={onToggle} title="Activer/Désactiver" />
        <ActionBtn label="🗑️" color="#ef4444" onClick={onDelete} title="Supprimer"           />
      </div>
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

function ActionBtn({ label, color, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
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
  feedback:{ padding: '12px 20px', borderRadius: 10, marginBottom: 20, fontWeight: 600 },

  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
  statCard:     { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  statValue:    { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 13, color: '#6b7280', marginTop: 2 },

  columnsRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  column:     { flex: 1, minWidth: 300, background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },

  columnHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  columnTitle:  { fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 4 },
  columnSub:    { fontSize: 12, color: '#9ca3af' },
  btnAdd:       { padding: '8px 16px', background: '#008339', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  messagesList: { display: 'flex', flexDirection: 'column', gap: 8 },
  messageItem:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 10, gap: 12 },
  messageContent: { display: 'flex', alignItems: 'center', gap: 10, flex: 1 },
  messageText:  { fontSize: 14, color: '#1f2937', fontWeight: 500, flex: 1 },
  messageActions: { display: 'flex', gap: 4 },

  badge:     { padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  actionBtn: { padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', border: 'none' },

  center: { textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 480, boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 },
  formGroup:  { marginBottom: 16 },
  label:      { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:      { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
