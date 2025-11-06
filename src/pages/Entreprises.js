import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import ClientDetail from './ClientDetail';

const Entreprises = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);

    const fetchClients = async () => {
        try {
            setLoading(true);
            let { data, error } = await supabase
                .from('clients')
                .select('*')
                .eq('type', 'Entreprise')
                .order('company_name', { ascending: true });

            if (error) throw error;
            setClients(data);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    const filteredClients = clients.filter(client =>
        (client.company_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCloseDetail = () => {
        setSelectedClient(null);
        fetchClients(); // Rafraîchir la liste après la fermeture
    };

    if (loading) return <p>Chargement des clients entreprises...</p>;
    if (error) return <p style={{ color: 'red' }}>Erreur: {error}</p>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2>Gestion des Entreprises ({filteredClients.length})</h2>
                <input
                    type="text"
                    placeholder="Rechercher une entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ padding: '8px', width: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                        <div key={client.id} onClick={() => setSelectedClient(client.id)} style={{ background: 'white', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                            <p><strong>Entreprise:</strong> {client.company_name}</p>
                            <p><strong>Contact Email:</strong> {client.email}</p>
                            <p><strong>Téléphone:</strong> {client.phone}</p>
                        </div>
                    ))
                ) : (
                    <p>Aucune entreprise trouvée.</p>
                )}
            </div>

            {selectedClient && <ClientDetail clientId={selectedClient} onClose={handleCloseDetail} />}
        </div>
    );
};

export default Entreprises;