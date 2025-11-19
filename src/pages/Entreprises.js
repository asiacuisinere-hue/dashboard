import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

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
        return <div>Chargement des entreprises...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>Gestion des Entreprises</h1>

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
                <h2>{editEntreprise ? "Modifier l'entreprise" : "Ajouter une nouvelle entreprise"}</h2>
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

            {/* Liste des entreprises */}
            <div style={tableContainerStyle}>
                <h2>Entreprises existantes</h2>
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

const labelStyle = { // Nouveau style pour les labels
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px', // Ajusté car le label a déjà une marge
    width: '100%',
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

export default Entreprises;