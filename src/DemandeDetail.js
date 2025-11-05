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
                let { data, error } = await supabase
                    .from('demandes')
                    .select(`*, clients(*)`)
                    .eq('id', demandeId)
                    .single();

                if (error) throw error;
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

    if (loading) return <p>Chargement...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;
    if (!demande) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '600px', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                <h2>Détails de la Demande</h2>
                <p><strong>Client:</strong> {demande.clients.last_name || demande.clients.email}</p>
                <p><strong>Date de la demande:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                <p><strong>Type:</strong> {demande.type}</p>
                <p><strong>Statut actuel:</strong> {demande.status}</p>
                <pre>{JSON.stringify(demande.details_json, null, 2)}</pre>
                
                <div style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                    <h4>Changer le statut :</h4>
                    <button onClick={() => updateStatus('Confirmée')} style={{ marginRight: '10px' }}>Confirmer</button>
                    <button onClick={() => updateStatus('En préparation')} style={{ marginRight: '10px' }}>Mettre en préparation</button>
                    <button onClick={() => updateStatus('Terminée')} style={{ marginRight: '10px' }}>Terminer</button>
                    <button onClick={() => updateStatus('Annulée')} style={{ background: '#dc3545', color: 'white' }}>Annuler</button>
                </div>
            </div>
        </div>
    );
};

export default DemandeDetail;
