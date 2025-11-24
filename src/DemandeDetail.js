import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const DemandeDetail = ({ demande, onClose, onUpdateStatus, onRefresh }) => {
    const navigate = useNavigate();
    
    // State for the editable form, initialized with existing details
    const [details, setDetails] = useState(demande.details_json || {});

    useEffect(() => {
        // Ensure form is updated if a new demande is selected while modal is open
        setDetails(demande.details_json || {});
    }, [demande]);

    if (!demande) return null;

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async () => {
        const { error } = await supabase
            .from('demandes')
            .update({ details_json: details })
            .eq('id', demande.id);
        
        if (error) {
            alert(`Erreur lors de la sauvegarde: ${error.message}`);
        } else {
            alert('Détails sauvegardés avec succès !');
            onRefresh && onRefresh(); // Refresh the list to show updated data
            onClose();
        }
    };

    const clientInfo = demande.clients || demande.entreprises;
    const clientInfoWithTag = clientInfo ? { ...clientInfo, type: demande.clients ? 'client' : 'entreprise' } : null;

    const handleRedirectToCreateQuote = async () => {
        console.log('--- [DEBUG] Type de demande au clic sur "Créer Devis":', demande.type);

        if (!clientInfoWithTag) {
            alert('Impossible de continuer : aucune information client trouvée.');
            onClose();
            return;
        }

        // Pour les commandes de menu, générer le document directement
        if (demande.type === 'COMMANDE_MENU') {
            if (!window.confirm("Cette action va générer la facture pour cette commande. Continuer ?")) return;

            try {
                console.log('[DEBUG] Calling API with demande ID:', demande.id);
                
                const response = await fetch('https://gestion.asiacuisine.re/functions/generate-document', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/pdf'
                    },
                    body: JSON.stringify({ 
                        demandeId: demande.id, 
                        documentType: 'Facture', 
                        sendEmail: false 
                    })
                });

                console.log('[DEBUG] Response status:', response.status);
                console.log('[DEBUG] Response headers:', [...response.headers.entries()]);

                if (!response.ok) {
                    // Try to get error message
                    let errorMessage = 'Erreur lors de la génération du document.';
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.details || errorMessage;
                    } else {
                        const errorText = await response.text();
                        console.error('[DEBUG] Error response text:', errorText);
                        errorMessage = `Erreur ${response.status}: ${response.statusText}`;
                    }
                    
                    throw new Error(errorMessage);
                }
                
                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `facture-commande-${demande.id.substring(0, 8)}.pdf`;
                
                if (contentDisposition) {
                    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (filenameMatch && filenameMatch[1]) {
                        filename = filenameMatch[1].replace(/['"]/g, '');
                    }
                }

                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                alert('Document généré et téléchargé avec succès.');
                onClose();

            } catch (error) {
                console.error('[ERROR] Auto-génération document:', error);
                alert(`Erreur: ${error.message}\n\nVérifiez que la fonction Cloudflare est déployée correctement.`);
            }

        } else {
            // Pour les autres types (ex: RESERVATION_SERVICE), rediriger vers la page de devis
            navigate('/devis', { state: { customer: clientInfoWithTag, demandeId: demande.id } });
            onClose();
        }
    };

    const renderReservationServiceForm = () => (
        <>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Nombre d'invités</label>
                <input style={inputStyle} type="number" name="numberOfGuests" value={details.numberOfGuests || ''} onChange={handleDetailChange} />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Lieu de la prestation</label>
                <input style={inputStyle} type="text" name="lieu" value={details.lieu || ''} onChange={handleDetailChange} />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Formules souhaitées (séparées par des virgules)</label>
                <input style={inputStyle} type="text" name="selectedFormulas" value={Array.isArray(details.selectedFormulas) ? details.selectedFormulas.join(', ') : details.selectedFormulas || ''} onChange={(e) => setDetails(prev => ({...prev, selectedFormulas: e.target.value.split(',').map(s => s.trim())}))} />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Allergies / Restrictions</label>
                <textarea style={textareaStyle} name="allergies" value={details.allergies || ''} onChange={handleDetailChange}></textarea>
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Équipement sur place</label>
                <textarea style={textareaStyle} name="equipement" value={details.equipement || ''} onChange={handleDetailChange}></textarea>
            </div>
             <div style={formGroupStyle}>
                <label style={labelStyle}>Détails supplémentaires</label>
                <textarea style={textareaStyle} name="extraInfo" value={details.extraInfo || ''} onChange={handleDetailChange}></textarea>
            </div>
        </>
    );

    const renderReadOnlyDetails = () => (
        <>
            {Object.entries(details).map(([key, value]) => (
                <p key={key}><strong>{key}:</strong> {Array.isArray(value) ? value.join(', ') : value}</p>
            ))}
        </>
    );

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails de la demande #{demande.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {demande.clients && <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>}
                    {demande.entreprises && <p><strong>Entreprise:</strong> {demande.entreprises.nom_entreprise}</p>}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails de la Prestation</h3>
                    <p><strong>Date de l'événement:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Type:</strong> {demande.type}</p>
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
                        {demande.status === 'confirmed' && (
                            <button onClick={handleRedirectToCreateQuote} style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}>Créer Devis</button>
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
    const colors = { 'pending': '#ffc107', 'confirmed': '#007bff', 'in_progress': '#17a2b8', 'completed': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 8px', borderRadius: '12px', color: 'white', fontWeight: 'bold', fontSize: '12px', backgroundColor: colors[status] || '#6c757d' };
};
const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const textareaStyle = { ...inputStyle, height: '100px', resize: 'vertical' };

export default DemandeDetail;