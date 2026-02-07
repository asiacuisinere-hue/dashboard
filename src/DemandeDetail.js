import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

const communesReunion = [
    "Bras-Panon", "Cilaos", "Entre-Deux", "L'Étange-Salé", "La Plaine-des-Palmistes",
    "La Possession", "Le Port", "Le Tampon", "Les Avirons", "Les Trois-Bassins",
    "Petite-Île", "Saint-André", "Saint-Benoît", "Saint-Denis", "Saint-Joseph",
    "Saint-Leu", "Saint-Louis", "Saint-Paul", "Saint-Philippe", "Saint-Pierre",
    "Sainte-Marie", "Sainte-Rose", "Sainte-Suzanne", "Salazie"
];

const DemandeDetail = ({ demande, onClose, onUpdateStatus, onRefresh }) => {
    const navigate = useNavigate();

    const [details, setDetails] = useState(demande.details_json || {});
    const [requestDate, setRequestDate] = useState('');
    const [totalAmount, setTotalAmount] = useState(demande.total_amount || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSendingQrCode, setIsSendingQrCode] = useState(false);
    const [isGeneratingStripeLink, setIsGeneratingStripeLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');

    useEffect(() => {
        setDetails(demande.details_json || {});
        setRequestDate(demande.request_date ? new Date(demande.request_date).toISOString().split('T')[0] : '');
        setTotalAmount(demande.total_amount || '');
        setPaymentLink('');
    }, [demande]);

    if (!demande) return null;

    const handleGenerateStripeLink = async (amountType = 'total') => {
        setIsGeneratingStripeLink(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-stripe-checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    demand_id: demande.id,
                    amount_type: amountType
                })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erreur lors de la génération du lien.'); 

            setPaymentLink(result.url);
            alert('Lien de paiement Stripe généré avec succès !');
        } catch (error) {
            alert(`Erreur Stripe: ${error.message}`);
        } finally {
            setIsGeneratingStripeLink(false);
        }
    };

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateDetails = async () => {
        const { error } = await supabase
            .from('demandes')
            .update({ 
                details_json: details, 
                request_date: requestDate,
                total_amount: totalAmount === '' ? null : parseFloat(totalAmount)
            })
            .eq('id', demande.id);

        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Détails et montant sauvegardés !');
            onRefresh && onRefresh();
            onClose();
        }
    };

    const handleAction = async () => {
        const clientInfo = demande.clients || demande.entreprises;
        const clientInfoWithTag = clientInfo ? {
            ...clientInfo,
            type: demande.clients ? 'client' : 'entreprise'
        } : null;

        if ((demande.type === 'COMMANDE_MENU' || demande.type === 'COMMANDE_SPECIALE') && (demande.status === 'confirmed' || demande.status === 'En attente de traitement')) {
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

                const blob = await response.blob();
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = 'facture.pdf';
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
                onRefresh && onRefresh();
                onClose();

            } catch (error) {
                alert(`Erreur: ${error.message}`);
            } finally {
                setIsGenerating(false);
            }

        } else if ((demande.type === 'RESERVATION_SERVICE' || demande.type === 'SOUSCRIPTION_ABONNEMENT') && demande.status === 'confirmed') {
            if (clientInfoWithTag) {
                navigate('/devis', { state: { customer: clientInfoWithTag, demandeId: demande.id } });    
                onClose();
            } else {
                alert('Infos client manquantes.');
            }
        }
    };

    const handleSendQrCodeAndPay = async () => {
        if (!window.confirm("Confirmer la réception du paiement et envoyer le QR Code ?")) return;       
        setIsSendingQrCode(true);
        try {
            const { data: companySettings, error: settingsError } = await supabase
                .from('company_settings')
                .select('*')
                .limit(1)
                .single();

            if (settingsError || !companySettings) {
                throw new Error(settingsError?.message || 'Impossible de récupérer les paramètres de l\'entreprise.');
            }

            const payload = {
                demandeId: demande.id,
                companySettings: companySettings
            };

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-qrcode`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Erreur lors de l\'envoi du QR Code.');     
            alert('Paiement confirmé et QR Code envoyé !');
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
            <div style={formGroupStyle}>
                <label style={labelStyle}>Date de l'événement</label>
                <input
                    style={inputStyle}
                    type="date"
                    value={requestDate}
                    onChange={(e) => setRequestDate(e.target.value)}
                />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Heure de l'événement</label>
                <select
                    style={inputStyle}
                    name="heure"
                    value={details.heure || ''}
                    onChange={handleDetailChange}
                >
                    <option value="">Non spécifié</option>
                    <option value="Midi">Midi (déjeuner)</option>
                    <option value="Soir">Soir (dîner)</option>
                </select>
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Nombre d'invités</label>
                <input
                    style={inputStyle}
                    type="text"
                    name="numberOfPeople"
                    value={details.numberOfPeople || ''}
                    onChange={handleDetailChange}
                />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Ville</label>
                <select
                    style={inputStyle}
                    name="ville"
                    value={details.ville || ''}
                    onChange={handleDetailChange}
                >
                    <option value="">-- Sélectionnez une ville --</option>
                    {communesReunion.map(commune => (
                        <option key={commune} value={commune}>{commune}</option>
                    ))}
                </select>
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Budget par personne</label>
                <select
                    style={inputStyle}
                    name="budget"
                    value={details.budget || ''}
                    onChange={handleDetailChange}
                >
                    <option value="">Non spécifié</option>
                    <option value="<50">Moins de 50€</option>
                    <option value="50-80">50€ - 80€</option>
                    <option value=">80">Plus de 80€</option>
                </select>
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Formules (séparées par ',')</label>
                <input
                    style={inputStyle}
                    type="text"
                    name="selectedFormulas"
                    value={Array.isArray(details.selectedFormulas) ? details.selectedFormulas.join(', ') : (details.selectedFormulas || '')}
                    onChange={(e) => setDetails(prev => ({...prev, selectedFormulas: e.target.value.split(',').map(s => s.trim())}))}
                />
            </div>
            <div style={formGroupStyle}>
                <label style={labelStyle}>Allergies</label>
                <textarea
                    style={textareaStyle}
                    name="allergies"
                    value={details.allergies || ''}
                    onChange={handleDetailChange}
                ></textarea>
            </div>
        </>
    );

    const renderReadOnlyDetails = () => {
        const d = demande.details_json || {};
        if (demande.type === 'COMMANDE_MENU') {
            return (
                <>
                    <p><strong>Formule:</strong> {d.formulaName || 'N/A'}</p>
                    <p><strong>Option:</strong> {d.formulaOption || 'N/A'}</p>
                    <p><strong>Ville de livraison:</strong> {d.deliveryCity || 'N/A'}</p>
                </>
            );
        }
                if (demande.type === 'COMMANDE_SPECIALE') {
                    if (!d.items || !Array.isArray(d.items)) return <p>Détails de la commande non disponibles.</p>;

                    const total = d.total || d.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

                    return (
                        <div>
                            <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '10px' }}>      
                                {d.items.map((item, index) => (
                                    <li key={index} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{item.quantity} x {item.name} ({item.portion})</span>
                                        <span>{(item.quantity * item.price).toFixed(2)} €</span>        
                                    </li>
                                ))}
                            </ul>
                            <hr style={{ margin: '10px 0' }} />
                            <p style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>    
                                <strong>Total:</strong> {parseFloat(total).toFixed(2)} €
                            </p>
                            {d.deliveryCity && <p style={{marginTop: '10px'}}><strong>Ville de livraison:</strong> {d.deliveryCity}</p>}
                        </div>
                    );
                }
                if (demande.type === 'SOUSCRIPTION_ABONNEMENT') {
                    return (
                        <>
                            <p><strong>Formule :</strong> {d.formula || 'N/A'}</p>
                            <p><strong>Notes :</strong> {d.notes || 'Aucune'}</p>
                        </>
                    );
                }        return (
            <>
                {Object.entries(d).map(([key, value]) => (
                    <p key={key}><strong>{key}:</strong> {String(value)}</p>
                ))}
            </>
        );
    };

    const renderCustomerInfo = () => {
        if (demande.clients) return <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p>;
        if (demande.entreprises) return <p><strong>Entreprise:</strong> {demande.entreprises.nom_entreprise}</p>;
        return null;
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>
                    Détails demande #{demande.id.substring(0, 8)}
                    {demande.invoices?.[0]?.document_number && (
                        <span style={{ fontSize: '14px', color: '#6c757d', marginLeft: '10px' }}>
                            (Facture: {demande.invoices[0].document_number})
                        </span>
                    )}
                </h2>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails & Montant</h3>
                    <div style={{...formGroupStyle, backgroundColor: '#fff9e6', padding: '15px', borderRadius: '8px', border: '1px solid #ffeeba', marginBottom: '20px'}}>
                        <label style={{...labelStyle, color: '#856404'}}>MONTANT TOTAL DE LA PRESTATION (€)</label>
                        <input
                            style={{...inputStyle, fontSize: '1.2rem', fontWeight: 'bold', borderColor: '#ffeeba'}}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={totalAmount}
                            onChange={(e) => setTotalAmount(e.target.value)}
                        />
                        <p style={{fontSize: '11px', color: '#856404', marginTop: '5px', marginBottom: 0}}>
                            * Saisissez le montant final négocié pour pouvoir générer le lien Stripe.
                        </p>
                    </div>
                    
                    <p>
                        <strong>Statut:</strong>
                        <span style={statusBadgeStyle(demande.status)}>{demande.status}</span>
                    </p>
                    {demande.type === 'RESERVATION_SERVICE' ? renderReservationServiceForm() : renderReadOnlyDetails()}
                </div>

                {paymentLink && (
                    <div style={{
                        backgroundColor: '#f8f9ff',
                        border: '1px solid #e0e4ff',
                        borderRadius: '8px',
                        padding: '15px',
                        marginBottom: '20px'
                    }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#635bff' }}>Lien de paiement généré :</p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                readOnly 
                                value={paymentLink} 
                                style={{ ...inputStyle, flex: 1, backgroundColor: '#fff' }}
                                onClick={(e) => e.target.select()}
                            />
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(paymentLink);
                                    alert('Lien copié !');
                                }}
                                style={{ ...actionButtonStyle, backgroundColor: '#635bff' }}
                            >
                                Copier
                            </button>
                        </div>
                    </div>
                )}

                <div style={modalActionsStyle}>
                    <>
                        <button
                            onClick={handleUpdateDetails}
                            style={{ ...actionButtonStyle, backgroundColor: '#5a6268', marginRight: 'auto' }}
                        >
                            Sauvegarder
                        </button>
                        
                        {demande.status === 'En attente de traitement' && (
                            <button
                                onClick={() => onUpdateStatus(demande.id, 'confirmed')}
                                style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}
                            >
                                Confirmer
                            </button>
                        )}
                        {(demande.status === 'En attente de paiement' || demande.status === 'confirmed') && (
                            <button
                                onClick={() => handleGenerateStripeLink('total')}
                                disabled={isGeneratingStripeLink}
                                style={{ ...actionButtonStyle, backgroundColor: '#635bff' }}
                            >
                                {isGeneratingStripeLink ? 'Génération...' : 'Lien Stripe (Total)'}
                            </button>
                        )}
                        {demande.status === 'En attente de paiement' && (
                            <button 
                                onClick={handleSendQrCodeAndPay}
                                disabled={isSendingQrCode}
                                style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}
                            >
                                {isSendingQrCode ? 'Envoi...' : 'Paiement Reçu & Envoyer QR'}
                            </button>
                        )}
                        {demande.status === 'En attente de préparation' && (
                            <button
                                onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')}       
                                style={{ ...actionButtonStyle, backgroundColor: '#17a2b8' }}
                            >
                                Mettre en préparation
                            </button>
                        )}
                        {(demande.status === 'confirmed' && (demande.type === 'RESERVATION_SERVICE' || demande.type === 'SOUSCRIPTION_ABONNEMENT')) && (
                            <button
                                onClick={handleAction}
                                style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}
                            >
                                Créer Devis
                            </button>
                        )}
                        {(demande.type === 'COMMANDE_MENU' || demande.type === 'COMMANDE_SPECIALE') && (demande.status === 'confirmed' || demande.status === 'En attente de traitement') && (
                            <button
                                onClick={handleAction}
                                disabled={isGenerating}
                                style={{ ...actionButtonStyle, backgroundColor: '#007bff' }}
                            >
                                {isGenerating ? 'Envoi...' : 'Générer & Envoyer Facture'}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (window.confirm('Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible.')) {
                                    onUpdateStatus(demande.id, 'cancelled');
                                }
                            }}
                            style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}
                        >
                            Annuler la commande
                        </button>
                    </>
                </div>
            </div>
        </div>
    );
};

// Styles
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
};

const modalContentStyle = {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '800px',
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
    marginBottom: '15px'
};

const actionButtonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold'
};

const modalActionsStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px'
};

const statusBadgeStyle = (status) => {
    const colors = {
        'pending': '#ffc107',
        'En attente de traitement': '#ffc107',
        'confirmed': '#007bff',
        'in_progress': '#17a2b8',
        'completed': '#28a745',
        'cancelled': '#dc3545',
        'En attente de paiement': '#fd7e14',
        'En attente de préparation': '#6f42c1',
        'Préparation en cours': '#17a2b8',
        'Payée': '#6f42c1'
    };
    return {
        padding: '4px 8px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        backgroundColor: colors[status] || '#6c757d'
    };
};

const formGroupStyle = { marginBottom: '15px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' };
const textareaStyle = { ...inputStyle, height: '80px', resize: 'vertical' };

export default DemandeDetail;