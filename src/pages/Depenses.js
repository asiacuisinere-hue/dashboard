import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
    PlusCircle, Trash2, RefreshCw,
    Search, Calendar, Euro, Tag,
    List, PieChart, ShoppingBasket,
    Truck, Wrench, Wallet, Megaphone, MoreHorizontal, Save, ArrowRight, XCircle,
    Repeat, Landmark, FileText, Download, Printer
} from 'lucide-react';

const categoryIcons = {
    'Matières Premières': <ShoppingBasket size={18} className="text-green-500" />,
    'Déplacement': <Truck size={18} className="text-blue-500" />,
    'Fournitures': <Wrench size={18} className="text-amber-500" />,
    'Salaires': <Wallet size={18} className="text-purple-500" />,
    'Marketing': <Megaphone size={18} className="text-pink-500" />,
    'Abonnement': <RefreshCw size={18} className="text-cyan-500" />,
    'Crédit': <Landmark size={18} className="text-indigo-500" />,
    'Autre': <MoreHorizontal size={18} className="text-gray-500" />
};

const ExpenseCard = ({ expense, onDelete, themeColor }) => (
    <div className={`bg-white rounded-[2rem] shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'} relative overflow-hidden`}>
        {expense.is_recurring && <div className="absolute top-0 right-0 p-2 bg-indigo-50 text-indigo-500 rounded-bl-xl" title="Dépense récurrente"><Repeat size={12}/></div>}
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-inner">
                    {categoryIcons[expense.category] || <Tag size={18} />}
                </div>
                <div>
                    <h3 className="font-black text-gray-800 text-lg leading-tight">{expense.description}</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{expense.category}</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-xl font-black text-red-600">-{parseFloat(expense.amount).toFixed(2)} €</p>
                <p className="text-[10px] font-bold text-gray-400 flex items-center justify-end gap-1 mt-1"><Calendar size={10}/> {new Date(expense.expense_date).toLocaleDateString('fr-FR')}</p>
            </div>
        </div>
        <div className="flex gap-2 border-t pt-4 mt-2">
            <div className="flex-1 text-[10px] text-gray-400 font-medium truncate italic">
                {expense.is_recurring ? `Crédit jusqu'au ${new Date(expense.end_date).toLocaleDateString('fr-FR')}` : (expense.demand_id ? `Lié à : #${expense.demand_id.substring(0,8)}` : "Dépense générale")}
            </div>
            <button onClick={() => onDelete(expense.id)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
        </div>
    </div>
);

const Depenses = () => {
    const { businessUnit } = useBusinessUnit();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('list');
    const [isAdding, setIsAdding] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const [formData, setFormData] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        description: '', amount: '', category: '', demand_id: '',
        business_unit: businessUnit, is_recurring: false, end_date: ''
    });

    const [filters, setFilter] = useState({ category: '', start: '', end: '', search: '' });
    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';
    const categories = ['Matières Premières', 'Déplacement', 'Fournitures', 'Salaires', 'Marketing', 'Abonnement', 'Crédit', 'Autre'];

    const fetchExpenses = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-expenses?business_unit=${businessUnit}`;
            if (filters.category) url += `&category=${filters.category}`;
            if (filters.start) url += `&start_date=${filters.start}`;
            if (filters.end) url += `&end_date=${filters.end}`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erreur de chargement");
            setExpenses(data || []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [businessUnit, filters]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const filteredList = expenses.filter(e => e.description.toLowerCase().includes(filters.search.toLowerCase()) || e.category.toLowerCase().includes(filters.search.toLowerCase()));
    const totalPeriod = filteredList.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const aggregated = filteredList.reduce((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount);
        return acc;
    }, {});

    const handleSave = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const payload = { ...formData, amount: parseFloat(formData.amount), end_date: formData.is_recurring && formData.end_date ? formData.end_date : null, demand_id: formData.demand_id || null };
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-expense`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!response.ok) throw new Error("Erreur lors de l'ajout");
            setFormData({ expense_date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', demand_id: '', business_unit: businessUnit, is_recurring: false, end_date: '' });
            setActiveTab('list'); fetchExpenses();
        } catch (err) { setError(err.message); }
        finally { setIsAdding(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette dépense ?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-expense?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token}` } });
            fetchExpenses(true);
        } catch (err) { alert(err.message); }
    };

    const exportCSV = () => {
        const headers = ["Date", "Description", "Categorie", "Montant"];
        const rows = filteredList.map(e => [e.expense_date, e.description, e.category, e.amount]);
        let csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `export_depenses.csv`);
        document.body.appendChild(link);
        link.click();
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto no-print">
                <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Gestion des Flux Sortants</h1>
                        <p className="text-gray-500 font-medium italic">Suivez vos charges et optimisez votre rentabilité.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowReport(true)} className="flex items-center gap-2 px-6 py-3 bg-white text-gray-700 rounded-2xl font-black shadow-sm border border-gray-100 hover:bg-gray-50 transition-all active:scale-95"><FileText size={18}/> RAPPORT</button>
                        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">     
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Période</p>
                            <p className="text-xl font-black text-red-600">-{totalPeriod.toFixed(2)} €</p>  
                        </div>
                    </div>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-md">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><List size={16} className="inline mr-2"/> Journal</button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'add' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><PlusCircle size={16} className="inline mr-2"/> Nouvelle Dépense</button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-2xl mb-8 font-bold border border-red-100 animate-in fade-in slide-in-from-top-2 flex items-center gap-3">
                        <XCircle size={18} />
                        <span>{error}</span>
                    </div>
                )}

                {activeTab === 'add' ? (
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3"><PlusCircle className={`text-${themeColor}-500`}/> Enregistrer un achat</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label><input required type="date" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Catégorie</label><select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold"><option value="">Choisir...</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description / Fournisseur</label><input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>    
                            <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100 space-y-4">
                                <div className="flex items-center gap-3"><input type="checkbox" id="is_recurring" checked={formData.is_recurring} onChange={e => setFormData({...formData, is_recurring: e.target.checked})} className="w-6 h-6 text-indigo-600 rounded-lg" /><label htmlFor="is_recurring" className="font-black text-xs text-indigo-900 uppercase">Dépense récurrente</label></div>
                                {formData.is_recurring && (<div><label className="text-[10px] font-black text-indigo-400 uppercase ml-2 block mb-2">Date de fin</label><input required type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full p-4 bg-white border-0 rounded-2xl font-bold" /></div>)}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Montant (€)</label><div className="relative"><input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl pl-12" /><Euro className="absolute left-4 top-4 text-gray-300" size={20}/></div></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">ID Demande</label><input type="text" value={formData.demand_id} onChange={e => setFormData({...formData, demand_id: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-mono text-xs" /></div>
                            </div>
                            <div className="pt-6 flex gap-4"><button type="submit" disabled={isAdding} className="flex-1 bg-gray-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-3">{isAdding ? <RefreshCw className="animate-spin" /> : <Save />} VALIDER</button><button type="button" onClick={() => setActiveTab('list')} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[2rem] font-black hover:bg-gray-200 transition-all">ANNULER</button></div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[250px] relative"><Search size={18} className="absolute left-3 top-3 text-gray-400"/><input type="text" placeholder="Rechercher..." value={filters.search} onChange={e => setFilter({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" /></div>
                            <select value={filters.category} onChange={e => setFilter({...filters, category: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs"><option value="">Toutes catégories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>      
                            <div className="flex items-center gap-2"><input type="date" value={filters.start} onChange={e => setFilter({...filters, start: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" /><ArrowRight size={14} className="text-gray-300"/><input type="date" value={filters.end} onChange={e => setFilter({...filters, end: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" /></div>
                            <button onClick={() => setFilter({category:'', start:'', end:'', search:''})} className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"><XCircle size={20}/></button>       
                        </div>
                        {loading ? (<div className="flex justify-center py-32"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredList.map(e => (<ExpenseCard key={e.id} expense={e} onDelete={handleDelete} themeColor={themeColor} />))}</div>
                        )}
                    </div>
                )}
            </div>

            {showReport && (
                <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center p-4 backdrop-blur-sm no-print">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto p-10 relative shadow-2xl animate-in zoom-in duration-300">
                        <button onClick={() => setShowReport(false)} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                        <div className="mb-10"><h2 className="text-3xl font-black text-gray-800 flex items-center gap-3"><PieChart className="text-amber-500" size={32}/> Rapport de Dépenses</h2></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest border-b pb-2">Récapitulatif</h3>
                                <div className="space-y-3">
                                    {Object.entries(aggregated).map(([cat, amount]) => (<div key={cat} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"><span className="font-bold text-gray-700">{cat}</span><span className="font-black text-red-600">{amount.toFixed(2)} €</span></div>))}
                                    <div className="flex justify-between items-center p-5 bg-gray-800 text-white rounded-2xl shadow-lg mt-6"><span className="font-black uppercase text-xs tracking-widest">TOTAL</span><span className="text-2xl font-black">{totalPeriod.toFixed(2)} €</span></div>
                                </div>
                            </div>
                            <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 flex flex-col justify-center text-center">
                                <h3 className="text-sm font-black text-amber-800 mb-6 uppercase tracking-widest">Exports</h3>
                                <div className="space-y-4">
                                    <button onClick={exportCSV} className="w-full py-4 bg-white text-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border border-amber-200 hover:bg-amber-100 transition-all shadow-sm"><Download size={18}/> Exporter CSV</button>
                                    <button onClick={handlePrint} className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-700 transition-all shadow-lg"><Printer size={18}/> Générer PDF</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VUE IMPRESSION ULTRA-SIMPLIFIÉE (SANS DÉPENDANCE AU RESTE) */}
            <div id="simple-print-area" className="print-visible-only">
                <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
                    <h1 style={{ fontSize: '32px', fontWeight: '900', borderBottom: '4px solid black', paddingBottom: '10px' }}>ASIACUISINE.RE</h1>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '20px', textTransform: 'uppercase', color: '#666' }}>Rapport de Dépenses</h2>
                    <p style={{ marginTop: '5px', fontWeight: 'bold' }}>Période : {filters.start || 'Toutes dates'} → {filters.end || 'Aujourd\'hui'}</p>
                    
                    <h3 style={{ marginTop: '40px', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>RÉCAPITULATIF PAR CATÉGORIE</h3>
                    <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                        <tbody>
                            {Object.entries(aggregated).map(([cat, amount]) => (
                                <tr key={cat} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px 0' }}>{cat}</td><td style={{ textAlign: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)} €</td></tr>
                            ))}
                            <tr style={{ background: '#f4f4f4', fontWeight: 'bold' }}><td style={{ padding: '15px 10px' }}>TOTAL GÉNÉRAL</td><td style={{ textAlign: 'right', padding: '15px 10px' }}>{totalPeriod.toFixed(2)} €</td></tr>
                        </tbody>
                    </table>

                    <h3 style={{ marginTop: '40px', borderBottom: '2px solid #eee', paddingBottom: '5px' }}>DÉTAIL DES OPÉRATIONS ({filteredList.length})</h3>
                    <table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
                        <thead><tr style={{ background: '#f9f9f9', fontSize: '12px', textTransform: 'uppercase' }}><th style={{ padding: '10px', textAlign: 'left' }}>Date</th><th style={{ padding: '10px', textAlign: 'left' }}>Désignation</th><th style={{ padding: '10px', textAlign: 'left' }}>Catégorie</th><th style={{ padding: '10px', textAlign: 'right' }}>Montant</th></tr></thead>
                        <tbody>
                            {filteredList.map(e => (
                                <tr key={e.id} style={{ borderBottom: '1px solid #eee', fontSize: '13px' }}><td style={{ padding: '10px' }}>{new Date(e.expense_date).toLocaleDateString('fr-FR')}</td><td style={{ padding: '10px', fontWeight: 'bold' }}>{e.description}</td><td style={{ padding: '10px' }}>{e.category}</td><td style={{ padding: '10px', textAlign: 'right' }}>-{parseFloat(e.amount).toFixed(2)} €</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .print-visible-only { display: none; }
                @media print {
                    @page { margin: 1cm; size: A4; }
                    body * { visibility: hidden !important; }
                    #simple-print-area, #simple-print-area * { visibility: visible !important; }
                    #simple-print-area { display: block !important; position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: white !important; }
                    .no-print, .fixed, aside, nav, header { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default Depenses;
