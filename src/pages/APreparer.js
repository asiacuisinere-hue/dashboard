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
    
        if (loading) return <div style={containerStyle}><p>Chargement...</p></div>;

    

        return (

            <div style={containerStyle}>

                <h1>Commandes à Préparer</h1>

                <p>Liste des commandes à préparer ou en cours de préparation.</p>

    

                <div style={filterContainerStyle}>

                    <input 

                        type="text"

                        placeholder="Rechercher par nom, formule..."

                        value={searchTerm}

                        onChange={(e) => setSearchTerm(e.target.value)}

                        style={inputStyle}

                    />

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

                            {currentDemandes.map(demande => (

                                <tr key={demande.id}>

                                    <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString()}</td>

                                    <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || 'N/A'}</td>

                                    <td style={tdStyle}>{demande.type}</td>

                                    <td style={tdStyle}><span style={statusBadgeStyle(demande.status)}>{demande.status}</span></td>

                                    <td style={tdStyle}>

                                        <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>

                                            Gérer

                                        </button>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                </div>

    

                <div style={{ borderTop: '1px solid #eee', marginTop: '2rem', paddingTop: '1rem' }}>

                    <style>{`

                        .pagination {

                            display: flex;

                            justify-content: center;

                            align-items: center;

                            list-style: none;

                            padding: 0;

                            font-family: Arial, sans-serif;

                        }

                        .pagination li {

                            margin: 0 4px;

                        }

                        .pagination li a {

                            padding: 8px 14px;

                            border-radius: 5px;

                            cursor: pointer;

                            color: #333;

                            text-decoration: none;

                            transition: background-color 0.2s, color 0.2s;

                            border: 1px solid #ddd;

                            font-weight: bold;

                        }

                        .pagination li.active a {

                            background-color: #d4af37;

                            color: white;

                            border-color: #d4af37;

                        }

                        .pagination li.disabled a {

                            color: #ccc;

                            cursor: not-allowed;

                        }

                        .pagination li a:hover:not(.disabled) {

                            background-color: #f5f5f5;

                        }

                    `}</style>

                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>

                        {pageCount > 1 && (

                             <span style={{ marginRight: '1.5rem', color: '#555', fontSize: '14px', fontWeight: 'bold' }}>

                                Page {currentPage + 1} sur {pageCount}

                            </span>

                        )}

                        <ReactPaginate

                            previousLabel={'<'}

                            nextLabel={'>'}

                            breakLabel={'...'}

                            pageCount={pageCount}

                            marginPagesDisplayed={1}

                            pageRangeDisplayed={3}

                            onPageChange={handlePageClick}

                            containerClassName={'pagination'}

                            activeClassName={'active'}

                            disabledClassName={'disabled'}

                        />

                    </div>

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

    

    // --- Styles (inspirés de Factures.js) ---

    const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };

    const filterContainerStyle = { display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' };

    const inputStyle = { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: '1 1 auto', minWidth: '200px' };

    const tableContainerStyle = { marginTop: '1rem', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflowX: 'auto', background: 'white' };

    const tableStyle = { width: '100%', borderCollapse: 'collapse' };

    const thStyle = { background: '#f8f9fa', padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #eee' };

    const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #eee' };

    const detailsButtonStyle = { padding: '8px 12px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };

    

    const statusBadgeStyle = (status) => {

        const colors = {

            'En attente de préparation': '#6f42c1', 

            'Préparation en cours': '#17a2b8'

        };

        return {

            padding: '4px 8px',

            borderRadius: '12px',

            color: 'white',

            fontWeight: 'bold',

            fontSize: '12px',

            backgroundColor: colors[status] || '#6c757d'

        };

    };

    

    export default APreparer;

    