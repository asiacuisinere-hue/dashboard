import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const ClientDetail = ({ clientId, onClose }) => {
    const [client, setClient] = useState(null);
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchClientDetails = async () => {
            if (!clientId) return;
            try {
                setLoading(true);
                // Récupérer les détails du client
                let { data: clientData, error: clientError } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('id', clientId)
                    .single();

                if (clientError) throw clientError;
                setClient(clientData);

                // Récupérer les demandes associées à ce client
                let { data: demandesData, error: demandesError } = await supabase
                    .from('demandes')
                    .select('*')
                    .eq('client_id', clientId)
                    .order('created_at', { ascending: false });
                
                if (demandesError) throw demandesError;
                setDemandes(demandesData);

            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };
        fetchClientDetails();
    }, [clientId]);

    if (loading) return <p>Chargement des détails du client...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;
    if (!client) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '30px', borderRadius: '8px', width: '80%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
                <h2>Détails du Client : {client.last_name} {client.first_name}</h2>
                <p><strong>Email:</strong> {client.email}</p>
                <p><strong>Téléphone:</strong> {client.phone}</p>
                <p><strong>Type:</strong> {client.type}</p>
                {client.type === 'Entreprise' && (
                    <>
                        <p><strong>Nom de l'entreprise:</strong> {client.company_name}</p>
                        <p><strong>SIRET:</strong> {client.siret}</p>
                    </>
                )}
                <p><strong>Adresse:</strong> {client.address || 'N/A'}</p>
                <p><strong>Notes:</strong> {client.notes || 'Aucune'}</p>

                <h3 style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>Historique des Demandes</h3>
                {demandes.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #333' }}>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Date Demande</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Statut</th>
                                <th style={{ padding: '10px', textAlign: 'left' }}>Détails</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandes.map((demande) => (
                                <tr key={demande.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td style={{ padding: '10px' }}>{demande.type}</td>
                                    <td style={{ padding: '10px' }}>{demande.status}</td>
                                    <td style={{ padding: '10px' }}><pre>{JSON.stringify(demande.details_json, null, 2)}</pre></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Aucune demande pour ce client.</p>
                )}
            </div>
        </div>
    );
};

export default ClientDetail;
