import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Factures = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('https://www.asiacuisine.re/api/get-invoices', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Erreur lors de la récupération des factures.');
            }

            const data = await response.json();
            setInvoices(data);
        } catch (err) {
            console.error('Error fetching invoices:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const renderCustomerName = (invoice) => {
        if (invoice.clients) {
            return `${invoice.clients.prenom} ${invoice.clients.nom}`;
        } else if (invoice.entreprises) {
            return invoice.entreprises.nom_entreprise;
        }
        return 'N/A';
    };

    const statusBadgeStyle = (status) => {
        const colors = {
            'Brouillon': '#6c757d', // Gris
            'En attente de paiement': '#ffc107', // Jaune
            'Acompte versé': '#17a2b8', // Bleu clair
            'Payée': '#28a745', // Vert
            'Annulée': '#dc3545', // Rouge
        };
        return {
            padding: '4px 8px',
            borderRadius: '12px',
            color: status === 'En attente de paiement' ? 'black' : 'white',
            fontWeight: 'bold',
            fontSize: '12px',
            backgroundColor: colors[status] || '#6c757d'
        };
    };

    if (loading) return <p>Chargement des factures...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;

    return (
        <div style={containerStyle}>
            <h1>Gestion des Factures</h1>

            <div style={sectionStyle}>
                <h2>Factures existantes</h2>
                {invoices.length === 0 ? (
                    <p>Aucune facture existante.</p>
                ) : (
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>ID Facture</th>
                                <th style={thStyle}>Client / Entreprise</th>
                                <th style={thStyle}>Date</th>
                                <th style={thStyle}>Total</th>
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onUpdate={fetchInvoices} // To refresh the list after an update
                />
            )}
        </div>
    );
};

// --- Invoice Detail Modal Component (Placeholder for now) ---
const InvoiceDetailModal = ({ invoice, onClose, onUpdate }) => {
    const [isSending, setIsSending] = useState(false);

    const handleSendInvoice = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir envoyer cette facture par e-mail au client ?')) return;
        setIsSending(true);
        try {
            const response = await fetch('https://www.asiacuisine.re/api/send-invoice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invoiceId: invoice.id }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Erreur lors de l\'envoi de la facture.');
            }
            alert('Facture envoyée avec succès !');
            onUpdate(); // Refresh the list
            onClose(); // Close the modal
        } catch (err) {
            alert(`Erreur: ${err.message}`);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (!window.confirm(`Confirmer le passage au statut "${newStatus}" ?`)) return;
        try {
            const { error } = await supabase
                .from('invoices')
                .update({ status: newStatus })
                .eq('id', invoice.id);
            if (error) throw error;
            alert('Statut mis à jour avec succès !');
            onUpdate();
            onClose();
        } catch (err) {
            alert(`Erreur lors de la mise à jour du statut: ${err.message}`);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails de la Facture #{invoice.id.substring(0, 8)}</h2>
                <p><strong>Statut:</strong> {invoice.status}</p>
                <p><strong>Total:</strong> {invoice.total_amount.toFixed(2)} €</p>
                {console.log("Invoice Status:", invoice.status)}
                {/* Action buttons */}
                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    {invoice.status === 'Brouillon' && (
                        <button onClick={handleSendInvoice} disabled={isSending} style={{...actionButtonStyle, backgroundColor: '#007bff'}}>
                            {isSending ? 'Envoi en cours...' : 'Envoyer la facture'}
                        </button>
                    )}
                    {invoice.status === 'En attente de paiement' && (
                        <button onClick={() => handleUpdateStatus('Acompte versé')} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>
                            Enregistrer un acompte
                        </button>
                    )}
                    {(invoice.status === 'En attente de paiement' || invoice.status === 'Acompte versé') && (
                        <button onClick={() => handleUpdateStatus('Payée')} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>
                            Marquer comme Payée
                        </button>
                    )}
                    <button onClick={() => handleUpdateStatus('Annulée')} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Styles (Copied from Devis.js for consistency) ---
const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
};

const sectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd',
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
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
    position: 'relative'
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



const actionButtonStyle = {

    padding: '10px 15px',

    border: 'none',

    borderRadius: '5px',

    cursor: 'pointer',

    color: 'white',

    fontWeight: 'bold'

};



export default Factures;
