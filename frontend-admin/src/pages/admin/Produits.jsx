import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const emptyForm = {
  nom: '', description: '', type_produit: 'medicament', categories: []
};

const TYPE_LABEL = {
  medicament:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Médicament'     },
  parapharmacie: { bg: '#fce7f3', color: '#9d174d', label: 'Parapharmacie' },
};

export default function AdminProduits() {
  const [produits,      setProduits]      = useState([]);
  const [stats,         setStats]         = useState({ total: 0, medicaments: 0, parapharmacie: 0, actifs: 0 });
  const [categories,    setCategories]    = useState([]);
  const [search,        setSearch]        = useState('');
  const [filtre,        setFiltre]        = useState('tous');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState({ show: false, type: '', produit: null });
  const [form,          setForm]          = useState(emptyForm);
  const [toast,         setToast]         = useState({ text: '', type: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProduits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/produits`, {
        params: { page, search, filtre },
        headers: headers()
      });
      setProduits(res.data.produits);
      setStats(res.data.stats);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtre]);

  useEffect(() => { fetchProduits(); }, [fetchProduits]);

  const fetchCategories = async (type) => {
    try {
      const res = await axios.get(`${API}/categories`, {
        params: { type },
        headers: headers()
      });
      setCategories(res.data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  const showMessage = (text, type) => setToast({ text, type });

  const openAdd = () => {
    setForm(emptyForm);
    fetchCategories('medicament');
    setModal({ show: true, type: 'form', produit: null });
  };

  const openEdit = (p) => {
    setForm({
      nom:          p.nom,
      description:  p.description,
      type_produit: p.type_produit,
      categories:   []
    });
    fetchCategories(p.type_produit);
    setModal({ show: true, type: 'form', produit: p });
  };

  const handleTypeChange = (type) => {
    setForm(f => ({ ...f, type_produit: type, categories: [] }));
    fetchCategories(type);
  };

  const toggleCategorie = (id) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter(c => c !== id)
        : [...f.categories, id]
    }));
  };

  const handleSubmit = async () => {
    if (!form.nom) { showMessage('Le nom est obligatoire', 'error'); return; }
    setActionLoading(true);
    try {
      if (modal.produit) {
        await axios.put(`${API}/produits/${modal.produit.admin_produit_id}`, form, { headers: headers() });
        showMessage('Produit modifié avec succès', 'success');
      } else {
        await axios.post(`${API}/produits`, form, { headers: headers() });
        showMessage('Produit ajouté avec succès', 'success');
      }
      setModal({ show: false, type: '', produit: null });
      fetchProduits();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggle = async (p) => {
    try {
      await axios.put(`${API}/produits/${p.admin_produit_id}/toggle`, {}, { headers: headers() });
      showMessage('Statut mis à jour', 'success');
      fetchProduits();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await axios.delete(`${API}/produits/${modal.produit.admin_produit_id}`, { headers: headers() });
      showMessage('Produit supprimé avec succès', 'success');
      setModal({ show: false, type: '', produit: null });
      fetchProduits();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Produits" />

      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsRow}>
          <StatCard icon="📦" label="Total"          value={stats.total}         accent="#008339" />
          <StatCard icon="💊" label="Médicaments"    value={stats.medicaments}   accent="#1d4ed8" />
          <StatCard icon="🧴" label="Parapharmacie"  value={stats.parapharmacie} accent="#9d174d" />
          <StatCard icon="✅" label="Actifs"         value={stats.actifs}        accent="#15803d" />
        </div>

        {/* FILTRES */}
        <div style={s.filtres}>
          {[
            { label: 'Tous',          value: 'tous'          },
            { label: 'Médicaments',   value: 'medicament'    },
            { label: 'Parapharmacie', value: 'parapharmacie' },
          ].map(f => (
            <button key={f.value} onClick={() => { setFiltre(f.value); setPage(1); }}
              style={{ ...s.filtreBtn, ...(filtre === f.value ? s.filtreBtnActive : {}) }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>

          {/* SEARCH + ADD */}
          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Rechercher un produit..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={s.searchInput}
              />
            </div>
            <button onClick={openAdd} style={s.btnAdd}>
              + Ajouter produit
            </button>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['Nom', 'Type', 'Catégories', 'Description', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={s.center}>Chargement...</td></tr>
                ) : produits.length === 0 ? (
                  <tr><td colSpan={7} style={s.center}>Aucun produit trouvé</td></tr>
                ) : produits.map((p, i) => {
                  const tc = TYPE_LABEL[p.type_produit] || TYPE_LABEL.medicament;
                  return (
                    <tr key={p.admin_produit_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}><span style={s.nom}>{p.nom}</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: tc.bg, color: tc.color }}>
                          {tc.label}
                        </span>
                      </td>
                      <td style={s.td}><span style={s.muted}>{p.categories}</span></td>
                      <td style={s.td}>
                        <span style={s.muted}>
                          {p.description ? p.description.substring(0, 40) + (p.description.length > 40 ? '...' : '') : '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: p.est_actif ? '#dcfce7' : '#fee2e2', color: p.est_actif ? '#15803d' : '#dc2626' }}>
                          {p.est_actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td style={s.td}><span style={s.muted}>{p.date}</span></td>
                      <td style={s.td}>
                        <div style={s.actions}>
                          <ActionBtn label="Modifier"                               color="#3b82f6" onClick={() => openEdit(p)} />
                          <ActionBtn label={p.est_actif ? 'Désactiver' : 'Activer'} color="#f59e0b" onClick={() => handleToggle(p)} />
                          <ActionBtn label="Supprimer"                              color="#ef4444" onClick={() => setModal({ show: true, type: 'supprimer', produit: p })} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div style={s.pagination}>
            <PageBtn label="‹" onClick={() => setPage(p => Math.max(1, p - 1))}        disabled={page === 1}          active={false} />
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <PageBtn key={n} label={n} onClick={() => setPage(n)} disabled={false} active={n === page} />
            ))}
            <PageBtn label="›" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} active={false} />
          </div>
        </div>
      </main>

      {/* MODAL FORMULAIRE */}
      {modal.show && modal.type === 'form' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', produit: null })}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h3 style={s.modalTitle}>
              {modal.produit ? '✏️ Modifier le produit' : '➕ Ajouter un produit'}
            </h3>

            <div style={s.formGroup}>
              <label style={s.label}>Nom *</label>
              <input type="text" value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Nom du produit"
                style={s.input} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Type *</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { value: 'medicament',    label: '💊 Médicament'    },
                  { value: 'parapharmacie', label: '🧴 Parapharmacie' },
                ].map(t => (
                  <button key={t.value}
                    onClick={() => handleTypeChange(t.value)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 8, cursor: 'pointer',
                      border: form.type_produit === t.value ? '2px solid #008339' : '1.5px solid #e5e7eb',
                      background: form.type_produit === t.value ? '#e6f4ec' : '#fff',
                      fontWeight: 600, fontSize: 13,
                      color: form.type_produit === t.value ? '#008339' : '#6b7280',
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Description</label>
              <textarea value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description du produit..."
                rows={3}
                style={{ ...s.input, resize: 'vertical' }} />
            </div>

            <div style={s.formGroup}>
              <label style={s.label}>Catégories</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map(c => (
                  <button key={c.categorie_id}
                    onClick={() => toggleCategorie(c.categorie_id)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      border: form.categories.includes(c.categorie_id) ? '2px solid #008339' : '1.5px solid #e5e7eb',
                      background: form.categories.includes(c.categorie_id) ? '#e6f4ec' : '#fff',
                      color: form.categories.includes(c.categorie_id) ? '#008339' : '#6b7280',
                    }}>
                    {c.nom}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal({ show: false, type: '', produit: null })}
                style={s.btnCancel} disabled={actionLoading}>
                Annuler
              </button>
              <button onClick={handleSubmit} style={s.btnConfirm} disabled={actionLoading}>
                {actionLoading ? 'En cours...' : modal.produit ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {modal.show && modal.type === 'supprimer' && (
        <div style={s.overlay} onClick={() => !actionLoading && setModal({ show: false, type: '', produit: null })}>
          <div style={{ ...s.modal, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={s.modalTitle}>Supprimer le produit</h3>
            <p style={{ color: '#6b7280', marginBottom: 28 }}>
              Êtes-vous sûr de vouloir supprimer <strong>{modal.produit?.nom}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, type: '', produit: null })}
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

function PageBtn({ label, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...s.pageBtn, ...(active ? s.pageBtnActive : {}), ...(disabled ? s.pageBtnDisabled : {}) }}>
      {label}
    </button>
  );
}

/* ── Styles ── */
const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },

  statsRow:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' },
  statCard:  { background: '#fff', borderRadius: '16px', padding: '24px', display: 'flex', alignItems: 'center', gap: '18px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: '54px', height: '54px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' },
  statValue: { fontSize: '28px', fontWeight: '700', color: '#1f2937' },
  statLabel: { fontSize: '13px', color: '#6b7280', marginTop: '2px' },

  filtres:         { display: 'flex', gap: 8, marginBottom: 24 },
  filtreBtn:       { padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: '#fff', color: '#6b7280', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  filtreBtnActive: { background: '#008339', color: '#fff' },

  card:        { background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  searchRow:   { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  searchBox:   { display: 'flex', alignItems: 'center', flex: 1, minWidth: 200, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', gap: 8 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: 14, color: '#374151' },
  btnAdd:      { padding: '12px 24px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },

  table:   { width: '100%', borderCollapse: 'collapse', minWidth: 800 },
  th:      { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:      { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven:  { background: '#fff'    },
  trOdd:   { background: '#fafafa' },
  nom:     { fontWeight: 600, color: '#1f2937' },
  muted:   { color: '#6b7280' },
  badge:   { padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  actionBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },

  center: { textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },

  pagination:      { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' },
  pageBtn:         { minWidth: 36, height: 36, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  pageBtnActive:   { background: '#008339', borderColor: '#008339', color: '#fff', fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modal:      { background: '#fff', borderRadius: 20, padding: '36px 32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 },
  formGroup:  { marginBottom: 16 },
  label:      { display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input:      { width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  btnCancel:  { padding: '11px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnConfirm: { padding: '11px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
