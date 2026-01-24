import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const EntrepriseCard = ({ entreprise, onEdit, onDelete }) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-shadow">
        <div className="flex items-center mb-4">
            <div className="bg-blue-100 text-blue-700 w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3">
                🏢
            </div>
            <div>
                <h3 className="font-bold text-gray-800">{entreprise.nom_entreprise}</h3>
                <p className="text-xs text-gray-500">SIRET: {entreprise.siret || '—'}</p>
            </div>
        </div>
        
        <div className="space-y-3 mb-5 text-sm">
            <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase font-bold">Contact</span>
                <span className="text-gray-800">{entreprise.contact_name || '—'}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase font-bold">Email</span>
                <span className="text-gray-800 truncate">{entreprise.contact_email}</span>
            </div>
            <div className="flex flex-col">
                <span className="text-gray-500 text-xs uppercase font-bold">Téléphone</span>
                <span className="text-gray-800">{entreprise.contact_phone || '—'}</span>
            </div>
        </div>

        <div className="flex gap-2">
            <button 
                onClick={() => onEdit(entreprise)}
                className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold py-2 rounded-lg transition-colors text-sm"
            >
                Modifier
            </button>
            <button 
                onClick={() => onDelete(entreprise.id)}
                className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-2 rounded-lg transition-colors text-sm"
            >
                Supprimer
            </button>
        </div>
    </div>
);

const Entreprises = () => {
    const [entreprises, setEntreprises] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editEntreprise, setEditEntreprise] = useState(null);
    const [newEntrepriseData, setNewEntrepriseData] = useState({
        nom_entreprise: '',
        siret: '',
        contact_name: '',
        contact_email: '',
        contact_phone: ''
    });

    const fetchEntreprises = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('entreprises').select('*');

        if (searchTerm) {
            query = query.or(`nom_entreprise.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('nom_entreprise', { ascending: true });

        if (error) {
            console.error('Erreur de chargement des entreprises:', error);
            alert(`Erreur de chargement des entreprises: ${error.message}`);
        } else {
            setEntreprises(data);
        }
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchEntreprises();
    }, [fetchEntreprises]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewEntrepriseData(prev => ({ ...prev, [name]: value }));
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditEntreprise(prev => ({ ...prev, [name]: value }));
    };

    const handleAddEntreprise = async () => {
        if (!newEntrepriseData.nom_entreprise || !newEntrepriseData.contact_email) {
            alert("Le nom de l'entreprise et l'email de contact sont obligatoires.");
            return;
        }

        const { error } = await supabase.from('entreprises').insert([newEntrepriseData]);

        if (error) {
            alert(`Erreur lors de l'ajout de l'entreprise : ${error.message}`);
        } else {
            alert("L'entreprise a été ajoutée.");
            setNewEntrepriseData({ nom_entreprise: '', siret: '', contact_name: '', contact_email: '', contact_phone: '' });
            fetchEntreprises();
        }
    };

    const handleUpdateEntreprise = async () => {
        if (!editEntreprise.nom_entreprise || !editEntreprise.contact_email) {
            alert("Le nom de l'entreprise et l'email de contact sont obligatoires.");
            return;
        }

        const { error } = await supabase
            .from('entreprises')
            .update(editEntreprise)
            .eq('id', editEntreprise.id);

        if (error) {
            alert(`Erreur lors de la mise à jour de l'entreprise : ${error.message}`);
        } else {
            alert("L'entreprise a été mise à jour.");
            setEditEntreprise(null);
            fetchEntreprises();
        }
    };

    const handleDeleteEntreprise = async (id) => {
        if (window.confirm("Êtes-vous sûr de vouloir supprimer cette entreprise ?")) {
            const { error } = await supabase
                .from('entreprises')
                .delete()
                .eq('id', id);

            if (error) {
                alert(`Erreur lors de la suppression de l'entreprise : ${error.message}`);
            } else {
                fetchEntreprises();
            }
        }
    };

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Chargement des entreprises...</div>;
    }

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Entreprises</h1>
                <p className="text-gray-600">Gérez votre base de clients professionnels.</p>
            </div>

            {/* Section de recherche */}
            <div style={filterContainerStyle}>
                <input
                    type="text"
                    placeholder="Rechercher par nom d'entreprise ou email de contact..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={filterInputStyle}
                />
            </div>

            {/* Formulaire d'ajout/édition d'entreprise */}
            <div style={formContainerStyle}>
                <h2 className="text-xl font-bold text-gray-800 mb-4">{editEntreprise ? "Modifier l'entreprise" : "Ajouter une nouvelle entreprise"}</h2>
                <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Nom de l'entreprise:</label>
                        <input type="text" name="nom_entreprise" value={editEntreprise ? editEntreprise.nom_entreprise : newEntrepriseData.nom_entreprise} onChange={editEntreprise ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>SIRET:</label>
                        <input type="text" name="siret" value={editEntreprise ? editEntreprise.siret : newEntrepriseData.siret} onChange={editEntreprise ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Nom du contact:</label>
                        <input type="text" name="contact_name" value={editEntreprise ? editEntreprise.contact_name : newEntrepriseData.contact_name} onChange={editEntreprise ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Email de contact:</label>
                        <input type="email" name="contact_email" value={editEntreprise ? editEntreprise.contact_email : newEntrepriseData.contact_email} onChange={editEntreprise ? handleEditChange : handleInputChange} style={inputStyle} required />
                    </div>
                    <div style={formGroupStyle}>
                        <label style={labelStyle}>Téléphone de contact:</label>
                        <input type="tel" name="contact_phone" value={editEntreprise ? editEntreprise.contact_phone : newEntrepriseData.contact_phone} onChange={editEntreprise ? handleEditChange : handleInputChange} style={inputStyle} />
                    </div>
                </div>
                <div style={formActionsStyle}>
                    <button onClick={editEntreprise ? handleUpdateEntreprise : handleAddEntreprise} style={buttonStyle}>
                        {editEntreprise ? "Mettre à jour l'entreprise" : "Ajouter l'entreprise"}
                    </button>
                    {editEntreprise && (
                        <button onClick={() => setEditEntreprise(null)} style={{ ...buttonStyle, backgroundColor: '#6c757d', marginLeft: '10px' }}>Annuler</button>
                    )}
                </div>
            </div>

            {/* Vue Tableau (Desktop) */}
            <div className="hidden lg:block">
                <div style={tableContainerStyle}>
                    <h2 className="text-xl font-bold text-gray-800 p-4 border-b">Entreprises existantes</h2>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Nom Entreprise</th>
                                <th style={thStyle}>SIRET</th>
                                <th style={thStyle}>Contact</th>
                                <th style={thStyle}>Email Contact</th>
                                <th style={thStyle}>Téléphone Contact</th>
                                <th style={thStyle}>Actions</th>
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
                                    <td style={tdStyle}>
                                        <button onClick={() => setEditEntreprise(entreprise)} style={editButtonStyle}>Modifier</button>
                                        <button onClick={() => handleDeleteEntreprise(entreprise.id)} style={deleteButtonStyle}>Supprimer</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vue Cartes (Mobile/Tablette) */}
            <div className="block lg:hidden mt-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Entreprises existantes</h2>
                {entreprises.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl">Aucune entreprise trouvée.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {entreprises.map(entreprise => (
                            <EntrepriseCard 
                                key={entreprise.id} 
                                entreprise={entreprise} 
                                onEdit={setEditEntreprise}
                                onDelete={handleDeleteEntreprise}
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

export default Entreprises;