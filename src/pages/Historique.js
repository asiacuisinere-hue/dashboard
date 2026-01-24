import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; // Réutilisation de la modale de détail

const HistoriqueCard = ({ demande, onSelect, statusBadgeStyle }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': '🏠',
        'COMMANDE_MENU': '🚚',
        'COMMANDE_SPECIALE': '⭐',
        'SOUSCRIPTION_ABONNEMENT': '🔄'
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <span className="text-2xl mr-3" title={demande.type}>
                        {typeIcons[demande.type] || '❓'}
                    </span>
                    <div>
                        <h3 className="font-bold text-gray-800">
                            {demande.clients?.last_name || demande.entreprises?.nom_entreprise || 'Client Inconnu'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            ID: {demande.id.substring(0, 8)}
                        </p>
                    </div>
                </div>
                <span style={statusBadgeStyle(demande.status)} className="uppercase tracking-wider">
                    {demande.status}
                </span>
            </div>
            
            <div className="space-y-2 mb-5 text-sm">
                <div className="flex items-center text-gray-600">
                    <span className="font-medium w-32">Date Demande:</span>
                    <span>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center text-gray-600">
                    <span className="font-medium w-32">Type:</span>
                    <span>{demande.type.replace('_', ' ')}</span>
                </div>
            </div>

            <button 
                onClick={() => onSelect(demande)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-lg transition-colors text-sm"
            >
                Consulter l'historique
            </button>
        </div>
    );
};

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
        return <div className="p-6 text-center text-gray-500">Chargement de l'historique...</div>;
    }

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Historique des Demandes</h1>
                <p className="text-gray-600">Consultez et gérez les demandes archivées, refusées ou annulées.</p>
            </div>

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

            {/* Vue Tableau (Desktop) */}
            <div className="hidden lg:block">
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
            </div>

            {/* Vue Cartes (Mobile/Tablette) */}
            <div className="block lg:hidden mt-4">
                {demandes.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl">Aucun historique disponible.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {demandes.map(demande => (
                            <HistoriqueCard 
                                key={demande.id} 
                                demande={demande} 
                                onSelect={setSelectedDemande}
                                statusBadgeStyle={statusBadgeStyle}
                            />
                        ))}
                    </div>
                )}
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