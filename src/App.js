import React, { useState, useEffect, useCallback } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Sidebar from './Sidebar';
import Scanner from './Scanner';
import Demandes from './Demandes';
import DemandesEnCours from './DemandesEnCours';
import Historique from './pages/Historique'; // Importation
import Particuliers from './pages/Particuliers';
import Entreprises from './pages/Entreprises';
import Devis from './pages/Devis';
import Factures from './pages/Factures';
import Parametres from './pages/Parametres';
import Services from './pages/Services'; // Importation de la page Services
import CalendarSettings from './pages/CalendarSettings'; // Importation de la page CalendarSettings
import Abonnements from './pages/Abonnements'; // Importation de la page Abonnements
import AdminAccountSettings from './pages/AdminAccountSettings'; // Importation de la page Compte Administrateur
import APreparer from './pages/APreparer';
import Validation from './pages/Validation'; // Importation de la page Validation

// --- Composants ---

const Login = () => {
  // ... (contenu inchangé)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Ajout de l'état
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setIsError(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f9f9f9' }}>
      <div style={{ width: '400px', padding: '30px', background: 'white', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '25px' }}>Connexion Administrateur</h2>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Email:</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre email" required style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '20px', position: 'relative' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Mot de passe:</label>
            <input 
              type={showPassword ? 'text' : 'password'} 
              id="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="Votre mot de passe" 
              required 
              style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(15%)', // Centrer verticalement
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px', // Augmenter la taille pour l'icône
                color: '#666',
              }}
            >
              {showPassword ? '👁️' : '🔒'} {/* Icône d'œil ouvert / Icône de cadenas */}
            </button>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Chargement...' : 'Se connecter'}
          </button>
          {message && <p style={{ textAlign: 'center', marginTop: '15px', color: isError ? 'red' : 'green' }}>{message}</p>}
        </form>
      </div>
    </div>
  );
};

const mainContentStyle = {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    backgroundColor: '#f4f7fa',
};

const DashboardLayout = () => {
    const [newCount, setNewCount] = useState(0);
    const [inProgressCount, setInProgressCount] = useState(0);
    const [pendingQuotesCount, setPendingQuotesCount] = useState(0);
    const [toPrepareCount, setToPrepareCount] = useState(0);
    const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
    const [depositPaidInvoicesCount, setDepositPaidInvoicesCount] = useState(0);
    const [waitingForPrepCount, setWaitingForPrepCount] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const appStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
    };

    const fetchCounts = useCallback(async () => {
        console.log("--- [DEBUG] Fetching all counts ---");
        
        // Demandes
        const { count: newDemandsCount, error: newError } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('status', 'Nouvelle');
        if(newError) console.error("Error fetching new demands:", newError);
        console.log("DEBUG: New Demands Count:", newDemandsCount);
        setNewCount(newDemandsCount);

        const { count: inProgressDemandsCount } = await supabase
            .from('demandes')
            .select('*', { count: 'exact', head: true })
            .or(`and(type.eq.COMMANDE_MENU,status.not.in.("completed","cancelled","paid","Nouvelle","En attente de préparation","Préparation en cours")),and(type.eq.RESERVATION_SERVICE,status.in.("En attente de traitement","confirmed"))`);
        setInProgressCount(inProgressDemandsCount);
        
        // Devis
        const { count: sentQuotesCount, error: quotesError } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent');
        if(quotesError) console.error("Error fetching quotes:", quotesError);
        console.log("DEBUG: Sent Quotes Count:", sentQuotesCount);
        setPendingQuotesCount(sentQuotesCount);

        // Commandes à préparer
        const { count: toPrepareDemandsCount, error: toPrepareError } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).in('status', ['En attente de préparation', 'Préparation en cours']);
        if(toPrepareError) console.error("Error fetching to-prepare demands:", toPrepareError);
        console.log("DEBUG: To Prepare Demands Count:", toPrepareDemandsCount);
        setToPrepareCount(toPrepareDemandsCount);

        // Factures
        const { count: pendingInvoices, error: pendingInvError } = await supabase.from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending')
            .not('quote_id', 'is', null); // NEW FILTER
        if(pendingInvError) console.error("Error fetching pending invoices:", pendingInvError);
        console.log("DEBUG: Pending Invoices Count:", pendingInvoices);
        setPendingInvoicesCount(pendingInvoices);

        const { count: depositPaidInvoices, error: depositInvError } = await supabase.from('invoices')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'deposit_paid')
            .not('quote_id', 'is', null); // NEW FILTER
        if(depositInvError) console.error("Error fetching deposit paid invoices:", depositInvError);
        console.log("DEBUG: Deposit Paid Invoices Count:", depositPaidInvoices);
        setDepositPaidInvoicesCount(depositPaidInvoices);

        const { count: waitingForPrep, error: waitingError } = await supabase
            .from('invoices')
            .select('*, demandes!inner(status)', { count: 'exact', head: true })
            .eq('status', 'paid')
            .not('quote_id', 'is', null)
            .not('demandes.status', 'in', '("En attente de préparation","Préparation en cours","completed")');
        if(waitingError) console.error("Error fetching waiting for prep invoices:", waitingError);
        console.log("DEBUG: Waiting for Prep Invoices Count:", waitingForPrep);
        setWaitingForPrepCount(waitingForPrep);

    }, []);

    useEffect(() => {
        // --- 1. Initial fetch and notification permission request ---
        fetchCounts();
        if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }

        // --- 2. Realtime listener for NEW demands (for notifications) ---
        const showNotification = () => {
            if (Notification.permission === 'granted') {
                new Notification('Nouvelle demande reçue !', {
                    body: 'Une nouvelle demande est en attente de traitement.',
                    icon: '/logo.svg' // Assurez-vous que ce fichier est dans votre dossier public
                });
            }
        };

        const handleNewDemand = (payload) => {
            console.log('--- [REALTIME] New demand INSERT detected.', payload);
            showNotification();
            fetchCounts(); // Refetch all counts to update UI
        };
        
        const newDemandsChannel = supabase.channel('nouvelles-demandes-insert')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'demandes' }, handleNewDemand)
            .subscribe();

        // --- 3. Realtime listener for OTHER updates (silent UI refresh) ---
        const handleUpdates = (payload) => {
            console.log(`--- [REALTIME] UPDATE detected on table, refetching counts.`, payload.table);
            fetchCounts();
        };

        const updatesChannel = supabase.channel('db-updates')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'demandes' }, handleUpdates)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, handleUpdates)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, handleUpdates)
            .subscribe();

        // --- 4. Window resize listener ---
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

        // --- 5. Cleanup ---
        return () => {
            supabase.removeChannel(newDemandsChannel);
            supabase.removeChannel(updatesChannel);
            window.removeEventListener('resize', handleResize);
        };
    }, [fetchCounts]);

    return (
        <div style={appStyle}>
            <Sidebar 
                newCount={newCount} 
                inProgressCount={inProgressCount} 
                pendingQuotesCount={pendingQuotesCount} 
                toPrepareCount={toPrepareCount}
                pendingInvoicesCount={pendingInvoicesCount}
                depositPaidInvoicesCount={depositPaidInvoicesCount}
                waitingForPrepCount={waitingForPrepCount}
                isMobile={isMobile} 
            />
            <main style={mainContentStyle}>
                <Routes>
                    <Route path="/" element={<Demandes />} />
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
                </Routes>
            </main>
        </div>
    );
};

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Chargement...</div>;
  }

  return (
      <Routes>
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/" />} />
        <Route path="/*" element={session ? <DashboardLayout /> : <Navigate to="/login" />} />
      </Routes>
  );
}

export default App;
