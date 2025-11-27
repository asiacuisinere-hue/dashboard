import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import ReactPaginate from 'react-paginate';

const Factures = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('invoices').select('*, clients(first_name, last_name), entreprises(nom_entreprise)');

        if (searchTerm) {
            query = query.or(`document_number.ilike.%${searchTerm}%,clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) console.error('Error fetching invoices:', error);
        else setInvoices(data);
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleUpdateStatus = async (invoiceId, newStatus) => {
        const { error: invoiceError } = await supabase
            .from('invoices')
            .update({ status: newStatus })
            .eq('id', invoiceId);

        if (invoiceError) {
            console.error('Error updating invoice status:', invoiceError);
            alert(`Erreur: ${invoiceError.message}`);
            return;
        }

        if (newStatus === 'paid') {
            try {
                const { data: updatedInvoice, error: fetchError } = await supabase
                    .from('invoices')
                    .select('demande_id, demandes (type)')
                    .eq('id', invoiceId)
                    .single();

                if (fetchError) throw fetchError;

                if (updatedInvoice?.demande_id && updatedInvoice.demandes?.type === 'RESERVATION_SERVICE') {
                    const { error: demandeError } = await supabase
                        .from('demandes')
                        .update({ status: 'completed' })
                        .eq('id', updatedInvoice.demande_id);
                    
                    if (demandeError) throw demandeError;
                }
            } catch (error) {
                console.error('Failed to auto-complete linked demand:', error.message);
            }
        }
        
        fetchInvoices();
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };

    const offset = currentPage * itemsPerPage;
    const currentInvoices = invoices.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(invoices.length / itemsPerPage);

    const getStatusStyle = (status) => {
        const colors = {
            'pending': '#ffc107',
            'paid': '#28a745',
            'deposit_paid': '#17a2b8',
            'cancelled': '#dc3545'
        };
        return {
            padding: '5px 10px',
            borderRadius: '15px',
            color: 'white',
            backgroundColor: colors[status] || '#6c757d'
        };
    };

    if (loading) return <div style={{ padding: '20px' }}>Chargement...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Factures</h1>
            <input 
                type="text"
                placeholder="Rechercher par N°, client..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }}
            />
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ddd', textAlign: 'left' }}>
                            <th style={{ padding: '12px' }}>N° Facture</th>
                            <th style={{ padding: '12px' }}>Client/Entreprise</th>
                            <th style={{ padding: '12px' }}>Montant Total</th>
                            <th style={{ padding: '12px' }}>Acompte Versé</th>
                            <th style={{ padding: '12px' }}>Reste à Payer</th>
                            <th style={{ padding: '12px' }}>Statut</th>
                            <th style={{ padding: '12px' }}>Date Création</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentInvoices.map(invoice => {
                            const clientName = invoice.clients?.last_name ? `${invoice.clients.first_name || ''} ${invoice.clients.last_name}`.trim() : invoice.entreprises?.nom_entreprise || 'N/A';
                            const totalAmount = parseFloat(invoice.total_amount || 0);
                            const depositAmount = parseFloat(invoice.deposit_amount || 0);
                            const remainingAmount = totalAmount - depositAmount;

                            return (
                                <tr key={invoice.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{invoice.document_number}</td>
                                    <td style={{ padding: '12px' }}>{clientName}</td>
                                    <td style={{ padding: '12px' }}>{totalAmount.toFixed(2)} €</td>
                                    <td style={{ padding: '12px' }}>{depositAmount.toFixed(2)} €</td>
                                    <td style={{ padding: '12px' }}>{remainingAmount.toFixed(2)} €</td>
                                    <td style={{ padding: '12px' }}><span style={getStatusStyle(invoice.status)}>{invoice.status}</span></td>
                                    <td style={{ padding: '12px' }}>{new Date(invoice.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px' }}>
                                        <select onChange={(e) => handleUpdateStatus(invoice.id, e.target.value)} value={invoice.status}>
                                            <option value="pending">En attente</option>
                                            <option value="paid">Payée</option>
                                            <option value="deposit_paid">Acompte versé</option>
                                            <option value="cancelled">Annulée</option>
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
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
        </div>
    );
};

export default Factures;
