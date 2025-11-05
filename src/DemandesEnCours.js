import React, { useState, useEffect } from 'react';
import { supabase } from './api/supabaseClient';
import DemandeDetail from './DemandeDetail';

const DemandesEnCours = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDemande, setSelectedDemande] = useState(null);

    const fetchDemandes = async () => {
        try {
            setLoading(true);
            let { data, error } = await supabase
                .from('demandes')
                .select(`id, created_at, type, status, request_date, details_json, clients ( id, first_name, last_name, email, phone )`)
                .in('status', ['Confirmée', 'En préparation'])
                .order('request_date', { ascending: true });

            if (error) throw error;

            setDemandes(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDemandes();
    }, []);

    const handleCloseDetail = () => {
        setSelectedDemande(null);
        fetchDemandes(); // Rafraîchir la liste après la fermeture
    };

    if (loading) return <p>Chargement des demandes en cours...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;

    return (
        <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '20px' }}>Demandes en Cours</h3>
            {demandes.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {demandes.map((demande) => (
                        <div key={demande.id} onClick={() => setSelectedDemande(demande.id)} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                            <p><strong>Client:</strong> {demande.clients.last_name || demande.clients.email}</p>
                            <p><strong>Type:</strong> {demande.type}</p>
                            <p><strong>Date:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                            <p><strong>Statut:</strong> <span style={{ background: '#ffc107', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8em' }}>{demande.status}</span></p>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Aucune demande en cours pour le moment.</p>
            )}

            {selectedDemande && <DemandeDetail demandeId={selectedDemande} onClose={handleCloseDetail} />}
        </div>
    );
};

export default DemandesEnCours;