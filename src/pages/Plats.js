import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    PlusCircle, List, Edit3, Trash2, Camera, 
    Utensils, Globe, Flame, CheckCircle, XCircle, Search, RefreshCw,
    Image as ImageIcon, Soup, ChefHat
} from 'lucide-react';

const DishCard = ({ dish, onEdit, onDelete }) => (
    <div className={`bg-white rounded-[2.5rem] shadow-sm overflow-hidden hover:shadow-xl transition-all border border-gray-100 group ${!dish.is_available ? 'opacity-60 grayscale' : ''}`}>
        <div className="relative h-56 overflow-hidden">
            {dish.image_url ? (
                <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            ) : (
                <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200">
                    <ImageIcon size={60} />
                </div>
            )}
            <div className="absolute top-4 right-4 flex gap-2">
                {!dish.is_available && (
                    <span className="bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">Épuisé</span>
                )}
                <span className="bg-white/90 backdrop-blur-md text-gray-800 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg border border-white/20">
                    {dish.category || 'Plat'}
                </span>
            </div>
        </div>

        <div className="p-6">
            <div className="flex justify-between items-start mb-2">
                <h3 className="font-black text-gray-800 text-xl leading-tight">{dish.name}</h3>
            </div>
            
            <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="flex items-center text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    <Globe size={12} className="mr-1.5" /> {dish.country || 'International'}
                </div>
                <div className="flex items-center text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-100">
                    <ChefHat size={12} className="mr-1.5" /> {dish.cooking_type || 'Artisanal'}
                </div>
                {dish.spice_level > 0 && (
                    <div className="flex items-center text-orange-500 text-xs font-black px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100">
                        <Flame size={12} className="mr-1" /> {'🌶️'.repeat(dish.spice_level)}
                    </div>
                )}
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 italic mb-6 leading-relaxed">
                {dish.description || "Aucune description pour ce plat."}
            </p>

            <div className="flex gap-2 border-t pt-5">
                <button onClick={() => onEdit(dish)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-800 text-white font-black hover:bg-black transition-all text-xs shadow-md active:scale-95">
                    <Edit3 size={14} /> MODIFIER
                </button>
                <button onClick={() => onDelete(dish.id)} className="p-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100 active:scale-95">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    </div>
);

const Plats = () => {
    const [dishes, setDishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('gallery'); // 'gallery' or 'create'
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '', description: '', image_url: '', country: '',
        main_ingredient: '', cooking_type: '', spice_level: 0,
        category: 'Plat', is_available: true
    });

    const fetchDishes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('dishes').select('*').order('created_at', { ascending: false });
        if (!error) setDishes(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchDishes(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = { ...formData, spice_level: parseInt(formData.spice_level) };
        const op = formData.id ? supabase.from('dishes').update(payload).eq('id', formData.id) : supabase.from('dishes').insert([payload]);
        const { error } = await op;
        if (!error) {
            alert('Sauvegarde réussie !');
            handleCancel();
            fetchDishes();
        } else alert(error.message);
    };

    const handleEdit = (dish) => {
        setFormData(dish);
        setIsEditing(true);
        setActiveTab('create');
    };

    const handleCancel = () => {
        setFormData({ name: '', description: '', image_url: '', country: '', main_ingredient: '', cooking_type: '', spice_level: 0, category: 'Plat', is_available: true });
        setIsEditing(false);
        setActiveTab('gallery');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer ce plat ?')) return;
        const { error } = await supabase.from('dishes').delete().eq('id', id);
        if (!error) fetchDishes();
    };

    const filteredDishes = dishes.filter(d => 
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        d.country?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Galerie des Possibles</h1>
                    <p className="text-gray-500 font-medium">Gérez votre portfolio culinaire et les menus de saison.</p>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1 rounded-2xl mb-8 max-w-md">
                    <button onClick={() => { setActiveTab('gallery'); setIsEditing(false); }} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'gallery' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} className="mr-2"/> Galerie</button>
                    <button onClick={() => setActiveTab('create')} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><PlusCircle size={16} className="mr-2"/> {isEditing ? 'Modifier' : 'Nouveau'}</button>
                </div>

                {activeTab === 'create' ? (
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-10 flex items-center gap-3"><ChefHat className="text-amber-500" size={32}/> {isEditing ? 'Modifier les détails' : 'Créer un nouveau chef-d\'œuvre'}</h2>
                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Nom du Plat</label><input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-lg focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-24 focus:ring-2 focus:ring-amber-500 outline-none" /></div>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Catégorie</label><select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold"><option value="Entrée">Entrée</option><option value="Plat">Plat Principal</option><option value="Accompagnement">Accompagnement</option><option value="Dessert">Dessert</option></select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Pays / Style</label><select value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold"><option value="">-- Choisir --</option><option value="Chine">Chine</option><option value="Japon">Japon</option><option value="Thaïlande">Thaïlande</option><option value="Vietnam">Vietnam</option><option value="Corée">Corée</option><option value="Autre">Autre</option></select></div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Niveau d'Épices</label><input type="range" min="0" max="3" value={formData.spice_level} onChange={e => setFormData({...formData, spice_level: e.target.value})} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500 my-4" /><div className="flex justify-between text-xs font-black text-gray-400 px-1"><span>Doux</span><span>🔥</span><span>🔥🔥</span><span>🔥🔥🔥</span></div></div>
                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl"><input type="checkbox" checked={formData.is_available} onChange={e => setFormData({...formData, is_available: e.target.checked})} className="w-6 h-6 rounded-lg text-amber-500 focus:ring-amber-500 border-0" /><label className="font-bold text-gray-700">Disponible actuellement ?</label></div>
                            <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">URL Image</label><input type="text" value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-mono text-xs focus:ring-2 focus:ring-amber-500 outline-none" placeholder="/assets/images/..." /></div>
                            <div className="md:col-span-2 flex gap-4 pt-10 border-t">
                                <button type="submit" className="flex-1 bg-gray-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-lg hover:bg-black transition-all active:scale-95 uppercase tracking-widest">Enregistrer le plat</button>
                                <button type="button" onClick={handleCancel} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[2rem] font-black text-lg hover:bg-gray-200 transition-all uppercase tracking-widest">Annuler</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex items-center">
                            <Search size={20} className="text-gray-300 mr-3 ml-2" />
                            <input type="text" placeholder="Rechercher un plat, une origine..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 py-2 outline-none text-gray-700 font-medium" />
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-20 animate-spin text-amber-500"><RefreshCw size={48} /></div>
                        ) : filteredDishes.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-100"><Soup size={60} className="mx-auto text-gray-100 mb-4"/><p className="text-gray-400 font-bold">Aucun plat dans la galerie.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                                {filteredDishes.map(dish => <DishCard key={dish.id} dish={dish} onEdit={handleEdit} onDelete={handleDelete} />)}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Plats;