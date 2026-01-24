import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; 
import ReactPaginate from 'react-paginate';

const APreparerCard = ({ demande, onSelect, statusBadgeStyle }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': '🏠',
        'COMMANDE_MENU': '🚚',
        'COMMANDE_SPECIALE': '⭐'
    };
    const invoiceNumber = demande.invoices?.[0]?.document_number;

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
                        <p className="text-xs text-gray-500 font-medium">
                            {invoiceNumber ? `Facture: ${invoiceNumber}` : 'Pas de facture'}
                        </p>
                    </div>
                </div>
                <span style={statusBadgeStyle(demande.status)} className="uppercase tracking-wider">
                    {demande.status}
                </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Ville</p>
                    <p className="text-gray-800">{demande.details_json?.deliveryCity || '—'}</p>
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Échéance</p>
                    <p className="text-red-600 font-bold">
                        {demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR') : '—'}
                    </p>
                </div>
            </div>

            <button 
                onClick={() => onSelect(demande)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm"
            >
                Gérer la préparation
            </button>
        </div>
    );
};

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
        let query = supabase.from('demandes').select(`*, details_json, clients (*), entreprises (*), invoices (document_number)`).in('status', toPrepareStatuses);

        if (searchTerm) {
            query = query.or(`details_json->>formulaName.ilike.%${searchTerm}%,clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%,invoices.document_number.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('request_date', { ascending: true }); // Order by event/delivery date

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
        if (error) {
            console.error('Error updating status:', error);
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Statut mis à jour !');
            fetchDemandes();
            setSelectedDemande(null); // Close the modal
        }
    };

    const offset = currentPage * itemsPerPage;
    const currentDemandes = demandes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(demandes.length / itemsPerPage);

    if (loading) return <div style={containerStyle}><p className="text-center text-gray-500 py-10">Chargement...</p></div>;

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Commandes à Préparer</h1>
                <p className="text-gray-600">Liste des commandes à préparer ou en cours de préparation.</p>
            </div>

            <div style={filterContainerStyle}>
                <input 
                    type="text"
                    placeholder="Rechercher par nom, formule, N° facture..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={inputStyle}
                />
            </div>

            {/* Vue Tableau (Desktop) */}
            <div className="hidden lg:block">
                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Date Évén./Liv.</th>
                                <th style={thStyle}>Client</th>
                                <th style={thStyle}>Ville</th>
                                <th style={{...thStyle, textAlign: 'center'}}>Type</th>
                                <th style={thStyle}>Facture</th>
                                <th style={thStyle}>Statut</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentDemandes.map(demande => {
                                const invoiceNumber = demande.invoices?.[0]?.document_number;
                                return (
                                    <tr key={demande.id}>
                                        <td style={tdStyle}>{demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'}</td>
                                        <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || '—'}</td>
                                        <td style={tdStyle}>{demande.details_json?.deliveryCity || '—'}</td>
                                        <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>
                                            {demande.type === 'RESERVATION_SERVICE' && <span title="RESERVATION_SERVICE">🏠</span>}
                                            {demande.type === 'COMMANDE_MENU' && <span title="COMMANDE_MENU">🚚</span>}
                                            {demande.type === 'COMMANDE_SPECIALE' && <span title="COMMANDE_SPECIALE">⭐</span>}
                                        </td>
                                        <td style={{...tdStyle, textAlign: 'center'}}>
                                            {invoiceNumber ? <span title={invoiceNumber}>🧾</span> : '—'}
                                        </td>
                                        <td style={tdStyle}><span style={statusBadgeStyle(demande.status)}>{demande.status}</span></td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>
                                                Gérer
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vue Cartes (Mobile/Tablette) */}
            <div className="block lg:hidden">
                {currentDemandes.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl">Aucune commande à préparer.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentDemandes.map(demande => (
                            <APreparerCard 
                                key={demande.id} 
                                demande={demande} 
                                onSelect={setSelectedDemande}
                                statusBadgeStyle={statusBadgeStyle}
                            />
                        ))}
                    </div>
                )}
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
const filterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap',
};
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

    