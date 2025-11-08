import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import DemandeDetail from './DemandeDetail';

const DemandesEnCours = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);

    // State for filters
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('all');

    const fetchDemandes = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('demandes')
                .select(`id, created_at, type, status, request_date, details_json, clients ( id, first_name, last_name, email, phone )`);

            // Apply status filter
            if (selectedStatus === 'all') {
                query = query.in('status', ['Payée', 'Confirmée', 'En préparation']);
            } else {
                query = query.eq('status', selectedStatus);
            }

            // Apply date filter
            if (selectedDate) {
                const startDate = new Date(selectedDate);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 1);
                query = query.gte('request_date', startDate.toISOString()).lt('request_date', endDate.toISOString());
            }

            query = query.order('request_date', { ascending: true });

            let { data, error } = await query;

            if (error) throw error;

            setDemandes(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch when filters change
    useEffect(() => {
        fetchDemandes();
    }, [selectedDate, selectedStatus]);

    const handleCloseDetail = () => {
        setSelectedDemande(null);
        fetchDemandes(); // Refresh the list after closing
    };
    
    const resetFilters = () => {
        setSelectedDate('');
        setSelectedStatus('all');
    };

    const getStatusStyle = (status) => {
        const baseStyle = { padding: '3px 8px', borderRadius: '12px', fontSize: '0.8em', color: 'white' };
        switch (status) {
            case 'Payée': return { ...baseStyle, background: '#28a745' };
            case 'Confirmée': return { ...baseStyle, background: '#17a2b8' };
            case 'En préparation': return { ...baseStyle, background: '#007bff' };
            default: return { ...baseStyle, background: '#6c757d' };
        }
    };

    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '20px' }}>Demandes en Cours</h3>

            {/* --- Filtres --- */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
                <div>
                    <label htmlFor="date-filter" style={{ marginRight: '10px' }}>Filtrer par date :</label>
                    <input type="date" id="date-filter" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="status-filter" style={{ marginRight: '10px' }}>Filtrer par statut :</label>
                    <select id="status-filter" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                        <option value="all">Tous les statuts</option>
                        <option value="Payée">Payée</option>
                        <option value="Confirmée">Confirmée</option>
                        <option value="En préparation">En préparation</option>
                    </select>
                </div>
                <button onClick={resetFilters}>Réinitialiser les filtres</button>
            </div>

            {loading ? <p>Chargement...</p> : demandes.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {demandes.map((demande) => (
                        <div key={demande.id} onClick={() => setSelectedDemande(demande.id)} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                            <p><strong>Client:</strong> {demande.clients.last_name || demande.clients.email}</p>
                            <p><strong>Type:</strong> {demande.type}</p>
                            <p><strong>Date:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Statut:</strong> <span style={getStatusStyle(demande.status)}>{demande.status}</span></p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Aucune demande en cours correspondant à vos filtres.</p>
            )}

            {selectedDemande && <DemandeDetail demandeId={selectedDemande} onClose={handleCloseDetail} />}
        </div>
    );
};

export default DemandesEnCours;
