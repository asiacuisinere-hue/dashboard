import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; 
import ReactPaginate from 'react-paginate';

const APreparer = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10; // Fixed value

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        const toPrepareStatuses = ['En attente de préparation', 'Préparation en cours'];
        let query = supabase.from('demandes').select(`*, clients (*), entreprises (*)`).in('status', toPrepareStatuses);

        if (searchTerm) {
            query = query.or(`details_json->>formulaName.ilike.%${searchTerm}%,clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) console.error('Error fetching demandes to prepare:', error);
        else setDemandes(data);
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchDemandes();
        const channel = supabase.channel('demandes-a-preparer-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, fetchDemandes).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchDemandes]);

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase.from('demandes').update({ status: newStatus }).eq('id', id);
        if (error) console.error('Error updating status:', error);
        else fetchDemandes();
    };

    const offset = currentPage * itemsPerPage;
    const currentDemandes = demandes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(demandes.length / itemsPerPage);

    const getStatusStyle = (status) => ({
        padding: '5px 10px', borderRadius: '15px', color: 'white',
        backgroundColor: status === 'En attente de préparation' ? '#6f42c1' : '#17a2b8'
    });

    if (loading) return <div style={{ padding: '20px' }}>Chargement...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Commandes à Préparer</h1>
            <p>Liste des commandes à préparer ou en cours de préparation.</p>

            <input 
                type="text"
                placeholder="Rechercher par nom, formule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>Date Demande</th>
                            <th style={{ padding: '12px' }}>Client</th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th style={{ padding: '12px' }}>Statut</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentDemandes.map(demande => (
                            <tr key={demande.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{new Date(demande.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: '12px' }}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || 'N/A'}</td>
                                <td style={{ padding: '12px' }}>{demande.type}</td>
                                <td style={{ padding: '12px' }}><span style={getStatusStyle(demande.status)}>{demande.status}</span></td>
                                <td style={{ padding: '12px' }}>
                                    <button onClick={() => setSelectedDemande(demande)}>Gérer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ReactPaginate
                previousLabel={'< Précédent'}
                nextLabel={'Suivant >'}
                breakLabel={'...'}
                pageCount={pageCount}
                marginPagesDisplayed={2}
                pageRangeDisplayed={5}
                onPageChange={handlePageClick}
                containerClassName={'pagination'}
                activeClassName={'active'}
            />
            
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

export default APreparer;