import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import Toast from '../../components/Toast';

const emptyForm = {
  nom: '', denomination_commune: '', forme: '',
  dosage: '', fabricant: '', necessite_ordonnance: false, description: ''
};

export default function AdminMedicaments() {
  const [medicaments, setMedicaments] = useState([]);
  const [stats, setStats]             = useState({ total: 0, actifs: 0, avec_ordonnance: 0, sans_ordonnance: 0 });
  const [search, setSearch]           = useState('');
  const [filtre, setFiltre]           = useState('tous');
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [loading, setLoading]         = useState(false);
  const [modal, setModal]             = useState({ show: false, type: '', medicament: null });
  const [form, setForm]               = useState(emptyForm);
  const [toast, setToast]             = useState({ text: '', type: '' });

  const token = localStorage.getItem('token');

  useEffect(() => { fetchMedicaments(); }, [page, search, filtre]);

  const fetchMedicaments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://127.0.0.1:5000/api/admin/medicaments', {
        params: { page, search, filtre },
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedicaments(res.data.medicaments);
      setStats(res.data.stats);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type) => setToast({ text, type });

  const openAdd = () => {
    setForm(emptyForm);
    setModal({ show: true, type: 'form', medicament: null });
  };

  const openEdit = (m) => {
    setForm({
      nom:                  m.nom,
      denomination_commune: m.denomination_commune,
      forme:                m.forme,
      dosage:               m.dosage,
      fabricant:            m.fabricant,
      necessite_ordonnance: m.necessite_ordonnance,
      description:          m.description || ''
    });
    setModal({ show: true, type: 'form', medicament: m });
  };

  const handleSubmit = async () => {
    if (!form.nom) { showMessage('Le nom est obligatoire', 'error'); return; }
    try {
      if (modal.medicament) {
        await axios.put(
          `http://127.0.0.1:5000/api/admin/medicaments/${modal.medicament.medicament_id}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showMessage('Médicament modifié avec succès', 'success');
      } else {
        await axios.post('http://127.0.0.1:5000/api/admin/medicaments', form, {
          headers: { Authorization: `Bearer ${token}` }
        });
        showMessage('Médicament ajouté avec succès', 'success');
      }
      setModal({ show: false, type: '', medicament: null });
      fetchMedicaments();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
  };

  const handleToggle = async (m) => {
    try {
      await axios.put(
        `http://127.0.0.1:5000/api/admin/medicaments/${m.medicament_id}/toggle`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('Statut mis à jour avec succès', 'success');
      fetchMedicaments();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(
        `http://127.0.0.1:5000/api/admin/medicaments/${modal.medicament.medicament_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showMessage('Médicament supprimé avec succès', 'success');
      setModal({ show: false, type: '', medicament: null });
      fetchMedicaments();
    } catch (err) {
      showMessage('Une erreur est survenue', 'error');
    }
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
        <Navbar title="Gestion des Médicaments" />
        <div style={{ marginTop: 70, padding: 32 }}>

          {/* STAT CARDS */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 24 }}>
            <StatCard icon="💊" label="Total"           value={stats.total}           color="#008339" />
            <StatCard icon="✅" label="Actifs"          value={stats.actifs}          color="#008339" />
            <StatCard icon="📋" label="Avec ordonnance" value={stats.avec_ordonnance} color="#f59e0b" />
            <StatCard icon="🆓" label="Sans ordonnance" value={stats.sans_ordonnance} color="#3b82f6" />
          </div>

          {/* FILTRES */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            {[
              { label: 'Tous',     value: 'tous'    },
              { label: 'Actifs',   value: 'actif'   },
              { label: 'Inactifs', value: 'inactif' },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => { setFiltre(f.value); setPage(1); }}
                style={{
                  padding: '8px 20px', borderRadius: 20, border: 'none',
                  cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: filtre === f.value ? '#008339' : '#fff',
                  color:      filtre === f.value ? '#fff'    : '#6b7280',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* TABLE CARD */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

            {/* SEARCH + ADD */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="🔍 Rechercher par nom ou dénomination..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{
                  flex: 1, minWidth: 200, padding: '12px 16px',
                  border: '1.5px solid #e5e7eb', borderRadius: 10,
                  fontSize: 14, outline: 'none'
                }}
              />
              <button onClick={openAdd} style={{
                padding: '12px 24px', background: '#008339', color: '#fff',
                border: 'none', borderRadius: 10, fontSize: 14,
                fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
              }}>
                + Ajouter médicament
              </button>
            </div>

            {/* TABLE */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Nom', 'Dénomination', 'Forme', 'Dosage', 'Fabricant', 'Ordonnance', 'Statut', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Chargement...</td></tr>
                  ) : medicaments.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>Aucun médicament trouvé</td></tr>
                  ) : medicaments.map((m, i) => (
                    <tr key={m.medicament_id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: '#1f2937' }}>{m.nom}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{m.denomination_commune || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{m.forme || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{m.dosage || '—'}</td>
                      <td style={{ padding: '14px 16px', fontSize: 13, color: '#6b7280' }}>{m.fabricant || '—'}</td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: m.necessite_ordonnance ? '#fef3c7' : '#d1fae5',
                          color:      m.necessite_ordonnance ? '#d97706' : '#065f46'
                        }}>
                          {m.necessite_ordonnance ? 'Oui' : 'Non'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          background: m.est_actif ? '#d1fae5' : '#fee2e2',
                          color:      m.est_actif ? '#065f46' : '#dc2626'
                        }}>
                          {m.est_actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => openEdit(m)}
                            style={{ padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            Modifier
                          </button>
                          <button onClick={() => handleToggle(m)}
                            style={{ padding: '6px 12px', background: m.est_actif ? '#f59e0b' : '#008339', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            {m.est_actif ? 'Désactiver' : 'Activer'}
                          </button>
                          <button onClick={() => setModal({ show: true, type: 'supprimer', medicament: m })}
                            style={{ padding: '6px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                            Supprimer
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

      {/* MODAL FORMULAIRE */}
      {modal.show && modal.type === 'form' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 24 }}>
              {modal.medicament ? '✏️ Modifier le médicament' : '➕ Ajouter un médicament'}
            </h3>

            {[
              { label: 'Nom *',               key: 'nom',                  placeholder: 'ex: Paracetamol'       },
              { label: 'Dénomination commune', key: 'denomination_commune', placeholder: 'ex: Paracétamol'       },
              { label: 'Forme',               key: 'forme',                placeholder: 'ex: Comprimé, Sirop...' },
              { label: 'Dosage',              key: 'dosage',               placeholder: 'ex: 500mg'              },
              { label: 'Fabricant',           key: 'fabricant',            placeholder: 'ex: Saidal'             },
            ].map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  {field.label}
                </label>
                <input
                  type="text"
                  value={form[field.key]}
                  onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Description
              </label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Description du médicament..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                id="ordonnance"
                checked={form.necessite_ordonnance}
                onChange={e => setForm({ ...form, necessite_ordonnance: e.target.checked })}
                style={{ width: 18, height: 18, cursor: 'pointer' }}
              />
              <label htmlFor="ordonnance" style={{ fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                Nécessite une ordonnance
              </label>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal({ show: false, type: '', medicament: null })}
                style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={handleSubmit}
                style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#008339', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                {modal.medicament ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION */}
      {modal.show && modal.type === 'supprimer' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 40, width: '100%', maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>
              Supprimer le médicament
            </h3>
            <p style={{ color: '#6b7280', marginBottom: 32 }}>
              Êtes-vous sûr de vouloir supprimer <strong>{modal.medicament?.nom}</strong> ?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => setModal({ show: false, type: '', medicament: null })}
                style={{ padding: '12px 24px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Annuler
              </button>
              <button onClick={handleDelete}
                style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}