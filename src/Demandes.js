import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import DemandeDetail from './DemandeDetail'; 
import {
    MapPin, Calendar,
    ChefHat, Truck, Star, RefreshCw,
    CheckCircle2, Mail,
    ArrowRight, SortAsc, SortDesc, XCircle
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

const DemandeCard = ({ demande, onSelect, themeColor, isPriority }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat className="text-amber-500" />,
        'COMMANDE_MENU': <Truck className="text-blue-500" />,
        'COMMANDE_SPECIALE': <Star className="text-purple-500" />,
        'SOUSCRIPTION_ABONNEMENT': <RefreshCw className="text-green-500" />
    };

    const clientName = demande.clients
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim()
        : (demande.entreprises?.nom_entreprise || 'Inconnu');

    const isDraft = demande.status === 'Intention WhatsApp';
    const location = demande.details_json?.deliveryCity || demande.details_json?.ville || '';
    const zone = getZoneInfo(location);

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative overflow-hidden group ${isPriority ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-50/10' : (themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500')} ${isDraft && !isPriority ? 'opacity-75 grayscale-[0.5]' : ''}`}> 
            
            <div className="absolute top-6 right-8 flex flex-col items-end gap-2">
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isDraft ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {isDraft ? 'Intention WhatsApp' : 'Nouvelle'}
                </div>
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
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shadow-inner group-hover:bg-white transition-colors border border-gray-100">
                        {typeIcons[demande.type] || <Mail />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-xl leading-tight pr-24">{clientName}</h3>  
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Reçue le {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Souhaitée</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ville</p>
                    <p className={`text-xs font-black flex items-center gap-2 truncate ${isPriority ? 'text-amber-600' : 'text-gray-700'}`}><MapPin size={12}/> {location || '—'}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${isPriority ? 'bg-amber-500 hover:bg-amber-600' : (isDraft ? 'bg-gray-400' : (themeColor === 'blue' ? 'bg-blue-600' : 'bg-amber-500'))}`}>    
                Gérer la demande <ArrowRight size={16} />
            </button>
        </div>
    );
};

const Demandes = () => {
    const { businessUnit } = useBusinessUnit();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [starCity, setStarCity] = useState('');
    const [filter, setFilter] = useState({ type: 'ALL', sortAsc: false });
    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);

        // 1. Fetch Star City from settings
        const { data: starData } = await supabase.from('settings').select('value').eq('key', 'priority_city').single();
        if (starData) setStarCity(starData.value);

        // 2. Fetch Demands
        let query = supabase
            .from('demandes')
            .select('*, clients (*), entreprises (*)')
            .in('status', ['Nouvelle', 'Intention WhatsApp', 'En attente de traitement'])
            .eq('business_unit', businessUnit);

        if (filter.type !== 'ALL') {
            query = query.eq('type', filter.type);
        }

        const { data, error } = await query.order('created_at', { ascending: filter.sortAsc });
        
        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [businessUnit, filter]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    const handleUpdateStatus = async (id, s) => {
        await supabase.from('demandes').update({ status: s }).eq('id', id);
        fetchDemandes();
        setSelectedDemande(null);
    };

    if (loading && demandes.length === 0) return <div className="p-6 text-center py-20 flex flex-col items-center gap-4"><RefreshCw className="animate-spin text-amber-500" size={40}/><p className="text-gray-400 font-bold">Réception des nouvelles demandes...</p></div>;

    // Stats for header
    const priorityInInbox = demandes.filter(d => (d.details_json?.deliveryCity || d.details_json?.ville) === starCity).length;

    const typeOptions = [
        { value: 'ALL', label: 'Tous les types' },
        { value: 'RESERVATION_SERVICE', label: 'Prestations Chef' },
        { value: 'COMMANDE_MENU', label: 'Menus Semaine' },
        { value: 'COMMANDE_SPECIALE', label: 'Commandes Spéciales' },
        { value: 'SOUSCRIPTION_ABONNEMENT', label: 'Abonnements' }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Boîte de Réception</h1>      
                        <p className="text-gray-500 font-medium italic">Traitement des intentions et nouvelles demandes ({businessUnit}).</p>
                    </div>
                    {starCity && (
                        <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4">
                            <Star fill="white" size={20}/>
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-80 leading-none">Cible Semaine</p>
                                <p className="text-lg font-black leading-tight">{starCity} <span className="text-xs opacity-70">({priorityInInbox})</span></p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px]">
                        <select 
                            value={filter.type} 
                            onChange={e => setFilter({...filter, type: e.target.value})}
                            className="w-full p-3 bg-gray-50 border-0 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500"
                        >
                            {typeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                        <Mail size={16} className="text-gray-400 ml-2" />
                        <span className="text-[10px] font-black uppercase text-gray-400 px-2">Réception</span>
                        <button 
                            onClick={() => setFilter({...filter, sortAsc: !filter.sortAsc})} 
                            className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            {filter.sortAsc ? <SortAsc size={16} className="text-blue-600" /> : <SortDesc size={16} className="text-red-600" />}
                            <span className="text-[9px] font-black uppercase">{filter.sortAsc ? 'Anciennes' : 'Récentes'}</span>
                        </button>
                    </div>

                    <button 
                        onClick={() => setFilter({type: 'ALL', sortAsc: false})} 
                        className="p-2.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="Réinitialiser les filtres"
                    >
                        <XCircle size={20}/>
                    </button>
                </div>

                {demandes.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 animate-in fade-in duration-700">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-gray-200"/></div>
                        <h2 className="text-2xl font-black text-gray-300 uppercase tracking-widest">Tout est à jour !</h2>
                        <p className="text-gray-400 font-medium mt-2">Aucune demande correspondante.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {demandes.map(demande => {
                            const isPriority = (demande.details_json?.deliveryCity || demande.details_json?.ville) === starCity;
                            return <DemandeCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} isPriority={isPriority} />;
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

export default Demandes;
