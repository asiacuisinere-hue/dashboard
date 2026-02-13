import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
    MapPin, Phone, Navigation, Clock,
    Truck, Calendar, RefreshCw,
    AlertCircle, Search
} from 'lucide-react';

const getZoneInfo = (city) => {
    if (!city) return { label: 'Inconnue', color: '#94a3b8', bg: 'bg-slate-100' };
    const c = city.toLowerCase();
    if (c.includes('denis') || c.includes('marie') || c.includes('suzanne'))
        return { label: 'NORD', color: '#3b82f6', bg: 'bg-blue-50' };
    if (c.includes('pierre') || c.includes('tampon') || c.includes('louis') || c.includes('joseph') || c.includes('philippe') || c.includes('île') || c.includes('deux') || c.includes('cilaos'))
        return { label: 'SUD', color: '#ef4444', bg: 'bg-red-50' };
    if (c.includes('paul') || c.includes('possession') || c.includes('port') || c.includes('leu') || c.includes('bassins') || c.includes('avirons') || c.includes('salé'))
        return { label: 'OUEST', color: '#10b981', bg: 'bg-green-50' };
    if (c.includes('andré') || c.includes('benoît') || c.includes('panon') || c.includes('rose') || c.includes('salazie') || c.includes('palmistes'))
        return { label: 'EST', color: '#8b5cf6', bg: 'bg-purple-50' };
    return { label: 'AUTRE', color: '#64748b', bg: 'bg-slate-50' };
};

const FeuilleRoute = () => {
    const { businessUnit } = useBusinessUnit();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const tourStatuses = ['Préparation en cours', 'Prêt pour livraison', 'En attente de préparation'];

        let query = supabase.from('demandes')
            .select(`*, clients (*), entreprises (*)`)
            .in('status', tourStatuses)
            .eq('business_unit', businessUnit)
            .eq('request_date', dateFilter);

        const { data, error } = await query;
        if (!error) setOrders(data || []);
        setLoading(false);
    }, [businessUnit, dateFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const groupedOrders = orders.reduce((acc, order) => {
        const details = typeof order.details_json === 'string' ? JSON.parse(order.details_json) : order.details_json;
        const city = details?.deliveryCity || details?.ville || 'Inconnue';
        const zone = getZoneInfo(city).label;
        if (!acc[zone]) acc[zone] = [];
        acc[zone].push({ ...order, parsedDetails: details });
        return acc;
    }, {});

    const openMaps = (city, address) => {
        const query = encodeURIComponent(`${address || ''} ${city}, La Réunion`.trim());
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    const makeCall = (phone) => {
        if (!phone) return;
        window.location.href = `tel:${phone}`;
    };

    return (
        <div className="p-4 md:p-8 bg-gray-50 min-h-screen pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-black text-gray-800 flex items-center gap-3"><Truck className="text-amber-500" size={28}/> Feuille de Route</h1>
                    <p className="text-gray-500 text-sm italic font-medium mt-1">Organisez vos livraisons par zone géographique.</p>
                </div>

                {/* FILTRE DATE & RECHERCHE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <Calendar className="text-amber-500" size={20}/>
                        <input
                            type="date"
                            value={dateFilter}
                            onChange={e => setDateFilter(e.target.value)}
                            className="bg-transparent border-0 font-black text-gray-800 outline-none w-full"
                        />
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <Search className="text-gray-300" size={20}/>
                        <input
                            type="text"
                            placeholder="Client, Ville..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="bg-transparent border-0 font-medium text-gray-800 outline-none w-full"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center"><RefreshCw className="animate-spin text-amber-500 mx-auto" size={40}/></div>
                ) : Object.keys(groupedOrders).length === 0 ? (
                    <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                        <AlertCircle className="mx-auto text-gray-200 mb-4" size={48}/>
                        <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Aucune livraison prévue ce jour.</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {Object.entries(groupedOrders).map(([zone, zoneOrders]) => (
                            <div key={zone} className="space-y-4">
                                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-3 ml-2">
                                    <span className={`w-2 h-2 rounded-full ${getZoneInfo(zoneOrders[0].parsedDetails?.deliveryCity || zoneOrders[0].parsedDetails?.ville).bg.replace('bg-', 'bg-')}`}></span>
                                    Zone {zone} ({zoneOrders.length})
                                </h2>

                                <div className="space-y-4">
                                    {zoneOrders.map(order => {
                                        const client = order.clients || order.entreprises;
                                        const name = order.clients ? `${client.last_name} ${client.first_name}` : client.nom_entreprise;
                                        const city = order.parsedDetails?.deliveryCity || order.parsedDetails?.ville;
                                        const phone = client.phone || client.contact_phone;
                                        const mode = order.parsedDetails?.deliveryMode || 'retrait';      

                                        return (
                                            <div key={order.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all relative overflow-hidden group">
                                                {/* Status bar */}
                                                <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${order.status === 'Prêt pour livraison' ? 'bg-green-500' : 'bg-cyan-500'}`}></div>

                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">    
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${mode === 'livraison' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {mode}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-300">#{order.id.substring(0,6)}</span>
                                                        </div>
                                                        <h3 className="text-lg font-black text-gray-800 mb-2">{name}</h3>
                                                        <div className="flex items-center gap-4 text-sm font-medium text-gray-500">
                                                            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-amber-500"/> {city}</span>
                                                            {order.parsedDetails?.heure && <span className="flex items-center gap-1.5"><Clock size={14} className="text-blue-500"/> {order.parsedDetails.heure}</span>}
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => makeCall(phone)}
                                                            className="flex-1 md:flex-none h-14 w-14 md:w-14 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all border border-gray-100 active:scale-90"
                                                            title="Appeler le client"
                                                        >
                                                            <Phone size={24}/>
                                                        </button>
                                                        <button
                                                            onClick={() => openMaps(city, order.parsedDetails?.address)}
                                                            className="flex-[2] md:flex-none h-14 px-6 rounded-2xl bg-gray-800 text-white flex items-center justify-center gap-2 font-black text-xs hover:bg-black transition-all shadow-lg active:scale-95"
                                                        >
                                                            <Navigation size={18}/> ITINÉRAIRE
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Legend */}
                <div className="mt-12 p-6 bg-white rounded-[2rem] border border-gray-100 flex flex-wrap gap-6 justify-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-cyan-500 rounded-full"></span> En cuisine</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-500 rounded-full"></span> Prêt à livrer</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-amber-100 rounded-sm"></span> Livraison</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-100 rounded-sm"></span> Retrait</div>
                </div>
            </div>
        </div>
    );
};

export default FeuilleRoute;
