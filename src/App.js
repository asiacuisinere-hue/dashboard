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
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const appStyle = {
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        height: '100vh',
        overflow: 'hidden',
    };

    const fetchCounts = useCallback(async () => {
        // Demandes
        const { count: newDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('status', 'Nouvelle');
        setNewCount(newDemandsCount);

        const { count: inProgressDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).not('status', 'in', '("completed", "paid", "cancelled")');
        setInProgressCount(inProgressDemandsCount);
        
        // Devis
        const { count: sentQuotesCount } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent');
        setPendingQuotesCount(sentQuotesCount);

        // Commandes à préparer
        const { count: toPrepareDemandsCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).in('status', ['En attente de préparation', 'Préparation en cours']);
        setToPrepareCount(toPrepareDemandsCount);

        // Factures
        const { count: pendingInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        setPendingInvoicesCount(pendingInvoices);

        const { count: depositPaidInvoices } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'deposit_paid');
        setDepositPaidInvoicesCount(depositPaidInvoices);

    }, []);

    useEffect(() => {
        fetchCounts();
        const channel = supabase.channel('demandes-quotes-invoices-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, () => fetchCounts())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, () => fetchCounts())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchCounts())
            .subscribe();
        
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);

        return () => {
            supabase.removeChannel(channel);
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
                isMobile={isMobile} 
            />
            <main style={mainContentStyle}>
                <Routes>
                    <Route path="/" element={<Demandes />} />
                    <Route path="/demandes-en-cours" element={<DemandesEnCours />} />
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
