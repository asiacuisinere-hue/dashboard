import React from 'react';
import { useNavigate } from 'react-router-dom';


const DemandeDetail = ({ demande, onClose, onUpdateStatus }) => {
    const navigate = useNavigate();

    if (!demande) return null;

    const clientInfo = demande.clients || demande.entreprises;
    const clientInfoWithTag = clientInfo ? { ...clientInfo, type: demande.clients ? 'client' : 'entreprise' } : null;

    const handleRedirectToCreateQuote = () => {
        if (clientInfoWithTag) {
            navigate('/devis', { state: { customer: clientInfoWithTag, demandeId: demande.id } });
        } else {
            alert('Impossible de rediriger : aucune information client trouvée pour cette demande.');
        }
        onClose();
    };

    const renderSpecificDetails = () => {
        const details = demande.details_json || {};
        switch (demande.type) {
            case 'RESERVATION_SERVICE':
                return (
                    <>
                        <p><strong>Nombre d'invités:</strong> {details.numberOfGuests || 'Non spécifié'}</p>
                        <p><strong>Lieu de la prestation:</strong> {details.lieu || 'Non spécifié'}</p>
                        <p><strong>Formules souhaitées:</strong> {details.selectedFormulas ? details.selectedFormulas.join(', ') : 'Non spécifié'}</p>
                        <p><strong>Allergies/Restrictions:</strong> {details.allergies || 'Aucune'}</p>
                        <p><strong>Équipement sur place:</strong> {details.equipement || 'Non spécifié'}</p>
                        <p><strong>Détails supplémentaires:</strong> {details.extraInfo || 'Aucun'}</p>
                    </>
                );
            case 'COMMANDE_MENU':
                 return (
                    <>
                        <p><strong>Formule choisie:</strong> {details.formulaName || 'Non spécifié'}</p>
                        <p><strong>Nombre de personnes:</strong> {details.numberOfPeople || 'Non spécifié'}</p>
                        <p><strong>Détails de livraison:</strong> {details.deliveryDetails || 'Non spécifié'}</p>
                    </>
                 );
            case 'COURS_CUISINE':
                 return (
                    <>
                        <p><strong>Thème du cours:</strong> {details.theme || 'Non spécifié'}</p>
                        <p><strong>Nombre de participants:</strong> {details.participants || 'Non spécifié'}</p>
                        <p><strong>Niveau:</strong> {details.level || 'Non spécifié'}</p>
                    </>
                 );
            default:
                return <p>Aucun détail spécifique pour ce type de demande.</p>;
        }
    };
    
    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails de la demande #{demande.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {demande.clients && <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>}
                    {demande.entreprises && <p><strong>Entreprise:</strong> {demande.entreprises.nom_entreprise}</p>}
                    <p><strong>Email:</strong> {demande.clients?.email || demande.entreprises?.contact_email}</p>
                    <p><strong>Téléphone:</strong> {demande.clients?.phone || demande.entreprises?.contact_phone}</p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails de la Prestation</h3>
                    <p><strong>Date de la demande:</strong> {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Date de l'événement:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Type:</strong> {demande.type}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                    {renderSpecificDetails()}
                </div>

                <div style={modalActionsStyle}>
                    {demande.status === 'pending' && (
                         <button onClick={() => onUpdateStatus(demande.id, 'confirmed')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Confirmer la demande</button>
                    )}
                    {demande.status === 'confirmed' && (
                        <button onClick={handleRedirectToCreateQuote} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Créer Devis</button>
                    )}
                     <button onClick={() => onUpdateStatus(demande.id, 'cancelled')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Annuler</button>
                </div>
            </div>
        </div>
    );
};

// --- Styles (similar to Factures.js for consistency) ---
const modalOverlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContentStyle = { background: 'white', padding: '30px', borderRadius: '8px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' };
const closeButtonStyle = { position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer' };
const detailSectionStyle = { marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' };
const detailTitleStyle = { fontSize: '18px', color: '#d4af37', marginBottom: '10px' };
const actionButtonStyle = { padding: '10px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', color: 'white', fontWeight: 'bold' };
const modalActionsStyle = { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'confirmed': '#007bff', 'in_progress': '#17a2b8', 'completed': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};

export default DemandeDetail;
