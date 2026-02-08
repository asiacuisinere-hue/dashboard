import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import DemandeDetail from '../DemandeDetail'; 
import { 
    History, Search, Calendar, Archive, 
    XCircle, RefreshCw, ChefHat, Truck, Star, ArrowRight,
    FileClock
} from 'lucide-react';

const getStatusStyle = (status) => {
    const colors = {
        'Archivée': { bg: 'rgba(108, 117, 125, 0.1)', text: '#6c757d' },
        'Refusée': { bg: 'rgba(220, 53, 69, 0.1)', text: '#dc3545' },
        'Annulée': { bg: 'rgba(220, 53, 69, 0.1)', text: '#dc3545' },
        'completed': { bg: 'rgba(40, 167, 69, 0.1)', text: '#28a745' },
        'Payée': { bg: 'rgba(40, 167, 69, 0.1)', text: '#28a745' }
    };
    const c = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return { backgroundColor: c.bg, color: c.text, padding: '4px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' };
};

const HistoriqueCard = ({ demande, onSelect, themeColor }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat size={20} />,
        'COMMANDE_MENU': <Truck size={20} />,
        'COMMANDE_SPECIALE': <Star size={20} />,
        'SOUSCRIPTION_ABONNEMENT': <RefreshCw size={20} />
    };

    // Fix: Handle null names
    const clientName = demande.clients 
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim() 
        : (demande.entreprises?.nom_entreprise || 'Client Inconnu');

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                        {typeIcons[demande.type] || <History />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight">{clientName}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {demande.id.substring(0, 8)}</p>
                    </div>
                </div>
                <span style={getStatusStyle(demande.status)}>{demande.status === 'completed' ? 'Terminée' : demande.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Demande</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Type de Flux</p>
                    <p className="text-xs font-black text-gray-700 truncate">{demande.type.replace('_', ' ')}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className="w-full py-4 rounded-2xl bg-gray-50 text-gray-500 font-black text-xs hover:bg-gray-100 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest">
                Consulter les détails <ArrowRight size={16} />
            </button>
        </div>
    );
};

const Historique = () => {
    const { businessUnit } = useBusinessUnit();
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [activeTab, setActiveTab] = useState('DONE'); 
    const [filters, setFilters] = useState({ date: '', search: '' });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('demandes').select('*, clients (*), entreprises (*)').eq('business_unit', businessUnit);

        if (activeTab === 'DONE') query = query.in('status', ['completed', 'Payée', 'Confirmée']);
        else if (activeTab === 'CANCELLED') query = query.in('status', ['Refusée', 'Annulée']);
        else query = query.eq('status', 'Archivée');

        if (filters.date) query = query.eq('request_date', filters.date);

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [businessUnit, activeTab, filters.date]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    const handleBulkArchive = async () => {
        if (!window.confirm('Archiver TOUTES les demandes affichées dans cet onglet ?')) return;
        const ids = demandes.map(d => d.id);
        if (ids.length === 0) return;
        const { error } = await supabase.from('demandes').update({ status: 'Archivée' }).in('id', ids);
        if (!error) fetchDemandes();
    };

    const filteredList = demandes.filter(d => {
        const name = d.clients 
            ? `${d.clients.last_name || ''} ${d.clients.first_name || ''}`.trim() 
            : (d.entreprises?.nom_entreprise || '');
        return name.toLowerCase().includes(filters.search.toLowerCase()) || d.id.includes(filters.search);
    });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Mémoire de l'Activité</h1>
                        <p className="text-gray-500 font-medium italic">Consultez vos dossiers clos, refusés ou archivés ({businessUnit}).</p>
                    </div>
                    {activeTab !== 'ARCHIVE' && (
                        <button onClick={handleBulkArchive} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-800 text-white font-black text-xs shadow-lg hover:bg-black transition-all active:scale-95 uppercase tracking-widest">
                            <Archive size={16}/> Archiver l'onglet
                        </button>
                    )}
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-xl">
                    <button onClick={() => setActiveTab('DONE')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'DONE' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Terminées</button>
                    <button onClick={() => setActiveTab('CANCELLED')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'CANCELLED' ? 'bg-white text-red-600 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Clos / Refus</button>
                    <button onClick={() => setActiveTab('ARCHIVE')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'ARCHIVE' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>Archives</button>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px] relative">
                        <Search size={18} className="absolute left-3 top-3 text-gray-300"/>
                        <input type="text" placeholder="Rechercher un dossier..." value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" />
                    </div>
                    <input type="date" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" />
                    <button onClick={() => setFilters({date:'', search:''})} className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"><XCircle size={20}/></button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-32"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>
                ) : filteredList.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                        <FileClock size={60} className="mx-auto text-gray-100 mb-4"/>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucun historique trouvé.</p>
                    </div>
                ) : (
                    <>
                        <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Date</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Client</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Type</th>
                                        <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Statut</th>
                                        <th className="px-8 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 font-medium">
                                    {filteredList.map(d => {
                                        const name = d.clients 
                                            ? `${d.clients.last_name || ''} ${d.clients.first_name || ''}`.trim() 
                                            : (d.entreprises?.nom_entreprise || '—');
                                        return (
                                            <tr key={d.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedDemande(d)}>
                                                <td className="px-8 py-5 text-sm font-bold text-gray-500">{new Date(d.created_at).toLocaleDateString('fr-FR')}</td>
                                                <td className="px-8 py-5 font-black text-gray-800">{name}</td>
                                                <td className="px-8 py-5 text-center text-gray-400">
                                                    {d.type === 'RESERVATION_SERVICE' && <ChefHat size={18} className="mx-auto" />}
                                                    {d.type === 'COMMANDE_MENU' && <Truck size={18} className="mx-auto" />}
                                                    {d.type === 'COMMANDE_SPECIALE' && <Star size={18} className="mx-auto" />}
                                                </td>
                                                <td className="px-8 py-5 text-center"><span style={getStatusStyle(d.status)}>{d.status === 'completed' ? 'Terminée' : d.status}</span></td>
                                                <td className="px-8 py-5 text-right"><button className={`font-black text-[10px] uppercase tracking-widest ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Détails</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filteredList.map(d => <HistoriqueCard key={d.id} demande={d} onSelect={setSelectedDemande} themeColor={themeColor} />)}
                        </div>
                    </>
                )}
            </div>

            {selectedDemande && (
                <DemandeDetail
                    demande={selectedDemande}
                    onClose={() => setSelectedDemande(null)}
                    onUpdateStatus={async (id, s) => { await supabase.from('demandes').update({status: s}).eq('id', id); fetchDemandes(); setSelectedDemande(null); }}
                    onRefresh={fetchDemandes}
                />
            )}
        </div>
    );
};

export default Historique;
