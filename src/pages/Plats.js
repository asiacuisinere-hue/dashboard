import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const Plats = () => {
    const [dishes, setDishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingDish, setEditingDish] = useState(null); // Plat en cours de modification
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        country: '',
        main_ingredient: '',
        cooking_type: '',
        spice_level: 0,
        category: 'Plat',
        is_available: true
    });

    const fetchDishes = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('dishes')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) console.error('Erreur chargement plats:', error);
        else setDishes(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchDishes();
    }, []);

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Préparation des données (gestion du niveau d'épices en entier)
        const payload = {
            ...formData,
            spice_level: parseInt(formData.spice_level)
        };

        let error;
        if (editingDish) {
            const { error: updateError } = await supabase
                .from('dishes')
                .update(payload)
                .eq('id', editingDish.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('dishes')
                .insert([payload]);
            error = insertError;
        }

        if (error) {
            alert('Erreur lors de la sauvegarde : ' + error.message);
        } else {
            alert(editingDish ? 'Plat modifié !' : 'Plat ajouté !');
            resetForm();
            fetchDishes();
        }
    };

    const handleEdit = (dish) => {
        setEditingDish(dish);
        setFormData({
            name: dish.name,
            description: dish.description || '',
            image_url: dish.image_url || '',
            country: dish.country || '',
            main_ingredient: dish.main_ingredient || '',
            cooking_type: dish.cooking_type || '',
            spice_level: dish.spice_level || 0,
            category: dish.category || 'Plat',
            is_available: dish.is_available
        });
    };

    const handleDelete = async (id) => {
        if (window.confirm('Voulez-vous vraiment supprimer ce plat ?')) {
            const { error } = await supabase.from('dishes').delete().eq('id', id);
            if (error) alert('Erreur suppression: ' + error.message);
            else fetchDishes();
        }
    };

    const resetForm = () => {
        setEditingDish(null);
        setFormData({
            name: '',
            description: '',
            image_url: '',
            country: '',
            main_ingredient: '',
            cooking_type: '',
            spice_level: 0,
            category: 'Plat',
            is_available: true
        });
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Gestion de la Galerie des Plats</h1>
            
            <div style={formContainerStyle}>
                <h2>{editingDish ? 'Modifier le plat' : 'Ajouter un nouveau plat'}</h2>
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Nom du plat *</label>
                        <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={inputStyle} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>Description</label>
                        <textarea name="description" value={formData.description} onChange={handleInputChange} style={{...inputStyle, height: '60px'}} />
                    </div>

                    <div style={{ gridColumn: 'span 2' }}>
                        <label style={labelStyle}>URL de l'image (ex: /assets/images/mon-plat.jpg)</label>
                        <input type="text" name="image_url" value={formData.image_url} onChange={handleInputChange} style={inputStyle} placeholder="https://..." />
                    </div>

                    <div>
                        <label style={labelStyle}>Pays / Style</label>
                        <select name="country" value={formData.country} onChange={handleInputChange} style={inputStyle}>
                            <option value="">-- Choisir --</option>
                            <option value="Chine">Chine</option>
                            <option value="Japon">Japon</option>
                            <option value="Thaïlande">Thaïlande</option>
                            <option value="Vietnam">Vietnam</option>
                            <option value="Corée">Corée</option>
                            <option value="Autre">Autre</option>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Ingrédient principal</label>
                        <select name="main_ingredient" value={formData.main_ingredient} onChange={handleInputChange} style={inputStyle}>
                            <option value="">-- Choisir --</option>
                            <option value="Poulet">Poulet</option>
                            <option value="Porc">Porc</option>
                            <option value="Bœuf">Bœuf</option>
                            <option value="Poisson">Poisson/Fruits de mer</option>
                            <option value="Légumes">Légumes / Tofu</option>
                            <option value="Riz/Nouilles">Riz / Nouilles</option>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Type de cuisson</label>
                        <select name="cooking_type" value={formData.cooking_type} onChange={handleInputChange} style={inputStyle}>
                            <option value="">-- Choisir --</option>
                            <option value="Wok">Sauté Wok</option>
                            <option value="Vapeur">Vapeur</option>
                            <option value="Mijoté">Mijoté</option>
                            <option value="Frit">Frit / Croustillant</option>
                            <option value="Grillé">Grillé / Rôti</option>
                            <option value="Soupe">Soupe / Bouillon</option>
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Niveau d'épices (0-3)</label>
                        <input type="number" name="spice_level" min="0" max="3" value={formData.spice_level} onChange={handleInputChange} style={inputStyle} />
                    </div>

                    <div>
                        <label style={labelStyle}>Catégorie</label>
                        <select name="category" value={formData.category} onChange={handleInputChange} style={inputStyle}>
                            <option value="Entrée">Entrée</option>
                            <option value="Plat">Plat Principal</option>
                            <option value="Accompagnement">Accompagnement</option>
                            <option value="Dessert">Dessert</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input type="checkbox" name="is_available" checked={formData.is_available} onChange={handleInputChange} style={{ marginRight: '10px' }} />
                        <label style={labelStyle}>Disponible actuellement ?</label>
                    </div>

                    <div style={{ gridColumn: 'span 2', marginTop: '10px' }}>
                        <button type="submit" style={submitBtnStyle}>{editingDish ? 'Mettre à jour' : 'Ajouter le plat'}</button>
                        {editingDish && <button type="button" onClick={resetForm} style={cancelBtnStyle}>Annuler</button>}
                    </div>
                </form>
            </div>

            <div style={listContainerStyle}>
                <h2>Vos Plats ({dishes.length})</h2>
                {loading ? <p>Chargement...</p> : (
                    <div style={gridStyle}>
                        {dishes.map(dish => (
                            <div key={dish.id} style={{...cardStyle, opacity: dish.is_available ? 1 : 0.6}}>
                                {dish.image_url && <img src={dish.image_url} alt={dish.name} style={imgStyle} />}
                                <div style={{padding: '10px'}}>
                                    <h3>{dish.name}</h3>
                                    <p style={{fontSize: '0.9em', color: '#666'}}>{dish.country} • {dish.cooking_type}</p>
                                    <p>{'🌶️'.repeat(dish.spice_level)}</p>
                                    <div style={{marginTop: '10px'}}>
                                        <button onClick={() => handleEdit(dish)} style={editBtnStyle}>Modifier</button>
                                        <button onClick={() => handleDelete(dish.id)} style={deleteBtnStyle}>Supprimer</button>
                                    </div>
                                    {!dish.is_available && <p style={{color: 'red', fontWeight: 'bold', marginTop: '5px'}}>Non disponible</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// Styles
const formContainerStyle = { background: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', marginBottom: '30px' };
const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' };
const submitBtnStyle = { padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px' };
const cancelBtnStyle = { padding: '10px 20px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', fontSize: '16px' };
const listContainerStyle = { marginTop: '20px' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' };
const cardStyle = { background: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', border: '1px solid #eee' };
const imgStyle = { width: '100%', height: '150px', objectFit: 'cover' };
const editBtnStyle = { padding: '5px 10px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' };
const deleteBtnStyle = { padding: '5px 10px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' };

export default Plats;
