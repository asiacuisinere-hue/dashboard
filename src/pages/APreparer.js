import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import DemandeDetail from '../DemandeDetail';
import ReactPaginate from 'react-paginate';
import { 
    Search, RefreshCw, ChefHat, Truck, Star, 
    Calendar, MapPin, ArrowRight, Soup, CookingPot
} from 'lucide-react';

const APreparerCard = ({ demande, onSelect, themeColor }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat size={20}/>,
        'COMMANDE_MENU': <Truck size={20}/>,
        'COMMANDE_SPECIALE': <Star size={20}/>
    };
    const invoiceNumber = demande.invoices?.[0]?.document_number;

    // Fix: Handle null names
    const clientName = demande.clients 
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim() 
        : (demande.entreprises?.nom_entreprise || 'Client Inconnu');

    // Fix: Check both possible keys for location
    const location = demande.details_json?.deliveryCity || demande.details_json?.ville || '—';

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 group-hover:bg-white transition-colors">
                        {typeIcons[demande.type] || <CookingPot />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-lg leading-tight">
                            {clientName}
                        </h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {invoiceNumber ? `Facture: ${invoiceNumber}` : '—'}
                        </p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${demande.status === 'Préparation en cours' ? 'bg-cyan-50 text-cyan-600' : 'bg-purple-50 text-purple-600'}`}>
                    {demande.status === 'Préparation en cours' ? 'En Cuisine' : 'En Attente'}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Échéance</p>
                    <p className="text-xs font-black text-red-500 flex items-center gap-2"><Calendar size={12}/> {demande.request_date ? new Date(demande.request_date).toLocaleDateString('fr-FR') : '—'}</p>   
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ville</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2 truncate"><MapPin size={12}/> {location}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
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
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 9;

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        const toPrepareStatuses = ['En attente de préparation', 'Préparation en cours'];
        let query = supabase.from('demandes').select(`*, details_json, clients (*), entreprises (*), invoices (document_number)`).in('status', toPrepareStatuses).eq('business_unit', businessUnit);

        if (searchTerm) {
            query = query.or(`clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%,invoices.document_number.ilike.%${searchTerm}%`);   
        }

        const { data, error } = await query.order('request_date', { ascending: true });
        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [searchTerm, businessUnit]);

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
            alert('Statut mis à jour !');
            fetchDemandes();
            setSelectedDemande(null);
        } else alert(error.message);
    };

    const offset = currentPage * itemsPerPage;
    const currentDemandes = demandes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(demandes.length / itemsPerPage);

    if (loading && demandes.length === 0) return <div className="p-6 text-center py-32 flex flex-col items-center gap-4"><RefreshCw className="animate-spin text-amber-500" size={40}/><p className="text-gray-400 font-bold">Préparation de l'atelier...</p></div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Atelier de Préparation</h1>   
                    <p className="text-gray-500 font-medium italic">Logistique et production des commandes en cours.</p>
                </div>

                <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex items-center">
                    <Search size={20} className="text-gray-300 mr-3 ml-2" />
                    <input 
                        type="text" 
                        placeholder="Rechercher client, facture, plat..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 py-2 outline-none text-gray-700 font-medium"
                    />
                </div>

                {demandes.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                        <Soup size={60} className="mx-auto text-gray-100 mb-4"/>
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Rien à préparer pour le moment.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-700">
                            {currentDemandes.map(demande => (
                                <APreparerCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} />
                            ))}
                        </div>

                        <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-6">
                            {pageCount > 1 && (
                                <div className="flex items-center gap-4 bg-white px-6 py-2 rounded-2xl shadow-sm border border-gray-100">
                                    <span className="text-xs font-black text-gray-400 uppercase">Page {currentPage + 1} / {pageCount}</span>
                                    <ReactPaginate
                                        previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick}
                                        containerClassName={'flex gap-2'}
                                        pageLinkClassName={'hidden'}
                                        activeClassName={'hidden'}
                                        previousLinkClassName={'p-2 bg-gray-50 rounded-lg hover:bg-gray-100 block font-black'}
                                        nextLinkClassName={'p-2 bg-gray-50 rounded-lg hover:bg-gray-100 block font-black'}
                                    />
                                </div>
                            )}
                        </div>
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