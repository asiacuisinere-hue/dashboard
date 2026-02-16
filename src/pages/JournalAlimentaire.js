import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import {
    ClipboardList, Users, Star, MessageCircle,
    ArrowUpCircle, ArrowDownCircle, Save, History,
    CheckCircle2, Info, Printer
} from 'lucide-react';

const JournalAlimentaire = () => {
    const [subscribers, setSubs] = useState([]);
    const [selectedSub, setSelectedSub] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Formulaire de saisie
    const [newLog, setNewLog] = useState({
        dish_name: '',
        client_rating: 5,
        client_feedback: '',
        chef_notes: '',
        protein_adj: 0,
        starch_adj: 0
    });

    const fetchSubscribers = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('abonnements')
            .select(`
                id,
                formule_base,
                client_id,
                clients (id, first_name, last_name)
            `)
            .eq('status', 'actif');

        if (!error) setSubs(data || []);
        setLoading(false);
    }, []);

    const fetchLogs = useCallback(async (subId) => {
        const { data, error } = await supabase
            .from('dietary_logs')
            .select('*')
            .eq('subscription_id', subId)
            .order('log_date', { ascending: false });

        if (!error) setLogs(data || []);
    }, []);

    useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

    const handleSelectSub = (sub) => {
        setSelectedSub(sub);
        fetchLogs(sub.id);
    };

    const handleSaveLog = async (e) => {
        e.preventDefault();
        if (!selectedSub) return;
        
        setIsSaving(true);
        try {
            const { error } = await supabase.from('dietary_logs').insert([{
                subscription_id: selectedSub.id,
                log_date: new Date().toISOString().split('T')[0],
                dish_name: newLog.dish_name,
                client_rating: newLog.client_rating,
                client_feedback: newLog.client_feedback,
                chef_notes: newLog.chef_notes,
                macro_adjustments: {
                    protein: newLog.protein_adj,
                    starch: newLog.starch_adj
                }
            }]);

            if (error) throw error;

            setNewLog({
                dish_name: '',
                client_rating: 5,
                client_feedback: '',
                chef_notes: '',
                protein_adj: 0,
                starch_adj: 0
            });
            fetchLogs(selectedSub.id);
        } catch (err) {
            alert("Erreur lors de l'enregistrement : " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const latestLog = logs[0]; // Le log le plus récent pour l'impression

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto no-print">
                <div className="mb-8 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Suivi & Journal Alimentaire</h1>
                        <p className="text-gray-500 font-medium italic">Ajustez la nutrition de vos abonnés en fonction de leurs retours.</p>
                    </div>
                    {selectedSub && logs.length > 0 && (
                        <button onClick={handlePrint} className="bg-white text-gray-800 px-6 py-3 rounded-2xl font-black shadow-sm border border-gray-100 hover:bg-gray-50 transition-all flex items-center gap-2"> 
                            <Printer size={18}/> IMPRIMER FICHE SUIVI
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* LISTE DES ABONNÉS */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">    
                            <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Users size={16}/> Abonnés Actifs</h2>
                            <div className="space-y-3">
                                {subscribers.map(sub => (
                                    <button
                                        key={sub.id}
                                        onClick={() => handleSelectSub(sub)}
                                        className={`w-full p-4 rounded-2xl text-left transition-all border ${selectedSub?.id === sub.id ? 'bg-amber-500 border-amber-600 text-white shadow-lg scale-[1.02]' : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-white'}`}
                                    >
                                        <p className="font-black leading-tight">{sub.clients?.first_name} {sub.clients?.last_name}</p>
                                        <p className={`text-[10px] uppercase font-bold mt-1 ${selectedSub?.id === sub.id ? 'text-amber-100' : 'text-gray-400'}`}>{sub.formula_name}</p>
                                    </button>
                                ))}
                                {subscribers.length === 0 && !loading && <p className="text-center py-8 text-gray-400 text-xs italic">Aucun abonné actif.</p>}
                            </div>
                        </div>
                    </div>

                    {/* JOURNAL & SAISIE */}
                    <div className="lg:col-span-8 space-y-8">
                        {!selectedSub ? (
                            <div className="bg-white/50 border-2 border-dashed border-gray-200 rounded-[3rem] p-20 text-center">
                                <div className="w-20 h-20 bg-gray-100 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6"><ClipboardList size={40}/></div>
                                <p className="text-gray-400 font-bold">Sélectionnez un abonné pour ouvrir son journal</p>
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                                {/* FORMULAIRE DE SAISIE */}
                                <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><MessageCircle className="text-amber-500"/> Nouveau compte-rendu</h2>
                                    <form onSubmit={handleSaveLog} className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Plat concerné</label>
                                                <input required type="text" value={newLog.dish_name} onChange={e => setNewLog({...newLog, dish_name: e.target.value})} placeholder="Ex: Sauté de porc" className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Note du client (1-5)</label>
                                                <div className="flex gap-2">
                                                    {[1,2,3,4,5].map(num => (
                                                        <button key={num} type="button" onClick={() => setNewLog({...newLog, client_rating: num})} className={`flex-1 py-3 rounded-xl font-black transition-all ${newLog.client_rating >= num ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>{num}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Retour du client</label>
                                                <textarea value={newLog.client_feedback} onChange={e => setNewLog({...newLog, client_feedback: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl h-32 text-sm font-medium" placeholder="Comment il a trouvé le plat, sa satiété, son énergie..." /> 
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Analyse du Chef</label>
                                                <textarea value={newLog.chef_notes} onChange={e => setNewLog({...newLog, chef_notes: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl h-32 text-sm font-medium" placeholder="Vos conclusions pour la suite..." />
                                            </div>
                                        </div>

                                        <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                                            <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={14}/> Préconisations pour la prochaine livraison</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
                                                    <span className="text-xs font-black text-gray-500 flex-1">Protéines</span>
                                                    <input type="number" step="10" value={newLog.protein_adj} onChange={e => setNewLog({...newLog, protein_adj: parseInt(e.target.value)})} className="w-20 text-center font-black text-amber-600 outline-none bg-transparent" />
                                                    <span className="text-[10px] font-bold text-gray-400">g</span>
                                                </div>
                                                <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
                                                    <span className="text-xs font-black text-gray-500 flex-1">Féculents</span>
                                                    <input type="number" step="10" value={newLog.starch_adj} onChange={e => setNewLog({...newLog, starch_adj: parseInt(e.target.value)})} className="w-20 text-center font-black text-amber-600 outline-none bg-transparent" />
                                                    <span className="text-[10px] font-bold text-gray-400">g</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={isSaving} className="w-full bg-gray-800 text-white py-5 rounded-[2rem] font-black shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-3">
                                            {isSaving ? "Enregistrement..." : <><Save size={20}/> ENREGISTRER AU JOURNAL</>}
                                        </button>
                                    </form>
                                </div>

                                {/* HISTORIQUE DU JOURNAL */}
                                <div className="space-y-4">
                                    <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2"><History size={16}/> Historique du suivi</h2>
                                    {logs.map(log => (
                                        <div key={log.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-in fade-in duration-500">
                                            <div className="flex justify-between items-start mb-6">       
                                                <div>
                                                    <h3 className="text-lg font-black text-gray-800">{log.dish_name}</h3>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{new Date(log.log_date).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'})}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    {[1,2,3,4,5].map(n => <Star key={n} size={14} className={log.client_rating >= n ? "text-amber-400 fill-amber-400" : "text-gray-200"}/>)}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">       
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Retour Client</p>
                                                    <p className="text-sm text-gray-600 italic">"{log.client_feedback || 'Aucun retour saisi'}"</p>
                                                </div>
                                                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Note du Chef</p>
                                                    <p className="text-sm text-gray-800 font-medium">{log.chef_notes || 'Pas de note particulière'}</p>
                                                </div>
                                            </div>

                                            {log.macro_adjustments && (
                                                <div className="mt-6 pt-6 border-t flex flex-wrap gap-4"> 
                                                    {log.macro_adjustments.protein !== 0 && (
                                                        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${log.macro_adjustments.protein > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                            {log.macro_adjustments.protein > 0 ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                                                            Protéines : {log.macro_adjustments.protein > 0 ? '+' : ''}{log.macro_adjustments.protein}g
                                                        </div>
                                                    )}
                                                    {log.macro_adjustments.starch !== 0 && (
                                                        <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 ${log.macro_adjustments.starch > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                            {log.macro_adjustments.starch > 0 ? <ArrowUpCircle size={14}/> : <ArrowDownCircle size={14}/>}
                                                            Féculents : {log.macro_adjustments.starch > 0 ? '+' : ''}{log.macro_adjustments.starch}g
                                                        </div>
                                                    )}
                                                    {log.macro_adjustments.protein === 0 && log.macro_adjustments.starch === 0 && (
                                                        <div className="px-4 py-2 rounded-full bg-gray-50 text-gray-400 text-[10px] font-black uppercase flex items-center gap-2">
                                                            <CheckCircle2 size={14}/> Équilibre maintenu 
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {logs.length === 0 && <p className="text-center py-12 text-gray-300 italic">Aucun historique pour cet abonné.</p>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- ZONE D'IMPRESSION (Invisible à l'écran) --- */}
            {selectedSub && latestLog && (
                <div id="dietary-print-area" className="print-only">
                    <div style={{ padding: '2cm', fontFamily: 'sans-serif', color: '#333' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #d4af37', paddingBottom: '20px', marginBottom: '40px' }}>
                            <div>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900' }}>ASIACUISINE.RE</h1>
                                <p style={{ margin: 0, fontSize: '14px', color: '#666', fontWeight: 'bold' }}>VOTRE CHEF PERSONNEL</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900' }}>SUIVI NUTRITIONNEL</h2>
                                <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>{new Date().toLocaleDateString('fr-FR')}</p>
                            </div>
                        </div>

                        {/* Client Info */}
                        <div style={{ marginBottom: '40px' }}>
                            <p style={{ margin: 0, fontSize: '12px', color: '#999', fontWeight: '900', textTransform: 'uppercase' }}>Abonné(e)</p>
                            <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{selectedSub.clients?.first_name} {selectedSub.clients?.last_name}</h3>
                            <p style={{ margin: '5px 0 0 0', fontSize: '14px', fontWeight: 'bold', color: '#d4af37' }}>{selectedSub.formula_name}</p>
                        </div>

                        {/* Last Meal Recap */}
                        <div style={{ backgroundColor: '#f9f9f9', padding: '30px', borderRadius: '20px', marginBottom: '40px' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', fontWeight: '900', color: '#d4af37' }}>RETOUR SUR VOTRE DERNIER REPAS</h4>
                            <p style={{ fontSize: '18px', fontWeight: '900', margin: '0 0 5px 0' }}>{latestLog.dish_name}</p>
                            <p style={{ fontSize: '14px', color: '#666', fontStyle: 'italic', margin: 0 }}>"{latestLog.client_feedback || 'Excellent'}"</p>
                        </div>

                        {/* Adjustments for next delivery */}
                        <div style={{ marginBottom: '40px' }}>
                            <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: '900' }}>OPTIMISATIONS POUR VOTRE PROCHAINE LIVRAISON</h4>
                            <div style={{ display: 'flex', gap: '20px' }}>
                                <div style={{ flex: 1, border: '2px solid #eee', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '10px', fontWeight: '900', color: '#999' }}>PROTÉINES</p>
                                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{latestLog.macro_adjustments?.protein > 0 ? '+' : ''}{latestLog.macro_adjustments?.protein || 0}g</p>
                                </div>
                                <div style={{ flex: 1, border: '2px solid #eee', padding: '20px', borderRadius: '15px', textAlign: 'center' }}>
                                    <p style={{ margin: '0 0 5px 0', fontSize: '10px', fontWeight: '900', color: '#999' }}>FÉCULENTS</p>
                                    <p style={{ margin: 0, fontSize: '24px', fontWeight: '900' }}>{latestLog.macro_adjustments?.starch > 0 ? '+' : ''}{latestLog.macro_adjustments?.starch || 0}g</p>
                                </div>
                            </div>
                        </div>

                        {/* Chef's personal note */}
                        {latestLog.chef_notes && (
                            <div style={{ borderLeft: '4px solid #d4af37', paddingLeft: '20px', marginTop: '60px' }}>
                                <p style={{ margin: '0 0 5px 0', fontSize: '10px', fontWeight: '900', color: '#999' }}>LE MOT DU CHEF</p>
                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', fontWeight: '500' }}>{latestLog.chef_notes}</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div style={{ position: 'absolute', bottom: '2cm', left: '2cm', right: '2cm', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                            <p style={{ margin: 0, fontSize: '10px', color: '#999' }}>asiacuisine.re - Votre partenaire santé & gastronomie au quotidien</p>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .print-only { display: none; }
                @media print {
                    @page { margin: 0; size: A4; }
                    body * { visibility: hidden !important; }
                    #dietary-print-area, #dietary-print-area * { visibility: visible !important; }        
                    #dietary-print-area { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: 100% !important; background: white !important; }
                    .no-print { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default JournalAlimentaire;
