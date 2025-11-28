import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const QuoteDetailModal = ({ quote, onClose, onUpdateStatus }) => {
    const [quoteItems, setQuoteItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);

    const fetchQuoteItems = useCallback(async () => {
        setLoadingItems(true);
        const { data, error } = await supabase
            .from('quote_items')
            .select('*')
            .eq('quote_id', quote.id);

        if (error) {
            console.error('Error fetching quote items:', error);
        } else {
            setQuoteItems(data);
        }
        setLoadingItems(false);
    }, [quote.id]);

    useEffect(() => {
        fetchQuoteItems();
    }, [fetchQuoteItems]);

    const renderCustomerInfo = () => {
        if (quote.clients) {
            return (
                <>
                    <p><strong>Nom:</strong> {quote.clients.last_name} {quote.clients.first_name}</p>
                    <p><strong>Email:</strong> {quote.clients.email}</p>
                </>
            );
        } else if (quote.entreprises) {
            return (
                <>
                    <p><strong>Nom de l'entreprise:</strong> {quote.entreprises.nom_entreprise}</p>
                    <p><strong>Contact:</strong> {quote.entreprises.contact_name}</p>
                    <p><strong>Email du contact:</strong> {quote.entreprises.contact_email}</p>
                </>
            );
        }
        return <p>Informations client non disponibles.</p>;
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails du Devis #{quote.document_number || quote.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Informations du Devis</h3>
                    <p><strong>Date du devis:</strong> {new Date(quote.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(quote.status)}>{quote.status}</span></p>
                    <p><strong>Total:</strong> {quote.total_amount.toFixed(2)} €</p>
                    {quote.demande_id && (
                        <p><strong>Lié à la demande:</strong> {quote.demande_id.substring(0, 8)}...</p>
                    )}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Services inclus</h3>
                    {loadingItems ? (
                        <p>Chargement des services...</p>
                    ) : quoteItems.length === 0 ? (
                        <p>Aucun service détaillé.</p>
                    ) : (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Service</th>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Qté</th>
                                        <th style={thStyle}>Prix U. (€)</th>
                                        <th style={thStyle}>Total (€)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quoteItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={tdStyle}>{item.name || 'N/A'}</td>
                                            <td style={tdStyle}>{item.description}</td>
                                            <td style={tdStyle}>{item.quantity}</td>
                                            <td style={tdStyle}>{item.unit_price.toFixed(2)}</td>
                                            <td style={tdStyle}>{(item.quantity * item.unit_price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={modalActionsStyle}>
                    {quote.status === 'sent' && (
                        <>
                            <button onClick={() => onUpdateStatus(quote.id, 'accepted')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Accepter</button>
                            <button onClick={() => onUpdateStatus(quote.id, 'rejected')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Refuser</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Styles ---

const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle = {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
};

const closeButtonStyle = {
    position: 'absolute',
    top: '15px',
    right: '15px',
    background: 'none',
    border: 'none',
    fontSize: '28px',
    cursor: 'pointer',
    color: '#aaa',
};

const detailSectionStyle = {
    marginBottom: '25px',
};

const detailTitleStyle = {
    borderBottom: '1px solid #eee',
    paddingBottom: '8px',
    marginBottom: '15px',
    color: '#333',
    fontSize: '18px',
};

const modalActionsStyle = {
    marginTop: '30px',
    textAlign: 'right',
    borderTop: '1px solid #eee',
    paddingTop: '20px',
};

const actionButtonStyle = {
    padding: '10px 20px',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginLeft: '10px',
};
const tableContainerStyle = {
    overflowX: 'auto',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thStyle = {
    border: '1px solid #ddd',
    padding: '10px',
    textAlign: 'left',
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold',
};

const tdStyle = {
    border: '1px solid #ddd',
    padding: '10px',
    textAlign: 'left',
};
const statusBadgeStyle = (status) => {
    let backgroundColor;
    switch (status) {
        case 'draft': backgroundColor = '#6c757d'; break;
        case 'sent': backgroundColor = '#17a2b8'; break;
        case 'accepted': backgroundColor = '#28a745'; break;
        case 'rejected': backgroundColor = '#dc3545'; break;
        default: backgroundColor = '#6c757d';
    }
    return {
        backgroundColor,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'capitalize',
    };
};

export default QuoteDetailModal;
