import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import axios from 'axios';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import { useNavigate } from 'react-router-dom';
import Toast from '../../components/Toast';

const API      = 'http://127.0.0.1:5000/api/admin';
const getToken = () => localStorage.getItem('token');
const headers  = () => ({ Authorization: `Bearer ${getToken()}` });

const PIE_COLORS = ['#008339', '#f59e0b', '#ef4444', '#3b82f6'];

const ETAT_CONFIG = {
  en_attente:    { bg: '#fef3c7', color: '#d97706', label: 'En attente'    },
  reponse_recue: { bg: '#dbeafe', color: '#1d4ed8', label: 'Réponse reçue' },
  termine:       { bg: '#dcfce7', color: '#15803d', label: 'Terminé'       },
  annule:        { bg: '#fee2e2', color: '#dc2626', label: 'Annulé'        },
};

export default function AdminDashboard() {
  const [stats,             setStats]             = useState({});
  const [demandesChart,     setDemandesChart]     = useState([]);
  const [pharmaciesChart,   setPharmaciesChart]   = useState([]);
  const [demandesTypeChart, setDemandesTypeChart] = useState([]);
  const [patientsChart,     setPatientsChart]     = useState([]);
  const [loading,           setLoading]           = useState(true);
  const navigate = useNavigate();

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`, { headers: headers() });
      setStats(res.data.stats);
      setDemandesChart(res.data.demandes_chart);
      setPharmaciesChart(res.data.pharmacies_chart);
      setDemandesTypeChart(res.data.demandes_type_chart);
      setPatientsChart(res.data.patients_chart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={s.root}>
        <Sidebar />
        <Navbar title="Tableau de bord" />
        <main style={s.main}>
          <div style={s.loadingBox}>
            <div style={s.spinner} />
            <p style={{ color: '#6b7280', marginTop: 16 }}>Chargement du tableau de bord...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <Sidebar />
      <Navbar title="Tableau de bord" />
      <main style={s.main}>

        {/* STAT CARDS ROW 1 */}
        <div style={s.statsGrid}>
          <StatCard
            icon="👥" label="Patients actifs"
            value={stats.patients}
            sub={`${stats.patients_suspendus} suspendus`}
            accent="#008339"
            onClick={() => navigate('/admin/patients')}
          />
          <StatCard
            icon="🏥" label="Pharmacies approuvées"
            value={stats.pharmacies}
            sub={stats.pharmacies_en_attente > 0 ? `⚠️ ${stats.pharmacies_en_attente} en attente` : 'Aucune en attente'}
            accent="#3b82f6"
            subAlert={stats.pharmacies_en_attente > 0}
            onClick={() => navigate('/admin/pharmacies')}
          />
          <StatCard
            icon="📋" label="Total demandes"
            value={stats.demandes}
            sub={`${stats.demandes_en_attente} en attente`}
            accent="#f59e0b"
            onClick={() => navigate('/admin/pharmacies')}
          />
          <StatCard
            icon="💊" label="Médicaments"
            value={stats.medicaments}
            sub="Dans le catalogue"
            accent="#8b5cf6"
            onClick={() => navigate('/admin/medicaments')}
          />
        </div>

        {/* STAT CARDS ROW 2 */}
        <div style={{ ...s.statsGrid, marginBottom: 28 }}>
          <StatCard
            icon="📦" label="Produits boutique"
            value={stats.produits}
            sub="Produits actifs"
            accent="#ec4899"
            onClick={() => navigate('/admin/produits')}
          />
          <div style={{ ...s.quickCard, cursor: 'pointer' }} onClick={() => navigate('/admin/pharmacies')}>
            <div style={s.quickCardIcon}>⏳</div>
            <div>
              <div style={s.quickCardValue}>{stats.pharmacies_en_attente}</div>
              <div style={s.quickCardLabel}>Pharmacies en attente d'approbation</div>
            </div>
            <div style={s.quickCardArrow}>→</div>
          </div>
          <div style={{ ...s.quickCard, cursor: 'pointer' }} onClick={() => navigate('/admin/notifications')}>
            <div style={s.quickCardIcon}>🔔</div>
            <div>
              <div style={s.quickCardValue}>{stats.demandes_en_attente}</div>
              <div style={s.quickCardLabel}>Demandes en attente de réponse</div>
            </div>
            <div style={s.quickCardArrow}>→</div>
          </div>
        </div>

        {/* CHARTS ROW 1 */}
        <div style={s.chartsRow}>

          {/* Demandes par mois */}
          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>📈 Demandes par mois</h3>
            {demandesChart.length === 0 ? (
              <div style={s.noData}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={demandesChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone" dataKey="total" stroke="#008339"
                    strokeWidth={3} dot={{ fill: '#008339', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Patients par mois */}
          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>👥 Patients inscrits par mois</h3>
            {patientsChart.length === 0 ? (
              <div style={s.noData}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={patientsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#008339" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CHARTS ROW 2 */}
        <div style={s.chartsRow}>

          {/* Statut pharmacies */}
          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>🏥 Statut des pharmacies</h3>
            {pharmaciesChart.length === 0 ? (
              <div style={s.noData}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pharmaciesChart}
                    cx="50%" cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pharmaciesChart.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Type demandes */}
          <div style={s.chartCard}>
            <h3 style={s.chartTitle}>📋 Type de demandes</h3>
            {demandesTypeChart.length === 0 ? (
              <div style={s.noData}>Aucune donnée disponible</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={demandesTypeChart}
                    cx="50%" cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {demandesTypeChart.map((_, index) => (
                      <Cell key={index} fill={['#008339', '#3b82f6'][index % 2]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* TABLES ROW */}
        <div style={s.chartsRow}>

          {/* Dernières demandes */}
          <div style={{ ...s.chartCard, flex: 2 }}>
            <h3 style={s.chartTitle}>📋 Dernières demandes</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {['ID', 'Patient', 'Type', 'État', 'Date'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!stats.demandes_recentes || stats.demandes_recentes.length === 0 ? (
                    <tr><td colSpan={5} style={s.noData}>Aucune demande</td></tr>
                  ) : stats.demandes_recentes.map((d, i) => {
                    const ec = ETAT_CONFIG[d.etat] || ETAT_CONFIG.en_attente;
                    return (
                      <tr key={d.demande_id} style={i % 2 === 0 ? s.trEven : s.trOdd}>
                        <td style={s.td}><span style={s.muted}>#{d.demande_id}</span></td>
                        <td style={s.td}><span style={s.nom}>{d.patient}</span></td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: '#e6f4ec', color: '#008339' }}>
                            {d.type === 'manuelle' ? '✍️ Manuelle' : '📋 Ordonnance'}
                          </span>
                        </td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, background: ec.bg, color: ec.color }}>
                            {ec.label}
                          </span>
                        </td>
                        <td style={s.td}><span style={s.muted}>{d.date}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pharmacies en attente */}
          <div style={{ ...s.chartCard, flex: 1 }}>
            <h3 style={s.chartTitle}>⏳ Pharmacies en attente</h3>
            {!stats.pharmacies_attente || stats.pharmacies_attente.length === 0 ? (
              <div style={s.noData}>✅ Aucune pharmacie en attente</div>
            ) : stats.pharmacies_attente.map((p, i) => (
              <div key={p.pharmacie_id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 0',
                borderBottom: i < stats.pharmacies_attente.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: '#fef3c7', color: '#d97706',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 16
                }}>
                  {p.nom.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={s.nom}>{p.nom}</div>
                  <div style={{ ...s.muted, fontSize: 12 }}>{p.email}</div>
                </div>
                <button
                  onClick={() => navigate('/admin/pharmacies')}
                  style={{
                    padding: '6px 12px', background: '#008339', color: '#fff',
                    border: 'none', borderRadius: 8, fontSize: 12,
                    fontWeight: 600, cursor: 'pointer'
                  }}>
                  Voir
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Sub-components ── */
function StatCard({ icon, label, value, sub, accent, subAlert, onClick }) {
  return (
    <div style={{ ...s.statCard, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ ...s.statIconWrap, background: accent + '18', color: accent }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={s.statValue}>{value ?? 0}</div>
        <div style={s.statLabel}>{label}</div>
        {sub && (
          <div style={{ fontSize: 12, marginTop: 4, color: subAlert ? '#d97706' : '#9ca3af', fontWeight: subAlert ? 600 : 400 }}>
            {sub}
          </div>
        )}
      </div>
      {onClick && <div style={{ color: '#9ca3af', fontSize: 18 }}>→</div>}
    </div>
  );
}

/* ── Styles ── */
const s = {
  root:    { display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" },
  main:    { marginLeft: '260px', marginTop: '70px', padding: '32px', flex: 1 },

  loadingBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' },
  spinner:    { width: 40, height: 40, border: '4px solid #e5e7eb', borderTop: '4px solid #008339', borderRadius: '50%', animation: 'spin 1s linear infinite' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 20 },
  statCard:  {
    background: '#fff', borderRadius: 16, padding: 24,
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  statIconWrap: { width: 54, height: 54, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 },
  statValue:    { fontSize: 28, fontWeight: 700, color: '#1f2937' },
  statLabel:    { fontSize: 13, color: '#6b7280', marginTop: 2 },

  quickCard: {
    background: '#fff', borderRadius: 16, padding: 24,
    display: 'flex', alignItems: 'center', gap: 16,
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
  },
  quickCardIcon:  { fontSize: 28 },
  quickCardValue: { fontSize: 24, fontWeight: 700, color: '#1f2937' },
  quickCardLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  quickCardArrow: { fontSize: 20, color: '#9ca3af', marginLeft: 'auto' },

  chartsRow: { display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' },
  chartCard: {
    background: '#fff', borderRadius: 16, padding: 24,
    flex: 1, minWidth: 300,
    boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
  },
  chartTitle: { fontSize: 16, fontWeight: 700, color: '#1f2937', marginBottom: 20 },

  table:  { width: '100%', borderCollapse: 'collapse', minWidth: 400 },
  th:     { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  td:     { padding: '12px 12px', fontSize: 14, color: '#374151', verticalAlign: 'middle', borderBottom: '1px solid #f3f4f6' },
  trEven: { background: '#fff'    },
  trOdd:  { background: '#fafafa' },

  nom:    { fontWeight: 600, color: '#1f2937' },
  muted:  { color: '#6b7280', fontSize: 13 },
  badge:  { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  noData: { textAlign: 'center', padding: 32, color: '#9ca3af', fontSize: 14 },
};