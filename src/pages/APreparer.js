import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import DemandeDetail from '../DemandeDetail';
import ReactPaginate from 'react-paginate';
import { 
    Search, RefreshCw, ChefHat, Truck, Star, 
    Calendar, MapPin, ArrowRight, Soup, CookingPot, SortAsc, SortDesc, XCircle
} from 'lucide-react';

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

const APreparerCard = ({ demande, onSelect, themeColor, isPriority }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat size={20}/>,
        'COMMANDE_MENU': <Truck size={20}/>,
        'COMMANDE_SPECIALE': <Star size={20}/>
    };
    const invoiceNumber = demande.invoices?.[0]?.document_number;
    const clientName = demande.clients 
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim() 
        : (demande.entreprises?.nom_entreprise || 'Client Inconnu');

    const location = demande.details_json?.deliveryCity || demande.details_json?.ville || '';
    const zone = getZoneInfo(location);

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${isPriority ? 'ring-4 ring-amber-400 border-amber-500 bg-amber-50/10' : (themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500')}`}>
            
            <div className="absolute top-6 right-8 flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${demande.status === 'Préparation en cours' ? 'bg-cyan-50 text-cyan-600' : 'bg-purple-50 text-purple-600'}`}>
                    {demande.status === 'Préparation en cours' ? 'En Cuisine' : 'En Attente'}
                </span>
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
                        {typeIcons[demande.type] || <CookingPot />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight pr-24">
                            {clientName}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {invoiceNumber ? `Facture: ${invoiceNumber}` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</p>
                    <p className="text-xs font-black text-red-500 flex items-center gap-2"><Calendar size={12}/> {demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR') : '—'}</p>   
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ville</p>
                    <p className={`text-xs font-black flex items-center gap-2 truncate ${isPriority ? 'text-amber-600' : 'text-gray-700'}`}><MapPin size={12}/> {location || '—'}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${isPriority ? 'bg-amber-500 hover:bg-amber-600' : (themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600')}`}>
                Gérer la préparation <ArrowRight size={16} />
            </button>
        </div>
    );
};

const APreparer = () => {
    const { businessUnit } = useBusinessUnit();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [zoneFilter, setZoneFilter] = useState('ALL');
    const [dateFilter, setDateFilter] = useState('');
    const [sortAsc, setSortAsc] = useState(true);
    const [starCity, setStarCity] = useState(''); 
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 9;

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        
        // 1. Fetch Star City from settings
        const { data: starData } = await supabase.from('settings').select('value').eq('key', 'priority_city').single();
        if (starData) setStarCity(starData.value);

        // 2. Fetch Demands
        const toPrepareStatuses = ['En attente de préparation', 'Préparation en cours'];
        let query = supabase.from('demandes').select(`*, details_json, clients (*), entreprises (*), invoices (document_number)`).in('status', toPrepareStatuses).eq('business_unit', businessUnit);

        if (searchTerm) {
            query = query.or(`clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%,invoices.document_number.ilike.%${searchTerm}%`);   
        }

        if (dateFilter) {
            query = query.eq('request_date', dateFilter);
        }

        const { data, error } = await query.order('request_date', { ascending: sortAsc });
        
        let filteredData = data || [];
        if (zoneFilter !== 'ALL') {
            filteredData = filteredData.filter(d => {
                const loc = d.details_json?.deliveryCity || d.details_json?.ville || '';
                return getZoneInfo(loc).label === zoneFilter;
            });
        }

        if (!error) setDemandes(filteredData);
        setLoading(false);
    }, [searchTerm, businessUnit, zoneFilter, dateFilter, sortAsc]);

    useEffect(() => {
        fetchDemandes();
        const channel = supabase.channel('demandes-a-preparer-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, fetchDemandes).subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchDemandes]);

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase.from('demandes').update({ status: newStatus }).eq('id', id);     
        if (!error) {
            fetchDemandes();
            setSelectedDemande(null);
        }
    };

    const offset = currentPage * itemsPerPage;
    const currentDemandes = demandes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(demandes.length / itemsPerPage);

    // Stats
    const priorityCount = demandes.filter(d => (d.details_json?.deliveryCity || d.details_json?.ville) === starCity).length;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Atelier de Préparation</h1>   
                        <p className="text-gray-500 font-medium italic">Logistique et production des commandes en cours.</p>
                    </div>
                    {starCity && (
                        <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4">
                            <Star fill="white" size={20}/>
                            <div>
                                <p className="text-[10px] font-black uppercase opacity-80 leading-none">Ville Star</p>
                                <p className="text-lg font-black leading-tight">{starCity} <span className="text-xs opacity-70">({priorityCount})</span></p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 mb-8 items-center">
                    <div className="flex-1 bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex items-center min-w-[300px]">
                        <Search size={20} className="text-gray-300 mr-3 ml-2" />
                        <input 
                            type="text" 
                            placeholder="Rechercher client, facture, plat..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 py-2 outline-none text-gray-700 font-medium"
                        />
                    </div>

                    {/* FILTRE DATE & TRI */}
                    <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 flex items-center gap-2">
                        <Calendar size={18} className="text-gray-400 ml-2" />
                        <input 
                            type="date" 
                            value={dateFilter} 
                            onChange={(e) => setDateFilter(e.target.value)} 
                            className="bg-transparent border-0 outline-none font-bold text-xs p-2"
                        />
                        <button 
                            onClick={() => setSortAsc(!sortAsc)} 
                            className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2 px-3"
                            title={sortAsc ? "Trier par date décroissante" : "Trier par date croissante"}
                        >
                            {sortAsc ? <SortAsc size={18} className="text-blue-600" /> : <SortDesc size={18} className="text-red-600" />}
                            <span className="text-[10px] font-black uppercase">{sortAsc ? 'Asc' : 'Desc'}</span>
                        </button>
                        { (dateFilter || searchTerm || zoneFilter !== 'ALL') && (
                            <button onClick={() => { setDateFilter(''); setSearchTerm(''); setZoneFilter('ALL'); }} className="p-2 text-gray-400 hover:text-red-500">
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>

                    <div className="bg-gray-200 p-1.5 rounded-[2rem] flex items-center gap-1">
                        <button onClick={() => setZoneFilter('ALL')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${zoneFilter === 'ALL' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>TOUTES</button>
                        <button onClick={() => setZoneFilter('NORD')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${zoneFilter === 'NORD' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>NORD</button>
                        <button onClick={() => setZoneFilter('SUD')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${zoneFilter === 'SUD' ? 'bg-red-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>SUD</button>
                        <button onClick={() => setZoneFilter('OUEST')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${zoneFilter === 'OUEST' ? 'bg-green-50 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>OUEST</button>
                        <button onClick={() => setZoneFilter('EST')} className={`px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black transition-all ${zoneFilter === 'EST' ? 'bg-purple-50 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>EST</button>
                    </div>
                </div>

                {loading && demandes.length === 0 ? (
                    <div className="p-6 text-center py-32 flex flex-col items-center gap-4"><RefreshCw className="animate-spin text-amber-500" size={40}/><p className="text-gray-400 font-bold">Préparation de l'atelier...</p></div>
                ) : demandes.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                        <Soup size={60} className="mx-auto text-gray-100 mb-4"/>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Rien à préparer pour cette sélection.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
                            {currentDemandes.map(demande => {
                                const isPriority = (demande.details_json?.deliveryCity || demande.details_json?.ville) === starCity;
                                return <APreparerCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} isPriority={isPriority} />;
                            })}
                        </div>

                        {pageCount > 1 && (
                            <div className="mt-12 flex justify-center">
                                <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl shadow-sm border border-gray-100">
                                    <ReactPaginate
                                        previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick}
                                        containerClassName={'flex gap-2'}
                                        pageLinkClassName={'hidden'}
                                        activeClassName={'hidden'}
                                        previousLinkClassName={'p-2 bg-gray-50 rounded-lg hover:bg-gray-100 block font-black'}
                                        nextLinkClassName={'p-2 bg-gray-50 rounded-lg hover:bg-gray-100 block font-black'}
                                    />
                                </div>
                            </div>
                        )}
                    </>
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

export default APreparer;