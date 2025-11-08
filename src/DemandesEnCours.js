import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import DemandeDetail from './DemandeDetail'; // Assurez-vous que ce composant est adapté

const DemandesEnCours = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [filter, setFilter] = useState({ date: '', status: '' });

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('demandes')
            .select(`
                *,
                clients (
                    *
                )
            `)
            .in('status', ['Payée', 'Confirmée', 'En préparation']);

        if (filter.date) {
            query = query.eq('request_date', filter.date);
        }
        if (filter.status) {
            query = query.eq('status', filter.status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des demandes en cours:', error);
        } else {
            setDemandes(data);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchDemandes();
    }, [fetchDemandes]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };
    
    const resetFilters = () => {
        setFilter({ date: '', status: '' });
    };

    if (loading) {
        return <div>Chargement des demandes en cours...</div>;
    }

    return (
        <div>
            <h1>Demandes en cours</h1>
            <p>Suivi des demandes confirmées, payées et en préparation.</p>

            <div style={filterContainerStyle}>
                <input 
                    type="date" 
                    name="date" 
                    value={filter.date} 
                    onChange={handleFilterChange}
                    style={filterInputStyle}
                />
                <select 
                    name="status" 
                    value={filter.status} 
                    onChange={handleFilterChange}
                    style={filterInputStyle}
                >
                    <option value="">Tous les statuts</option>
                    <option value="Confirmée">Confirmée</option>
                    <option value="Payée">Payée</option>
                    <option value="En préparation">En préparation</option>
                </select>
                <button onClick={resetFilters} style={detailsButtonStyle}>Réinitialiser</button>
            </div>

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Date Demande</th>
                            <th style={thStyle}>Client</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demandes.map(demande => (
                            <tr key={demande.id}>
                                <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                                <td style={tdStyle}>{demande.clients?.last_name || 'N/A'}</td>
                                <td style={tdStyle}>{demande.type}</td>
                                <td style={tdStyle}><span style={statusBadgeStyle(demande.status)}>{demande.status}</span></td>
                                <td style={tdStyle}>
                                    <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>
                                        Voir Détails
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedDemande && (
                <DemandeDetail 
                    demande={selectedDemande} 
                    onClose={() => setSelectedDemande(null)}
                    onUpdate={fetchDemandes} 
                />
            )}
        </div>
    );
};


// --- Styles ---

const filterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center'
};

const filterInputStyle = {
    padding: '8px',
    borderRadius: '5px',
    border: '1px solid #ccc'
};

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
    background: 'white'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd'
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555'
};

const detailsButtonStyle = {
    padding: '8px 12px',
    background: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
};

const statusBadgeStyle = (status) => {
    const colors = {
        'Confirmée': '#28a745',
        'Payée': '#17a2b8',
        'En préparation': '#ffc107',
        'Terminée': '#6c757d',
        'Annulée': '#dc3545'
    };
    return {
        padding: '4px 8px',
        borderRadius: '12px',
        color: status === 'En préparation' ? 'black' : 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        backgroundColor: colors[status] || '#6c757d'
    };
};

export default DemandesEnCours;
