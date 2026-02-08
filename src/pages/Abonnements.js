import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    Calendar, Clock, CreditCard, RefreshCw, AlertTriangle, 
    PauseCircle, PlayCircle, XCircle, Search 
} from 'lucide-react';

const getFrenchStatus = (status) => {
    switch (status) {
        case 'actif': return 'Actif';
        case 'en_pause': return 'En pause';
        case 'termine': return 'Terminé';
        case 'en_attente': return 'En attente';
        default: return status;
    }
};

const statusBadgeStyle = (status) => {
    const colors = { 
        'actif': { bg: 'rgba(40, 167, 69, 0.1)', text: '#28a745' }, 
        'en_pause': { bg: 'rgba(212, 175, 55, 0.1)', text: '#d4af37' }, 
        'termine': { bg: 'rgba(108, 117, 125, 0.1)', text: '#6c757d' },
        'en_attente': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' }
    };
    const style = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return { 
        backgroundColor: style.bg, 
        color: style.text, 
        padding: '4px 12px', 
        borderRadius: '20px', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        textTransform: 'uppercase' 
    };
};

const SubscriptionCard = ({ sub, onSelect, onInvoice, isGenerating, renderCustomerName, themeColor }) => {
    const hasPrice = sub.monthly_price && sub.monthly_price > 0;
    
    return (
        <div className={`bg-white rounded-3xl shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 ${themeColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                        <RefreshCw size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-lg">{renderCustomerName(sub)}</h3>
                        <p className="text-xs text-gray-400 font-medium">Formule : {sub.formule_base || 'Standard'}</p>
                    </div>
                </div>
                <span style={statusBadgeStyle(sub.status)}>{getFrenchStatus(sub.status)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Mensualité</p>
                    {hasPrice ? (
                        <p className="text-gray-800 font-black text-xl">{sub.monthly_price.toFixed(2)} €</p>
                    ) : (
                        <p className="text-red-500 font-bold text-xs flex items-center gap-1"><AlertTriangle size={12}/> À définir</p>
                    )}
                </div>
                <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Prochain RDV</p>
                    <p className="text-gray-700 font-bold text-sm flex items-center gap-1.5">
                        <Calendar size={12} /> {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString('fr-FR') : 'Non planifié'}
                    </p>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={() => onSelect(sub)}
                    className="flex-1 bg-gray-100 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-200 transition-all text-sm"
                >
                    Détails
                </button>
                {sub.status === 'actif' && (
                    <button
                        onClick={() => onInvoice(sub.id)}
                        disabled={isGenerating === sub.id}
                        className={`flex-[2] text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${!hasPrice ? 'bg-red-400 cursor-not-allowed' : (themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700')}`}
                    >
                        {isGenerating === sub.id ? <RefreshCw size={16} className="animate-spin" /> : <CreditCard size={16} />}
                        {hasPrice ? `Facturer ${sub.monthly_price}€` : 'Prix requis'}
                    </button>
                )}
            </div>
        </div>
    );
};

const Abonnements = () => {
    const { businessUnit } = useBusinessUnit();
    const [abonnements, setAbonnements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('actif'); // 'actif', 'attention', 'all'
    const [selectedSub, setSelectedSub] = useState(null);
    const [isGenerating, setIsGenerating] = useState(null);

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchAbonnements = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('abonnements').select(`
            *,
            clients (first_name, last_name, email, phone),
            entreprises (nom_entreprise, contact_name, contact_email, contact_phone)
        `).eq('business_unit', businessUnit);

        if (activeTab === 'actif') query = query.eq('status', 'actif');
        else if (activeTab === 'attention') query = query.or('monthly_price.is.null,monthly_price.lte.0');

        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error) setAbonnements(data || []);
        setLoading(false);
    }, [businessUnit, activeTab]);

    useEffect(() => { fetchAbonnements(); }, [fetchAbonnements]);

    const handleGenerateInvoice = async (id) => {
        const sub = abonnements.find(a => a.id === id);
        if (!sub?.monthly_price) return alert("Veuillez définir un prix.");
        if (!window.confirm(`Générer la facture mensuelle ?`)) return;

        setIsGenerating(id);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/generate-recurring-invoice`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                body: JSON.stringify({ abonnementId: id }),
            });
            if (!response.ok) throw new Error("Erreur serveur");
            alert('Facture générée !');
            fetchAbonnements();
        } catch (e) { alert(e.message); }
        finally { setIsGenerating(null); }
    };

    const handleUpdateSub = async (id, updates) => {
        const { error } = await supabase.from('abonnements').update(updates).eq('id', id);
        if (!error) {
            alert('Mise à jour réussie');
            fetchAbonnements();
            setSelectedSub(null);
        } else alert(error.message);
    };

    const renderCustomerName = (sub) => {
        if (sub.clients) return `${sub.clients.last_name} ${sub.clients.first_name || ''}`.trim();
        if (sub.entreprises) return sub.entreprises.nom_entreprise;
        return 'N/A';
    };

    const filteredSubs = abonnements.filter(s => 
        renderCustomerName(s).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.id.substring(0,8).includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Abonnements</h1>
                    <p className="text-gray-600">Pilotez vos contrats récurrents pour l'unité {businessUnit}.</p>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 max-w-lg">
                    <button onClick={() => setActiveTab('actif')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'actif' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Actifs</button>
                    <button onClick={() => setActiveTab('attention')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'attention' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>À définir</button>
                    <button onClick={() => setActiveTab('all')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Tous</button>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex items-center">
                    <Search size={18} className="text-gray-400 mr-3 ml-2" />
                    <input type="text" placeholder="Rechercher un client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 py-2 outline-none text-gray-700" />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>
                ) : filteredSubs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Clock size={48} className="mx-auto text-gray-200 mb-4"/>
                        <p className="text-gray-500">Aucun abonnement trouvé.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700">
                        {filteredSubs.map(sub => (
                            <SubscriptionCard 
                                key={sub.id} sub={sub} 
                                onSelect={setSelectedSub} 
                                onInvoice={handleGenerateInvoice}
                                isGenerating={isGenerating}
                                renderCustomerName={renderCustomerName}
                                themeColor={themeColor}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedSub && <SubDetailModal sub={selectedSub} onClose={() => setSelectedSub(null)} onUpdate={handleUpdateSub} themeColor={themeColor} />}
        </div>
    );
};

const SubDetailModal = ({ sub, onClose, onUpdate, themeColor }) => {
    const [form, setForm] = useState({...sub});

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>
                
                <div className="mb-10">
                    <span style={statusBadgeStyle(sub.status)} className="mb-3 inline-block">{getFrenchStatus(sub.status)}</span>
                    <h2 className="text-3xl font-black text-gray-800">Contrat #{sub.id.substring(0, 8)}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                        <h3 className={`text-xs font-black uppercase tracking-widest opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Client</h3>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100">
                            <p className="font-bold text-gray-900 text-lg">{sub.clients ? `${sub.clients.first_name} ${sub.clients.last_name}` : sub.entreprises?.nom_entreprise}</p>
                            <p className="text-gray-500 text-sm mt-1">{sub.clients?.email || sub.entreprises?.contact_email}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className={`text-xs font-black uppercase tracking-widest opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Paramètres Financiers</h3>
                        <div className="space-y-3">
                            <label className="block">
                                <span className="text-xs font-bold text-gray-400 ml-2">PRIX MENSUEL (€)</span>
                                <input type="number" value={form.monthly_price || ''} onChange={e => setForm({...form, monthly_price: parseFloat(e.target.value)})} className="w-full mt-1 p-3 bg-gray-50 border-0 rounded-2xl font-black text-lg focus:ring-2 focus:ring-amber-500" />
                            </label>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-10">
                    <label>
                        <span className="text-xs font-bold text-gray-400 ml-2">DATE DÉBUT</span>
                        <input type="date" value={form.start_date || ''} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full mt-1 p-3 bg-gray-50 border-0 rounded-2xl" />
                    </label>
                    <label>
                        <span className="text-xs font-bold text-gray-400 ml-2">PROCHAINE FACTURE</span>
                        <input type="date" value={form.next_billing_date || ''} onChange={e => setForm({...form, next_billing_date: e.target.value})} className="w-full mt-1 p-3 bg-gray-50 border-0 rounded-2xl" />
                    </label>
                </div>

                <div className="mb-10">
                    <label className="text-xs font-bold text-gray-400 ml-2">NOTES INTERNES</label>
                    <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="w-full mt-1 p-4 bg-gray-50 border-0 rounded-3xl h-24" placeholder="Détails de la prestation récurrente..." />
                </div>

                <div className="flex flex-wrap gap-3 justify-end border-t pt-8">
                    <div className="flex-1 flex gap-2">
                        {sub.status === 'actif' && <button onClick={() => onUpdate(sub.id, {status: 'en_pause'})} className="p-3 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"><PauseCircle /></button>}
                        {sub.status === 'en_pause' && <button onClick={() => onUpdate(sub.id, {status: 'actif'})} className="p-3 rounded-xl bg-green-50 text-green-600 hover:bg-green-100 transition-all"><PlayCircle /></button>}
                        <button onClick={() => onUpdate(sub.id, {status: 'termine'})} className="p-3 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"><XCircle /></button>
                    </div>
                    <button onClick={() => onUpdate(sub.id, form)} className="px-8 py-4 bg-gray-800 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95">Enregistrer les modifications</button>
                </div>
            </div>
        </div>
    );
};

export default Abonnements;