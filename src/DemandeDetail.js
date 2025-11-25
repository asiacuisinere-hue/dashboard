import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const DemandeDetail = ({ demande, onClose, onUpdateStatus, onRefresh }) => {
    const navigate = useNavigate();
    
    const [details, setDetails] = useState(demande.details_json || {});
    const [requestDate, setRequestDate] = useState(demande.request_date ? new Date(demande.request_date).toISOString().split('T')[0] : '');
    
    // eslint-disable-next-line no-unused-vars
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSendingQrCode, setIsSendingQrCode] = useState(false);

    useEffect(() => {
        setDetails(demande.details_json || {});
        setRequestDate(demande.request_date ? new Date(demande.request_date).toISOString().split('T')[0] : '');
    }, [demande]);

    if (!demande) return null;

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async () => {
        const { error } = await supabase
            .from('demandes')
            .update({ 
                details_json: details,
                request_date: requestDate 
            })
            .eq('id', demande.id);
        
        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Détails sauvegardés !');
            onRefresh && onRefresh();
            onClose();
        }
    };
    
    const handleAction = async () => { /* ... (logic for COMMANDE_MENU and RESERVATION_SERVICE) ... */ };
    const handleSendQrCodeAndPay = async () => { /* ... (logic for sending QR code) ... */ };

    const renderReservationServiceForm = () => (
         <>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Date de l'événement</label>
                <input style={inputStyle} type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
            </div>
            <div style={formGroupStyle}><label style={labelStyle}>Nombre d'invités</label><input style={inputStyle} type="number" name="numberOfGuests" value={details.numberOfGuests || ''} onChange={handleDetailChange} /></div>
            <div style={formGroupStyle}><label style={labelStyle}>Lieu</label><input style={inputStyle} type="text" name="lieu" value={details.lieu || ''} onChange={handleDetailChange} /></div>
            {/* ... other form fields ... */}
        </>
    );

    const renderReadOnlyDetails = () => ( /* ... */ );

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails demande #{demande.id.substring(0, 8)}</h2>
                
                {/* ... Customer Info ... */}

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails</h3>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                    {demande.type === 'RESERVATION_SERVICE' ? renderReservationServiceForm() : renderReadOnlyDetails()}
                </div>

                <div style={modalActionsStyle}>
                    <>
                        {demande.type === 'RESERVATION_SERVICE' && (
                            <button onClick={handleUpdateDetails} style={{ ...actionButtonStyle, backgroundColor: '#5a6268', marginRight: 'auto' }}>Sauvegarder</button>
                        )}
                        {demande.status === 'En attente de traitement' && (
                             <button onClick={() => onUpdateStatus(demande.id, 'confirmed')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Confirmer</button>
                        )}
                        {demande.status === 'En attente de paiement' && (
                            <button onClick={handleSendQrCodeAndPay} disabled={isSendingQrCode} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>
                                {isSendingQrCode ? 'Envoi...' : 'Paiement Reçu & Envoyer QR'}
                            </button>
                        )}
                        {demande.status === 'En attente de préparation' && (
                             <button onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Mettre en préparation</button>
                        )}
                        {demande.status === 'confirmed' && (
                           <button onClick={handleAction} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Créer Devis</button>
                        )}
                        {(demande.type === 'COMMANDE_MENU' && demande.status !== 'En attente de paiement') && (
                            <button onClick={handleAction} disabled={isGenerating} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>
                                {isGenerating ? 'Envoi...' : 'Générer & Envoyer Facture'}
                            </button>
                        )}
                         <button onClick={() => onUpdateStatus(demande.id, 'cancelled')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Annuler</button>
                    </>
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
// ...
export default DemandeDetail;