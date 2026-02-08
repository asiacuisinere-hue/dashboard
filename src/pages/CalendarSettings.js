import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { 
    Clock, Trash2, PlusCircle, 
    UtensilsCrossed, ChefHat, 
    CalendarDays, CalendarCheck
} from 'lucide-react';

const CalendarSettings = () => {
    const [unavailableEntries, setUnavailableEntries] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [recurringDay, setRecurringDay] = useState('');
    const [activeServiceTab, setActiveServiceTab] = useState('RESERVATION_SERVICE'); 

    const dayOfWeekMap = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    const fetchUnavailableEntries = useCallback(async () => {
        const { data, error } = await supabase
            .from('indisponibilites')
            .select('id, date, day_of_week, reason')
            .eq('service_type', activeServiceTab);

        if (!error) setUnavailableEntries(data || []);
    }, [activeServiceTab]);

    useEffect(() => { fetchUnavailableEntries(); }, [fetchUnavailableEntries]);

    const handleAddDate = async (e) => {
        e.preventDefault();
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        const { error } = await supabase.from('indisponibilites').insert([{
            date: dateString, reason: reason, service_type: activeServiceTab
        }]);
        if (!error) {
            setReason('');
            fetchUnavailableEntries();
        } else alert(error.message);
    };

    const handleAddRecurringDay = async (e) => {
        e.preventDefault();
        if (recurringDay === '') return;
        const { error } = await supabase.from('indisponibilites').insert([{
            day_of_week: parseInt(recurringDay),
            reason: `Fermeture hebdomadaire`,
            service_type: activeServiceTab
        }]);
        if (!error) fetchUnavailableEntries();
        else alert(error.message);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette règle d'indisponibilité ?")) return;
        const { error } = await supabase.from('indisponibilites').delete().eq('id', id);
        if (!error) fetchUnavailableEntries();
    };

    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateString = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
            const isSpecificDate = unavailableEntries.some(d => d.date === dateString);
            const isRecurringDay = unavailableEntries.some(d => d.day_of_week === date.getDay());
            return (isSpecificDate || isRecurringDay) ? 'unavailable-tile' : null;
        }
        return null;
    };

    const specificDates = unavailableEntries.filter(e => e.date);
    const recurringDays = unavailableEntries.filter(e => e.day_of_week !== null);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <style>{`
                .unavailable-tile { background: #fee2e2 !important; color: #ef4444 !important; font-weight: 900 !important; border-radius: 12px !important; }
                .react-calendar { border: none !important; width: 100% !important; background: transparent !important; font-family: inherit !important; }
                .react-calendar__tile--active { background: #d4af37 !important; border-radius: 12px !important; }
                .react-calendar__navigation button { font-weight: 900; font-size: 1.1rem; }
            `}</style>

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Gestion du Calendrier</h1>
                    <p className="text-gray-500 font-medium">Contrôlez vos disponibilités et fermetures hebdomadaires.</p>
                </div>

                {/* --- CHOIX DU SERVICE --- */}
                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-10 max-w-xl">
                    <button onClick={() => setActiveServiceTab('RESERVATION_SERVICE')} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeServiceTab === 'RESERVATION_SERVICE' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <ChefHat size={16} className="mr-2"/> PRESTATIONS
                    </button>
                    <button onClick={() => setActiveServiceTab('COMMANDE_MENU')} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeServiceTab === 'COMMANDE_MENU' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <UtensilsCrossed size={16} className="mr-2"/> MENU SEMAINE
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
                    
                    {/* --- COLONNE GAUCHE : CALENDRIER & AJOUT DATE --- */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><CalendarCheck className="text-amber-500"/> Planificateur Interactif</h2>
                            <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 mb-8">
                                <Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} locale="fr-FR" />
                            </div>
                            
                            <form onSubmit={handleAddDate} className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><PlusCircle size={16}/> Bloquer une date précise</h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Raison du blocage</label>
                                        <input type="text" placeholder="Ex: Congés, Férié..." value={reason} onChange={(e) => setReason(e.target.value)} className="w-full p-4 bg-white border-0 rounded-2xl font-bold shadow-sm outline-none focus:ring-2 focus:ring-amber-500" />
                                    </div>
                                    <div className="md:w-48 flex items-end">
                                        <button type="submit" className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xs hover:bg-black transition-all active:scale-95 shadow-lg uppercase tracking-widest">BLOQUER LE {selectedDate.toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}</button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* --- COLONNE DROITE : RÉCURRENCE & LISTES --- */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Fermetures Hebdo */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Clock className="text-blue-500"/> Fermetures Hebdomadaires</h2>
                            <div className="flex gap-2 mb-8">
                                <select value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)} className="flex-1 p-4 bg-gray-50 border-0 rounded-2xl font-bold outline-none">
                                    <option value="">Choisir un jour...</option>
                                    {dayOfWeekMap.map((day, idx) => <option key={idx} value={idx}>{day}</option>)}
                                </select>
                                <button onClick={handleAddRecurringDay} className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all"><PlusCircle/></button>
                            </div>
                            
                            <div className="space-y-2">
                                {recurringDays.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-4 bg-blue-50/50 rounded-2xl border border-blue-100 group">
                                        <span className="font-black text-blue-700 text-sm">Tous les {dayOfWeekMap[d.day_of_week]}s</span>
                                        <button onClick={() => handleDelete(d.id)} className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                                    </div>
                                ))}
                                {recurringDays.length === 0 && <p className="text-center py-4 text-gray-400 text-xs italic">Aucun jour hebdomadaire bloqué.</p>}
                            </div>
                        </div>

                        {/* Dates spécifiques */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                            <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><CalendarDays className="text-red-500"/> Dates Ponctuelles</h2>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                                {specificDates.map(d => (
                                    <div key={d.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white transition-all">
                                        <div>
                                            <p className="font-black text-gray-800 text-sm">{new Date(d.date + 'T00:00').toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'})}</p>
                                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight">{d.reason || 'Indisponible'}</p>
                                        </div>
                                        <button onClick={() => handleDelete(d.id)} className="p-2 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={18}/></button>
                                    </div>
                                ))}
                                {specificDates.length === 0 && <div className="text-center py-10 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200"><p className="text-gray-400 text-xs font-bold">Aucune date bloquée.</p></div>}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CalendarSettings;
