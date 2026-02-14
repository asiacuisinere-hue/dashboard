import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
    PlusCircle, List, Edit3, Trash2,
    Search, RefreshCw,
    Languages, Soup, ChefHat, Scale, Save
} from 'lucide-react';

const getProteinIcon = (type) => {
    switch (type) {
        case 'poulet': return '🍗';
        case 'porc': return '🥩';
        case 'boeuf': return '🐂';
        case 'poisson': return '🐟';
        case 'vegetarien': return '🥗';
        default: return '🍲';
    }
};

const DishCard = ({ dish, onEdit, onDelete }) => {
    const name = typeof dish.name === 'object' ? (dish.name.fr || Object.values(dish.name).find(v => v !== "")) : dish.name;
    const description = typeof dish.description === 'object' ? dish.description.fr : dish.description;

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm p-8 hover:shadow-xl transition-all border-t-4 border-amber-500 relative group ${!dish.is_active ? 'opacity-60 grayscale' : ''}`}>
            <div className="absolute top-6 right-8 flex gap-2">
                <span className="bg-gray-50 text-gray-400 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-gray-100">
                    {dish.season}
                </span>
            </div>

            <div className="mb-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl shadow-inner border border-amber-100">
                    {getProteinIcon(dish.protein_type)}
                </div>
                <div>
                    <h3 className="font-black text-gray-800 text-lg leading-tight pr-10">{name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{dish.protein_type}</span>
                        <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">{dish.starch_type}</span>
                    </div>
                </div>
            </div>

            <p className="text-sm text-gray-500 line-clamp-2 italic mb-8 leading-relaxed">
                {description || "Aucune description fournie."}
            </p>

            <div className="flex gap-2 pt-6 border-t border-gray-50">
                <button onClick={() => onEdit(dish)} className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gray-800 text-white font-black hover:bg-black transition-all text-[10px] uppercase tracking-widest shadow-md active:scale-95">
                    <Edit3 size={14} /> Modifier
                </button>
                <button onClick={() => onDelete(dish.id)} className="p-3.5 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-100 active:scale-95">
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const Plats = () => {
    const [dishes, setDishes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('gallery');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterProtein, setFilterProtein] = useState('all');
    const [isEditing, setIsEditing] = useState(false);
    const [inputLang, setInputLang] = useState('fr');

    const [formData, setFormData] = useState({
        name: { fr: '', en: '', zh: '' },
        description: { fr: '', en: '', zh: '' },
        protein_type: 'poulet',
        starch_type: 'riz',
        season: 'toute l\'année',
        is_active: true
    });

    const fetchDishes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('dishes_library').select('*').order('created_at', { ascending: false });
        if (!error) setDishes(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchDishes(); }, [fetchDishes]);

    const handleSave = async (e) => {
        e.preventDefault();
        const op = formData.id 
            ? supabase.from('dishes_library').update(formData).eq('id', formData.id) 
            : supabase.from('dishes_library').insert([formData]);
        
        const { error } = await op;
        if (!error) {
            alert('Plat enregistré dans la bibliothèque !');
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
        setFormData({ name: { fr: '', en: '', zh: '' }, description: { fr: '', en: '', zh: '' }, protein_type: 'poulet', starch_type: 'riz', season: 'toute l\'année', is_active: true });
        setIsEditing(false);
        setActiveTab('gallery');
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Supprimer définitivement ce plat de la bibliothèque ?')) return;
        const { error } = await supabase.from('dishes_library').delete().eq('id', id);
        if (!error) fetchDishes();
    };

    const updateName = (lang, val) => setFormData({...formData, name: {...formData.name, [lang]: val}});
    const updateDesc = (lang, val) => setFormData({...formData, description: {...formData.description, [lang]: val}});

    const filteredDishes = dishes.filter(d => {
        const nameMatch = JSON.stringify(d.name).toLowerCase().includes(searchTerm.toLowerCase());
        const proteinMatch = filterProtein === 'all' || d.protein_type === filterProtein;
        return nameMatch && proteinMatch;
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Bibliothèque de Plats</h1>     
                        <p className="text-gray-500 font-medium italic">Gérez vos fiches techniques et vos compositions multi-langues.</p>
                    </div>
                    <div className="flex gap-3 no-print">
                        <button onClick={fetchDishes} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-amber-500 transition-all"><RefreshCw size={20}/></button>      
                    </div>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-10 max-w-md">
                    <button onClick={() => { setActiveTab('gallery'); setIsEditing(false); }} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'gallery' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} className="mr-2"/> Catalogue</button>
                    <button onClick={() => setActiveTab('create')} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'create' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><PlusCircle size={16} className="mr-2"/> {isEditing ? 'Éditer' : 'Ajouter'}</button>
                </div>

                {activeTab === 'create' ? (
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-10">
                            <h2 className="text-2xl font-black text-gray-800 flex items-center gap-3"><ChefHat className="text-amber-500" size={32}/> {isEditing ? 'Modification' : 'Nouvelle Recette'}</h2>
                            
                            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                {['fr', 'en', 'zh'].map(lang => (
                                    <button key={lang} type="button" onClick={() => setInputLang(lang)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputLang === lang ? 'bg-amber-500 text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}>{lang}</button>
                                ))}
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-12 gap-8">    
                            <div className="md:col-span-8 space-y-8">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2 flex items-center gap-2"><Languages size={14}/> Nom du Plat ({inputLang})</label>
                                    <input required type="text" value={formData.name[inputLang]} onChange={e => updateName(inputLang, e.target.value)} className="w-full p-5 bg-gray-50 border-0 rounded-[1.5rem] font-black text-xl focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" placeholder="Ex: Poulet Teriyaki" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description ({inputLang})</label>
                                    <textarea value={formData.description[inputLang]} onChange={e => updateDesc(inputLang, e.target.value)} className="w-full p-5 bg-gray-50 border-0 rounded-[1.5rem] font-medium h-32 focus:ring-2 focus:ring-amber-500 outline-none shadow-inner" placeholder="Détails du plat, épices, préparation..." />
                                </div>
                            </div>

                            <div className="md:col-span-4 space-y-8">
                                <div className="bg-amber-50/50 p-8 rounded-[2rem] border border-amber-100">
                                    <h3 className="text-xs font-black text-amber-800 uppercase tracking-widest mb-6 flex items-center gap-2"><Scale size={16}/> Fiche Technique</h3>
                                    
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[9px] font-black text-amber-600/60 uppercase ml-1 block mb-2">Type de Protéine</label>
                                            <select value={formData.protein_type} onChange={e => setFormData({...formData, protein_type: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm">
                                                <option value="poulet">🍗 Poulet / Volaille</option>
                                                <option value="porc">🥩 Porc</option>
                                                <option value="boeuf">🐂 Bœuf</option>
                                                <option value="poisson">🐟 Poisson / Mer</option>
                                                <option value="vegetarien">🥗 Végétarien</option>
                                                <option value="autre">🍲 Autre</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-amber-600/60 uppercase ml-1 block mb-2">Type de Féculent</label>
                                            <select value={formData.starch_type} onChange={e => setFormData({...formData, starch_type: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm">
                                                <option value="riz">🍚 Riz (100g cru)</option>
                                                <option value="nouilles">🍜 Nouilles (100g cru)</option>
                                                <option value="aucun">🚫 Aucun</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-amber-600/60 uppercase ml-1 block mb-2">Saison</label>
                                            <select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm">
                                                <option value="toute l'année">🌍 Toute l'année</option>
                                                <option value="été">☀️ Été</option>
                                                <option value="hiver">❄️ Hiver</option>
                                                <option value="fete">🎉 Fête / Spécial</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100">
                                    <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="w-6 h-6 rounded-lg text-amber-500 focus:ring-amber-500 border-0" />
                                    <label className="font-black text-gray-700 text-xs uppercase">Plat actif</label>
                                </div>
                            </div>

                            <div className="md:col-span-12 flex gap-4 pt-10 border-t">
                                <button type="submit" className="flex-1 bg-gray-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-lg hover:bg-black transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-3">
                                    <Save size={24}/> Enregistrer la fiche
                                </button>
                                <button type="button" onClick={handleCancel} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[2rem] font-black text-lg hover:bg-gray-200 transition-all uppercase tracking-widest">
                                    Annuler
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="flex flex-wrap gap-4 mb-10 items-center">
                            <div className="flex-1 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center min-w-[300px]">
                                <Search size={20} className="text-gray-300 mr-3 ml-2" />
                                <input type="text" placeholder="Rechercher un plat par nom..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 py-2 outline-none text-gray-700 font-medium" />
                            </div>
                            
                            <div className="bg-gray-200 p-1.5 rounded-[2rem] flex items-center gap-1">
                                <button onClick={() => setFilterProtein('all')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${filterProtein === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>TOUS</button>
                                <button onClick={() => setFilterProtein('poulet')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${filterProtein === 'poulet' ? 'bg-amber-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>POULET</button>
                                <button onClick={() => setFilterProtein('porc')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${filterProtein === 'porc' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>PORC</button>
                                <button onClick={() => setFilterProtein('boeuf')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${filterProtein === 'boeuf' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-700'}`}>BŒUF</button>
                                <button onClick={() => setFilterProtein('poisson')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${filterProtein === 'poisson' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}>MER</button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-32"><RefreshCw size={48} className="animate-spin text-amber-500" /></div>
                        ) : filteredDishes.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                                <Soup size={60} className="mx-auto text-gray-100 mb-4"/>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucun plat ne correspond à cette recherche.</p>
                            </div>
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
