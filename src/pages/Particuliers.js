import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Particuliers = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editClient, setEditClient] = useState(null); // Client en cours d'édition
    const [newClientData, setNewClientData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        address: '',
        notes: ''
    });

    const fetchClients = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('clients').select('*');

        if (searchTerm) {
            query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('last_name', { ascending: true });

        if (error) {
            console.error('Erreur de chargement des clients:', error);
            alert(`Erreur de chargement des clients: ${error.message}`);
        } else {
            setClients(data);
        }
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewClientData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditClient(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClient = async () => {
        if (!newClientData.last_name || !newClientData.email) {
            alert("Le nom de famille et l'email sont obligatoires.");
            return;
        }

        const { error } = await supabase.from('clients').insert([newClientData]);

        if (error) {
            alert(`Erreur lors de l'ajout du client : ${error.message}`);
        } else {
            alert("Le client a été ajouté.");
            setNewClientData({ first_name: '', last_name: '', email: '', phone: '', address: '', notes: '' });
            fetchClients();
        }
    };

    const handleUpdateClient = async () => {
        if (!editClient.last_name || !editClient.email) {
            alert("Le nom de famille et l'email sont obligatoires.");
            return;
        }

        const { error } = await supabase
            .from('clients')
            .update(editClient)
            .eq('id', editClient.id);

        if (error) {
            alert(`Erreur lors de la mise à jour du client : ${error.message}`);
        } else {
            alert("Le client a été mis à jour.");
            setEditClient(null);
            fetchClients();
        }
    };

    const handleDeleteClient = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer ce client ?")) {
            const { error } = await supabase
                .from('clients')
                .delete()
                .eq('id', id);

            if (error) {
                alert(`Erreur lors de la suppression du client : ${error.message}`);
            } else {
                fetchClients();
            }
        }
    };

    if (loading) {
        return <div>Chargement des particuliers...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>Gestion des Particuliers</h1>

            {/* Section de recherche */}
            <div style={filterContainerStyle}>
                <input
                    type="text"
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={filterInputStyle}
                />
            </div>

            {/* Formulaire d'ajout/édition de client */}
            <div style={formContainerStyle}>
                <h2>{editClient ? 'Modifier le client' : 'Ajouter un nouveau client'}</h2>
                <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                        <label>Nom:</label>
                        <input type="text" name="last_name" value={editClient ? editClient.last_name : newClientData.last_name} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label>Prénom:</label>
                        <input type="text" name="first_name" value={editClient ? editClient.first_name : newClientData.first_name} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label>Email:</label>
                        <input type="email" name="email" value={editClient ? editClient.email : newClientData.email} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label>Téléphone:</label>
                        <input type="tel" name="phone" value={editClient ? editClient.phone : newClientData.phone} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label>Adresse:</label>
                        <textarea name="address" value={editClient ? editClient.address : newClientData.address} onChange={editClient ? handleEditChange : handleInputChange} style={textareaStyle}></textarea>
                    </div>
                    <div style={formGroupStyle}>
                        <label>Notes:</label>
                        <textarea name="notes" value={editClient ? editClient.notes : newClientData.notes} onChange={editClient ? handleEditChange : handleInputChange} style={textareaStyle}></textarea>
                    </div>
                </div>
                <div style={formActionsStyle}>
                    <button onClick={editClient ? handleUpdateClient : handleAddClient} style={buttonStyle}>
                        {editClient ? 'Mettre à jour le client' : 'Ajouter le client'}
                    </button>
                    {editClient && (
                        <button onClick={() => setEditClient(null)} style={{ ...buttonStyle, backgroundColor: '#6c757d', marginLeft: '10px' }}>Annuler</button>
                    )}
                </div>
            </div>

            {/* Liste des clients */}
            <div style={tableContainerStyle}>
                <h2>Clients existants</h2>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Nom</th>
                            <th style={thStyle}>Prénom</th>
                            <th style={thStyle}>Email</th>
                            <th style={thStyle}>Téléphone</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clients.map(client => (
                            <tr key={client.id}>
                                <td style={tdStyle}>{client.last_name}</td>
                                <td style={tdStyle}>{client.first_name}</td>
                                <td style={tdStyle}>{client.email}</td>
                                <td style={tdStyle}>{client.phone}</td>
                                <td style={tdStyle}>
                                    <button onClick={() => setEditClient(client)} style={editButtonStyle}>Modifier</button>
                                    <button onClick={() => handleDeleteClient(client.id)} style={deleteButtonStyle}>Supprimer</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
};

const filterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap',
};

const filterInputStyle = {
    padding: '8px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    flex: '1 1 auto',
    minWidth: '200px',
};

const formContainerStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '15px',
    marginBottom: '20px',
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
    width: '100%',
};

const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
};

const formActionsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '20px',
    flexWrap: 'wrap',
    gap: '10px',
};

const buttonStyle = {
    padding: '10px 15px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
};

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto',
    background: 'white'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd',
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap',
};

const editButtonStyle = {
    padding: '6px 10px',
    background: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '5px',
};

const deleteButtonStyle = {
    padding: '6px 10px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
};

export default Particuliers;
