import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import DemandeDetail from './DemandeDetail';
import { 
    Search, ChefHat, Truck, Star, RefreshCw, 
    Calendar, MapPin, List, Layout, ArrowRight, 
    XCircle
} from 'lucide-react';

const communesReunion = [
    "Bras-Panon", "Cilaos", "Entre-Deux", "L'Étang-Salé", "La Plaine-des-Palmistes",
    "La Possession", "Le Port", "Le Tampon", "Les Avirons", "Les Trois-Bassins",
    "Petite-Île", "Saint-André", "Saint-Benoît", "Saint-Denis", "Saint-Joseph",
    "Saint-Leu", "Saint-Louis", "Saint-Paul", "Saint-Philippe", "Saint-Pierre",
    "Sainte-Marie", "Sainte-Rose", "Sainte-Suzanne", "Salazie"
];

const getStatusColor = (status) => {
    const colors = {
        'En attente de traitement': { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
        'confirmed': { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981' },
        'En attente de paiement': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
        'Payée': { bg: 'rgba(139, 92, 246, 0.1)', text: '#8b5cf6' },
        'En attente de préparation': { bg: 'rgba(109, 40, 217, 0.1)', text: '#6d28d9' }
    };
    const c = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return { backgroundColor: c.bg, color: c.text, padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' };
};

const DemandeEnCoursCard = ({ demande, onSelect, themeColor }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat size={20}/>,
        'COMMANDE_MENU': <Truck size={20}/>,
        'COMMANDE_SPECIALE': <Star size={20}/>,
        'SOUSCRIPTION_ABONNEMENT': <RefreshCw size={20}/>
    };

    const clientName = demande.clients ? `${demande.clients.first_name} ${demande.clients.last_name}` : (demande.entreprises?.nom_entreprise || 'Client Inconnu');

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                        {typeIcons[demande.type] || <List />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight">{clientName}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {demande.id.substring(0, 8)}</p>
                    </div>
                </div>
                <span style={getStatusColor(demande.status)}>{demande.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Localisation</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2 truncate"><MapPin size={12}/> {demande.details_json?.deliveryCity || '—'}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
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
    const [filter, setFilter] = useState({ date: '', status: '', city: '', searchTerm: '' });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('demandes').select(`*, clients (*), entreprises (*)`).eq('business_unit', businessUnit);

        if (activeTab === 'SERVICE') query = query.eq('type', 'RESERVATION_SERVICE').in('status', ['En attente de traitement', 'confirmed', 'En attente de validation de devis']);
        else if (activeTab === 'MENU') query = query.in('type', ['COMMANDE_MENU', 'COMMANDE_SPECIALE']).not('status', 'in', '(completed,cancelled,paid,Nouvelle)');
        else if (activeTab === 'SUBS') query = query.eq('type', 'SOUSCRIPTION_ABONNEMENT');
        else {
            const commandeMenuFilter = `and(type.in.("COMMANDE_MENU","COMMANDE_SPECIALE"),status.not.in.(completed,cancelled,paid,Nouvelle,"En attente de préparation","Préparation en cours"))`; 
            const reservationServiceFilter = `and(type.in.("RESERVATION_SERVICE","SOUSCRIPTION_ABONNEMENT"),status.in.("En attente de traitement",confirmed,"En attente de validation de devis"))`;
            query = query.or(`${commandeMenuFilter},${reservationServiceFilter}`);
        }

        if (filter.date) query = query.eq('request_date', filter.date);
        if (filter.status) query = query.eq('status', filter.status);
        if (filter.city) query = query.ilike('details_json->>deliveryCity', `%${filter.city}%`);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [businessUnit, activeTab, filter]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    const handleUpdateStatus = async (id, s) => {
        await supabase.from('demandes').update({ status: s }).eq('id', id);
        fetchDemandes();
        setSelectedDemande(null);
    };

    const filteredList = demandes.filter(d => {
        const name = d.clients ? `${d.clients.last_name} ${d.clients.first_name}` : (d.entreprises?.nom_entreprise || '');
        return name.toLowerCase().includes(filter.searchTerm.toLowerCase()) || d.id.includes(filter.searchTerm);
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Suivi des Dossiers</h1>
                    <p className="text-gray-500 font-medium italic">Pilotage des demandes actives ({businessUnit}).</p>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-2xl overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('ALL')} className={`flex-1 min-w-[100px] py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Tous</button>
                    <button onClick={() => setActiveTab('SERVICE')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'SERVICE' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><ChefHat size={14} className="mr-2"/> Prestations</button>
                    <button onClick={() => setActiveTab('MENU')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'MENU' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Truck size={14} className="mr-2"/> Menus</button>
                    <button onClick={() => setActiveTab('SUBS')} className={`flex-1 min-w-[100px] flex items-center justify-center py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'SUBS' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><RefreshCw size={14} className="mr-2"/> Abos</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search size={18} className="absolute left-3 top-3 text-gray-300"/>
                        <input type="text" placeholder="Rechercher client..." value={filter.searchTerm} onChange={e => setFilter({...filter, searchTerm: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" />
                    </div>
                    <input type="date" value={filter.date} onChange={e => setFilter({...filter, date: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" />
                    <select value={filter.city} onChange={e => setFilter({...filter, city: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs">
                        <option value="">Toutes les villes</option>
                        {communesReunion.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button onClick={() => setFilter({date:'', status:'', city:'', searchTerm:''})} className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"><XCircle size={20}/></button>
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
                        {filteredList.map(demande => (
                            <DemandeEnCoursCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} />
                        ))}
                    </div>
                )}
            </div>

            {selectedDemande && <DemandeDetail demande={selectedDemande} onClose={() => setSelectedDemande(null)} onUpdateStatus={handleUpdateStatus} onRefresh={fetchDemandes} />}
        </div>
    );
};

export default DemandesEnCours;