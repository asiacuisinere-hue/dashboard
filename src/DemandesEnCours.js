import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import DemandeDetail from './DemandeDetail'; 

const communesReunion = [
    "Bras-Panon", "Cilaos", "Entre-Deux", "L'Étang-Salé", "La Plaine-des-Palmistes", 
    "La Possession", "Le Port", "Le Tampon", "Les Avirons", "Les Trois-Bassins", 
    "Petite-Île", "Saint-André", "Saint-Benoît", "Saint-Denis", "Saint-Joseph", 
    "Saint-Leu", "Saint-Louis", "Saint-Paul", "Saint-Philippe", "Saint-Pierre", 
    "Sainte-Marie", "Sainte-Rose", "Sainte-Suzanne", "Salazie"
];

const DemandesEnCours = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [filter, setFilter] = useState({ date: '', status: '', city: '' });

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('demandes')
            .select(`
                *,
                clients (*),
                entreprises (*)
            `)
            .or(
                `and(type.eq.COMMANDE_MENU,status.not.in.("completed","cancelled","paid","Nouvelle")),and(type.eq.RESERVATION_SERVICE,status.in.("En attente de traitement","confirmed"))`
            );
        
        if (filter.date) {
            query = query.eq('request_date', filter.date);
        }
        if (filter.status) {
            query = query.eq('status', filter.status);
        }
                if (filter.city) {
                    query = query.ilike('details_json->>ville', `%${filter.city}%`);
                }
        
                const { data, error } = await query.order('created_at', { ascending: false });
        
                if (error) {
                    console.error('Erreur de chargement des demandes en cours:', error);
                    alert(`Une erreur est survenue lors du chargement des données : ${error.message}`);
                } else {
                    console.log('--- [DEBUG] Demandes en cours reçues:', data);
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
        
            const handleUpdateStatus = async (demandeId, newStatus) => {
                     const { error } = await supabase
                         .from('demandes')
                         .update({ status: newStatus })
                         .eq('id', demandeId);
            
                     if (error) {
                         alert(`Erreur lors de la mise à jour du statut : ${error.message}`);
                     } else {
                        alert('Statut de la demande mis à jour.');
                        fetchDemandes(); // Rafraîchit la liste
                        setSelectedDemande(null);
                    }
                };
            
            const resetFilters = () => {
                setFilter({ date: '', status: '', city: '' });
            };
        
            if (loading) {
                return <div style={containerStyle}>Chargement des demandes en cours...</div>;
            }
        
            return (
                <div style={containerStyle}>
                    <h1>Demandes en cours</h1>
                    <p>Suivi de toutes les demandes actives.</p>
        
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
                            <option value="En attente de traitement">En attente de traitement</option>
                            <option value="En attente de validation de devis">En attente de validation de devis</option>
                            <option value="En attente de paiement">En attente de paiement</option>
                            <option value="Payée">Payée</option>
                            <option value="En attente de préparation">En attente de préparation</option>
                            <option value="Préparation en cours">Préparation en cours</option>
                        </select>
                        <select
                            name="city"
                            value={filter.city}
                            onChange={handleFilterChange}
                            style={filterInputStyle}
                        >
                            <option value="">Toutes les villes</option>
                            {communesReunion.map(commune => (
                                <option key={commune} value={commune}>{commune}</option>
                            ))}
                        </select>
                        <button onClick={resetFilters} style={detailsButtonStyle}>Réinitialiser</button>
                    </div>
        
                    <div style={tableContainerStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                                                <th style={thStyle}>Date Demande</th>
                                                                <th style={thStyle}>Client</th>
                                                                <th style={thStyle}>Ville</th>
                                                                <th style={thStyle}>D.Evé</th>
                                                                <th style={thStyle}>D.Liv.Re</th>
                                                                <th style={thStyle}>Statut</th>
                                                                <th style={thStyle}>Actions</th>                                </tr>
                            </thead>
                                                <tbody>
                                                    {demandes.map(demande => (
                                                        <tr key={demande.id}>
                                                            <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                                            <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || '—'}</td>
                                                            <td style={tdStyle}>{demande.details_json?.ville || '—'}</td>
                                                            <td style={tdStyle}>
                                                                {demande.type === 'RESERVATION_SERVICE' && demande.request_date
                                                                    ? new Date(demande.request_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                                                    : '—'}
                                                            </td>
                                                            <td style={tdStyle}>
                                                                {demande.type === 'COMMANDE_MENU' && demande.request_date
                                                                    ? new Date(demande.request_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                                                                    : '—'}
                                                            </td>
                                                            <td style={tdStyle}><span style={statusBadgeStyle(demande.status)}>{demande.status}</span></td>
                                                            <td style={tdStyle}>
                                                                <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>
                                                                    Gérer
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>                        </table>
                    </div>
        
                    {selectedDemande && (
                        <DemandeDetail 
                            demande={selectedDemande} 
                            onClose={() => setSelectedDemande(null)}
                            onUpdateStatus={handleUpdateStatus}
                            onRefresh={fetchDemandes} 
                        />
                    )}
                </div>
            );
        };
        
        
        // --- Styles ---
        const containerStyle = {
            padding: '20px',
            maxWidth: '1400px', // Increased width for more columns
            margin: '0 auto',
        };
        
        const filterContainerStyle = {
            display: 'flex',
            gap: '1rem',
            marginBottom: '2rem',
            alignItems: 'center',
            flexWrap: 'wrap',
        };
        
        const filterInputStyle = {
            padding: '8px',
            borderRadius: '5px',
            border: '1px solid #ccc',
            flex: '1 1 auto',
            minWidth: '150px',
        };
        
        const tableContainerStyle = {
            marginTop: '2rem',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            overflowX: 'auto',
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
            borderBottom: '2px solid #ddd',
            whiteSpace: 'nowrap',
        };
        
        const tdStyle = {
            padding: '12px 15px',
            borderBottom: '1px solid #eee',
            color: '#555',
            whiteSpace: 'nowrap',
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
                'Nouvelle': '#007bff',
                'En attente de traitement': '#ffc107',
                'En attente de validation de devis': '#fd7e14',
                'En attente de paiement': '#17a2b8',
                'En attente de préparation': '#6f42c1',
                'Préparation en cours': '#20c997',
                'Confirmée': '#28a745',
                'Refusée': '#6c757d',
                'Annulée': '#dc3545',
                'Payée': '#6f42c1'
            };
            return {
                padding: '4px 8px',
                borderRadius: '12px',
                color: ['En attente de traitement', 'Préparation en cours'].includes(status) ? 'black' : 'white',
                fontWeight: 'bold',
                fontSize: '12px',
                backgroundColor: colors[status] || '#6c757d'
            };
        };
        
        export default DemandesEnCours;
        