import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

const Demandes = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDemandes = async () => {
            try {
                console.log('Fetching demandes from Supabase...');
                setLoading(true);
                let { data, error } = await supabase
                    .from('demandes')
                    .select(`
                        id,
                        created_at,
                        type,
                        status,
                        request_date,
                        details_json,
                        clients ( id, first_name, last_name, email )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                console.log('Data received from Supabase:', data);
                setDemandes(data);
            } catch (error) {
                console.error('Error fetching demandes:', error.message);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDemandes();
    }, []);

    if (loading) {
        return <p>Chargement des demandes...</p>;
    }

    if (error) {
        return <p style={{ color: 'red' }}>Erreur: {error}</p>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <h3 style={{ marginBottom: '20px' }}>Dernières Demandes</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #333' }}>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Client</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Date de la demande</th>
                        <th style={{ padding: '10px', textAlign: 'left' }}>Statut</th>
                    </tr>
                </thead>
                <tbody>
                    {demandes.length > 0 ? (
                        demandes.map((demande) => (
                            <tr key={demande.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '10px' }}>{demande.clients.last_name || demande.clients.email}</td>
                                <td style={{ padding: '10px' }}>{demande.type}</td>
                                <td style={{ padding: '10px' }}>{new Date(demande.request_date).toLocaleDateString('fr-FR')}</td>
                                <td style={{ padding: '10px' }}>{demande.status}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Aucune demande pour le moment.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default Demandes;
