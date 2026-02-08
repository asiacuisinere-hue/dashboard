import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import { 
    User, MapPin, Calendar, 
    ChefHat, Truck, Star, RefreshCw, 
    CheckCircle2, Mail, Phone, 
    ClipboardList, ArrowRight, Bell, MailX
} from 'lucide-react';

const DetailsRenderer = ({ details }) => {
    if (!details) return null;

    if (details.items && Array.isArray(details.items)) {
        const total = details.total || details.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
        return (
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <ul className="space-y-2 mb-4">
                    {details.items.map((item, index) => (
                        <li key={index} className="flex justify-between text-sm text-gray-600 font-medium">
                            <span>{item.quantity} x {item.name} <span className="opacity-50 text-[10px]">({item.portion})</span></span>
                            <span className="font-bold text-gray-800">{(item.quantity * item.price).toFixed(2)} €</span>
                        </li>
                    ))}
                </ul>
                <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Commande</span>
                    <span className="text-lg font-black text-amber-600">{parseFloat(total).toFixed(2)} €</span>
                </div>
            </div>
        );
    }

    const keyMap = {
        customerType: 'Client', serviceType: 'Service', numberOfPeople: 'Couverts',
        customerMessage: 'Message', formulaName: 'Formule', formulaOption: 'Option',
        deliveryCity: 'Ville', formula: 'Abonnement', notes: 'Notes Client'
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(details).map(([key, value]) => {
                if (!value || key === 'items' || key === 'total') return null;
                return (
                    <div key={key} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{keyMap[key] || key}</p>
                        <p className="text-xs font-bold text-gray-700 truncate">{String(value)}</p>
                    </div>
                );
            })}
        </div>
    );
};

const DemandeModal = ({ demande, onClose, onUpdate, themeColor }) => {
    if (!demande) return null;

    const handleUpdateStatus = async (newStatus) => {
        const { error } = await supabase.from('demandes').update({ status: newStatus }).eq('id', demande.id);
        if (!error) {
            alert(`Statut mis à jour : ${newStatus}`);
            onUpdate();
            onClose();
        } else alert(error.message);
    };

    const handleRefuse = async () => {
        if (!window.confirm("Confirmer le refus et l'envoi de l'email automatique ?")) return;
        const { error } = await supabase.from('demandes').update({ status: 'Refusée' }).eq('id', demande.id);
        if (!error) {
            fetch('https://www.asiacuisine.re/send-refusal-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id })
            });
            onUpdate();
            onClose();
        }
    };

    const client = demande.clients || demande.entreprises;
    // Fix: Handle null names
    const clientName = demande.clients 
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim() 
        : (demande.entreprises?.nom_entreprise || 'Inconnu');

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>
                
                <div className="mb-10 flex items-center gap-4">
                    <div className={`p-4 rounded-3xl bg-${themeColor}-50 text-${themeColor}-600 shadow-sm border border-${themeColor}-100`}>
                        <Bell size={32}/>
                    </div>
                    <div>
                        <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 inline-block">Nouvelle Demande</span>
                        <h2 className="text-3xl font-black text-gray-800 leading-none">{clientName}</h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4 text-sm">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><User size={14}/> Contact</h3>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-2">
                            <p className="font-bold text-gray-700 flex items-center gap-2"><Mail size={14} className="opacity-40"/> {client.email || client.contact_email}</p>
                            <p className="font-bold text-gray-700 flex items-center gap-2"><Phone size={14} className="opacity-40"/> {client.phone || client.contact_phone || '—'}</p>
                        </div>
                    </div>
                    <div className="space-y-4 text-sm">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2"><Calendar size={14}/> Échéance</h3>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                            <p className="text-lg font-black text-gray-800 uppercase">{new Date(demande.request_date).toLocaleDateString('fr-FR', {weekday: 'long', day:'numeric', month:'long'})}</p>
                            <p className="text-xs font-bold text-gray-400 mt-1">Type: {demande.type.replace('_', ' ')}</p>
                        </div>
                    </div>
                </div>

                <div className="mb-10">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><ClipboardList size={14}/> Détails du projet</h3>
                    <DetailsRenderer details={demande.details_json} />
                </div>

                <div className="flex flex-wrap gap-4 pt-8 border-t">
                    <button onClick={() => handleUpdateStatus('En attente de traitement')} className={`flex-1 py-5 rounded-[2rem] text-white font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
                        <CheckCircle2 size={24}/> ACCEPTER LA DEMANDE
                    </button>
                    <button onClick={handleRefuse} className="px-10 py-5 bg-red-50 text-red-600 rounded-[2rem] font-black shadow-md hover:bg-red-100 transition-all active:scale-95 flex items-center gap-3">
                        <MailX size={20}/> REFUSER
                    </button>
                </div>
            </div>
        </div>
    );
};

const DemandeCard = ({ demande, onSelect, themeColor }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': <ChefHat className="text-amber-500" />,
        'COMMANDE_MENU': <Truck className="text-blue-500" />,
        'COMMANDE_SPECIALE': <Star className="text-purple-500" />,
        'SOUSCRIPTION_ABONNEMENT': <RefreshCw className="text-green-500" />
    };

    // Fix: Handle null names
    const clientName = demande.clients 
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim() 
        : (demande.entreprises?.nom_entreprise || 'Inconnu');

    return (
        <div className={`bg-white rounded-[2.5rem] shadow-sm border-t-4 p-8 mb-4 hover:shadow-lg transition-all relative overflow-hidden group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
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
                <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">Nouvelle</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Souhaitée</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><Calendar size={12}/> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 group-hover:bg-white transition-colors">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Ville</p>
                    <p className="text-xs font-black text-gray-700 flex items-center gap-2"><MapPin size={12}/> {demande.details_json?.deliveryCity || '—'}</p>
                </div>
            </div>

            <button onClick={() => onSelect(demande)} className={`w-full py-4 rounded-2xl text-white font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
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
        const { data, error } = await supabase.from('demandes').select('*, clients (*), entreprises (*)').eq('status', 'Nouvelle').eq('business_unit', businessUnit).order('created_at', { ascending: false });
        if (!error) setDemandes(data || []);
        setLoading(false);
    }, [businessUnit]);

    useEffect(() => { fetchDemandes(); }, [fetchDemandes]);

    if (loading && demandes.length === 0) return <div className="p-6 text-center py-20 flex flex-col items-center gap-4"><RefreshCw className="animate-spin text-amber-500" size={40}/><p className="text-gray-400 font-bold">Réception des nouvelles demandes...</p></div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-10">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Boîte de Réception</h1>
                    <p className="text-gray-500 font-medium italic">Traitement des nouvelles demandes entrantes ({businessUnit}).</p>
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

            {selectedDemande && <DemandeModal demande={selectedDemande} onClose={() => setSelectedDemande(null)} onUpdate={fetchDemandes} themeColor={themeColor} />}
        </div>
    );
};

export default Demandes;
