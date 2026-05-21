import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import Toast from '../../components/Toast';

const API      = 'http://127.0.0.1:5000/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const ETAT_CONFIG = {
  en_attente:    { bg: '#fef3c7', color: '#d97706', label: '⏳ En attente'    },
  reponse_recue: { bg: '#dbeafe', color: '#1d4ed8', label: '📬 Réponse reçue' },
  termine:       { bg: '#dcfce7', color: '#15803d', label: '✅ Terminé'        },
  annule:        { bg: '#fee2e2', color: '#dc2626', label: '❌ Annulé'         },
};

export default function AdminDemandes() {
  const [demandes,      setDemandes]      = useState([]);
  const [stats,         setStats]         = useState({ total: 0, en_attente: 0, reponse_recue: 0, termine: 0, annule: 0 });
  const [search,        setSearch]        = useState('');
  const [filtre,        setFiltre]        = useState('tous');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchDemandes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/demandes`, {
        params: { page, search, filtre },
        headers: headers()
      });
      setDemandes(res.data.demandes);
      setStats(res.data.stats);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filtre]);

  useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

  const fetchDetail = async (demande_id) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}/demandes/${demande_id}`, { headers: headers() });
      setDetail(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Gestion des Demandes" />
      <main style={s.main}>

        {/* STAT CARDS */}
        <div style={s.statsGrid}>
          <StatCard icon="📋" label="Total"          value={stats.total}         accent="#008339" />
          <StatCard icon="⏳" label="En attente"     value={stats.en_attente}    accent="#d97706" />
          <StatCard icon="📬" label="Réponse reçue"  value={stats.reponse_recue} accent="#1d4ed8" />
          <StatCard icon="✅" label="Terminées"       value={stats.termine}       accent="#15803d" />
          <StatCard icon="❌" label="Annulées"        value={stats.annule}        accent="#dc2626" />
        </div>

        {/* FILTRES */}
        <div style={s.filtres}>
          {[
            { label: 'Toutes',         value: 'tous'          },
            { label: '⏳ En attente',  value: 'en_attente'    },
            { label: '📬 Réponse',     value: 'reponse_recue' },
            { label: '✅ Terminées',   value: 'termine'       },
            { label: '❌ Annulées',    value: 'annule'        },
          ].map(f => (
            <button key={f.value} onClick={() => { setFiltre(f.value); setPage(1); }}
              style={{ ...s.filtreBtn, ...(filtre === f.value ? s.filtreBtnActive : {}) }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* TABLE CARD */}
        <div style={s.card}>
          <div style={s.searchRow}>
            <div style={s.searchBox}>
              <span>🔍</span>
              <input
                type="text"
                placeholder="Rechercher par nom patient..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={s.searchInput}
              />
            </div>
            <span style={s.resultCount}>{stats.total} demande(s)</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['ID', 'Patient', 'Type', 'Message', 'Rayon', 'Pharmacie choisie', 'Note', 'État', 'Date', 'Actions'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={s.center}>Chargement...</td></tr>
                ) : demandes.length === 0 ? (
                  <tr><td colSpan={10} style={s.center}>Aucune demande trouvée</td></tr>
                ) : demandes.map((d, i) => {
                  const ec = ETAT_CONFIG[d.etat] || ETAT_CONFIG.en_attente;
                  return (
                    <tr key={d.demande_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                      <td style={s.td}><span style={s.muted}>#{d.demande_id}</span></td>
                      <td style={s.td}>
                        <div style={s.nom}>{d.patient}</div>
                        <div style={{ ...s.muted, fontSize: 12 }}>{d.patient_tel}</div>
                      </td>
                      <td style={s.td}>
                        <span style={{
                          ...s.badge,
                          background: d.type === 'manuelle' ? '#e6f4ec' : '#dbeafe',
                          color:      d.type === 'manuelle' ? '#008339' : '#1d4ed8',
                        }}>
                          {d.type === 'manuelle' ? '✍️ Manuelle' : '📋 Ordonnance'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={s.muted}>
                          {d.message_patient
                            ? d.message_patient.substring(0, 30) + (d.message_patient.length > 30 ? '...' : '')
                            : '—'}
                        </span>
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: '#f3f4f6', color: '#374151' }}>
                          {d.rayon_km} km
                        </span>
                      </td>
                      <td style={s.td}>
                        {d.pharmacie_choisie ? (
                          <span style={{ ...s.badge, background: '#dcfce7', color: '#15803d' }}>
                            🏥 {d.pharmacie_choisie}
                          </span>
                        ) : (
                          <span style={s.muted}>—</span>
                        )}
                      </td>
                      <td style={s.td}>
                        {d.note_pharmacie ? (
                          <div>
                            <div style={{ color: '#f59e0b', fontSize: 14 }}>
                              {'⭐'.repeat(d.note_pharmacie)}
                            </div>
                            <div style={{ ...s.muted, fontSize: 11 }}>{d.note_pharmacie}/5</div>
                          </div>
                        ) : <span style={s.muted}>—</span>}
                      </td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, background: ec.bg, color: ec.color }}>
                          {ec.label}
                        </span>
                      </td>
                      <td style={s.td}><span style={s.muted}>{d.date}</span></td>
                      <td style={s.td}>
                        <ActionBtn
                          label="Voir détail"
                          color="#008339"
                          onClick={() => fetchDetail(d.demande_id)}
                        />
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

      {/* MODAL DETAIL */}
      {detail && (
        <div style={s.overlay} onClick={() => setDetail(null)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>

            {detailLoading ? (
              <div style={s.center}>Chargement...</div>
            ) : (
              <>
                <div style={s.modalHeader}>
                  <h3 style={s.modalTitle}>📋 Détail Demande #{detail.demande?.demande_id}</h3>
                  <button onClick={() => setDetail(null)} style={s.closeBtn}>✕</button>
                </div>

                {/* INFO PATIENT */}
                <div style={s.section}>
                  <h4 style={s.sectionTitle}>👤 Patient</h4>
                  <div style={s.infoGrid}>
                    <InfoRow label="Nom"       value={detail.demande?.patient}       />
                    <InfoRow label="Email"     value={detail.demande?.patient_email} />
                    <InfoRow label="Téléphone" value={detail.demande?.patient_tel}   />
                  </div>
                </div>

                {/* INFO DEMANDE */}
                <div style={s.section}>
                  <h4 style={s.sectionTitle}>📋 Demande</h4>
                  <div style={s.infoGrid}>
                    <InfoRow label="Type"   value={detail.demande?.type}     />
                    <InfoRow label="État"   value={detail.demande?.etat}     />
                    <InfoRow label="Rayon"  value={`${detail.demande?.rayon_km} km`} />
                    <InfoRow label="Date"   value={detail.demande?.date}     />
                    {detail.demande?.message_patient && (
                      <InfoRow label="Message" value={detail.demande?.message_patient} />
                    )}
                  </div>
                </div>

                {/* MEDICAMENTS */}
                {detail.medicaments?.length > 0 && (
                  <div style={s.section}>
                    <h4 style={s.sectionTitle}>💊 Médicaments demandés</h4>
                    {detail.medicaments.map((m, i) => (
                      <div key={i} style={s.medItem}>
                        <span>💊 {m.nom}</span>
                        <span style={{ ...s.badge, background: '#e6f4ec', color: '#008339' }}>
                          x{m.quantite}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ORDONNANCES */}
                {detail.ordonnances?.length > 0 && (
                  <div style={s.section}>
                    <h4 style={s.sectionTitle}>📄 Ordonnances</h4>
                    {detail.ordonnances.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer"
                        style={{ display: 'block', color: '#008339', marginBottom: 4, fontSize: 13 }}>
                        📎 Ordonnance {i + 1}
                      </a>
                    ))}
                  </div>
                )}

                {/* PHARMACIE CHOISIE */}
                {detail.demande?.pharmacie_choisie && (
                  <div style={s.section}>
                    <h4 style={s.sectionTitle}>🏥 Pharmacie choisie</h4>
                    <div style={s.infoGrid}>
                      <InfoRow label="Pharmacie"  value={detail.demande?.pharmacie_choisie} />
                      {detail.demande?.note_pharmacie && (
                        <InfoRow label="Note" value={`${'⭐'.repeat(detail.demande.note_pharmacie)} (${detail.demande.note_pharmacie}/5)`} />
                      )}
                      {detail.demande?.commentaire && (
                        <InfoRow label="Commentaire" value={detail.demande?.commentaire} />
                      )}
                    </div>
                  </div>
                )}

                {/* REPONSES PHARMACIES */}
                {detail.reponses?.length > 0 && (
                  <div style={s.section}>
                    <h4 style={s.sectionTitle}>💬 Réponses des pharmacies</h4>
                    {detail.reponses.map((r, i) => (
                      <div key={i} style={s.reponseItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={s.nom}>🏥 {r.pharmacie}</span>
                          <span style={{
                            ...s.badge,
                            background: r.statut === 'acceptee' ? '#dcfce7' : r.statut === 'refusee' ? '#fee2e2' : '#fef3c7',
                            color:      r.statut === 'acceptee' ? '#15803d' : r.statut === 'refusee' ? '#dc2626' : '#d97706',
                          }}>
                            {r.statut === 'acceptee' ? '✅ Acceptée' : r.statut === 'refusee' ? '❌ Refusée' : '⏳ En attente'}
                          </span>
                        </div>
                        {r.message && <div style={{ ...s.muted, marginTop: 4, fontSize: 13 }}>💬 {r.message}</div>}
                        {r.date && <div style={{ ...s.muted, fontSize: 11, marginTop: 2 }}>🕐 {r.date}</div>}
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

function InfoRow({ label, value }) {
  return (
    <div style={s.infoRow}>
      <span style={s.infoLabel}>{label}</span>
      <span style={s.infoValue}>{value || '—'}</span>
    </div>
  );
}

/* ── Styles ── */
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
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  nom:       { fontWeight: 600, color: '#1f2937' },
  muted:     { color: '#6b7280', fontSize: 13 },
  badge:     { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  actions:   { display: 'flex', gap: 6 },
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

  medItem:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f8fafc', borderRadius: 8, marginBottom: 6 },
  reponseItem:{ padding: '12px', background: '#f8fafc', borderRadius: 10, marginBottom: 8 },
};