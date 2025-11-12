import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Entreprises = () => {
    const [entreprises, setEntreprises] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchEntreprises = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('entreprises')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des entreprises:', error);
            alert(`Erreur de chargement des entreprises: ${error.message}`);
        } else {
            setEntreprises(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchEntreprises();
    }, [fetchEntreprises]);

    if (loading) {
        return <div>Chargement de la liste des entreprises...</div>;
    }

    return (
        <div>
            <h1>Liste des Entreprises</h1>
            <p>Voici la liste de toutes les entreprises enregistrées.</p>

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Nom de l'entreprise</th>
                            <th style={thStyle}>SIRET</th>
                            <th style={thStyle}>Nom du contact</th>
                            <th style={thStyle}>Email du contact</th>
                            <th style={thStyle}>Téléphone du contact</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entreprises.map(entreprise => (
                            <tr key={entreprise.id}>
                                <td style={tdStyle}>{entreprise.nom_entreprise}</td>
                                <td style={tdStyle}>{entreprise.siret}</td>
                                <td style={tdStyle}>{entreprise.contact_name}</td>
                                <td style={tdStyle}>{entreprise.contact_email}</td>
                                <td style={tdStyle}>{entreprise.contact_phone}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Styles ---
const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto',
    background: 'white'
};
const tableStyle = { width: '100%', borderCollapse: 'collapse' };
const thStyle = { background: '#f4f7fa', padding: '12px 15px', textAlign: 'left', fontWeight: 'bold', color: '#333', borderBottom: '2px solid #ddd' };
const tdStyle = { padding: '12px 15px', borderBottom: '1px solid #eee', color: '#555' };

export default Entreprises;
