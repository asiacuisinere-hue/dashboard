import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import DemandeDetail from './DemandeDetail'; // Use the full complete component
import {
    MapPin, Calendar,
    ChefHat, Truck, Star, RefreshCw,
    CheckCircle2, Mail,
    ArrowRight
} from 'lucide-react';

const DemandeCard = ({ demande, onSelect, themeColor }) => {
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

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative overflow-hidden group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'} ${isDraft ? 'opacity-75 grayscale-[0.5]' : ''}`}>
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center shadow-inner group-hover:bg-white transition-colors border border-gray-100">
                        {typeIcons[demande.type] || <Mail />}
                    </div>
                    <div>
                        <h3 className="font-black text-gray-800 text-xl leading-tight">{clientName}</h3>  
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Reçue le {new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${isDraft ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {isDraft ? 'Intention WhatsApp' : 'Nouvelle'}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Souhaitée</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ville</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><MapPin size={12}/> {demande.details_json?.deliveryCity || demande.details_json?.ville || '—'}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${isDraft ? 'bg-gray-400' : (themeColor === 'blue' ? 'bg-blue-600' : 'bg-amber-500')}`}>
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
    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        // FETCH BOTH: Validated (Nouvelle) AND Drafts (Intention WhatsApp)
        const { data, error } = await supabase
            .from('demandes')
            .select('*, clients (*), entreprises (*)')
            .in('status', ['Nouvelle', 'Intention WhatsApp', 'En attente de traitement'])
            .eq('business_unit', businessUnit)
            .order('created_at', { ascending: false });

        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [businessUnit]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    const handleUpdateStatus = async (id, s) => {
        await supabase.from('demandes').update({ status: s }).eq('id', id);
        fetchDemandes();
        setSelectedDemande(null);
    };

    if (loading && demandes.length === 0) return <div className="p-6 text-center py-20 flex flex-col items-center gap-4"><RefreshCw className="animate-spin text-amber-500" size={40}/><p className="text-gray-400 font-bold">Réception des nouvelles demandes...</p></div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Boîte de Réception</h1>      
                    <p className="text-gray-500 font-medium italic">Traitement des intentions et nouvelles demandes ({businessUnit}).</p>
                </div>

                {demandes.length === 0 ? (
                    <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200 animate-in fade-in duration-700">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={40} className="text-gray-200"/></div>
                        <h2 className="text-2xl font-black text-gray-300 uppercase tracking-widest">Tout est à jour !</h2>
                        <p className="text-gray-400 font-medium mt-2">Aucune nouvelle demande pour le moment.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {demandes.map(demande => (
                            <DemandeCard key={demande.id} demande={demande} onSelect={setSelectedDemande} themeColor={themeColor} />
                        ))}
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
