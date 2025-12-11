import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const StatistiqueCard = ({ title, value, isLoading }) => {
    const cardStyle = {
        background: 'white',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        textAlign: 'center',
    };
    const titleStyle = {
        fontSize: '1rem',
        color: '#6c757d',
        margin: '0 0 10px 0',
    };
    const valueStyle = {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#343a40',
        margin: 0,
    };

    return (
        <div style={cardStyle}>
            <h3 style={titleStyle}>{title}</h3>
            {isLoading ? <p>...</p> : <p style={valueStyle}>{value}</p>}
        </div>
    );
};

const Statistiques = () => {
    const [kpis, setKpis] = useState({
        revenue: 0,
        totalOrders: 0,
        newClients: 0
    });
    const [period, setPeriod] = useState('last30days');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState([]);

    const addDebug = (message) => {
        console.log(message);
        setDebugInfo(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
    };

    useEffect(() => {
        console.log('=== COMPONENT MOUNTED ===');
        addDebug('Component mounted');
        
        const fetchKpis = async () => {
            setLoading(true);
            setError(null);
            setDebugInfo([]);
            addDebug(`Fetching KPIs for period: ${period}`);
            
            try {
                // Vérifier si supabase est disponible
                if (!supabase) {
                    throw new Error("Supabase client non disponible");
                }
                addDebug('Supabase client OK');

                // Vérifier l'URL de l'environnement
                const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
                addDebug(`Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'UNDEFINED'}`);
                
                if (!supabaseUrl) {
                    throw new Error("REACT_APP_SUPABASE_URL n'est pas défini dans les variables d'environnement");
                }

                // Get the current session
                addDebug('Getting session...');
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    throw new Error(`Erreur de session: ${sessionError.message}`);
                }
                
                if (!session) {
                    throw new Error("Utilisateur non authentifié");
                }

                addDebug(`Session found - User ID: ${session.user?.id}`);
                
                // Construct URL
                const functionUrl = `${supabaseUrl}/functions/v1/get-kpis?period=${period}`;
                addDebug(`Calling: ${functionUrl}`);
                
                // Call the Edge Function with Authorization header
                const response = await fetch(functionUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`,
                        'Content-Type': 'application/json',
                    }
                });

                addDebug(`Response status: ${response.status}`);

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errorMessage = `Erreur du serveur (status ${response.status})`;
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        addDebug(`Error response: ${JSON.stringify(errorData)}`);
                        errorMessage = errorData.details || errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        addDebug(`Error text: ${errorText}`);
                        errorMessage = errorText || errorMessage;
                    }
                    
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                addDebug(`KPIs data received: ${JSON.stringify(data)}`);
                
                setKpis({
                    revenue: `${data.revenue}€`,
                    totalOrders: data.totalOrders,
                    newClients: data.newClients
                });
                
                addDebug('KPIs set successfully');
            } catch (error) {
                const errorMsg = error.message || 'Erreur inconnue';
                addDebug(`ERROR: ${errorMsg}`);
                console.error('[Statistiques] Error:', error);
                setError(errorMsg);
                setKpis({ 
                    revenue: 'N/A', 
                    totalOrders: 'N/A', 
                    newClients: 'N/A' 
                });
            } finally {
                setLoading(false);
                addDebug('Loading complete');
            }
        };

        fetchKpis();
    }, [period]);

    const containerStyle = { 
        padding: '20px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
    };
    
    const headerStyle = { 
        marginBottom: '30px' 
    };
    
    const gridStyle = { 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px',
        marginTop: '20px'
    };
    
    const toggleContainerStyle = { 
        display: 'flex', 
        justifyContent: 'center', 
        margin: '30px 0',
        gap: '0'
    };
    
    const toggleButtonStyle = {
        padding: '10px 20px',
        fontSize: '1rem',
        border: '1px solid #d4af37',
        background: 'transparent',
        color: '#d4af37',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
    };
    
    const activeToggleStyle = {
        ...toggleButtonStyle,
        background: '#d4af37',
        color: 'white',
    };

    const errorBoxStyle = {
        backgroundColor: '#f8d7da',
        border: '1px solid #f5c6cb',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        color: '#721c24'
    };

    const debugBoxStyle = {
        backgroundColor: '#f0f0f0',
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '15px',
        marginTop: '20px',
        maxHeight: '300px',
        overflow: 'auto',
        fontSize: '0.85rem',
        fontFamily: 'monospace'
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h1>Statistiques</h1>
                <p>Aperçu de la performance de votre activité.</p>
            </div>

            {error && (
                <div style={errorBoxStyle}>
                    <strong>⚠️ Erreur:</strong> {error}
                </div>
            )}

            <div style={toggleContainerStyle}>
                <button
                    style={period === 'last30days' ? activeToggleStyle : toggleButtonStyle}
                    onClick={() => setPeriod('last30days')}
                >
                    30 derniers jours
                </button>
                <button
                    style={period === 'currentYear' ? activeToggleStyle : toggleButtonStyle}
                    onClick={() => setPeriod('currentYear')}
                >
                    Cette année
                </button>
            </div>

            <div style={gridStyle}>
                <StatistiqueCard 
                    title="Chiffre d'affaires" 
                    value={kpis.revenue} 
                    isLoading={loading} 
                />
                <StatistiqueCard 
                    title="Nombre de commandes" 
                    value={kpis.totalOrders} 
                    isLoading={loading} 
                />
                <StatistiqueCard 
                    title="Nouveaux clients" 
                    value={kpis.newClients} 
                    isLoading={loading} 
                />
            </div>

            {/* Debug Panel */}
            <div style={debugBoxStyle}>
                <h3 style={{ marginTop: 0 }}>Debug Logs:</h3>
                {debugInfo.length === 0 ? (
                    <p>Aucun log disponible</p>
                ) : (
                    debugInfo.map((log, idx) => (
                        <div key={idx}>{log}</div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Statistiques;