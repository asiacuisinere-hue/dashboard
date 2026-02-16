import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import DemandeDetail from './DemandeDetail';
import {
    Search, ChefHat, Truck, Star, RefreshCw,
    Calendar, MapPin, List, Layout, ArrowRight,
    XCircle, SortAsc, SortDesc
} from 'lucide-react';

// --- LOGIQUE DES ZONES DE LA RÉUNION ---
const getZoneInfo = (city) => {
    if (!city) return { label: 'Inconnue', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    const c = city.toLowerCase();
    if (c.includes('denis') || c.includes('marie') || c.includes('suzanne')) 
        return { label: 'NORD', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
    if (c.includes('pierre') || c.includes('tampon') || c.includes('louis') || c.includes('joseph') || c.includes('philippe') || c.includes('île') || c.includes('deux') || c.includes('cilaos')) 
        return { label: 'SUD', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' };
    if (c.includes('paul') || c.includes('possession') || c.includes('port') || c.includes('leu') || c.includes('bassins') || c.includes('avirons') || c.includes('salé')) 
        return { label: 'OUEST', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (c.includes('andré') || c.includes('benoît') || c.includes('panon') || c.includes('rose') || c.includes('salazie') || c.includes('palmistes')) 
        return { label: 'EST', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
    return { label: 'AUTRE', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
};

const getStatusColor = (status) => {
    const colors = {
        'En attente de traitement': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
        'confirmed': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
        'En attente de paiement': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
        'Payée': { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
        'En attente de préparation': { bg: 'rgba(109, 40, 217, 0.1)', text: '#6d28d9' },
        'Prét pour livraison': { bg: 'rgba(6, 182, 212, 0.1)', text: '#06b6d4' }
    };
    const c = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return { backgroundColor: c.bg, color: c.text, padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' };
};

const DemandeEnCoursCard = ({ demande, onSelect, themeColor, isPriority }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat size={20}/>,
        'COMMANDE_MENU': <Truck size={20}/>,
        'COMMANDE_SPECIALE': <Star size={20}/>,
        'SOUSCRIPTION_ABONNEMENT': <RefreshCw size={20}/>
    };

    const clientName = demande.clients
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim()
        : (demande.entreprises?.nom_entreprise || 'Client Inconnu');

    const location = demande.details_json?.deliveryCity || demande.details_json?.ville || '—';
    const zone = getZoneInfo(location);

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${isPriority ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-50/10' : (themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500')}`}>
            
            <div className="absolute top-6 right-8 flex flex-col items-end gap-2">
                <span style={getStatusColor(demande.status)}>{demande.status === 'confirmed' ? 'Confirmée' : demande.status}</span>
                {isPriority && (
                    <span className="bg-amber-500 text-white px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-md animate-pulse">
                        <Star size={10} fill="white"/> VILLE STAR
                    </span>
                )}
                <span style={{ backgroundColor: zone.bg, color: zone.color }} className="px-3 py-1 rounded-lg text-[9px] font-black border border-current opacity-80 uppercase">
                    ZONE {zone.label}
                </span>
            </div>

            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                        {typeIcons[demande.type] || <List />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight pr-24">{clientName}</h3>  
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {demande.id.substring(0, 8)}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR') : '—'}</p>   
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Localisation</p>
                    <p className={`text-xs font-black flex items-center gap-2 truncate ${isPriority ? 'text-amber-600' : 'text-gray-700'}`}><MapPin size={12}/> {location}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${isPriority ? 'bg-amber-500 hover:bg-amber-600' : (themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600')}`}>
                Gérer le dossier <ArrowRight size={16} />
            </button>
        </div>
    );
};

const DemandesEnCours = () => {
    const { businessUnit } = useBusinessUnit();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [activeTab, setActiveTab] = useState('ALL');
    const [starCity, setStarCity] = useState('');
    const [filter, setFilter] = useState({ date: '', status: '', city: '', searchTerm: '', zone: 'ALL', sortAsc: true });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);

        // 1. Fetch Star City
        const { data: starData } = await supabase.from('settings').select('value').eq('key', 'priority_city').single();
        if (starData) setStarCity(starData.value);

        // 2. Fetch Demands
        let query = supabase.from('demandes').select(`*, clients (*), entreprises (*)`).eq('business_unit', businessUnit);

        const ongoingStatuses = ['confirmed', 'En attente de paiement', 'En attente de validation de devis', 'En cours de traitement'];

        if (activeTab === 'SERVICE') {
            query = query.eq('type', 'RESERVATION_SERVICE').in('status', ongoingStatuses);
        } else if (activeTab === 'MENU') {
            query = query.in('type', ['COMMANDE_MENU', 'COMMANDE_SPECIALE']).in('status', ['En attente de paiement', 'confirmed', 'En cours de traitement']);
        } else if (activeTab === 'SUBS') {
            query = query.eq('type', 'SOUSCRIPTION_ABONNEMENT');
        } else {
            query = query.in('status', ongoingStatuses);
        }

        if (filter.date) query = query.eq('request_date', filter.date);
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.city) {
            query = query.or(`details_json->>deliveryCity.ilike.%${filter.city}%,details_json->>ville.ilike.%${filter.city}%`);
        }

        // --- SORT BY REQUEST DATE ---
        const { data, error } = await query.order('request_date', { ascending: filter.sortAsc });
        
        let filteredData = data || [];
        // client-side zone filter
        if (filter.zone !== 'ALL') {
            filteredData = filteredData.filter(d => getZoneInfo(d.details_json?.deliveryCity || d.details_json?.ville).label === filter.zone);
        }

        if (!error) setDemandes(filteredData);
        setLoading(false);
    }, [businessUnit, activeTab, filter]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    const handleUpdateStatus = async (id, s) => {
        await supabase.from('demandes').update({ status: s }).eq('id', id);
        fetchDemandes();
        setSelectedDemande(null);
    };

    const filteredList = demandes.filter(d => {
        const name = d.clients
            ? `${d.clients.last_name || ''} ${d.clients.first_name || ''}`.trim()
            : (d.entreprises?.nom_entreprise || '');
        return name.toLowerCase().includes(filter.searchTerm.toLowerCase()) || d.id.includes(filter.searchTerm);
    });

    const priorityCount = demandes.filter(d => (d.details_json?.deliveryCity || d.details_json?.ville) === starCity).length;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Suivi des Dossiers</h1>        
                        <p className="text-gray-500 font-medium italic">Pilotage des demandes actives ({businessUnit}).</p>
                    </div>
                    {starCity && (
                        <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4">
                            <Star fill="white" size={20}/>
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-80 leading-none">Cible Semaine</p>
                                <p className="text-lg font-black leading-tight">{starCity} <span className="text-xs opacity-70">({priorityCount})</span></p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-2xl overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('ALL')} className={`flex-1 min-w-[100px] py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Tous</button>
                    <button onClick={() => setActiveTab('SERVICE')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'SERVICE' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><ChefHat size={14} className="mr-2"/> Prestations</button>
                    <button onClick={() => setActiveTab('MENU')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'MENU' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Truck size={14} className="mr-2"/> Menus</button>
                    <button onClick={() => setActiveTab('SUBS')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'SUBS' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><RefreshCw size={14} className="mr-2"/> Abos</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={18} className="absolute left-3 top-3 text-gray-400"/>
                        <input type="text" placeholder="Rechercher client..." value={filter.searchTerm} onChange={e => setFilter({...filter, searchTerm: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" />
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <Calendar size={16} className="text-gray-400 ml-2" />
                        <input type="date" value={filter.date} onChange={e => setFilter({...filter, date: e.target.value})} className="bg-transparent border-0 outline-none font-bold text-xs p-1" />
                        <button 
                            onClick={() => setFilter({...filter, sortAsc: !filter.sortAsc})} 
                            className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {filter.sortAsc ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-red-600" />}
                            <span className="text-[9px] font-black uppercase">{filter.sortAsc ? 'Asc' : 'Desc'}</span>
                        </button>
                    </div>

                    <select value={filter.zone} onChange={e => setFilter({...filter, zone: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs">
                        <option value="ALL">Toutes Zones</option>
                        <option value="NORD">NORD</option>
                        <option value="SUD">SUD</option>
                        <option value="OUEST">OUEST</option>
                        <option value="EST">EST</option>
                    </select>

                    <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs">
                        <option value="">Tous les statuts</option>
                        <option value="confirmed">Confirmée</option>
                        <option value="En attente de paiement">Attente Paiement</option>
                    </select>

                    <button onClick={() => setFilter({date:'', status:'', city:'', searchTerm:'', zone:'ALL', sortAsc: true})} className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"><XCircle size={20}/></button> 
                </div>

                {loading ? (
                    <div className="flex justify-center py-32"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>
                ) : filteredList.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                        <Layout size={60} className="mx-auto text-gray-100 mb-4"/>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucun dossier trouvé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
                        {filteredList.map(demande => {
                            const isPriority = (demande.details_json?.deliveryCity || demande.details_json?.ville) === starCity;
                            return <DemandeEnCoursCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} isPriority={isPriority} />;
                        })}
                    </div>
                )}
            </div>

            {selectedDemande && (
                <DemandeDetail 
                    demande={selectedDemande} 
                    onClose={() => setSelectedDemande(null)} 
                    onUpdateStatus={handleUpdateStatus} 
                    onRefresh={fetchDemandes} 
                />
            )}
        </div>
    );
};

export default DemandesEnCours;