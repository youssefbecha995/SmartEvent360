import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { I18nProvider } from '@/lib/i18n';
import { ToastProvider } from '@/components/ui/Toast';

// Public pages
import PublicLayout from '@/layouts/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import ServicesPage from '@/pages/public/ServicesPage';
import PacksPage from '@/pages/public/PacksPage';
import AboutPage from '@/pages/public/AboutPage';
import ContactPage from '@/pages/public/ContactPage';
import QuotePage from '@/pages/public/QuotePage';
import RdvPage from '@/pages/public/RdvPage';

// Auth pages
import LoginClientPage from '@/pages/auth/LoginClientPage';
import LoginAdminPage from '@/pages/auth/LoginAdminPage';
import RegisterPage from '@/pages/auth/RegisterPage';

// Client pages
import ClientLayout from '@/layouts/ClientLayout';
import ClientDashboard from '@/pages/client/ClientDashboard';
import ClientDevis from '@/pages/client/ClientDevis';
import ClientPaiements from '@/pages/client/ClientPaiements';
import ClientRendezVous from '@/pages/client/ClientRendezVous';
import ClientPacks from '@/pages/client/ClientPacks';
import ClientContrats from '@/pages/client/ClientContrats';
import ClientProfil from '@/pages/client/ClientProfil';
import ClientSupport from '@/pages/client/ClientSupport';
import ClientServices from '@/pages/client/ClientServices';

// Admin pages
import AdminLayout from '@/layouts/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminClients from '@/pages/admin/AdminClients';
import AdminClientDetail from '@/pages/admin/AdminClientDetail';
import AdminDevis from '@/pages/admin/AdminDevis';
import AdminDevisDetail from '@/pages/admin/AdminDevisDetail';
import AdminEvenements from '@/pages/admin/AdminEvenements';
import AdminEvenementDetail from '@/pages/admin/AdminEvenementDetail';
import AdminPersonnel from '@/pages/admin/AdminPersonnel';
import AdminEquipements from '@/pages/admin/AdminEquipements';
import AdminEquipementDetail from '@/pages/admin/AdminEquipementDetail';
import AdminCalendrier from '@/pages/admin/AdminCalendrier';
import AdminTresorerie from '@/pages/admin/AdminTresorerie';
import AdminAppels from '@/pages/admin/AdminAppels';
import AdminRendezVous from '@/pages/admin/AdminRendezVous';
import AdminParametres from '@/pages/admin/AdminParametres';
import AdminPacks from '@/pages/admin/AdminPacks';
import AdminPackDetail from '@/pages/admin/AdminPackDetail';
import AdminReservations from '@/pages/admin/AdminReservations';
import AdminServices from '@/pages/admin/AdminServices';
import AdminServiceDetail from '@/pages/admin/AdminServiceDetail';

const SPINNER = (
  <div className="min-h-screen bg-dark-900 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ADMIN_ROLES = ['super_admin'];

function ProtectedClient({ children }: { children: React.ReactNode }) {
  const { user, hydrated, profile } = useAuth();

  // Attendre que localStorage soit lu avant de prendre une décision
  if (!hydrated) return SPINNER;

  if (!user) return <Navigate to="/connexion-client" replace />;

  // Si admin connecté sur /client → le renvoyer vers son espace
  if (profile && ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, hydrated, profile } = useAuth();

  // Attendre que localStorage soit lu — évite le flash de redirection
  if (!hydrated) return SPINNER;

  if (!user) return <Navigate to="/connexion-admin" replace />;

  // Vérification stricte du rôle depuis le profil persisté
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return <Navigate to="/client" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/packs" element={<PacksPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/devis" element={<QuotePage />} />
        <Route path="/rendez-vous" element={<RdvPage />} />
      </Route>

      {/* Auth */}
      <Route path="/connexion-client" element={<LoginClientPage />} />
      <Route path="/connexion-admin" element={<LoginAdminPage />} />
      <Route path="/inscription" element={<RegisterPage />} />

      {/* Client */}
      <Route path="/client" element={<ProtectedClient><ClientLayout /></ProtectedClient>}>
        <Route index element={<ClientDashboard />} />
        <Route path="packs" element={<ClientPacks />} />
        <Route path="devis" element={<ClientDevis />} />
        <Route path="paiements" element={<ClientPaiements />} />
        <Route path="rendez-vous" element={<ClientRendezVous />} />
        <Route path="contrats" element={<ClientContrats />} />
        <Route path="profil" element={<ClientProfil />} />
        <Route path="support" element={<ClientSupport />} />
        <Route path="services" element={<ClientServices />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>}>
        <Route index element={<AdminDashboard />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="clients/:id" element={<AdminClientDetail />} />
        <Route path="devis" element={<AdminDevis />} />
        <Route path="devis/:id" element={<AdminDevisDetail />} />
        <Route path="evenements" element={<AdminEvenements />} />
        <Route path="evenements/:id" element={<AdminEvenementDetail />} />
        <Route path="personnel" element={<AdminPersonnel />} />
        <Route path="equipements" element={<AdminEquipements />} />
        <Route path="equipements/:id" element={<AdminEquipementDetail />} />
        <Route path="calendrier" element={<AdminCalendrier />} />
        <Route path="tresorerie" element={<AdminTresorerie />} />
        <Route path="appels" element={<AdminAppels />} />
        <Route path="rendez-vous" element={<AdminRendezVous />} />
        <Route path="parametres" element={<AdminParametres />} />
        <Route path="packs" element={<AdminPacks />} />
        <Route path="packs/:id" element={<AdminPackDetail />} />
        <Route path="reservations" element={<AdminReservations />} />
        <Route path="services" element={<AdminServices />} />
        <Route path="services/:id" element={<AdminServiceDetail />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
