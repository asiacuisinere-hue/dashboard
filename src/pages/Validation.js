import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Validation = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const demandeId = searchParams.get('id');

    const [demande, setDemande] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isConfirming, setIsConfirming] = useState(false);

    const fetchDemande = useCallback(async () => {
        if (!demandeId) {
            setError('Aucun ID de demande fourni.');
            setLoading(false);
            return;
        }

        setLoading(true);
        const { data, error } = await supabase
            .from('demandes')
            .select('*, clients(*), entreprises(*)')
            .eq('id', demandeId)
            .single();

        if (error) {
            console.error('Error fetching demande:', error);
            setError('Impossible de trouver la demande correspondante.');
        } else {
            setDemande(data);
        }
        setLoading(false);
    }, [demandeId]);

    useEffect(() => {
        fetchDemande();
    }, [fetchDemande]);

    const handleConfirmDelivery = async () => {
        if (!demande) return;

        if (!window.confirm("Confirmer la livraison de cette commande ? Le statut passera à 'Terminée'.")) return;

        setIsConfirming(true);
        const { error } = await supabase
            .from('demandes')
            .update({ status: 'completed' })
            .eq('id', demande.id);

        if (error) {
            setError(`Erreur lors de la mise à jour: ${error.message}`);
        } else {
            alert('Livraison confirmée avec succès !');
            navigate('/'); // Redirect to the main page
        }
        setIsConfirming(false);
    };

    if (loading) {
        return <div style={containerStyle}>Chargement des détails de la demande...</div>;
    }

    if (error) {
        return <div style={{...containerStyle, color: 'red'}}>Erreur: {error}</div>;
    }

    if (!demande) {
        return <div style={containerStyle}>Aucune demande trouvée.</div>;
    }

    const clientName = demande.clients?.last_name ? `${demande.clients.first_name} ${demande.clients.last_name}` : demande.entreprises?.nom_entreprise;

    return (
        <div style={containerStyle}>
            <h1>Validation de Livraison</h1>
            <div style={cardStyle}>
                <h2>Commande #{demande.id.substring(0, 8)}</h2>
                <p><strong>Client:</strong> {clientName || 'N/A'}</p>
                <p><strong>Date de l'événement:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                <p><strong>Statut actuel:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>

                {demande.status === 'completed' ? (
                    <p style={{color: 'green', fontWeight: 'bold'}}>Cette commande est déjà terminée.</p>
                ) : (
                    <button 
                        onClick={handleConfirmDelivery} 
                        disabled={isConfirming} 
                        style={confirmButtonStyle}
                    >
                        {isConfirming ? 'Confirmation...' : 'Confirmer la Livraison et Terminer'}
                    </button>
                )}
            </div>
        </div>
    );
};

// Styles
const containerStyle = { padding: '20px', maxWidth: '800px', margin: '2rem auto', textAlign: 'center' };
const cardStyle = { background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' };
const confirmButtonStyle = {
    padding: '12px 25px',
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#28a745',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '2rem',
};
const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'En cours de traitement': '#ffc107', 'confirmed': '#007bff', 'in_progress': '#17a2b8', 'completed': '#28a745', 'cancelled': '#dc3545', 'En attente de paiement': '#fd7e14', 'En attente de préparation': '#6f42c1', 'Préparation en cours': '#17a2b8' };
    return {
        padding: '4px 8px', borderRadius: '12px', color: 'white',
        fontWeight: 'bold', fontSize: '14px', backgroundColor: colors[status] || '#6c757d'
    };
};

export default Validation;
