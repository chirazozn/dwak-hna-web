import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const STATUT_CONFIG = {
  en_attente: { bg: '#fef3c7', color: '#d97706', label: '⏳ En attente' },
  acceptee:   { bg: '#dcfce7', color: '#15803d', label: '✅ Acceptée' },
  refusee:    { bg: '#fee2e2', color: '#dc2626', label: '❌ Refusée' },
  terminee:   { bg: '#dbeafe', color: '#1d4ed8', label: '📦 Terminée' },
  annulee:    { bg: '#f3f4f6', color: '#6b7280', label: 'Annulée' },
};

export default function AdminCommandes() {
  const [commandes, setCommandes] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    en_attente: 0,
    acceptee: 0,
    refusee: 0,
    terminee: 0,
    annulee: 0,
  });
  const [search, setSearch] = useState('');
  const [filtre, setFiltre] = useState('tous');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchCommandes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/commandes`, {
        params: { page, search, filtre },
        headers: headers(),
      });

      setCommandes(res.data.commandes || []);
      setStats(res.data.stats || {
        total: 0,
        en_attente: 0,
        acceptee: 0,
        refusee: 0,
        terminee: 0,
        annulee: 0,
      });
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtre]);

  useEffect(() => {
    fetchCommandes();
  }, [fetchCommandes]);

  const fetchDetail = async (commandeId) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}/commandes/${commandeId}`, {
        headers: headers(),
      });
      setDetail(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const priceValue = (value) => {
    const n = Number(value || 0);
    return `${n.toFixed(2)} DA`;
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Commandes" />

      <main style={s.main}>

        <div style={s.statsGrid}>
          <StatCard icon="🛒" label="Total" value={stats.total} accent="#008339" />
          <StatCard icon="⏳" label="En attente" value={stats.en_attente} accent="#d97706" />
          <StatCard icon="✅" label="Acceptées" value={stats.acceptee} accent="#15803d" />
          <StatCard icon="❌" label="Refusées" value={stats.refusee} accent="#dc2626" />
          <StatCard icon="📦" label="Terminées" value={stats.terminee} accent="#1d4ed8" />
        </div>

        <div style={s.filtres}>
          {[
            { label: 'Toutes', value: 'tous' },
            { label: '⏳ En attente', value: 'en_attente' },
            { label: '✅ Acceptées', value: 'acceptee' },
            { label: '❌ Refusées', value: 'refusee' },
            { label: '📦 Terminées', value: 'terminee' },
            { label: 'Annulées', value: 'annulee' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => { setFiltre(f.value); setPage(1); }}
              style={{ ...s.filtreBtn, ...(filtre === f.value ? s.filtreBtnActive : {}) }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={s.card}>
          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Rechercher patient, pharmacie ou commande..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={s.searchInput}
              />
            </div>
            <span style={s.resultCount}>{stats.total} commande(s)</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['ID', 'Patient', 'Pharmacie', 'Produits', 'Total', 'Statut', 'Date', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={s.center}>Chargement...</td></tr>
                ) : commandes.length === 0 ? (
                  <tr><td colSpan={8} style={s.center}>Aucune commande trouvée</td></tr>
                ) : commandes.map((c, i) => {
                  const sc = STATUT_CONFIG[c.statut] || STATUT_CONFIG.en_attente;
                  return (
                    <tr key={c.commande_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}><span style={s.muted}>#{c.commande_id}</span></td>

                      <td style={s.td}>
                        <div style={s.nom}>{c.patient || 'Patient'}</div>
                        <div style={{ ...s.muted, fontSize: 12 }}>{c.patient_tel || '—'}</div>
                      </td>

                      <td style={s.td}>
                        <div style={s.nom}>🏥 {c.pharmacie_nom || 'Pharmacie'}</div>
                        <div style={{ ...s.muted, fontSize: 12 }}>{c.pharmacie_tel || ''}</div>
                      </td>

                      <td style={s.td}>
                        <span style={{ ...s.badge, background: '#e6f4ec', color: '#008339' }}>
                          {c.nb_produits || 0} produit(s)
                        </span>
                      </td>

                      <td style={s.td}>
                        <span style={{ fontWeight: 800, color: '#008339' }}>
                          {priceValue(c.total)}
                        </span>
                      </td>

                      <td style={s.td}>
                        <span style={{ ...s.badge, background: sc.bg, color: sc.color }}>
                          {sc.label}
                        </span>
                      </td>

                      <td style={s.td}>
                        <span style={s.muted}>{c.date}</span>
                      </td>

                      <td style={s.td}>
                        <ActionBtn
                          label="Voir détail"
                          color="#008339"
                          onClick={() => fetchDetail(c.commande_id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={s.pagination}>
              <PageBtn label="‹" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} active={false} />
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <PageBtn key={n} label={n} onClick={() => setPage(n)} disabled={false} active={n === page} />
              ))}
              <PageBtn label="›" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} active={false} />
            </div>
          )}
        </div>
      </main>

      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            {detailLoading ? (
              <div style={s.center}>Chargement...</div>
            ) : (
              <>
                <div style={s.modalHeader}>
                  <h3 style={s.modalTitle}>🛒 Détail Commande #{detail.commande?.commande_id}</h3>
                  <button onClick={() => setDetail(null)} style={s.closeBtn}>✕</button>
                </div>

                <div style={s.section}>
                  <h4 style={s.sectionTitle}>👤 Patient</h4>
                  <div style={s.infoGrid}>
                    <InfoRow label="Nom" value={detail.commande?.patient} />
                    <InfoRow label="Email" value={detail.commande?.patient_email} />
                    <InfoRow label="Téléphone" value={detail.commande?.patient_tel} />
                  </div>
                </div>

                <div style={s.section}>
                  <h4 style={s.sectionTitle}>🏥 Pharmacie</h4>
                  <div style={s.infoGrid}>
                    <InfoRow label="Nom" value={detail.commande?.pharmacie_nom} />
                    <InfoRow label="Adresse" value={detail.commande?.pharmacie_adresse} />
                    <InfoRow label="Téléphone" value={detail.commande?.pharmacie_tel} />
                  </div>
                </div>

                <div style={s.section}>
                  <h4 style={s.sectionTitle}>📋 Commande</h4>
                  <div style={s.infoGrid}>
                    <InfoRow label="Statut" value={detail.commande?.statut} />
                    <InfoRow label="Total" value={priceValue(detail.commande?.total)} />
                    <InfoRow label="Date" value={detail.commande?.date} />
                    {detail.commande?.message_patient && (
                      <InfoRow label="Message" value={detail.commande?.message_patient} />
                    )}
                  </div>
                </div>

                {detail.lignes?.length > 0 && (
                  <div style={s.section}>
                    <h4 style={s.sectionTitle}>🧾 Produits commandés</h4>
                    {detail.lignes.map((l, i) => (
                      <div key={i} style={s.productItem}>
                        <div>
                          <div style={s.nom}>🛍️ {l.nom_produit}</div>
                          <div style={s.muted}>{priceValue(l.prix_unitaire)} × {l.quantite}</div>
                        </div>
                        <span style={{ ...s.badge, background: '#e6f4ec', color: '#008339' }}>
                          {priceValue(l.sous_total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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
    <button onClick={onClick} disabled={disabled}
      style={{ ...s.pageBtn, ...(active ? s.pageBtnActive : {}), ...(disabled ? s.pageBtnDisabled : {}) }}>
      {label}
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value || '—'}</span>
    </div>
  );
}

const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },

  statsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 },
  statCard:     { background: '#fff', borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  statIconWrap: { width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  statValue:    { fontSize: 24, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 12, color: '#6b7280', marginTop: 2 },

  filtres:         { display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' },
  filtreBtn:       { padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: '#fff', color: '#6b7280', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  filtreBtnActive: { background: '#008339', color: '#fff' },

  card:        { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.07)' },
  searchRow:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16 },
  searchBox:   { display: 'flex', alignItems: 'center', flex: 1, maxWidth: 440, background: '#f8fafc', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '0 14px', gap: 8 },
  searchInput: { flex: 1, border: 'none', background: 'transparent', outline: 'none', padding: '11px 0', fontSize: 14, color: '#374151' },
  resultCount: { fontSize: 13, color: '#9ca3af', whiteSpace: 'nowrap' },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 1000 },
  th:     { textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '13px 16px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff' },
  trOdd:  { background: '#fafafa' },

  nom:       { fontWeight: 600, color: '#1f2937' },
  muted:     { color: '#6b7280', fontSize: 13 },
  badge:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actionBtn: { padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' },

  center: { textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 },

  pagination:      { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f0f0f0' },
  pageBtn:         { minWidth: 36, height: 36, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  pageBtnActive:   { background: '#008339', borderColor: '#008339', color: '#fff', fontWeight: 700 },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 },
  modal:   { background: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },

  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle:  { fontSize: 18, fontWeight: 700, color: '#1f2937' },
  closeBtn:    { background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#6b7280' },

  section:      { marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #f3f4f6' },
  sectionTitle: { fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' },
  infoGrid:     { display: 'flex', flexDirection: 'column', gap: 8 },
  infoRow:      { display: 'flex', gap: 12, alignItems: 'flex-start' },
  infoLabel:    { fontSize: 13, fontWeight: 600, color: '#6b7280', minWidth: 100 },
  infoValue:    { fontSize: 13, color: '#1f2937', flex: 1 },

  productItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 8 },
};
