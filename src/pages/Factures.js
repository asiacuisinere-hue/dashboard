import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Factures = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null); // Facture sélectionnée pour la modale

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('invoices')
            .select(
                `*,
                clients (first_name, last_name, email),
                entreprises (nom_entreprise, contact_name, contact_email)`
            );

        // La recherche inter-tables avec .or() est complexe.
        // Simplifions en ne cherchant que sur un champ qui est dans la table `invoices`
        // (par exemple, si vous ajoutiez un nom de client en texte brut)
        // Pour l'instant, la recherche est désactivée si un terme est entré pour éviter les erreurs.
        if (searchTerm) {
             // query = query.ilike('client_name_cache', `%${searchTerm}%`); // Exemple si vous aviez un champ cache
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des factures:', error);
            alert(`Erreur de chargement des factures: ${error.message}`);
        } else {
            setInvoices(data);
        }
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const handleUpdateStatus = async (invoiceId, newStatus) => {
        if (!window.confirm(`Confirmer le changement de statut de la facture ${invoiceId.substring(0, 8)} à "${newStatus}" ?`)) {
            return;
        }

        console.log(`--- [DEBUG] handleUpdateStatus: Tentative de mise à jour du statut de la facture ${invoiceId.substring(0, 8)} à "${newStatus}"`);
        
        const { error } = await supabase
            .from('invoices')
            .update({ status: newStatus })
            .eq('id', invoiceId);

        if (error) {
            console.error('Erreur lors de la mise à jour du statut:', error);
            alert(`Erreur lors de la mise à jour du statut : ${error.message}`);
        } else {
            console.log(`--- [DEBUG] handleUpdateStatus: Statut mis à jour avec succès à "${newStatus}"`);
            alert(`Statut de la facture ${invoiceId.substring(0, 8)} mis à jour à "${newStatus}".`);
            fetchInvoices(); // Rafraîchir la liste des factures
            setSelectedInvoice(null); // Fermer la modale si ouverte
        }
    };

    const renderCustomerName = (invoice) => {
        if (invoice.clients) {
            return `${invoice.clients.last_name} ${invoice.clients.first_name}`;
        } else if (invoice.entreprises) {
            return invoice.entreprises.nom_entreprise;
        }
        return 'N/A';
    };

    if (loading) {
        return <div style={containerStyle}>Chargement des factures...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>Gestion des Factures</h1>

            {/* Section de recherche */}
            <div style={filterContainerStyle}>
                <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={filterInputStyle}
                />
                <button onClick={() => setSearchTerm('')} style={resetFilterButtonStyle}>Réinitialiser</button>
            </div>

            {/* Liste des factures */}
            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>ID Facture</th>
                            <th style={thStyle}>Client / Entreprise</th>
                            <th style={thStyle}>Date Facture</th>
                            <th style={thStyle}>Montant Total</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoices.map(invoice => (
                            <tr key={invoice.id}>
                                <td style={tdStyle}>{invoice.id.substring(0, 8)}</td>
                                <td style={tdStyle}>{renderCustomerName(invoice)}</td>
                                <td style={tdStyle}>{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                                <td style={tdStyle}>{invoice.total_amount.toFixed(2)} €</td>
                                <td style={tdStyle}><span style={statusBadgeStyle(invoice.status)}>{invoice.status}</span></td>
                                <td style={tdStyle}>
                                    <button onClick={() => setSelectedInvoice(invoice)} style={detailsButtonStyle}>Voir Détails</button>
                                    {invoice.status === 'pending' && (
                                        <>
                                            <button onClick={() => handleUpdateStatus(invoice.id, 'deposit_paid')} style={{ ...actionButtonStyle, backgroundColor: '#007bff', marginLeft: '5px' }}>Acompte versé</button>
                                            <button onClick={() => handleUpdateStatus(invoice.id, 'paid')} style={{ ...actionButtonStyle, backgroundColor: '#28a745', marginLeft: '5px' }}>Payée</button>
                                        </>
                                    )}
                                    {invoice.status === 'deposit_paid' && (
                                        <button onClick={() => handleUpdateStatus(invoice.id, 'paid')} style={{ ...actionButtonStyle, backgroundColor: '#28a745', marginLeft: '5px' }}>Marquer comme Payée</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
};

// --- Invoice Detail Modal Component ---
const InvoiceDetailModal = ({ invoice, onClose, onUpdateStatus }) => {
    const renderCustomerInfo = () => {
        if (invoice.clients) {
            return (
                <>
                    <p><strong>Nom:</strong> {invoice.clients.last_name} {invoice.clients.first_name}</p>
                    <p><strong>Email:</strong> {invoice.clients.email}</p>
                </>
            );
        } else if (invoice.entreprises) {
            return (
                <>
                    <p><strong>Nom de l'entreprise:</strong> {invoice.entreprises.nom_entreprise}</p>
                    <p><strong>Contact:</strong> {invoice.entreprises.contact_name}</p>
                    <p><strong>Email du contact:</strong> {invoice.entreprises.contact_email}</p>
                </>
            );
        }
        return <p>Informations client non disponibles.</p>;
    };

    const handleSendInvoice = () => {
        alert('Fonctionnalité d\'envoi par email à implémenter.');
        // Ici, vous appellerez une future fonction serveur
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails de la Facture #{invoice.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Informations de la Facture</h3>
                    <p><strong>Date de la facture:</strong> {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Montant Total:</strong> {invoice.total_amount.toFixed(2)} €</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(invoice.status)}>{invoice.status}</span></p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Services inclus</h3>
                    {invoice.items && invoice.items.length > 0 ? (
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
                                    {invoice.items.map((item, index) => (
                                        <tr key={index}>
                                            <td style={tdStyle}>{item.name || item.description}</td>
                                            <td style={tdStyle}>{item.quantity}</td>
                                            <td style={tdStyle}>{item.price.toFixed(2)}</td>
                                            <td style={tdStyle}>{(item.quantity * item.price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p>Aucun service détaillé.</p>
                    )}
                </div>

                <div style={modalActionsStyle}>
                    <button onClick={handleSendInvoice} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Envoyer par mail</button>
                    {invoice.status === 'pending' && (
                        <>
                            <button onClick={() => onUpdateStatus(invoice.id, 'deposit_paid')} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Acompte versé</button>
                            <button onClick={() => onUpdateStatus(invoice.id, 'paid')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Marquer comme Payée</button>
                        </>
                    )}
                    {invoice.status === 'deposit_paid' && (
                        <button onClick={() => onUpdateStatus(invoice.id, 'paid')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Marquer comme Payée</button>
                    )}
                </div>
            </div>
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
    flexWrap: 'wrap',
};

const filterInputStyle = {
    padding: '8px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    flex: '1 1 auto',
    minWidth: '200px',
};

const resetFilterButtonStyle = {
    padding: '8px 12px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
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
    marginRight: '5px',
};

const actionButtonStyle = {
    padding: '8px 12px',
    background: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
};

const statusBadgeStyle = (status) => {
    const colors = {
        'pending': '#ffc107',
        'deposit_paid': '#007bff',
        'paid': '#28a745',
        'cancelled': '#dc3545',
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

const modalOverlayStyle = { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000 
};
const modalContentStyle = { 
    background: 'white', 
    padding: '30px', 
    borderRadius: '8px', 
    width: '90%', 
    maxWidth: '700px', 
    maxHeight: '90vh', 
    overflowY: 'auto', 
    position: 'relative',
    boxSizing: 'border-box',
};
const closeButtonStyle = { 
    position: 'absolute', 
    top: '15px', 
    right: '15px', 
    background: 'transparent', 
    border: 'none', 
    fontSize: '24px', 
    cursor: 'pointer' 
};
const detailSectionStyle = { 
    marginBottom: '20px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid #f0f0f0' 
};
const detailTitleStyle = { 
    fontSize: '18px', 
    color: '#d4af37', 
    marginBottom: '10px' 
};

const modalActionsStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap',
};

export default Factures;
