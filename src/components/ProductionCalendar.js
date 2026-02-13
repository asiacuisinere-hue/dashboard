import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Calendar as CalendarIcon, ChefHat, Truck, 
    Soup, ChevronLeft, ChevronRight, Clock, RefreshCw 
} from 'lucide-react';

const ProductionCalendar = ({ businessUnit }) => {
    const [loading, setLoading] = useState(true);
    const [events, setEvents] = useState({});
    const [startDate, setStartDate] = useState(new Date());

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        
        // Calculate range (7 days from startDate)
        const end = new Date(startDate);
        end.setDate(startDate.getDate() + 6);
        
        const startISO = startDate.toISOString().split('T')[0];
        const endISO = end.toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('demandes')
            .select('id, request_date, type, status, details_json, clients(first_name, last_name)')
            .eq('business_unit', businessUnit)
            .gte('request_date', startISO)
            .lte('request_date', endISO)
            .not('status', 'in', '("cancelled","Nouvelle","Intention WhatsApp")');

        if (!error && data) {
            const grouped = data.reduce((acc, item) => {
                const date = item.request_date;
                if (!acc[date]) acc[date] = [];
                acc[date].push(item);
                return acc;
            }, {});
            setEvents(grouped);
        }
        setLoading(false);
    }, [businessUnit, startDate]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const navigateWeek = (direction) => {
        const newDate = new Date(startDate);
        newDate.setDate(startDate.getDate() + (direction * 7));
        setStartDate(newDate);
    };

    const renderEventBlock = (item) => {
        const details = typeof item.details_json === 'string' ? JSON.parse(item.details_json) : item.details_json;
        const clientName = item.clients ? `${item.clients.first_name} ${item.clients.last_name[0]}.` : 'Client';
        
        let bgColor = "bg-amber-100 border-amber-200 text-amber-800";
        let Icon = Soup;

        if (item.type === 'RESERVATION_SERVICE') {
            bgColor = "bg-blue-100 border-blue-200 text-blue-800";
            Icon = ChefHat;
        } else if (item.type === 'COMMANDE_MENU' || item.type === 'COMMANDE_SPECIALE') {
            bgColor = "bg-green-100 border-green-200 text-green-800";
            Icon = Truck;
        }

        return (
            <div key={item.id} className={`${bgColor} border p-2 rounded-xl text-[10px] font-bold mb-1 shadow-sm flex items-center gap-2 truncate`}>
                <Icon size={12} className="flex-shrink-0" />
                <div className="flex items-center gap-1 min-w-0">
                    <Clock size={10} className="opacity-40 flex-shrink-0" />
                    <span className="truncate">{details?.heure || 'Jour'}</span>
                </div>
                <span className="opacity-60">|</span>
                <span className="truncate">{clientName}</span>
            </div>
        );
    };

    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        days.push(d);
    }

    return (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <CalendarIcon className="text-amber-500" size={24}/>
                        Planning de Production
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Vue hebdomadaire des prestations et livraisons</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronLeft size={18}/></button>
                    <span className="text-xs font-black uppercase tracking-widest px-4">Semaine du {startDate.toLocaleDateString('fr-FR', {day:'numeric', month:'short'})}</span>
                    <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-white rounded-xl transition-all"><ChevronRight size={18}/></button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center text-amber-500"><RefreshCw className="animate-spin" size={32}/></div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    {days.map(day => {
                        const dateKey = day.toISOString().split('T')[0];
                        const dayEvents = events[dateKey] || [];
                        const isToday = new Date().toISOString().split('T')[0] === dateKey;

                        return (
                            <div key={dateKey} className={`min-h-[200px] flex flex-col rounded-2xl border ${isToday ? 'border-amber-400 bg-amber-50/10 ring-2 ring-amber-400/20' : 'border-gray-50 bg-gray-50/30'}`}>
                                <div className={`p-3 text-center border-b ${isToday ? 'border-amber-200' : 'border-gray-100'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-amber-600' : 'text-gray-400'}`}>
                                        {day.toLocaleDateString('fr-FR', {weekday: 'short'})}
                                    </p>
                                    <p className={`text-lg font-black ${isToday ? 'text-amber-700' : 'text-gray-800'}`}>
                                        {day.getDate()}
                                    </p>
                                </div>
                                <div className="p-2 flex-1 overflow-y-auto max-h-48 scrollbar-hide">
                                    {dayEvents.length > 0 ? (
                                        dayEvents.map(renderEventBlock)
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-10">
                                            <Soup size={24}/>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 flex flex-wrap gap-6 justify-center text-[9px] font-black uppercase tracking-[0.15em] text-gray-400 border-t pt-6 border-gray-50">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full"></span> Chef à Domicile</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-100 border border-green-200 rounded-full"></span> Livraisons Menus</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-full"></span> En Cuisine (Atelier)</div>
            </div>
        </div>
    );
};

export default ProductionCalendar;
