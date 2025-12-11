import React, { useState, useEffect } from 'react';

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
    const [period, setPeriod] = useState('last30days'); // 'last30days' or 'currentYear'
    const [loading, setLoading] = useState(true);

    // This will be replaced by a call to a serverless function
        useEffect(() => {
            const fetchKpis = async () => {
                setLoading(true);
                try {
                    const response = await fetch(`/get-kpis?period=${period}`);
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.details || errorData.error || 'Erreur lors du chargement des KPIs.');
                    }
                    const data = await response.json();
                    setKpis({
                        revenue: `${data.revenue}€`,
                        totalOrders: data.totalOrders,
                        newClients: data.newClients
                    });
                } catch (error) {
                    console.error('Error fetching KPIs:', error);
                    alert(`Erreur: ${error.message}`);
                    setKpis({ revenue: 'N/A', totalOrders: 'N/A', newClients: 'N/A' });
                } finally {
                    setLoading(false);
                }
            };
    
            fetchKpis();
        }, [period]);
    
        const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
        const headerStyle = { marginBottom: '30px' };
        const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' };
        const toggleContainerStyle = { display: 'flex', justifyContent: 'center', margin: '30px 0' };
        const toggleButtonStyle = {
            padding: '10px 20px',
            fontSize: '1rem',
            border: '1px solid #d4af37',
            background: 'transparent',
            color: '#d4af37',
            cursor: 'pointer',
        };
        const activeToggleStyle = {
            ...toggleButtonStyle,
            background: '#d4af37',
            color: 'white',
        };
    
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <h1>Statistiques</h1>
                    <p>Aperçu de la performance de votre activité.</p>
                </div>
    
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
                    <StatistiqueCard title="Chiffre d'affaires" value={kpis.revenue} isLoading={loading} />
                    <StatistiqueCard title="Nombre de commandes" value={kpis.totalOrders} isLoading={loading} />
                    <StatistiqueCard title="Nouveaux clients" value={kpis.newClients} isLoading={loading} />
                </div>
            </div>
        );
    };
export default Statistiques;
