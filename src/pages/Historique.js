import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; // Réutilisation de la modale de détail

const Historique = () => {
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
                clients (*),
                entreprises (*)
            `)
            .in('status', ['Archivée', 'Refusée', 'Annulée', 'completed']) // Add 'completed' status
            .order('created_at', { ascending: false });

        if (filter.date) {
            query = query.eq('request_date', filter.date);
        }
        if (filter.status) {
            query = query.eq('status', filter.status);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erreur de chargement de l\'historique:', error);
            alert(`Une erreur est survenue lors du chargement des données : ${error.message}`);
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

    const handleBulkArchive = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir archiver TOUTES les demandes affichées dans l\'historique ? Cette action est irréversible.')) {
            return;
        }

        const demandeIdsToArchive = demandes.map(d => d.id);
        if (demandeIdsToArchive.length === 0) {
            alert('Aucune demande à archiver.');
            return;
        }

        const { error } = await supabase
            .from('demandes')
            .update({ status: 'Archivée' })
            .in('id', demandeIdsToArchive);

        if (error) {
            alert(`Erreur lors de l'archivage en masse : ${error.message}`);
        } else {
            alert(`${demandeIdsToArchive.length} demandes ont été archivées.`);
            fetchDemandes(); // Rafraîchir la liste
        }
    };

    if (loading) {
        return <div>Chargement de l'historique...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>Historique des Demandes</h1>
            <p>Consultez et gérez les demandes archivées, refusées ou annulées.</p>

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
                    <option value="Archivée">Archivée</option>
                    <option value="Refusée">Refusée</option>
                    <option value="Annulée">Annulée</option>
                </select>
                <button onClick={resetFilters} style={detailsButtonStyle}>Réinitialiser</button>
                <button onClick={handleBulkArchive} style={{...detailsButtonStyle, backgroundColor: '#6c757d', marginLeft: '10px'}}>Archiver tout l\'historique</button>
            </div>

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Date Demande</th>
                            <th style={thStyle}>Client / Entreprise</th>
                            <th style={{...thStyle, textAlign: 'center'}}>Type</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demandes.map(demande => (
                            <tr key={demande.id}>
                                <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || '—'}</td>
                                <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>
                                    {demande.type === 'RESERVATION_SERVICE' && <span title="RESERVATION_SERVICE">🏠</span>}
                                    {demande.type === 'COMMANDE_MENU' && <span title="COMMANDE_MENU">🚚</span>}
                                </td>
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
const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
};

const filterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap', // Permet aux filtres de passer à la ligne
};

const filterInputStyle = {
    padding: '8px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    flex: '1 1 auto', // Permet aux inputs de s'étirer mais aussi de se réduire
    minWidth: '150px', // Largeur minimale pour les inputs
};

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto', // Permet le défilement horizontal sur les petits écrans
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
    whiteSpace: 'nowrap', // Empêche le retour à la ligne pour les en-têtes
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne pour les cellules
};

const detailsButtonStyle = {
    padding: '8px 12px',
    background: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
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
        'Archivée': '#343a40', // Nouveau statut pour l'historique
        'completed': '#28a745', // Added for consistency
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

export default Historique;