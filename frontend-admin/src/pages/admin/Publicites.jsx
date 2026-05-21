import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const PUBS_API = `${API}/pubs`;
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const emptyForm = {
  titre: '', image_url: '', lien_cible: '',
  proprietaire: 'plateforme', partenaire_id: '',
  date_debut: '', date_fin: '', est_active: true, position: 0,
  emplacement_pharmacie: false,
  emplacement_patient_accueil: false,
  emplacement_patient_store: false,
};

export default function AdminPublicites() {
  const [publicites,    setPublicites]    = useState([]);
  const [stats,         setStats]         = useState({ total: 0, actives: 0, plateforme: 0, partenaire: 0 });
  const [partenaires,   setPartenaires]   = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState({ show: false, type: '', publicite: null });
  const [form,          setForm]          = useState(emptyForm);
  const [toast,         setToast]         = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchPublicites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(PUBS_API, { headers: headers() });
      setPublicites(res.data.publicites);
      setStats(res.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPartenaires = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/partenaires`, { headers: headers() });
      setPartenaires(res.data.partenaires.filter(p => p.est_actif));
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchPublicites();
    fetchPartenaires();
  }, [fetchPublicites, fetchPartenaires]);

  const showMessage = (text, type) => setToast({ text, type });

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ show: true, type: 'form', publicite: null });
  };

  const openEdit = (p) => {
    setForm({
      titre:                       p.titre,
      image_url:                   p.image_url,
      lien_cible:                  p.lien_cible,
      proprietaire:                p.proprietaire,
      partenaire_id:               p.partenaire_id || '',
      date_debut:                  p.date_debut,
      date_fin:                    p.date_fin,
      est_active:                  p.est_active,
      position:                    p.position,
      emplacement_pharmacie:       p.emplacement_pharmacie,
      emplacement_patient_accueil: p.emplacement_patient_accueil,
      emplacement_patient_store:   p.emplacement_patient_store,
    });
    setModal({ show: true, type: 'form', publicite: p });
  };

  const handleSubmit = async () => {
    if (!form.titre)      { showMessage('Le titre est obligatoire', 'error');         return; }
    if (!form.date_debut) { showMessage('La date de début est obligatoire', 'error'); return; }
    if (!form.date_fin)   { showMessage('La date de fin est obligatoire', 'error');   return; }
    if (!form.emplacement_pharmacie && !form.emplacement_patient_accueil && !form.emplacement_patient_store) {
      showMessage('Choisissez au moins un emplacement', 'error'); return;
    }
    setActionLoading(true);
    try {
      const payload = {
        ...form,
        partenaire_id: form.proprietaire === 'partenaire' ? form.partenaire_id : null,
      };
      if (modal.publicite) {
        await axios.put(`${PUBS_API}/${modal.publicite.publicite_id}`, payload, { headers: headers() });
        showMessage('Publicité modifiée avec succès', 'success');
      } else {
        await axios.post(PUBS_API, payload, { headers: headers() });
        showMessage('Publicité créée avec succès', 'success');
      }
      setModal({ show: false, type: '', publicite: null });
      fetchPublicites();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await axios.put(`${PUBS_API}/${p.publicite_id}/toggle`, {}, { headers: headers() });
      showMessage('Statut mis à jour avec succès', 'success');
      fetchPublicites();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${PUBS_API}/${modal.publicite.publicite_id}`, { headers: headers() });
      showMessage('Publicité supprimée avec succès', 'success');
      setModal({ show: false, type: '', publicite: null });
      fetchPublicites();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const emplacementLabels = (p) => {
    const locs = [];
    if (p.emplacement_pharmacie)       locs.push('Pharmacie');
    if (p.emplacement_patient_accueil) locs.push('Accueil');
    if (p.emplacement_patient_store)   locs.push('Boutique');
    return locs;
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Publicités" />

      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <StatCard icon="📢" label="Total"       value={stats.total}      accent="#008339" />
          <StatCard icon="✅" label="Actives"     value={stats.actives}    accent="#15803d" />
          <StatCard icon="🏢" label="Plateforme"  value={stats.plateforme} accent="#1d4ed8" />
          <StatCard icon="🤝" label="Partenaires" value={stats.partenaire} accent="#9d174d" />
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardTitle}>Liste des publicités</h3>
            <button onClick={openAdd} style={s.btnAdd}>+ Ajouter publicité</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Aperçu', 'Titre', 'Propriétaire', 'Emplacements', 'Période', 'Position', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={s.center}>Chargement...</td></tr>
                ) : publicites.length === 0 ? (
                  <tr><td colSpan={8} style={s.center}>Aucune publicité trouvée</td></tr>
                ) : publicites.map((p, i) => (
                  <tr key={p.publicite_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                    <td style={s.td}>
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.titre}
                          style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6 }}
                          onError={e => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: 60, height: 40, background: '#f3f4f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                          📢
                        </div>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={s.nom}>{p.titre}</span>
                      {p.lien_cible && (
                        <a href={p.lien_cible} target="_blank" rel="noreferrer"
                          style={{ display: 'block', fontSize: 11, color: '#008339', marginTop: 2 }}>
                          🔗 {p.lien_cible.substring(0, 30)}...
                        </a>
                      )}
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.proprietaire === 'plateforme' ? '#dbeafe' : '#fce7f3',
                        color:      p.proprietaire === 'plateforme' ? '#1d4ed8' : '#9d174d',
                      }}>
                        {p.proprietaire === 'plateforme' ? '🏢 Plateforme' : `🤝 ${p.partenaire_nom}`}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {emplacementLabels(p).map(loc => (
                          <span key={loc} style={{ ...s.badge, background: '#e6f4ec', color: '#008339', fontSize: 11 }}>
                            {loc}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={s.td}>
                      <span style={s.muted}>
                        {p.date_debut}<br />→ {p.date_fin}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, background: '#f3f4f6', color: '#374151' }}>
                        #{p.position}
                      </span>
                    </td>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: p.est_active ? '#dcfce7' : '#fee2e2',
                        color:      p.est_active ? '#15803d' : '#dc2626',
                      }}>
                        {p.est_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.actions}>
                        <ActionBtn label="Modifier" color="#3b82f6" onClick={() => openEdit(p)} />
                        <ActionBtn
                          label={p.est_active ? 'Désactiver' : 'Activer'}
                          color="#f59e0b"
                          onClick={() => handleToggle(p)}
                        />
                        <ActionBtn
                          label="Supprimer"
                          color="#ef4444"
                          onClick={() => setModal({ show: true, type: 'supprimer', publicite: p })}
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
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', publicite: null })}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {modal.publicite ? '✏️ Modifier la publicité' : '➕ Ajouter une publicité'}
            </h3>

            <div style={s.formGroup}>
              <label style={s.label}>Titre *</label>
              <input type="text" value={form.titre}
                onChange={e => setForm({ ...form, titre: e.target.value })}
                placeholder="Titre de la publicité"
                style={s.input} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>URL de l'image</label>
              <input type="text" value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://exemple.com/image.jpg"
                style={s.input} />
              {form.image_url && (
                <img src={form.image_url} alt="aperçu"
                  style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              )}
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Lien au clic</label>
              <input type="text" value={form.lien_cible}
                onChange={e => setForm({ ...form, lien_cible: e.target.value })}
                placeholder="https://exemple.com"
                style={s.input} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Propriétaire *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'plateforme', label: '🏢 Plateforme' },
                  { value: 'partenaire', label: '🤝 Partenaire' },
                ].map(t => (
                  <button key={t.value}
                    onClick={() => setForm({ ...form, proprietaire: t.value, partenaire_id: '' })}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                      border: form.proprietaire === t.value ? '2px solid #008339' : '1.5px solid #e5e7eb',
                      background: form.proprietaire === t.value ? '#e6f4ec' : '#fff',
                      fontWeight: 600, fontSize: 13,
                      color: form.proprietaire === t.value ? '#008339' : '#6b7280',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {form.proprietaire === 'partenaire' && (
              <div style={s.formGroup}>
                <label style={s.label}>Choisir le partenaire *</label>
                <select value={form.partenaire_id}
                  onChange={e => setForm({ ...form, partenaire_id: e.target.value })}
                  style={s.input}>
                  <option value="">-- Sélectionner --</option>
                  {partenaires.map(p => (
                    <option key={p.partenaire_id} value={p.partenaire_id}>{p.nom}</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Date début *</label>
                <input type="date" value={form.date_debut}
                  onChange={e => setForm({ ...form, date_debut: e.target.value })}
                  style={s.input} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={s.label}>Date fin *</label>
                <input type="date" value={form.date_fin}
                  onChange={e => setForm({ ...form, date_fin: e.target.value })}
                  style={s.input} />
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Position (ordre d'affichage)</label>
              <input type="number" value={form.position} min={0}
                onChange={e => setForm({ ...form, position: parseInt(e.target.value) || 0 })}
                style={s.input} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Emplacements * (au moins 1)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'emplacement_pharmacie',       label: '🏥 Interface Pharmacie'      },
                  { key: 'emplacement_patient_accueil', label: '🏠 Accueil Patient (Mobile)'  },
                  { key: 'emplacement_patient_store',   label: '🛍️ Boutique Patient (Mobile)' },
                ].map(emp => (
                  <label key={emp.key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form[emp.key]}
                      onChange={e => setForm({ ...form, [emp.key]: e.target.checked })}
                      style={{ width: 16, height: 16 }}
                    />
                    <span style={{ fontSize: 14, color: '#374151', fontWeight: 500 }}>{emp.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div style={{ ...s.formGroup, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" id="est_active" checked={form.est_active}
                onChange={e => setForm({ ...form, est_active: e.target.checked })}
                style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <label htmlFor="est_active" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Publicité active
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal({ show: false, type: '', publicite: null })}
                style={s.btnCancel} disabled={actionLoading}>
                Annuler
              </button>
              <button onClick={handleSubmit} style={s.btnConfirm} disabled={actionLoading}>
                {actionLoading ? 'En cours...' : modal.publicite ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {modal.show && modal.type === 'supprimer' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', publicite: null })}>
          <div style={{ ...s.modal, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={s.modalTitle}>Supprimer la publicité</h3>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>
              Êtes-vous sûr de vouloir supprimer <strong>{modal.publicite?.titre}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, type: '', publicite: null })}
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

  statsRow:     { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 },
  statCard:     { background: '#fff', borderRadius: 16, padding: 24, display: 'flex', alignItems: 'center', gap: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 },
  statValue:    { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 13, color: '#6b7280', marginTop: 2 },

  card:       { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  cardTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937' },
  btnAdd:     { padding: '12px 24px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 900 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  nom:       { fontWeight: 600, color: '#1f2937' },
  muted:     { color: '#6b7280', fontSize: 13 },
  badge:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:   { display: 'flex', gap: 6, flexWrap: 'wrap' },
  actionBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },

  center: { textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modal:      { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 },
  formGroup:  { marginBottom: 16 },
  label:      { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:      { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
