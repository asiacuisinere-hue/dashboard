import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Services = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingService, setEditingService] = useState(null); // Service en cours d'édition
    const [newService, setNewService] = useState({ name: '', description: '', default_price: 0 });

    const fetchServices = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('services')
            .select('*')
            .order('name', { ascending: true });

        if (error) {
            console.error('Erreur de chargement des services:', error);
            alert(`Erreur de chargement des services: ${error.message}`);
        } else {
            setServices(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewService(prev => ({ ...prev, [name]: value }));
    };

    const handleEditInputChange = (e) => {
        const { name, value } = e.target;
        setEditingService(prev => ({ ...prev, [name]: value }));
    };

    const handleAddService = async () => {
        if (!newService.name) {
            alert('Le nom du service est obligatoire.');
            return;
        }
        const { error } = await supabase
            .from('services')
            .insert([newService]);

        if (error) {
            alert(`Erreur lors de l'ajout du service : ${error.message}`);
        } else {
            setNewService({ name: '', description: '', default_price: 0 });
            fetchServices();
        }
    };

    const handleUpdateService = async () => {
        if (!editingService.name) {
            alert('Le nom du service est obligatoire.');
            return;
        }
        const { error } = await supabase
            .from('services')
            .update(editingService)
            .eq('id', editingService.id);

        if (error) {
            alert(`Erreur lors de la mise à jour du service : ${error.message}`);
        } else {
            setEditingService(null);
            fetchServices();
        }
    };

    const handleDeleteService = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
            const { error } = await supabase
                .from('services')
                .delete()
                .eq('id', id);

            if (error) {
                alert(`Erreur lors de la suppression du service : ${error.message}`);
            } else {
                fetchServices();
            }
        }
    };

    if (loading) {
        return <div>Chargement des services...</div>;
    }

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Services</h1>
                <p className="text-gray-600">Définissez et gérez les services que vous proposez dans vos devis.</p>
            </div>

            {/* Formulaire d'ajout de service */}
            <div style={formContainerStyle}>
                <h2>Ajouter un nouveau service</h2>
                <div style={formGridStyle}>
                    <div style={formGroupStyle}>
                        <label>Nom du service:</label>
                        <input type="text" name="name" value={newService.name} onChange={handleInputChange} style={inputStyle} />
                    </div>
                    <div style={formGroupStyle}>
                        <label>Description:</label>
                        <textarea name="description" value={newService.description} onChange={handleInputChange} style={textareaStyle}></textarea>
                    </div>
                    <div style={formGroupStyle}>
                        <label>Prix par défaut (€):</label>
                        <input type="number" name="default_price" value={newService.default_price} onChange={handleInputChange} style={inputStyle} />
                    </div>
                </div>
                <div style={formActionsStyle}>
                    <button onClick={handleAddService} style={buttonStyle}>Ajouter Service</button>
                </div>
            </div>

            {/* Liste des services existants */}
            <div style={tableContainerStyle}>
                <h2>Services existants</h2>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Nom</th>
                            <th style={thStyle}>Description</th>
                            <th style={thStyle}>Prix par défaut</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {services.map(service => (
                            <tr key={service.id}>
                                {editingService && editingService.id === service.id ? (
                                    <>
                                        <td style={tdStyle}><input type="text" name="name" value={editingService.name} onChange={handleEditInputChange} style={smallInputStyle} /></td>
                                        <td style={tdStyle}><textarea name="description" value={editingService.description} onChange={handleEditInputChange} style={textareaSmallStyle}></textarea></td>
                                        <td style={tdStyle}><input type="number" name="default_price" value={editingService.default_price} onChange={handleEditInputChange} style={smallInputStyle} /></td>
                                        <td style={tdStyle}>
                                            <button onClick={handleUpdateService} style={{...buttonSmallStyle, backgroundColor: '#28a745'}}>Sauvegarder</button>
                                            <button onClick={() => setEditingService(null)} style={{...buttonSmallStyle, backgroundColor: '#6c757d', marginLeft: '5px'}}>Annuler</button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td style={tdStyle}>{service.name}</td>
                                        <td style={tdStyle}>{service.description}</td>
                                        <td style={tdStyle}>{service.default_price} €</td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setEditingService(service)} style={buttonSmallStyle}>Modifier</button>
                                            <button onClick={() => handleDeleteService(service.id)} style={{...buttonSmallStyle, backgroundColor: '#dc3545', marginLeft: '5px'}}>Supprimer</button>
                                        </td>
                                    </>
                                )}
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
    maxWidth: '900px',
    margin: '0 auto',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', // Rend la grille responsive
    gap: '15px',
    marginBottom: '20px',
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
};

const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
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
    flexWrap: 'wrap', // Permet aux boutons de passer à la ligne
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
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    overflowX: 'auto', // Permet le défilement horizontal
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne
};

const buttonSmallStyle = {
    padding: '6px 10px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
};

const smallInputStyle = {
    width: '100px', // Plus petit que l'input normal
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
};

const textareaSmallStyle = {
    ...smallInputStyle,
    minHeight: '50px',
    resize: 'vertical',
};

export default Services;