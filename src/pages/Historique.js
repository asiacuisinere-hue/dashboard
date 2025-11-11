import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; // On le réutilise pour voir le détail

const Historique = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('demandes')
            .select(`*, clients (*)`) // Note: backticks are used for template literals, not string escaping here.
            .in('status', ['Confirmée', 'Refusée', 'Annulée'])
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement de l\'historique:', error);
            alert(`Erreur de chargement de l\'historique: ${error.message}`);
        } else {
            setDemandes(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchDemandes();
    }, [fetchDemandes]);

    const handleSelect = (id) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(id)) {
            newSelectedIds.delete(id);
        } else {
            newSelectedIds.add(id);
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = new Set(demandes.map(d => d.id));
            setSelectedIds(allIds);
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleBulkArchive = async () => {
        if (selectedIds.size === 0) {
            alert('Veuillez sélectionner au moins une demande à archiver.');
            return;
        }

        if (window.confirm(`Êtes-vous sûr de vouloir archiver ${selectedIds.size} demande(s) ?`)) {
            const { error } = await supabase
                .from('demandes')
                .update({ status: 'Archivée' })
                .in('id', Array.from(selectedIds));

            if (error) {
                alert(`Erreur lors de l'archivage : ${error.message}`);
            } else {
                alert(`${selectedIds.size} demande(s) archivée(s) avec succès.`);
                setSelectedIds(new Set());
                fetchDemandes(); // Rafraîchir la liste
            }
        }
    };

    if (loading) {
        return <div>Chargement de l'historique...</div>;
    }

    return (
        <div>
            <h1>Historique des demandes</h1>
            <p>Liste des demandes terminées, refusées ou annulées. Vous pouvez les archiver pour nettoyer la vue.</p>

            {selectedIds.size > 0 && (
                <div style={{ margin: '20px 0', padding: '10px', background: '#e9ecef', borderRadius: '8px' }}>
                    <span style={{ marginRight: '20px' }}>{selectedIds.size} demande(s) sélectionnée(s)</span>
                    <button onClick={handleBulkArchive} style={{...detailsButtonStyle, background: '#6c757d'}}>
                        Archiver la sélection
                    </button>
                </div>
            )}

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>
                                <input 
                                    type="checkbox"
                                    onChange={handleSelectAll}
                                    checked={selectedIds.size > 0 && selectedIds.size === demandes.length}
                                />
                            </th>
                            <th style={thStyle}>Date Demande</th>
                            <th style={thStyle}>Client</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {demandes.map(demande => (
                            <tr key={demande.id}>
                                <td style={tdStyle}>
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.has(demande.id)}
                                        onChange={() => handleSelect(demande.id)}
                                    />
                                </td>
                                <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                                <td style={tdStyle}>{demande.clients?.last_name || 'N/A'}</td>
                                <td style={tdStyle}><span style={statusBadgeStyle(demande.status)}>{demande.status}</span></td>
                                <td style={tdStyle}>
                                    <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>
                                        Détails
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

// --- Styles (copiés de DemandesEnCours.js pour la cohérence) ---
const tableContainerStyle = { marginTop: '2rem', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', borderRadius: '8px', overflow: 'hidden', background: 'white' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { background: '#f4f7fa', padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #eee', color: '#555' };
const detailsButtonStyle = { padding: '8px 12px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const statusBadgeStyle = (status) => {
    const colors = {
        'Confirmée': '#28a745', 'Refusée': '#6c757d', 'Annulée': '#dc3545', 'Archivée': '#343a40'
    };
    return {
        padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold',
        fontSize: '12px', backgroundColor: colors[status] || '#6c757d'
    };
};

export default Historique;
