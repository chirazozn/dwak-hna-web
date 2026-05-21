import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPatients from './pages/admin/Patients';
import AdminPharmacies from './pages/admin/Pharmacies';
import AdminMedicaments from './pages/admin/Medicaments';
import AdminProduits from './pages/admin/Produits';
import AdminNotifications from './pages/admin/Notifications';
import AdminPublicites from './pages/admin/Publicites';
import AdminPartenaires from './pages/admin/Partenaires';
import AdminDemandes from './pages/admin/Demandes';
import AdminMessages from './pages/admin/Messages';
import AdminProfil from './pages/admin/Profil';
import Register from './pages/pharmacie/Register';
import EnAttente from './pages/pharmacie/EnAttente';
import PharmacieDashboard from './pages/pharmacie/Dashboard';
import PharmacieDemandes from './pages/pharmacie/Demandes';
import PharmacieProduits from './pages/pharmacie/Produits';
import PharmacieProfil from './pages/pharmacie/Profil';



import './App.css';

const PrivateRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin/dashboard" element={<PrivateRoute role="admin"><AdminDashboard /></PrivateRoute>} />
        <Route path="/admin/patients" element={<PrivateRoute role="admin"><AdminPatients /></PrivateRoute>} />
        <Route path="/admin/pharmacies" element={<PrivateRoute role="admin"><AdminPharmacies /></PrivateRoute>} />
        <Route path="/admin/medicaments" element={<PrivateRoute role="admin"><AdminMedicaments /></PrivateRoute>} />
        <Route path="/admin/produits" element={<PrivateRoute role="admin"><AdminProduits /></PrivateRoute>} />
        <Route path="/admin/notifications" element={<PrivateRoute role="admin"><AdminNotifications /></PrivateRoute>} />
        <Route path="/admin/publicites" element={<PrivateRoute role="admin"><AdminPublicites /></PrivateRoute>} />
        <Route path="/admin/partenaires" element={<PrivateRoute role="admin"><AdminPartenaires /></PrivateRoute>} />
        <Route path="/pharmacie/dashboard" element={<PrivateRoute role="pharmacie"><PharmacieDashboard /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/login" />} />
        // Dans les routes :
<Route path="/admin/demandes" element={
  <PrivateRoute role="admin"><AdminDemandes /></PrivateRoute>
} />
<Route path="/admin/messages" element={
  <PrivateRoute role="admin"><AdminMessages /></PrivateRoute>
} />
<Route path="/admin/profil" element={
  <PrivateRoute role="admin"><AdminProfil /></PrivateRoute>
} />



<Route path="/pharmacie/register" element={<Register />} />
<Route path="/pharmacie/en-attente" element={<EnAttente />} />
<Route path="/pharmacie/dashboard" element={<PharmacieDashboard />} />
<Route path="/pharmacie/demandes" element={<PharmacieDemandes />} />
<Route path="/pharmacie/produits" element={<PharmacieProduits />} />
<Route path="/pharmacie/profil" element={<PharmacieProfil />} />


      </Routes>
    </Router>
  );
}

export default App;
