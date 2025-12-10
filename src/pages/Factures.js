import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import ReactPaginate from 'react-paginate';
import { useLocation } from 'react-router-dom';

// Helper function to get French status
const getFrenchStatus = (status) => {
    switch (status) {
        case 'pending': return 'En attente';
        case 'deposit_paid': return 'Acompte versé';
        case 'paid': return 'Payée';
        case 'cancelled': return 'Annulée';
        default: return status;
    }
};

const Factures = () => {
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10; // Items per page for pagination

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const urlStatus = searchParams.get('status');
        setStatusFilter(urlStatus || 'all');
    }, [location.search]);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('invoices').select(`
            *,
            demand_id,
            clients (first_name, last_name, email),
            entreprises (nom_entreprise, contact_email),
            demandes (type, status, details_json)
        `);

        // --- Always filter for RESERVATION_SERVICE invoices ---
        query = query.not('quote_id', 'is', null);

        // --- Apply Status Filter from state (synced with URL) ---
        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        // --- Apply search term filter ---
        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            query = query.or(
                `document_number.ilike.${searchPattern},clients.first_name.ilike.${searchPattern},clients.last_name.ilike.${searchPattern},entreprises.nom_entreprise.ilike.${searchPattern}`
            );
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des factures:', error);
        } else {
            // --- Filter out demands in preparation or completed (done client-side) ---
            const filteredData = (data || []).filter(invoice => {
                const demandStatus = invoice.demandes?.status;
                return !demandStatus || !['En attente de préparation', 'Préparation en cours', 'completed'].includes(demandStatus);
            });
            setInvoices(filteredData);
        }
        setLoading(false);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInvoices();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchInvoices]);

    const handleRefresh = () => {
        fetchInvoices();
        setSelectedInvoice(null);
    };

    const renderCustomerName = (invoice) => {
        if (invoice.clients) return `${invoice.clients.first_name || ''} ${invoice.clients.last_name || ''}`.trim();
        if (invoice.entreprises) return invoice.entreprises.nom_entreprise;
        return 'N/A';
    };
    
    // Pagination logic
    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };
    const offset = currentPage * itemsPerPage;
    const currentInvoices = invoices.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(invoices.length / itemsPerPage);


    if (loading) return <div style={containerStyle}><p>Chargement des factures...</p></div>;

    return (
        <div style={containerStyle}>
            <h1>Gestion des Factures</h1>

            <div style={filterContainerStyle}>
                <input
                    type="text"
                    placeholder="Rechercher par N° ou client..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={inputStyle}
                />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
                    <option value="all">Tous les statuts</option>
                    <option value="pending">{getFrenchStatus('pending')}</option>
                    <option value="deposit_paid">{getFrenchStatus('deposit_paid')}</option>
                    <option value="paid">{getFrenchStatus('paid')}</option>
                    <option value="cancelled">{getFrenchStatus('cancelled')}</option>
                </select>
            </div>

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>N° Facture</th>
                            <th style={thStyle}>Client / Entreprise</th>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Montant</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentInvoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td style={tdStyle}>{invoice.document_number || invoice.id.substring(0, 8)}</td>
                                <td style={tdStyle}>{renderCustomerName(invoice)}</td>
                                <td style={tdStyle}>{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                                <td style={tdStyle}>{(invoice.total_amount || 0).toFixed(2)} €</td>
                                <td style={tdStyle}><span style={statusBadgeStyle(invoice.status)}>{getFrenchStatus(invoice.status)}</span></td>
                                <td style={tdStyle}>
                                    <button onClick={() => setSelectedInvoice(invoice)} style={detailsButtonStyle}>Voir Détails</button>
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

            {selectedInvoice && (
                <InvoiceDetailModal 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)}
                    onUpdate={handleRefresh}
                />
            )}
        </div>
    );
};

// Modal Component for Invoice Details
const InvoiceDetailModal = ({ invoice, onClose, onUpdate }) => {
    const [isEnteringDeposit, setIsEnteringDeposit] = useState(false);
    const [depositAmountInput, setDepositAmountInput] = useState('');
    const [loadingAction, setLoadingAction] = useState(false);

    const handleSaveDeposit = async () => {
        const amount = parseFloat(depositAmountInput);
        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant d'acompte valide.");
            return;
        }
        setLoadingAction(true);
        const { error } = await supabase
            .from('invoices')
            .update({
                deposit_amount: amount,
                deposit_date: new Date().toISOString(),
                status: 'deposit_paid'
            })
            .eq('id', invoice.id);
        setLoadingAction(false);

        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Acompte enregistré avec succès !');
            onUpdate();
            onClose();
        }
    };
    
        const handleUpdateStatus = async (newStatus) => {
            setLoadingAction(true);
            const { error: invoiceError } = await supabase
                .from('invoices')
                .update({ status: newStatus })
                .eq('id', invoice.id);
    
            if (invoiceError) {
                setLoadingAction(false);
                alert(`Erreur: ${invoiceError.message}`);
                return;
            }
    
            // If the invoice is marked as paid and is linked to a subscription demand, create the subscription
            if (newStatus === 'paid' && invoice.demandes?.type === 'SOUSCRIPTION_ABONNEMENT') {
                const subscriptionPayload = {
                    client_id: invoice.client_id,
                    entreprise_id: invoice.entreprise_id,
                    formule_base: invoice.demandes.details_json?.formula || 'N/A',
                    notes: invoice.demandes.details_json?.notes || '',
                    status: 'actif',
                    start_date: new Date().toISOString(),
                };
    
                const { error: subError } = await supabase.from('abonnements').insert([subscriptionPayload]);
    
                if (subError) {
                    alert(`Erreur lors de la création de l'abonnement: ${subError.message}`);
                    // Note: The invoice status was still updated. You might want to handle this case.
                } else {
                    alert('Abonnement activé avec succès !');
                }
            }
            
            setLoadingAction(false);
            alert(`Statut de la facture mis à jour à "${getFrenchStatus(newStatus)}"!`);
            onUpdate();
            onClose();
        };
    const handlePrepareDemand = async () => {
        if (!invoice.demand_id) {
            alert("Erreur: Impossible de trouver la demande liée à cette facture.");
            return;
        }
        if (!window.confirm("Confirmer le passage de la demande en préparation ?")) return;

        setLoadingAction(true);
        const { error } = await supabase
            .from('demandes')
            .update({ status: 'En attente de préparation' })
            .eq('id', invoice.demand_id);
        
        setLoadingAction(false);
        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('La demande a été envoyée en préparation.');
            onUpdate();
            onClose();
        }
    };

    const handleSendInvoice = async () => {
        if (!window.confirm('Confirmer l\'envoi de la facture par email ?')) return;
        setLoadingAction(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ invoiceId: invoice.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'envoi de la facture.');
            }

            alert('Facture envoyée avec succès !');
        } catch (error) {
            console.error('Error sending invoice:', error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setLoadingAction(false);
        }
    };

    const renderCustomerInfo = () => {
        if (invoice.clients) return <p><strong>Nom:</strong> {invoice.clients.first_name || ''} {invoice.clients.last_name || ''}</p>;
        if (invoice.entreprises) return <p><strong>Entreprise:</strong> {invoice.entreprises.nom_entreprise}</p>;
        return <p>Informations client non disponibles.</p>;
    };

    const totalAmount = parseFloat(invoice.total_amount || 0);
    const depositAmount = parseFloat(invoice.deposit_amount || 0);
    const remainingBalance = totalAmount - depositAmount;

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails Facture #{invoice.document_number || invoice.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Informations</h3>
                    <p><strong>Date:</strong> {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(invoice.status)}>{getFrenchStatus(invoice.status)}</span></p>
                    <p><strong>Total:</strong> {totalAmount.toFixed(2)} €</p>
                    {invoice.deposit_amount > 0 && <p><strong>Acompte Versé:</strong> {depositAmount.toFixed(2)} € le {new Date(invoice.deposit_date).toLocaleDateString('fr-FR')}</p>}
                    {(invoice.status === 'deposit_paid' && remainingBalance > 0) && <p><strong>Reste à Payer:</strong> {remainingBalance.toFixed(2)} €</p>}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Articles</h3>
                    {(invoice.items && invoice.items.length > 0) ? (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Qté</th>
                                        <th style={thStyle}>Prix U. (€)</th>
                                        <th style={thStyle}>Total (€)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(invoice.items || []).map((item, index) => (
                                        <tr key={index}>
                                            <td style={tdStyle}>{item.name || item.description}</td>
                                            <td style={tdStyle}>{item.quantity || 0}</td>
                                            <td style={tdStyle}>{(item.unit_price || 0).toFixed(2)}</td>
                                            <td style={tdStyle}>{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p>Aucun article détaillé.</p>}
                </div>

                <div style={modalActionsStyle}>
                    <button onClick={handleSendInvoice} disabled={loadingAction} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8', marginRight: 'auto' }}>
                        {loadingAction ? 'Envoi...' : 'Envoyer par mail'}
                    </button>
                    {!isEnteringDeposit && (
                        <>
                            {(invoice.status === 'pending' || invoice.status === 'deposit_paid') && (
                                <button onClick={() => handleUpdateStatus('paid')} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>
                                    {loadingAction ? 'Mise à jour...' : 'Marquer comme Payée'}
                                </button>
                            )}
                            {invoice.status === 'paid' && invoice.demandes?.type === 'RESERVATION_SERVICE' && (
                                <button onClick={handlePrepareDemand} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#6f42c1'}}>
                                    Mettre en préparation
                                </button>
                            )}
                            {invoice.status === 'pending' && (
                                <button onClick={() => setIsEnteringDeposit(true)} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#007bff'}}>
                                    {loadingAction ? 'Mise à jour...' : 'Enregistrer un acompte'}
                                </button>
                            )}
                            {(invoice.status !== 'cancelled') && (
                                <button onClick={() => handleUpdateStatus('cancelled')} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>
                                    {loadingAction ? 'Mise à jour...' : 'Annuler la facture'}
                                </button>
                            )}
                        </>
                    )}

                    {isEnteringDeposit && (
                        <div style={{width: '100%', display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <input
                                type="number"
                                placeholder="Montant de l'acompte"
                                value={depositAmountInput}
                                onChange={(e) => setDepositAmountInput(e.target.value)}
                                style={inputStyle}
                                autoFocus
                            />
                            <button onClick={handleSaveDeposit} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>
                                {loadingAction ? 'Confirmation...' : 'Confirmer'}
                            </button>
                            <button onClick={() => setIsEnteringDeposit(false)} disabled={loadingAction} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Annuler</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Styles for Factures component ---
const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };
const filterContainerStyle = { display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' };
const inputStyle = { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: '1 1 auto', minWidth: '200px' };
const tableContainerStyle = { marginTop: '1rem', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflowX: 'auto', background: 'white' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { background: '#f8f9fa', padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #eee' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #eee' };
const detailsButtonStyle = { padding: '8px 12px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'deposit_paid': '#007bff', 'paid': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};

// --- Styles for InvoiceDetailModal ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '10px' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };

export default Factures;