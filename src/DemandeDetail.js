import React from 'react';
import { supabase } from './supabaseClient';

// --- Composants ---

const DetailsRenderer = ({ details }) => {
    if (!details) return null;

    const keyMap = {
        customerType: 'Type de client',
        serviceType: 'Type de service',
        numberOfPeople: 'Nombre de personnes',
        customerMessage: 'Message du client',
        formulaName: 'Formule',
        formulaOption: 'Option de la formule',
        deliveryCity: 'Ville de livraison'
    };

    return (
        <ul style={{ listStyleType: 'none', padding: 0, background: '#f9f9f9', borderRadius: '5px' }}>
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

const DemandeDetail = ({ demande, onClose, onUpdate }) => {
    if (!demande) return null;

    const handleUpdateStatus = async (newStatus) => {
        const { error } = await supabase
            .from('demandes')
            .update({ status: newStatus })
            .eq('id', demande.id);
        
        if (error) {
            alert(`Erreur lors de la mise à jour : ${error.message}`);
        } else {
            alert('Statut mis à jour avec succès !');
            onUpdate();
            onClose();
        }
    };

    const handleGenerateDocument = async (documentType) => {
        alert(`Génération du ${documentType}...`);
        try {
            const response = await fetch('https://www.asiacuisine.re/generate-document/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id, documentType: documentType })
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || `Erreur lors de la génération du ${documentType}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${documentType}-${demande.id}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            alert(`Erreur: ${error.message}`);
        }
    };

    const handleMarkAsPaid = async () => {
        // 1. Mettre à jour le statut
        await handleUpdateStatus('Payée');
        
        // 2. Envoyer le QR Code
        try {
            const response = await fetch('/send-qrcode/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Erreur inconnue');
            }
            alert('E-mail avec QR code envoyé au client.');
        } catch (error) {
            alert(`Erreur lors de l'envoi du QR code : ${error.message}`);
        }
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails de la demande</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client</h3>
                    <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>
                    <p><strong>Email:</strong> {demande.clients.email}</p>
                    <p><strong>Téléphone:</strong> {demande.clients.phone}</p>
                    <p><strong>ID Client:</strong> {demande.clients.client_id}</p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Demande</h3>
                    <p><strong>Type:</strong> {demande.type}</p>
                    <p><strong>Date souhaitée:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut actuel:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails Spécifiques</h3>
                    <DetailsRenderer details={demande.details_json} />
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    {demande.status === 'Confirmée' && (
                        <button onClick={handleMarkAsPaid} style={{...actionButtonStyle, backgroundColor: '#17a2b8'}}>Marquer comme Payée & Envoyer QR</button>
                    )}
                    {demande.status === 'Payée' && (
                         <button onClick={() => handleUpdateStatus('En préparation')} style={{...actionButtonStyle, backgroundColor: '#ffc107', color: 'black'}}>Marquer comme "En préparation"</button>
                    )}
                    <button onClick={() => handleUpdateStatus('Annulée')} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>Annuler la demande</button>
                    <button onClick={() => handleGenerateDocument('Devis')} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Générer Devis</button>
                    <button onClick={() => handleGenerateDocument('Facture')} style={{...actionButtonStyle, backgroundColor: '#007bff'}}>Générer Facture</button>
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

const statusBadgeStyle = (status) => {
    const colors = {
        'Nouvelle': '#007bff',
        'Confirmée': '#28a745',
        'Payée': '#17a2b8',
        'En préparation': '#ffc107',
        'Terminée': '#6c757d',
        'Annulée': '#dc3545'
    };
    return {
        padding: '4px 8px',
        borderRadius: '12px',
        color: status === 'En préparation' ? 'black' : 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        backgroundColor: colors[status] || '#6c757d'
    };
};

const actionButtonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold'
};

export default DemandeDetail;