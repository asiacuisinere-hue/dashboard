import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    PlusCircle, List, Edit3, Trash2, Euro, 
    ClipboardList, Info, CheckCircle, XCircle, Search 
} from 'lucide-react';

const ServiceCard = ({ service, onEdit, onDelete, themeColor }) => (
    <div className={`bg-white rounded-[2rem] shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 ${themeColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <ClipboardList size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">{service.name}</h3>
                    <p className="text-xs text-gray-400 font-medium">Référence : #{service.id.substring(0, 8)}</p>
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix Base</p>
                <p className="text-lg font-black text-gray-800">{(service.default_price || 0).toFixed(2)} €</p>
            </div>
        </div>

        <div className="mb-6">
            <p className="text-sm text-gray-500 leading-relaxed italic">
                {service.description || "Aucune description fournie pour ce service."}
            </p>
        </div>

        <div className="flex gap-2 border-t pt-4">
            <button onClick={() => onEdit(service)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm">
                <Edit3 size={16} /> Modifier
            </button>
            <button onClick={() => onDelete(service.id)} className="flex items-center justify-center px-4 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 size={18} />
            </button>
        </div>
    </div>
);

const Services = () => {
    const { businessUnit } = useBusinessUnit();
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('list'); // 'list' or 'create'
    
    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '', default_price: 0 });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchServices = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('services').select('*').order('name', { ascending: true });
        if (!error) setServices(data || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchServices(); }, [fetchServices]);

    const handleOpenEdit = (service) => {
        setFormData(service);
        setIsEditing(true);
        setActiveTab('create');
    };

    const handleCloseEdit = () => {
        setIsEditing(false);
        setFormData({ name: '', description: '', default_price: 0 });
        setActiveTab('list');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (formData.id) {
            const { error } = await supabase.from('services').update(formData).eq('id', formData.id);
            if (!error) {
                alert('Service mis à jour !');
                handleCloseEdit();
                fetchServices();
            } else alert(error.message);
        } else {
            const { error } = await supabase.from('services').insert([formData]);
            if (!error) {
                alert('Service ajouté !');
                handleCloseEdit();
                fetchServices();
            } else alert(error.message);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer ce service ?")) return;
        const { error } = await supabase.from('services').delete().eq('id', id);
        if (!error) fetchServices();
        else alert(error.message);
    };

    const filteredServices = services.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Catalogue Services</h1>
                        <p className="text-gray-500 font-medium italic">Gérez vos prestations pour les devis {businessUnit}.</p>
                    </div>
                </div>

                {/* --- NAVIGATION PAR ONGLETS --- */}
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-2xl mb-8 max-w-md">
                    <button
                        onClick={() => { setActiveTab('list'); setIsEditing(false); }}
                        className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <List size={16} className="mr-2" /> Liste
                    </button>
                    <button
                        onClick={() => setActiveTab('create')}
                        className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <PlusCircle size={16} className="mr-2" /> {isEditing ? 'Modifier' : 'Ajouter'}
                    </button>
                </div>

                {activeTab === 'create' ? (
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
                            <div className={`p-3 rounded-2xl bg-${themeColor}-50 text-${themeColor}-600`}>
                                {isEditing ? <Edit3 /> : <PlusCircle />}
                            </div>
                            {isEditing ? 'Modifier le Service' : 'Nouveau Service'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2">Nom de la prestation</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: Chef à domicile (Dîner)" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2">Description commerciale</label>
                                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Détails du service..." />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2">Prix par défaut (€)</label>
                                <div className="relative">
                                    <input required type="number" step="0.01" value={formData.default_price} onChange={e => setFormData({...formData, default_price: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl focus:ring-2 focus:ring-amber-500 outline-none pl-12" />
                                    <Euro className="absolute left-4 top-4 text-gray-300" size={20} />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-6">
                                <button type="submit" className="flex-1 bg-gray-800 text-white py-4 rounded-[2rem] font-black shadow-lg hover:bg-black transition-all active:scale-95">ENREGISTRER</button>
                                <button type="button" onClick={handleCloseEdit} className="px-8 py-4 bg-gray-100 text-gray-500 rounded-[2rem] font-bold hover:bg-gray-200 transition-all">ANNULER</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex items-center">
                            <Search size={20} className="text-gray-300 mr-3 ml-2" />
                            <input 
                                type="text" 
                                placeholder="Rechercher un service..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 py-2 outline-none text-gray-700 font-medium"
                            />
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-20 animate-spin text-amber-500"><RefreshCw size={40} /></div>
                        ) : filteredServices.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
                                <ClipboardList size={60} className="mx-auto text-gray-100 mb-4"/>
                                <p className="text-gray-400 font-bold">Aucun service dans le catalogue.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredServices.map(service => (
                                    <ServiceCard 
                                        key={service.id} 
                                        service={service} 
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                        themeColor={themeColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Services;
