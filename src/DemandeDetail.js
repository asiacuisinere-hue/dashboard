import React from 'react';
import { supabase } from './supabaseClient';

// --- Helper Components ---

const DetailsRenderer = ({ details }) => {
    if (!details) return null;
    const keyMap = {
        customerType: 'Type de client', serviceType: 'Type de service', numberOfPeople: 'Nombre de personnes',
        customerMessage: 'Message du client', formulaName: 'Formule', formulaOption: 'Option de la formule',
        deliveryCity: 'Ville de livraison'
    };
    return (
        <ul style={{ listStyleType: 'none', background: '#f9f9f9', borderRadius: '5px', padding: '15px' }}>
            {Object.entries(details).map(([key, value]) => {
                if (!value) return null;
                const label = keyMap[key] || key;
                return (
                    <li key={key} style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
                        <strong style={{ color: '#333', minWidth: '150px', display: 'inline-block' }}>{label}</strong>
                        <span style={{ color: '#555' }}>{value}</span>
                    </li>
                );
            })}
        </ul>
    );
};

// --- Main Component ---

const DemandeDetail = ({ demande, onClose, onUpdate }) => {
    if (!demande) return null;

    const handleUpdateStatus = async (newStatus) => {
        const { error } = await supabase.from('demandes').update({ status: newStatus }).eq('id', demande.id);
        if (error) {
            alert(`Erreur lors de la mise à jour : ${error.message}`);
            return false;
        }
        return true;
    };

    const handleGenerateDocument = async (documentType, shouldUpdateStatus = true) => {
        const shouldSendEmail = window.confirm(`Voulez-vous envoyer ce ${documentType} par e-mail au client ?`);
        
        try {
            const response = await fetch('/generate-document/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id, documentType, sendEmail: shouldSendEmail })
            });

            if (!response.ok) throw new Error(`Erreur du serveur: ${response.statusText}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${documentType}_${demande.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            alert(`${documentType} généré. ${shouldSendEmail ? 'Un e-mail a été envoyé au client.' : ''}`);

            if (shouldUpdateStatus) {
                const nextStatus = documentType === 'Devis' ? 'En attente de validation de devis' : 'En attente de paiement';
                const success = await handleUpdateStatus(nextStatus);
                if (success) {
                    onUpdate();
                    onClose();
                }
            }

        } catch (error) {
            alert(`Erreur lors de la génération du document : ${error.message}`);
        }
    };

    const handleMarkAsPaid = async () => {
        const success = await handleUpdateStatus('En attente de préparation');
        if (!success) {
            alert("Le statut n'a pas pu être mis à jour. L'envoi du QR code est annulé.");
            return;
        }
        
        try {
            const response = await fetch('/send-qrcode/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Erreur inconnue');
            alert('Statut mis à jour et QR code envoyé !');
            onUpdate();
            onClose();
        } catch (error) {
            alert(`Erreur lors de l'envoi du QR code : ${error.message}`);
        }
    };

    const handleStartPreparation = async () => {
        const success = await handleUpdateStatus('Préparation en cours');
        if (success) {
            alert('Statut mis à jour à "Préparation en cours".');
            onUpdate();
            onClose();
        }
    };

    const renderActions = () => {
        const statusActions = {
            'En attente de traitement': (
                <>
                    <button onClick={() => handleGenerateDocument('Devis')} style={{...actionButtonStyle, backgroundColor: '#fd7e14'}}>Générer Devis</button>
                    <button onClick={() => handleGenerateDocument('Facture')} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>Générer Facture</button>
                </>
            ),
            'En attente de validation de devis': (
                <>
                    <button onClick={() => handleGenerateDocument('Facture')} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>Générer la Facture</button>
                </>
            ),
            'En attente de paiement': (
                <button onClick={handleMarkAsPaid} style={{...actionButtonStyle, backgroundColor: '#6f42c1'}}>Marquer comme Payée & Envoyer QR</button>
            ),
            'En attente de préparation': (
                <button onClick={handleStartPreparation} style={{...actionButtonStyle, backgroundColor: '#20c997', color: 'black'}}>Mettre en préparation</button>
            )
        };

        const duplicateButton = (
             <button onClick={() => handleGenerateDocument('Facture', false)} style={{...actionButtonStyle, backgroundColor: '#6c757d', marginRight: 'auto'}}>Dupliquer facture</button>
        );

        const mainActions = statusActions[demande.status] || null;
        
        const showDuplicateButton = ['En attente de paiement', 'En attente de préparation', 'Préparation en cours', 'Confirmée'].includes(demande.status);

        return (
            <>
                {showDuplicateButton && duplicateButton}
                {mainActions}
            </>
        );
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Gérer la demande</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client</h3>
                    <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>
                    <p><strong>Email:</strong> {demande.clients.email}</p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Demande</h3>
                    <p><strong>Statut actuel:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                    <DetailsRenderer details={demande.details_json} />
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    {renderActions()}
                </div>
            </div>
        </div>
    );
};

// --- Styles ---

const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '10px' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const statusBadgeStyle = (status) => {
    const colors = {
        'Nouvelle': '#007bff', 'En attente de traitement': '#ffc107', 'En attente de validation de devis': '#fd7e14',
        'En attente de paiement': '#17a2b8', 'En attente de préparation': '#6f42c1', 'Préparation en cours': '#20c997',
        'Confirmée': '#28a745', 'Refusée': '#6c757d', 'Annulée': '#dc3545'
    };
    return {
        padding: '4px 8px', borderRadius: '12px',
        color: ['En attente de traitement', 'Préparation en cours'].includes(status) ? 'black' : 'white',
        fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d'
    };
};

export default DemandeDetail;
