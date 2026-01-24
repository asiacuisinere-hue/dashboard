import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const ClientCard = ({ client, onEdit, onDelete }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-shadow">
        <div className="flex items-center mb-4">
            <div className="bg-amber-100 text-amber-700 w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3">
                {client.last_name.charAt(0).toUpperCase()}
            </div>
            <div>
                <h3 className="font-bold text-gray-800">{client.last_name} {client.first_name}</h3>
                <p className="text-xs text-gray-500">ID: {client.client_id || '—'}</p>
            </div>
        </div>
        
        <div className="space-y-2 mb-5 text-sm">
            <div className="flex items-center text-gray-600">
                <span className="font-medium w-20">Email:</span>
                <span className="truncate">{client.email}</span>
            </div>
            <div className="flex items-center text-gray-600">
                <span className="font-medium w-20">Tél:</span>
                <span>{client.phone || '—'}</span>
            </div>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => onEdit(client)}
                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2 rounded-lg transition-colors text-sm"
            >
                Modifier
            </button>
            <button 
                onClick={() => onDelete(client.id)}
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg transition-colors text-sm"
            >
                Supprimer
            </button>
        </div>
    </div>
);

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
        return <div className="p-6 text-center text-gray-500">Chargement des particuliers...</div>;
    }

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Particuliers</h1>
                <p className="text-gray-600">Gérez votre base de clients particuliers.</p>
            </div>

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
                <h2 className="text-xl font-bold text-gray-800 mb-4">{editClient ? 'Modifier le client' : 'Ajouter un nouveau client'}</h2>
                <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Nom:</label>
                        <input type="text" name="last_name" value={editClient ? editClient.last_name : newClientData.last_name} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Prénom:</label>
                        <input type="text" name="first_name" value={editClient ? editClient.first_name : newClientData.first_name} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Email:</label>
                        <input type="email" name="email" value={editClient ? editClient.email : newClientData.email} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Téléphone:</label>
                        <input type="tel" name="phone" value={editClient ? editClient.phone : newClientData.phone} onChange={editClient ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Adresse:</label>
                        <textarea name="address" value={editClient ? editClient.address : newClientData.address} onChange={editClient ? handleEditChange : handleInputChange} style={textareaStyle}></textarea>
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Notes:</label>
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

            {/* Vue Tableau (Desktop) */}
            <div className="hidden lg:block">
                <div style={tableContainerStyle}>
                    <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Clients existants</h2>
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

            {/* Vue Cartes (Mobile/Tablette) */}
            <div className="block lg:hidden mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Clients existants</h2>
                {clients.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl">Aucun client trouvé.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clients.map(client => (
                            <ClientCard 
                                key={client.id} 
                                client={client} 
                                onEdit={setEditClient}
                                onDelete={handleDeleteClient}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    boxSizing: 'border-box',
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
    maxWidth: '100%',
    boxSizing: 'border-box',
};

const formContainerStyle = {
    background: 'white',
    padding: '15px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    boxSizing: 'border-box',
};

const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', // Permet un rétrécissement plus agressif
    gap: '15px',
    marginBottom: '20px',
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // Permet au conteneur de se réduire au-delà de sa taille de contenu
};

const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
    fontSize: '14px',
    wordWrap: 'break-word', // Permet aux mots longs de passer à la ligne
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
    width: '100%',
    fontSize: '16px', // Pour éviter le zoom sur iOS
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
    whiteSpace: 'nowrap', // Empêche le bouton de passer à la ligne
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