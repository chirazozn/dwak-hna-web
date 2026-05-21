import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import Toast from '../../components/Toast';

const API      = 'https://dwak-hna-web.onrender.com/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

export default function AdminPharmacies() {
  const [pharmacies,    setPharmacies]    = useState([]);
  const [stats,         setStats]         = useState({ total: 0, approuvees: 0, en_attente: 0, suspendues: 0 });
  const [search,        setSearch]        = useState('');
  const [page,          setPage]          = useState(1);
  const [totalPages,    setTotalPages]    = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [modal,         setModal]         = useState({ show: false, type: '', pharmacie: null });
  const [detail,        setDetail]        = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast,         setToast]         = useState({ text: '', type: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchPharmacies(); }, [page, search]);

  const fetchPharmacies = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/pharmacies`, {
        params: { page, search },
        headers: headers()
      });
      setPharmacies(res.data.pharmacies);
      setStats(res.data.stats);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => setToast({ text, type });

  const openVoir = async (p) => {
    setModal({ show: true, type: 'voir', pharmacie: p });
    setDetailLoading(true);
    try {
      const res = await axios.get(`${API}/pharmacies/${p.pharmacie_id}`, { headers: headers() });
      setDetail(res.data.pharmacie);
    } catch (err) {
      showMessage('Erreur chargement détails', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

const handleAction = async () => {
  const { type, pharmacie } = modal;
  try {
    if (type === 'approuver') {
      await axios.put(`${API}/pharmacies/${pharmacie.pharmacie_id}/approuver`, {}, { headers: headers() });
      showMessage('Pharmacie approuvée avec succès ✅', 'success');
    } else if (type === 'suspendre') {
      await axios.put(`${API}/pharmacies/${pharmacie.pharmacie_id}/suspendre`, {}, { headers: headers() });
      showMessage('Statut mis à jour avec succès', 'success');
    } else if (type === 'supprimer') {
      await axios.delete(`${API}/pharmacies/${pharmacie.pharmacie_id}`, { headers: headers() });
      showMessage('Pharmacie supprimée avec succès', 'success');
    }
    setModal({ show: false, type: '', pharmacie: null });
    setDetail(null);
    fetchPharmacies();

    // ✅ Déclenche le refresh du badge dans Sidebar instantanément
    window.dispatchEvent(new Event('pharmacie-action'));

  } catch (err) {
    showMessage('Une erreur est survenue', 'error');
  }
};

  const statutBadge = (statut) => {
    const config = {
      approuvee:  { bg: '#d1fae5', color: '#065f46', label: 'Approuvée'  },
      en_attente: { bg: '#fef3c7', color: '#d97706', label: 'En attente' },
      suspendue:  { bg: '#fee2e2', color: '#dc2626', label: 'Suspendue'  },
      supprimee:  { bg: '#f3f4f6', color: '#6b7280', label: 'Supprimée'  },
    };
    const c = config[statut] || config.en_attente;
    return (
      <span style={{ background: c.bg, color: c.color, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
        {c.label}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      <Sidebar />

      <Toast
        message={toast.text}
        type={toast.type}
        onClose={() => setToast({ text: '', type: '' })}
      />

      <div style={{ marginLeft: 260, flex: 1 }}>
        <Navbar title="Gestion des Pharmacies" />
        <div style={{ marginTop: 70, padding: 32 }}>

          {/* STAT CARDS */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard icon="🏥" label="Total"       value={stats.total}      color="#008339" />
            <StatCard icon="✅" label="Approuvées"  value={stats.approuvees} color="#008339" />
            <StatCard icon="⏳" label="En attente"  value={stats.en_attente} color="#f59e0b" />
            <StatCard icon="🚫" label="Suspendues"  value={stats.suspendues} color="#ef4444" />
          </div>

          {/* TABLE CARD */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <input
              type="text"
              placeholder="🔍 Rechercher par nom ou email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '12px 16px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', marginBottom: 20, boxSizing: 'border-box' }}
            />

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 750 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Logo', 'Nom', 'Email', 'Téléphone', 'Wilaya', 'Statut', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Chargement...</td></tr>
                  ) : pharmacies.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Aucune pharmacie trouvée</td></tr>
                  ) : pharmacies.map((p, i) => (
                    <tr key={p.pharmacie_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                          {p.nom.charAt(0).toUpperCase()}
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{p.nom}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{p.email}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{p.telephone}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{p.wilaya}</td>
                      <td style={{ padding: '14px 16px' }}>{statutBadge(p.statut)}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{p.date}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openVoir(p)}
                            style={{ padding: '6px 12px', background: '#008339', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            👁️ Voir
                          </button>
                          {p.statut === 'en_attente' && (
                            <button onClick={() => setModal({ show: true, type: 'approuver', pharmacie: p })}
                              style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                              ✅ Approuver
                            </button>
                          )}
                          <button onClick={() => setModal({ show: true, type: 'suspendre', pharmacie: p })}
                            style={{ padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            {p.statut === 'suspendue' ? '▶️ Réactiver' : '⏸️ Suspendre'}
                          </button>
                          <button onClick={() => setModal({ show: true, type: 'supprimer', pharmacie: p })}
                            style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            🗑️ Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: page === 1 ? '#f9fafb' : '#fff', cursor: page === 1 ? 'default' : 'pointer' }}>
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: page === p ? '#008339' : '#fff', color: page === p ? '#fff' : '#1f2937', cursor: 'pointer', fontWeight: page === p ? 700 : 400, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: page === totalPages ? '#f9fafb' : '#fff', cursor: page === totalPages ? 'default' : 'pointer' }}>
                →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VOIR */}
      {modal.show && modal.type === 'voir' && (
        <div style={s.overlay} onClick={() => { setModal({ show: false, type: '', pharmacie: null }); setDetail(null); }}>
          <div style={{ ...s.modalBox, maxWidth: 640 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={s.modalTitle}>🏥 Détails Pharmacie</h3>
              <button onClick={() => { setModal({ show: false, type: '', pharmacie: null }); setDetail(null); }}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {detailLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Chargement...</div>
            ) : detail && (
              <>
                {/* Header pharmacie */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, padding: 16, background: '#f8fafc', borderRadius: 12 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#008339', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                    {detail.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', margin: 0 }}>{detail.nom}</h4>
                    <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>{detail.email}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      {statutBadge(detail.statut)}
                      {detail.est_ouverte && <span style={{ background: '#d1fae5', color: '#065f46', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>🟢 Ouverte</span>}
                      {detail.est_de_garde && <span style={{ background: '#fef3c7', color: '#d97706', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>⭐ De garde</span>}
                    </div>
                  </div>
                </div>

                {/* Infos grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <InfoItem label="📞 Téléphone"   value={detail.telephone || '—'} />
                  <InfoItem label="📍 Wilaya"       value={detail.wilaya    || '—'} />
                  <InfoItem label="🏘️ Commune"      value={detail.commune   || '—'} />
                  <InfoItem label="📅 Inscrit le"   value={detail.date      || '—'} />
                  <InfoItem label="🗺️ Latitude"     value={detail.latitude  || '—'} />
                  <InfoItem label="🗺️ Longitude"    value={detail.longitude || '—'} />
                </div>

                {detail.adresse && (
                  <InfoItem label="📫 Adresse" value={detail.adresse} full />
                )}

                {/* Documents */}
                <div style={{ marginTop: 20 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 }}>📄 Documents fournis</h4>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {detail.registre_commerce ? (
                      <a href={detail.registre_commerce} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        📋 Registre de commerce
                      </a>
                    ) : (
                      <span style={{ padding: '10px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                        ❌ Registre de commerce manquant
                      </span>
                    )}
                    {detail.carte_identite ? (
                      <a href={detail.carte_identite} target="_blank" rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                        🪪 Carte d'identité
                      </a>
                    ) : (
                      <span style={{ padding: '10px 16px', background: '#fee2e2', color: '#dc2626', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>
                        ❌ Carte d'identité manquante
      </span>
                    )}
                  </div>
                </div>

                {/* Actions rapides */}
                {detail.statut === 'en_attente' && (
                  <div style={{ marginTop: 24, padding: 16, background: '#fef3c7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 700, color: '#d97706', margin: 0, fontSize: 14 }}>⏳ En attente d'approbation</p>
                      <p style={{ color: '#92400e', fontSize: 12, margin: '4px 0 0' }}>Vérifiez les documents avant d'approuver</p>
                    </div>
                    <button
                      onClick={() => {
                        setModal({ show: true, type: 'approuver', pharmacie: detail });
                        setDetail(null);
                      }}
                      style={{ padding: '10px 20px', background: '#008339', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      ✅ Approuver
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CONFIRMATION */}
      {modal.show && modal.type !== 'voir' && (
        <div style={s.overlay} onClick={() => setModal({ show: false, type: '', pharmacie: null })}>
          <div style={{ ...s.modalBox, maxWidth: 400, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>
              {modal.type === 'approuver' ? '✅' : modal.type === 'suspendre' ? '⚠️' : '🗑️'}
            </div>
            <h3 style={s.modalTitle}>
              {modal.type === 'approuver' ? 'Approuver la pharmacie' :
               modal.type === 'suspendre' ? 'Suspendre / Réactiver' : 'Supprimer la pharmacie'}
            </h3>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Êtes-vous sûr de vouloir effectuer cette action sur <strong>{modal.pharmacie?.nom}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, type: '', pharmacie: null })}
                style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={handleAction}
                style={{ padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 600, color: '#fff',
                  background: modal.type === 'approuver' ? '#008339' : modal.type === 'suspendre' ? '#f59e0b' : '#ef4444' }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sub-components ── */
function InfoItem({ label, value, full }) {
  return (
    <div style={{
      padding: '10px 14px', background: '#f8fafc', borderRadius: 8,
      gridColumn: full ? '1 / -1' : 'auto',
    }}>
      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1f2937', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 },
  modalBox:   { background: '#fff', borderRadius: 20, padding: '32px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' },
  modalTitle: { fontSize: 20, fontWeight: 700, color: '#1f2937', margin: 0 },
};
