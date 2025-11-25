import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const DemandeDetail = ({ demande, onClose, onUpdateStatus, onRefresh }) => {
    const navigate = useNavigate();
    const [details, setDetails] = useState(demande.details_json || {});
    // eslint-disable-next-line no-unused-vars
    const [isGenerating, setIsGenerating] = useState(false); // Used for "Générer Facture" button
    const [isSendingQrCode, setIsSendingQrCode] = useState(false); // Used for "Paiement reçu" button

    useEffect(() => {
        setDetails(demande.details_json || {});
    }, [demande]);

    if (!demande) return null;

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async () => {
        const { error } = await supabase.from('demandes').update({ details_json: details }).eq('id', demande.id);
        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Détails sauvegardés !');
            onRefresh && onRefresh();
            onClose();
        }
    };
    
    const handleAction = async () => {
        const clientInfo = demande.clients || demande.entreprises;
        const clientInfoWithTag = clientInfo ? { ...clientInfo, type: demande.clients ? 'client' : 'entreprise' } : null;

        // Flow for COMMANDE_MENU: Generate, send, and download the invoice
        if (demande.type === 'COMMANDE_MENU') {
            if (!window.confirm("Cette action va générer la facture, l'envoyer au client, et la télécharger. Continuer ?")) return;
            
            setIsGenerating(true);
            try {
                const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` 
                    },
                    body: JSON.stringify({ demandeId: demande.id })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Erreur inattendue du serveur.' }));
                    throw new Error(errorData.error || `Erreur ${response.status}`);
                }
                
                // Handle PDF download
                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `facture.pdf`;
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename="(.+)"/);
                    if (filenameMatch && filenameMatch[1]) filename = filenameMatch[1];
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('Facture envoyée et téléchargée avec succès ! Le statut a été mis à jour.');
                onRefresh && onRefresh();
                onClose();

            } catch (error) {
                alert(`Erreur: ${error.message}`);
            } finally {
                setIsGenerating(false);
            }
        } 
        // Flow for RESERVATION_SERVICE: Navigate to the quote creation page
        else if (demande.type === 'RESERVATION_SERVICE' && demande.status === 'confirmed') {
             if (clientInfoWithTag) {
                navigate('/devis', { state: { customer: clientInfoWithTag, demandeId: demande.id } });
                onClose();
            } else {
                alert('Infos client manquantes.');
            }
        }
    };

    const handleSendQrCodeAndPay = async () => {
        if (!window.confirm("Confirmer la réception du paiement et envoyer le QR Code au client ?")) return;
        
        setIsSendingQrCode(true);
        try {
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-qrcode`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` 
                },
                body: JSON.stringify({ demandeId: demande.id })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de l\'envoi du QR Code.');
            }
            
            alert('Paiement confirmé et QR Code envoyé ! Le statut a été mis à jour.');
            onRefresh && onRefresh();
            onClose();

        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            setIsSendingQrCode(false);
        }
    };

    const renderReservationServiceForm = () => (
         <>
            <div style={formGroupStyle}><label style={labelStyle}>Nombre d'invités</label><input style={inputStyle} type="number" name="numberOfGuests" value={details.numberOfGuests || ''} onChange={handleDetailChange} /></div>
            <div style={formGroupStyle}><label style={labelStyle}>Lieu</label><input style={inputStyle} type="text" name="lieu" value={details.lieu || ''} onChange={handleDetailChange} /></div>
            <div style={formGroupStyle}><label style={labelStyle}>Formules (séparées par ',')</label><input style={inputStyle} type="text" name="selectedFormulas" value={Array.isArray(details.selectedFormulas) ? details.selectedFormulas.join(', ') : details.selectedFormulas || ''} onChange={(e) => setDetails(prev => ({...prev, selectedFormulas: e.target.value.split(',').map(s => s.trim())}))} /></div>
            <div style={formGroupStyle}><label style={labelStyle}>Allergies</label><textarea style={textareaStyle} name="allergies" value={details.allergies || ''} onChange={handleDetailChange}></textarea></div>
        </>
    );

    const renderReadOnlyDetails = () => (
        <>
            {Object.entries(details).map(([key, value]) => (<p key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}</p>))}
        </>
    );

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails demande #{demande.id.substring(0, 8)}</h2>
                
                {/* Customer Info */}
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {demande.clients && (
                        <>
                            <p><strong>ID Client:</strong> {demande.clients.client_id || 'N/A'}</p>
                            <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>
                        </>
                    )}
                    {demande.entreprises && <p><strong>Entreprise:</strong> {demande.entreprises.nom_entreprise}</p>}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails</h3>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                    {demande.type === 'RESERVATION_SERVICE' ? renderReservationServiceForm() : renderReadOnlyDetails()}
                </div>

                <div style={modalActionsStyle}>
                    <>
                        {demande.type === 'RESERVATION_SERVICE' && (
                            <button onClick={handleUpdateDetails} style={{ ...actionButtonStyle, backgroundColor: '#5a6268', marginRight: 'auto' }}>Sauvegarder les détails</button>
                        )}
                        {demande.status === 'En attente de traitement' && (
                             <button onClick={() => onUpdateStatus(demande.id, 'confirmed')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Confirmer Demande</button>
                        )}
                        {demande.status === 'En attente de paiement' && demande.type === 'COMMANDE_MENU' && (
                            <button onClick={handleSendQrCodeAndPay} disabled={isSendingQrCode} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>
                                {isSendingQrCode ? 'Envoi en cours...' : 'Paiement reçu & Envoyer QR Code'}
                            </button>
                        )}
                        {demande.status === 'En attente de préparation' && (
                             <button onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Mettre en préparation</button>
                        )}

                        {(demande.status === 'confirmed' && demande.type === 'RESERVATION_SERVICE') && (
                            <button onClick={handleAction} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Créer Devis</button>
                        )}

                        {(demande.type === 'COMMANDE_MENU') && (
                            <button onClick={handleAction} disabled={isGenerating} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>
                                {isGenerating ? 'Envoi en cours...' : 'Générer et Envoyer Facture'}
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
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '15px' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'En attente de traitement': '#ffc107', 'confirmed': '#007bff', 'En attente de paiement': '#fd7e14', 'En attente de préparation': '#6f42c1', 'Préparation en cours': '#17a2b8', 'in_progress': '#17a2b8', 'completed': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};
const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const textareaStyle = { ...inputStyle, height: '80px', resize: 'vertical' };

export default DemandeDetail;
