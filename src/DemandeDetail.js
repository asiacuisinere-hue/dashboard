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
    
    const handleAction = async () => { /* Logic to be implemented based on workflow */ };
    const handleSendQrCodeAndPay = async () => { /* Logic to be implemented based on workflow */ };

    const renderDetailsSection = () => {
        const currentDetails = demande.details_json || {};

        if (demande.type === 'RESERVATION_SERVICE') {
            return (
                <>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Date de l'événement</label>
                        <input style={inputStyle} type="date" value={requestDate} onChange={(e) => setRequestDate(e.target.value)} />
                    </div>
                    <div style={formGroupStyle}><label style={labelStyle}>Nombre d'invités</label><input style={inputStyle} type="number" name="numberOfGuests" value={currentDetails.numberOfGuests || ''} onChange={handleDetailChange} /></div>
                    <div style={formGroupStyle}><label style={labelStyle}>Lieu</label><input style={inputStyle} type="text" name="lieu" value={currentDetails.lieu || ''} onChange={handleDetailChange} /></div>
                    <div style={formGroupStyle}><label style={labelStyle}>Formules (séparées par ',')</label><input style={inputStyle} type="text" name="selectedFormulas" value={Array.isArray(currentDetails.selectedFormulas) ? currentDetails.selectedFormulas.join(', ') : (currentDetails.selectedFormulas || '')} onChange={(e) => setDetails(prev => ({ ...prev, selectedFormulas: e.target.value.split(',').map(s => s.trim()) }))} /></div>
                    <div style={formGroupStyle}><label style={labelStyle}>Allergies</label><textarea style={textareaStyle} name="allergies" value={currentDetails.allergies || ''} onChange={handleDetailChange}></textarea></div>
                </>
            );
        } else if (demande.type === 'COMMANDE_MENU') {
            return (
                <>
                    <p><strong>Formule:</strong> {currentDetails.formulaName || 'Non spécifié'}</p>
                    <p><strong>Nombre de personnes:</strong> {currentDetails.numberOfPeople || 'Non spécifié'}</p>
                    <p><strong>Date de livraison:</strong> {requestDate ? new Date(requestDate).toLocaleDateString('fr-FR') : 'Non spécifié'}</p>
                    {/* Add other COMMANDE_MENU specific read-only details here if needed */}
                </>
            );
        } else if (demande.type === 'COURS_CUISINE') {
            return (
                <>
                    <p><strong>Thème:</strong> {currentDetails.theme || 'Non spécifié'}</p>
                    <p><strong>Nombre de participants:</strong> {currentDetails.participants || 'Non spécifié'}</p>
                    <p><strong>Niveau:</strong> {currentDetails.level || 'Non spécifié'}</p>
                </>
            );
        } else {
            // Generic read-only for other types
            return (
                <>
                    {Object.entries(currentDetails).map(([key, value]) => (<p key={key}><strong>{key}:</strong> {String(value)}</p>))}
                </>
            );
        }
    };

    const renderCustomerInfo = () => {
        if (demande.clients) return <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>;
        if (demande.entreprises) return <p><strong>Entreprise:</strong> {demande.entreprises.nom_entreprise}</p>;
        return <p>Informations client non disponibles.</p>;
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails demande #{demande.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails</h3>
                    <p><strong>Date de la demande:</strong> {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                    {renderDetailsSection()}
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
                            <button onClick={handleSendQrCodeAndPay} disabled={isSendingQrCode} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>{isSendingQrCode ? 'Envoi...' : 'Paiement Reçu & Envoyer QR'}</button>
                        )}
                        {demande.status === 'En attente de préparation' && (
                             <button onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}>Mettre en préparation</button>
                        )}
                        {(demande.status === 'confirmed' && demande.type === 'RESERVATION_SERVICE') && (
                            <button onClick={handleAction} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Créer Devis</button>
                        )}
                        {(demande.type === 'COMMANDE_MENU' && (demande.status === 'confirmed' || demande.status === 'En attente de traitement')) && (
                            <button onClick={handleAction} disabled={isGenerating} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>{isGenerating ? 'Envoi...' : 'Générer & Envoyer Facture'}</button>
                        )}
                         <button onClick={() => onUpdateStatus(demande.id, 'cancelled')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Annuler</button>
                    </>
                </div>
            </div>
        </div>
    );
};

// Styles...
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '15px' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'En attente de traitement': '#ffc107', 'confirmed': '#007bff', 'in_progress': '#17a2b8', 'completed': '#28a745', 'cancelled': '#dc3545', 'En attente de paiement': '#fd7e14', 'En attente de préparation': '#6f42c1', 'Préparation en cours': '#17a2b8' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};
const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const textareaStyle = { ...inputStyle, height: '80px', resize: 'vertical' };

export default DemandeDetail;
