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

    useEffect(() => {
        const fetchKpis = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                
                if (sessionError) {
                    throw new Error(`Erreur de session: ${sessionError.message}`);
                }
                
                if (!session) {
                    throw new Error("Utilisateur non authentifié");
                }
                
                const response = await fetch(
                    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-kpis?period=${period}`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errorMessage = `Erreur du serveur (status ${response.status})`;
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.details || errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                    }
                    
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                
                setKpis({
                    revenue: `${data.revenue}€`,
                    totalOrders: data.totalOrders,
                    newClients: data.newClients
                });
            } catch (error) {
                console.error('Error fetching KPIs:', error);
                setError(error.message);
                setKpis({ 
                    revenue: 'N/A', 
                    totalOrders: 'N/A', 
                    newClients: 'N/A' 
                });
            } finally {
                setLoading(false);
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
        </div>
    );
};

export default Statistiques;