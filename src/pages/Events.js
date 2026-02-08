import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    Calendar, PlusCircle, Trash2, AlertCircle, 
    RefreshCw, Search, List, ArrowRight,
    Star, CheckCircle2, History
} from 'lucide-react';

const EventCard = ({ event, onDelete, themeColor }) => (
    <div className={`bg-white rounded-[2rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors`}>
                    <Star className={`text-${themeColor}-500`} size={24} />
                </div>
                <div>
                    <h3 className="font-black text-gray-800 text-xl leading-tight">{event.event_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {event.event_type || 'Général'}
                        </span>
                    </div>
                </div>
            </div>
            <button onClick={() => onDelete(event.id)} className="p-3 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all opacity-0 group-hover:opacity-100">
                <Trash2 size={18} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Période</p>
                <div className="flex items-center gap-2 text-xs font-black text-gray-700">
                    <Calendar size={14} className="text-gray-300"/>
                    {new Date(event.start_date).toLocaleDateString('fr-FR')} 
                    <ArrowRight size={12} className="text-gray-300"/>
                    {new Date(event.end_date).toLocaleDateString('fr-FR')}
                </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Description</p>
                <p className="text-xs font-medium text-gray-500 italic truncate">{event.description || "Aucun détail fourni."}</p>
            </div>
        </div>
    </div>
);

const Events = () => {
    const { businessUnit } = useBusinessUnit();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'add'
    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        event_name: '', event_type: '', start_date: '', end_date: '', description: ''
    });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';
    const eventTypes = ['Foire', 'Exposition', 'Promotion', 'Fête', 'Autre'];

    const fetchEvents = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-events`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!response.ok) throw new Error("Erreur serveur");
            const data = await response.json();
            setEvents(data || []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-event`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error("Erreur lors de l'ajout");
            setFormData({ event_name: '', event_type: '', start_date: '', end_date: '', description: '' });
            setActiveTab('list');
            fetchEvents();
        } catch (err) { setError(err.message); }
        finally { setIsAdding(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cet événement ?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-event?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            fetchEvents(true);
        } catch (err) { alert(err.message); }
    };

    const filteredEvents = events.filter(e => 
        e.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.event_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
                            Journal d'Événements
                        </h1>
                        <p className="text-gray-500 font-medium italic">Gérez les temps forts pour analyser vos pics d'activité.</p>
                    </div>
                </div>

                {/* --- NAVIGATION PAR ONGLETS --- */}
                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-10 max-w-md">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={16} className="inline mr-2"/> Liste
                    </button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'add' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <PlusCircle size={16} className="inline mr-2"/> Nouvel Événement
                    </button>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-5 rounded-3xl mb-8 flex items-center gap-3 border border-red-100 font-bold animate-pulse"><AlertCircle /> {error}</div>}

                {activeTab === 'add' ? (
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-10 flex items-center gap-3">
                            <div className={`p-3 rounded-2xl bg-${themeColor}-50 text-${themeColor}-600`}><PlusCircle /></div>
                            Planifier un événement
                        </h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Désignation de l'événement</label>
                                <input required type="text" value={formData.event_name} onChange={e => setFormData({...formData, event_name: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-lg focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Ex: Foire de Saint-Denis" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Type</label><select value={formData.event_type} onChange={e => setFormData({...formData, event_type: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold">{eventTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                                <div />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date Début</label><input required type="date" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date Fin</label><input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Notes & Précisions</label><textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-24 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Impact sur le trafic, promotions prévues..." /></div>
                            
                            <div className="pt-8 flex gap-4">
                                <button type="submit" disabled={isAdding} className="flex-1 bg-gray-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-3">
                                    {isAdding ? <RefreshCw className="animate-spin" /> : <CheckCircle2 />} ENREGISTRER
                                </button>
                                <button type="button" onClick={() => setActiveTab('list')} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[2rem] font-black hover:bg-gray-200 transition-all uppercase tracking-widest text-xs">Annuler</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex items-center">
                            <Search size={20} className="text-gray-300 mr-3 ml-2" />
                            <input 
                                type="text" 
                                placeholder="Rechercher un événement..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 py-2 outline-none text-gray-700 font-medium"
                            />
                        </div>

                        {loading && events.length === 0 ? (
                            <div className="flex justify-center py-32 flex-col items-center gap-4 text-gray-400"><RefreshCw className="animate-spin" size={40}/><p className="font-bold uppercase text-[10px] tracking-widest">Mise à jour du calendrier...</p></div>
                        ) : filteredEvents.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                                <History size={60} className="mx-auto text-gray-100 mb-4"/>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucun événement enregistré.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in duration-700">
                                {filteredEvents.map(event => (
                                    <EventCard key={event.id} event={event} onDelete={handleDelete} themeColor={themeColor} />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Events;