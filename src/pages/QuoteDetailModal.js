import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const QuoteDetailModal = ({ quote, onClose, onUpdateStatus, fetchExistingQuotes }) => {
    const [isSending, setIsSending] = useState(false);

    const handleView = () => {
        if (!quote.storage_path) {
            alert("Aucun document à afficher.");
            return;
        }
        const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/view-document?path=${quote.storage_path}`;
        window.open(url, '_blank');
    };

    const handleDownload = async () => {
        if (!quote.storage_path) {
            alert("Aucun document à télécharger.");
            return;
        }
        const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/view-document?path=${quote.storage_path}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error("Le fichier n'a pas pu être téléchargé.");
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = quote.storage_path.split('/').pop() || `devis-${quote.document_number}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert(`Erreur de téléchargement: ${error.message}`);
        }
    };

    const handleSend = async () => {
        if (!window.confirm("Confirmer l'envoi du devis par email au client ?")) return;
        setIsSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");
            
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-quote-test-does-not-exist`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ quoteId: quote.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message);
            fetchExistingQuotes(); // Refresh the list to show the new 'sent' status
            onClose();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <div style={modalOverlayStyle}>
            <div style={{...modalContentStyle, maxWidth: '600px'}}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails du Devis #{quote.document_number}</h2>
                <p><strong>Statut :</strong> <span style={statusBadgeStyle(quote.status)}>{quote.status}</span></p>
                <p><strong>Date :</strong> {new Date(quote.created_at).toLocaleDateString('fr-FR')}</p>
                
                {/* --- Actions --- */}
                <div style={modalActionsStyle}>
                    {quote.storage_path && (
                        <>
                            <button onClick={handleView} style={{ ...actionButtonStyle, backgroundColor: '#6c757d' }}>Voir</button>
                            <button onClick={handleDownload} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Télécharger</button>
                        </>
                    )}
                    {quote.status === 'draft' && (
                        <button onClick={handleSend} disabled={isSending} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>
                            {isSending ? 'Envoi en cours...' : 'Envoyer par Email'}
                        </button>
                    )}
                    {quote.status === 'sent' && (
                         <button onClick={() => onUpdateStatus(quote.id, 'accepted')} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>
                            Marquer comme Accepté
                        </button>
                    )}
                     <button onClick={() => onUpdateStatus(quote.id, 'rejected')} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>
                        Marquer comme Refusé
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #eee', paddingTop: '20px' };
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