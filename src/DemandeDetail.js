import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const DemandeDetail = ({ demandeId, onClose }) => {
    const [demande, setDemande] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDemande = async () => {
            if (!demandeId) return;
            try {
                setLoading(true);
                let { data, error: demandeError } = await supabase
                    .from('demandes')
                    .select(`*,
                        clients ( id, first_name, last_name, email, phone, company_name, siret, address )
                    `)
                    .eq('id', demandeId)
                    .single();

                if (demandeError) throw demandeError;
                setDemande(data);
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDemande();
    }, [demandeId]);

    const updateStatus = async (newStatus) => {
        try {
            const { error } = await supabase
                .from('demandes')
                .update({ status: newStatus })
                .eq('id', demandeId);

            if (error) throw error;
            onClose(); // Fermer le modal et rafraîchir la liste
        } catch (error) {
            alert(`Erreur lors de la mise à jour du statut : ${error.message}`);
        }
    };

    const generateDocument = async (documentType) => {
        try {
            const response = await fetch('https://www.asiacuisine.re/generate-document', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ demandeId, documentType }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Erreur lors de la génération du document.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${documentType}_${demandeId}.pdf`; // Nom de fichier temporaire
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            alert(`${documentType} généré et téléchargé avec succès !`);

        } catch (error) {
            console.error(`Erreur lors de la génération du ${documentType}:`, error);
            alert(`Erreur lors de la génération du ${documentType}: ${error.message}`);
        }
    };

    const generateQRCode = async () => {
        try {
            const response = await fetch('https://www.asiacuisine.re/generate-qrcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ demandeId }),
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.error || 'Erreur lors de la génération du QR code.');
            }

            const { qrCodeImage } = await response.json();
            const newWindow = window.open();
            newWindow.document.write(`<img src="${qrCodeImage}" alt="QR Code" />`);

        } catch (error) {
            console.error('Erreur lors de la génération du QR code:', error);
            alert(`Erreur lors de la génération du QR code: ${error.message}`);
        }
    };

    if (loading) return <p>Chargement...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;
    if (!demande) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '80%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                <h2>Détails de la Demande</h2>
                <p><strong>Client:</strong> {demande.clients.last_name || demande.clients.email} {demande.clients.first_name}</p>
                {demande.clients.company_name && <p><strong>Entreprise:</strong> {demande.clients.company_name}</p>}
                <p><strong>Email:</strong> {demande.clients.email}</p>
                <p><strong>Téléphone:</strong> {demande.clients.phone}</p>
                <p><strong>Type de demande:</strong> {demande.type}</p>
                <p><strong>Date de la demande:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                <p><strong>Statut actuel:</strong> {demande.status}</p>
                <p><strong>Détails:</strong> <pre>{JSON.stringify(demande.details_json, null, 2)}</pre></p>
                
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h4>Actions :</h4>
                    <button onClick={() => updateStatus('Confirmée')} style={{ marginRight: '10px', backgroundColor: '#28a745', color: 'white' }}>Confirmer</button>
                    <button onClick={() => updateStatus('En préparation')} style={{ marginRight: '10px', backgroundColor: '#007bff', color: 'white' }}>En préparation</button>
                    <button onClick={() => updateStatus('Terminée')} style={{ marginRight: '10px', backgroundColor: '#6c757d', color: 'white' }}>Terminer</button>
                    <button onClick={() => updateStatus('Annulée')} style={{ marginRight: '10px', backgroundColor: '#dc3545', color: 'white' }}>Annuler</button>
                    <button onClick={() => generateDocument('Devis')} style={{ marginRight: '10px', backgroundColor: '#17a2b8', color: 'white' }}>Créer Devis</button>
                    <button onClick={() => generateDocument('Facture')} style={{ backgroundColor: '#ffc107', color: 'white' }}>Créer Facture</button>
                    <button onClick={generateQRCode} style={{ marginLeft: '10px', backgroundColor: '#343a40', color: 'white' }}>Générer QR Code</button>
                </div>
            </div>
        </div>
    );
};

export default DemandeDetail;