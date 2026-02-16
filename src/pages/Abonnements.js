import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
        Calendar, Clock, CreditCard, RefreshCw, AlertTriangle,
        PauseCircle, PlayCircle, XCircle, Search,
        Save, Printer, ClipboardCheck, Share2, User
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
                    Détails & Suivi
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
    const [activeTab, setActiveTab] = useState('actif'); 
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
            <div className="max-w-7xl mx-auto no-print">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800 mb-2">Gestion des Abonnements</h1>    
                    <p className="text-gray-600 font-medium">Pilotez vos contrats récurrents et le suivi nutritionnel.</p>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1 rounded-2xl mb-8 max-w-lg">
                    <button onClick={() => setActiveTab('actif')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'actif' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Actifs</button>
                    <button onClick={() => setActiveTab('attention')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'attention' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>À définir</button>
                    <button onClick={() => setActiveTab('all')} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Tous</button>
                </div>

                <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-8 flex items-center">
                    <Search size={18} className="text-gray-400 mr-3 ml-2" />
                    <input type="text" placeholder="Rechercher un client..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 py-2 outline-none text-gray-700 font-medium" />
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>
                ) : filteredSubs.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                        <Clock size={48} className="mx-auto text-gray-200 mb-4"/>
                        <p className="text-gray-500 font-bold">Aucun abonnement trouvé.</p>
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

            {selectedSub && (
                <SubDetailModal 
                    sub={selectedSub} 
                    onClose={() => setSelectedSub(null)} 
                    onUpdate={handleUpdateSub} 
                    themeColor={themeColor} 
                    customerName={renderCustomerName(selectedSub)}
                />
            )}
        </div>
    );
};

const SubDetailModal = ({ sub, onClose, onUpdate, themeColor, customerName }) => {
    const [modalTab, setModalTab] = useState('admin'); 
    const [form, setForm] = useState({...sub});
    const [suiviChef, setSuiviChef] = useState([]);
    const [journalClient, setJournalClient] = useState([]);
    
    const [newSuivi, setNewSuivi] = useState({
        date_suivi: new Date().toISOString().split('T')[0],
        proteine_nom: '', proteine_poids: '',
        feculent_nom: '', feculent_poids: '',
        legumes_detail: '', note_chef: '',
        humeur_energie: 3
    });

    const fetchData = useCallback(async () => {
        const { data: chefData } = await supabase.from('abonnement_suivi').select('*').eq('abonnement_id', sub.id).order('date_suivi', { ascending: false });
        setSuiviChef(chefData || []);
        const { data: clientData } = await supabase.from('abonnement_journal_client').select('*').eq('abonnement_id', sub.id).order('date_saisie', { ascending: false });
        setJournalClient(clientData || []);
    }, [sub.id]);

    useEffect(() => {
        if (modalTab !== 'admin') fetchData();
    }, [modalTab, fetchData]);

    const handleAddSuivi = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('abonnement_suivi').insert([{
            ...newSuivi,
            abonnement_id: sub.id,
            proteine_poids: parseInt(newSuivi.proteine_poids || 0),
            feculent_poids: parseInt(newSuivi.feculent_poids || 0)
        }]);
        if (!error) {
            setNewSuivi({ date_suivi: new Date().toISOString().split('T')[0], proteine_nom: '', proteine_poids: '', feculent_nom: '', feculent_poids: '', legumes_detail: '', note_chef: '', humeur_energie: 3 });
            fetchData();
        } else alert(error.message);
    };

    const handleShareLink = () => {
        const url = `https://www.asiacuisine.re/mon-suivi?key=${sub.tracking_token}`;
        const phone = sub.clients?.phone || sub.entreprises?.contact_phone || "";
        const message = `Bonjour ${customerName}, voici votre lien personnel pour votre journal de suivi nutritionnel : ${url}\n\nVous pourrez y noter vos repas et vos sensations au quotidien.`;
        const waUrl = `https://wa.me/${phone.replace(/\s/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');
    };

    const handlePrint = () => { window.print(); };

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-8 md:p-12 shadow-2xl animate-in zoom-in duration-300 no-print">
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6">
                    <div>
                        <span style={statusBadgeStyle(sub.status)} className="mb-2 inline-block">{getFrenchStatus(sub.status)}</span>
                        <h2 className="text-3xl font-black text-gray-800">{customerName}</h2>
                        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-1">Contrat #{sub.id.substring(0, 8)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 bg-gray-200 p-1.5 rounded-[1.5rem] shadow-inner">
                        <button onClick={() => setModalTab('admin')} className={`px-6 py-3 rounded-[1.2rem] text-[10px] font-black transition-all ${modalTab === 'admin' ? 'bg-white text-gray-800 shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>⚙️ ADMIN</button>
                        <button onClick={() => setModalTab('suivi')} className={`px-6 py-3 rounded-[1.2rem] text-[10px] font-black transition-all ${modalTab === 'suivi' ? 'bg-amber-500 text-white shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>📊 CHEF</button>
                        <button onClick={() => setModalTab('client')} className={`px-6 py-3 rounded-[1.2rem] text-[10px] font-black transition-all ${modalTab === 'client' ? 'bg-blue-600 text-white shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}>👤 CLIENT</button>
                    </div>
                    <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
                </div>

                {modalTab === 'admin' && (
                    <div className="animate-in fade-in space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Identité & Contact</h3>
                                <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100 relative group">
                                    <button onClick={handleShareLink} className="absolute top-4 right-4 p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-all border border-green-100" title="Envoyer lien de suivi"><Share2 size={16}/></button>
                                    <p className="font-black text-gray-900 text-xl">{customerName}</p>
                                    <p className="text-gray-500 font-bold text-sm mt-1">{sub.clients?.email || sub.entreprises?.contact_email}</p>
                                    <p className="text-gray-500 font-bold text-sm">{sub.clients?.phone || sub.entreprises?.contact_phone}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Clé de suivi</p>
                                        <code className="text-[9px] text-gray-400 font-mono block truncate">{sub.tracking_token || 'Non généré'}</code>
                                    </div>
                                </div>
                                <div>
                                    <label className="block"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">PRIX MENSUEL (€)</span>
                                        <div className="relative mt-1">
                                            <input type="number" value={form.monthly_price || ''} onChange={e => setForm({...form, monthly_price: parseFloat(e.target.value)})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl pl-10" />
                                            <CreditCard className="absolute left-3 top-4 text-gray-300" size={20}/>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Planning</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <label className="block"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">DATE DÉBUT</span><input type="date" value={form.start_date || ''} onChange={e => setForm({...form, start_date: e.target.value})} className="w-full mt-1 p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></label>
                                    <label className="block"><span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 text-red-500">PROCHAINE FACTURE</span><input type="date" value={form.next_billing_date || ''} onChange={e => setForm({...form, next_billing_date: e.target.value})} className="w-full mt-1 p-4 bg-gray-50 border-0 rounded-2xl font-black text-red-600" /></label>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">NOTES INTERNES / PRÉFÉRENCES</label>
                            <textarea value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} className="w-full mt-1 p-5 bg-gray-50 border-0 rounded-[2rem] font-medium h-32 focus:ring-2 focus:ring-gray-200" placeholder="Ex: Pas de piment, Allergies..." />
                        </div>
                        <div className="flex flex-wrap gap-3 justify-end border-t pt-8">
                            <div className="flex-1 flex gap-2">
                                {sub.status === 'actif' && <button onClick={() => onUpdate(sub.id, {status: 'en_pause'})} className="p-4 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 transition-all"><PauseCircle /></button>}
                                {sub.status === 'en_pause' && <button onClick={() => onUpdate(sub.id, {status: 'actif'})} className="p-4 rounded-2xl bg-green-50 text-green-600 hover:bg-green-100 transition-all"><PlayCircle /></button>}
                                <button onClick={() => onUpdate(sub.id, {status: 'termine'})} className="p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-all"><XCircle /></button>
                            </div>
                            <button onClick={() => onUpdate(sub.id, form)} className="px-10 py-4 bg-gray-800 text-white rounded-[1.5rem] font-black shadow-lg hover:bg-black transition-all active:scale-95 flex items-center gap-2"><Save size={20}/> ENREGISTRER MODIFICATIONS</button>
                        </div>
                    </div>
                )}

                {modalTab === 'suivi' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="bg-amber-50/30 p-8 rounded-[2.5rem] border border-amber-100">
                            <h3 className="text-sm font-black text-amber-800 mb-6 flex items-center gap-2"><ClipboardCheck/> Saisie des préparations du Chef</h3>
                            <form onSubmit={handleAddSuivi} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Date</label><input type="date" value={newSuivi.date_suivi} onChange={e => setNewSuivi({...newSuivi, date_suivi: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" required /></div>
                                    <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Énergie / Humeur (1-5)</label><input type="range" min="1" max="5" value={newSuivi.humeur_energie} onChange={e => setNewSuivi({...newSuivi, humeur_energie: parseInt(e.target.value)})} className="w-full accent-amber-500" /></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Protéine</label><input type="text" placeholder="Poulet..." value={newSuivi.proteine_nom} onChange={e => setNewSuivi({...newSuivi, proteine_nom: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                            <div className="w-24"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Poids (g)</label><input type="number" value={newSuivi.proteine_poids} onChange={e => setNewSuivi({...newSuivi, proteine_poids: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-black shadow-sm text-center" /></div>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Féculent</label><input type="text" placeholder="Riz..." value={newSuivi.feculent_nom} onChange={e => setNewSuivi({...newSuivi, feculent_nom: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                            <div className="w-24"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Poids (g)</label><input type="number" value={newSuivi.feculent_poids} onChange={e => setNewSuivi({...newSuivi, feculent_poids: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl font-black shadow-sm text-center" /></div>
                                        </div>
                                    </div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Légumes & Accompagnements</label><textarea value={newSuivi.legumes_detail} onChange={e => setNewSuivi({...newSuivi, legumes_detail: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl shadow-sm h-[108px]" placeholder="Détails légumes..." /></div>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-1">Note du Chef pour le client</label><textarea value={newSuivi.note_chef} onChange={e => setNewSuivi({...newSuivi, note_chef: e.target.value})} className="w-full p-3 bg-white border-0 rounded-xl shadow-sm h-20" placeholder="Message..." /></div>
                                    <div className="flex items-end"><button type="submit" className="bg-amber-500 text-white px-8 py-4 rounded-xl font-black shadow-md hover:bg-amber-600 transition-all uppercase text-xs">Enregistrer pesée</button></div>
                                </div>
                            </form>
                        </div>
                        <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black text-gray-800">Historique des pesées</h3><button onClick={handlePrint} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-800 uppercase"><Printer size={16}/> Imprimer carnet</button></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {suiviChef.map(entry => (
                                <div key={entry.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="font-black text-gray-800">{new Date(entry.date_suivi).toLocaleDateString('fr-FR')}</p>
                                        <div className="flex gap-1">
                                            {[...Array(5)].map((_, i) => <div key={i} className={`w-2 h-2 rounded-full ${i < entry.humeur_energie ? 'bg-amber-400' : 'bg-gray-100'}`}></div>)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-gray-600 border-t pt-3">
                                        <span>🍖 {entry.proteine_poids}g {entry.proteine_nom}</span>
                                        <span>🍚 {entry.feculent_poids}g {entry.feculent_nom}</span>
                                    </div>
                                    {entry.note_chef && <p className="mt-3 text-[10px] text-gray-400 italic">Chef: {entry.note_chef}</p>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {modalTab === 'client' && (
                    <div className="space-y-8 animate-in fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-800">Retours du Client (Journal interactif)</h3>
                            <button onClick={handleShareLink} className="p-4 bg-blue-50 text-blue-600 rounded-2xl hover:bg-blue-100 transition-all flex items-center gap-2 font-black text-xs uppercase tracking-widest border border-blue-100 shadow-sm"><Share2 size={18}/> Partager lien</button>
                        </div>
                        {journalClient.length === 0 ? (
                            <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200"><User size={40} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-400 font-bold italic">Aucune saisie client.</p></div>
                        ) : (
                            <div className="space-y-4">
                                {journalClient.map(entry => (
                                    <div key={entry.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-start mb-6">
                                            <div><p className="font-black text-gray-800 text-lg">{new Date(entry.date_saisie).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'})}</p><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Saisie client</p></div>
                                            {entry.poids_actuel && <div className="bg-blue-50 px-4 py-2 rounded-xl text-blue-700 font-black text-xl border border-blue-100">{entry.poids_actuel} <span className="text-xs">kg</span></div>}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2 text-center">Satiété & Énergie</p>
                                                    <div className="flex justify-center gap-4">
                                                        <div className="flex flex-col items-center"><div className="flex gap-1">{[1,2,3,4,5].map(n => <div key={n} className={`w-2 h-2 rounded-full ${n <= entry.niveau_satiete ? 'bg-green-500' : 'bg-gray-200'}`}></div>)}</div><span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Faim</span></div>
                                                        <div className="flex flex-col items-center"><div className="flex gap-1">{[1,2,3,4,5].map(n => <div key={n} className={`w-2 h-2 rounded-full ${n <= entry.energie_ressentie ? 'bg-orange-500' : 'bg-gray-200'}`}></div>)}</div><span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Énergie</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col justify-center italic text-sm text-gray-600 leading-relaxed">"{entry.repas_contenu}" {entry.notes_client && <p className="mt-2 text-xs text-gray-400 border-t pt-2">{entry.notes_client}</p>}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="print-visible-only">
                <div style={{ padding: '40px', fontFamily: 'sans-serif', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid black', paddingBottom: '20px', marginBottom: '40px' }}>
                        <div><h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0 }}>JOURNAL DE BORD</h1><p style={{ fontWeight: 'bold', color: '#666' }}>SUIVI DIÉTÉTIQUE - ASIACUISINE.RE</p></div>
                        <div style={{ textAlign: 'right' }}><h2 style={{ fontSize: '24px', fontWeight: '900', margin: 0 }}>{customerName}</h2><p>Contrat : #{sub.id.substring(0,8)}</p></div>
                    </div>
                    {suiviChef.map(entry => (
                        <div key={entry.id} style={{ borderBottom: '1px solid #eee', padding: '20px 0', pageBreakInside: 'avoid' }}>
                            <p style={{ fontWeight: '900', fontSize: '18px', marginBottom: '10px' }}>{new Date(entry.date_suivi).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'})}</p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div><p><strong>PROTÉINES :</strong> {entry.proteine_poids}g ({entry.proteine_nom})</p><p><strong>FÉCULENTS :</strong> {entry.feculent_poids}g ({entry.feculent_nom})</p></div>
                                <div><p><strong>LÉGUMES :</strong> {entry.legumes_detail || 'N/A'}</p><p style={{ fontSize: '13px', fontStyle: 'italic', color: '#666' }}><strong>NOTE CHEF :</strong> {entry.note_chef || '-'}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .print-visible-only { display: none; }
                @media print {
                    @page { size: A4; margin: 1cm; }
                    body * { visibility: hidden !important; }
                    .print-visible-only, .print-visible-only * { visibility: visible !important; }
                    .print-visible-only { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
                    .no-print, aside, nav, header { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Abonnements;
