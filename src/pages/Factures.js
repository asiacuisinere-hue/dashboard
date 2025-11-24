import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Factures = () => {
    const [invoices, setInvoices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const fetchInvoices = useCallback(async () => {
        setIsLoading(true);
        let query = supabase.from('invoices').select(`
            id, created_at, document_number, total_amount, status, items, deposit_amount, deposit_date,
            clients (first_name, last_name),
            entreprises (nom_entreprise)
        `).order('created_at', { ascending: false });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            query = query.or(
                `document_number.ilike.${searchPattern}`,
                `clients.last_name.ilike.${searchPattern}`,
                `entreprises.nom_entreprise.ilike.${searchPattern}`
            );
        }

        const { data, error } = await query;
        if (error) {
            console.error('Erreur de chargement des factures:', error);
        } else {
            setInvoices(data || []);
        }
        setIsLoading(false);
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
                    <option value="pending">En attente</option>
                    <option value="deposit_paid">Acompte versé</option>
                    <option value="paid">Payée</option>
                    <option value="cancelled">Annulée</option>
                </select>
            </div>

            {isLoading ? <p>Chargement...</p> : (
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
                            {invoices.map(invoice => (
                                <tr key={invoice.id}>
                                    <td style={tdStyle}>{invoice.document_number || invoice.id.substring(0, 8)}</td>
                                    <td style={tdStyle}>{renderCustomerName(invoice)}</td>
                                    <td style={tdStyle}>{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td style={tdStyle}>{(invoice.total_amount || 0).toFixed(2)} €</td>
                                    <td style={tdStyle}><span style={statusBadgeStyle(invoice.status)}>{invoice.status}</span></td>
                                    <td style={tdStyle}>
                                        <button onClick={() => setSelectedInvoice(invoice)} style={detailsButtonStyle}>Voir Détails</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

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

const InvoiceDetailModal = ({ invoice, onClose, onUpdate }) => {
    const [isEnteringDeposit, setIsEnteringDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');

    const handleSaveDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant d'acompte valide.");
            return;
        }

        const { error } = await supabase
            .from('invoices')
            .update({
                deposit_amount: amount,
                deposit_date: new Date().toISOString(),
                status: 'deposit_paid'
            })
            .eq('id', invoice.id);

        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Acompte enregistré avec succès !');
            onUpdate();
        }
    };
    
    const handleMarkAsPaid = async () => {
        if (!window.confirm("Confirmer le paiement total de la facture ?")) return;
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', invoice.id);

        if (error) alert(`Erreur: ${error.message}`);
        else {
            alert('Facture marquée comme payée.');
            onUpdate();
        }
    };

    const renderCustomerInfo = () => {
        if (invoice.clients) return <p><strong>Nom:</strong> {invoice.clients.last_name} {invoice.clients.first_name}</p>;
        if (invoice.entreprises) return <p><strong>Entreprise:</strong> {invoice.entreprises.nom_entreprise}</p>;
        return <p>Informations client non disponibles.</p>;
    };

    const handleSendInvoice = async () => {
        if (!window.confirm('Confirmer l\'envoi de la facture par email ?')) return;

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
        }
    };

    const remainingBalance = (invoice.total_amount || 0) - (invoice.deposit_amount || 0);

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
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>
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
                    <button onClick={handleSendInvoice} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8', marginRight: 'auto' }}>Envoyer par mail</button>
                    {!isEnteringDeposit && (
                        <>
                            {invoice.status === 'pending' && (
                                <button onClick={() => setIsEnteringDeposit(true)} style={{...actionButtonStyle, backgroundColor: '#007bff'}}>Enregistrer un acompte</button>
                            )}
                            {(invoice.status === 'pending' || invoice.status === 'deposit_paid') && (
                                <button onClick={handleMarkAsPaid} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>Marquer comme Payée</button>
                            )}
                        </>
                    )}

                    {isEnteringDeposit && (
                        <div style={{width: '100%', display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <input
                                type="number"
                                placeholder="Montant de l\'acompte"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                style={inputStyle}
                                autoFocus
                            />
                            <button onClick={handleSaveDeposit} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>Confirmer</button>
                            <button onClick={() => setIsEnteringDeposit(false)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Annuler</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };
const filterContainerStyle = { display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center' };
const inputStyle = { padding: '8px', borderRadius: '5px', border: '1px solid #ccc', flex: '1 1 auto', minWidth: '200px' };
const tableContainerStyle = { marginTop: '1rem', boxShadow: '0 4px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflowX: 'auto', background: 'white' };
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { background: '#f8f9fa', padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #eee' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #eee' };
const detailsButtonStyle = { padding: '8px 12px', background: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'deposit_paid': '#007bff', 'paid': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '10px' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };

export default Factures;