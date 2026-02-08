import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Sidebar from './Sidebar';
import Scanner from './Scanner';
import Demandes from './Demandes';
import DemandesEnCours from './DemandesEnCours';
import Historique from './pages/Historique';
import Particuliers from './pages/Particuliers';
import Entreprises from './pages/Entreprises';
import Devis from './pages/Devis';
import Factures from './pages/Factures';
import Parametres from './pages/Parametres';
import Services from './pages/Services';
import CalendarSettings from './pages/CalendarSettings';
import Abonnements from './pages/Abonnements';
import AdminAccountSettings from './pages/AdminAccountSettings';
import APreparer from './pages/APreparer';
import Validation from './pages/Validation';
import Statistiques from './pages/Statistiques';
import Depenses from './pages/Depenses';
import Plats from './pages/Plats'; 
import Events from './pages/Events'; 
import Accueil from './pages/Accueil'; 
import { useBusinessUnit } from './BusinessUnitContext';

// --- Composants Login (inchangé) ---
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); setIsError(true); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9f9f9' }}>
      <div style={{ width: '400px', padding: '30px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>Connexion Administrateur</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mot de passe:</label>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}>
            {loading ? 'Chargement...' : 'Se connecter'}
          </button>
          {message && <p style={{ textAlign: 'center', marginTop: '15px', color: isError ? 'red' : 'green' }}>{message}</p>}
        </form>
      </div>
    </div>
  );
};

const mainContentStyle = { flex: 1, padding: '20px', overflowY: 'auto', backgroundColor: '#f4f7fa' };

const DashboardLayout = () => {
    const { businessUnit } = useBusinessUnit();
    const [newCount, setNewCount] = useState(0);
    const [inProgressCount, setInProgressCount] = useState(0);
    const [pendingQuotesCount, setPendingQuotesCount] = useState(0);
    const [toPrepareCount, setToPrepareCount] = useState(0);
    const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
    const [depositPaidInvoicesCount, setDepositPaidInvoicesCount] = useState(0);
    const [waitingForPrepCount, setWaitingForPrepCount] = useState(0);
    const [activeSubscriptionsCount, setActiveSubscriptionsCount] = useState(0);
    const [subscriptionsNeedAttentionCount, setSubscriptionsNeedAttentionCount] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [notifications, setNotifications] = useState([]);

    const fetchCounts = useCallback(async () => {
        const { count: newDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('status', 'Nouvelle').eq('business_unit', businessUnit);
        setNewCount(newDemandsCount || 0);

        const { count: inProgressDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('business_unit', businessUnit).or(`and(type.in.("COMMANDE_MENU","COMMANDE_SPECIALE"),status.not.in.("completed","cancelled","paid","Nouvelle","En attente de préparation","Préparation en cours")),and(type.eq.RESERVATION_SERVICE,status.in.("En attente de traitement",confirmed))`);
        setInProgressCount(inProgressDemandsCount || 0);
        
        const { count: sentQuotesCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent').eq('business_unit', businessUnit);
        setPendingQuotesCount(sentQuotesCount || 0);

        const { count: toPrepareDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).in('status', ['En attente de préparation', 'Préparation en cours']).eq('business_unit', businessUnit);
        setToPrepareCount(toPrepareDemandsCount || 0);

        const { count: pendingInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('business_unit', businessUnit);
        setPendingInvoicesCount(pendingInvoices || 0);

        const { count: depositPaidInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'deposit_paid').eq('business_unit', businessUnit);
        setDepositPaidInvoicesCount(depositPaidInvoices || 0);

        const { count: activeSubsCount } = await supabase.from('abonnements').select('*', { count: 'exact', head: true }).eq('status', 'actif').eq('business_unit', businessUnit);
        setActiveSubscriptionsCount(activeSubsCount || 0);
    }, [businessUnit]);

    useEffect(() => {
        fetchCounts();
        
        const handleDbChanges = (payload) => {
            console.log(`[REALTIME] Event detected on ${payload.table}`);
            
            // Sécurité Unité Commerciale
            if (payload.new && payload.new.business_unit && payload.new.business_unit !== businessUnit) return;

            let newNotification = null;

            // --- 1. TABLE DEMANDES ---
            if (payload.table === 'demandes') {
                if (payload.eventType === 'INSERT') {
                    newNotification = { id: Date.now(), type: 'info', message: `Nouvelle demande reçue (${payload.new.type}).`, timestamp: new Date(), link: '/nouvelles-demandes' };
                } else if (payload.eventType === 'UPDATE' && payload.new.status === 'Confirmée par client' && payload.old.status !== 'Confirmée par client') {
                    newNotification = { id: Date.now(), type: 'success', message: `Un client a confirmé son intérêt pour une prestation !`, timestamp: new Date(), link: '/demandes-en-cours' };
                }
            } 
            // --- 2. TABLE QUOTES (DEVIS) ---
            else if (payload.table === 'quotes' && payload.eventType === 'UPDATE') {
                if (payload.new.status === 'accepted' && payload.old.status !== 'accepted') {
                    newNotification = { id: Date.now(), type: 'success', message: `Le devis #${payload.new.document_number} a été accepté.`, timestamp: new Date(), link: '/devis' };
                } else if (payload.new.status === 'rejected' && payload.old.status !== 'rejected') {
                    newNotification = { id: Date.now(), type: 'error', message: `Le devis #${payload.new.document_number} a été refusé.`, timestamp: new Date(), link: '/devis' };
                }
            } 
            // --- 3. TABLE INVOICES (FACTURES) ---
            else if (payload.table === 'invoices' && payload.eventType === 'UPDATE') {
                 if (payload.new.status === 'paid' && payload.old.status !== 'paid') {
                    newNotification = { id: Date.now(), type: 'success', message: `Facture #${payload.new.document_number} entièrement payée !`, timestamp: new Date(), link: '/factures' };
                } else if (payload.new.status === 'deposit_paid' && payload.old.status !== 'deposit_paid') {
                    newNotification = { id: Date.now(), type: 'info', message: `Acompte reçu pour la facture #${payload.new.document_number}.`, timestamp: new Date(), link: '/factures' };
                }
            }

            if (newNotification) {
                setNotifications(prev => [newNotification, ...prev]);
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Asiacuisine.re', { body: newNotification.message });
                }
            }
            fetchCounts();
        };

        const channel = supabase.channel('all-db-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, handleDbChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, handleDbChanges)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, handleDbChanges)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [fetchCounts, businessUnit]);

    return (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', height: '100vh', overflow: 'hidden' }}>
            <Sidebar 
                newCount={newCount} inProgressCount={inProgressCount} pendingQuotesCount={pendingQuotesCount} 
                toPrepareCount={toPrepareCount} pendingInvoicesCount={pendingInvoicesCount}
                depositPaidInvoicesCount={depositPaidInvoicesCount} activeSubscriptionsCount={activeSubscriptionsCount}
                isMobile={isMobile} notifications={notifications} setNotifications={setNotifications} 
            />
            <main style={mainContentStyle}>
                <Routes>
                    <Route path="/" element={<Accueil />} />
                    <Route path="/nouvelles-demandes" element={<Demandes />} />
                    <Route path="/demandes-en-cours" element={<DemandesEnCours />} />
                    <Route path="/a-preparer" element={<APreparer />} />
                    <Route path="/historique" element={<Historique />} />
                    <Route path="/particuliers" element={<Particuliers />} />
                    <Route path="/entreprises" element={<Entreprises />} />
                    <Route path="/devis" element={<Devis />} />
                    <Route path="/factures" element={<Factures />} />
                    <Route path="/scanner" element={<Scanner />} />
                    <Route path="/parametres" element={<Parametres />} />
                    <Route path="/validation" element={<Validation />} />
                    <Route path="/services" element={<Services />} />
                    <Route path="/calendrier" element={<CalendarSettings />} />
                    <Route path="/abonnements" element={<Abonnements />} />
                    <Route path="/admin-account" element={<AdminAccountSettings />} />
                    <Route path="/plats" element={<Plats />} />
                    <Route path="/statistiques" element={<Statistiques />} />
                    <Route path="/depenses" element={<Depenses />} />
                    <Route path="/events" element={<Events />} />
                </Routes>
            </main>
        </div>
    );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    supabase.auth.onAuthStateChange((_event, session) => { setSession(session); });
  }, []);

  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;

  return (
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={session ? <DashboardLayout /> : <Navigate to="/login" />} />
      </Routes>
  );
}

export default App;
