import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    PlusCircle, Trash2, AlertCircle, RefreshCw, 
    Search, Calendar, Euro, Tag, 
    List, PieChart, ShoppingBasket, 
    Truck, Wrench, Wallet, Megaphone, MoreHorizontal, Save, ArrowRight, XCircle
} from 'lucide-react';

const categoryIcons = {
    'Matières Premières': <ShoppingBasket size={18} className="text-green-500" />,
    'Déplacement': <Truck size={18} className="text-blue-500" />,
    'Fournitures': <Wrench size={18} className="text-amber-500" />,
    'Salaires': <Wallet size={18} className="text-purple-500" />,
    'Marketing': <Megaphone size={18} className="text-pink-500" />,
    'Abonnement': <RefreshCw size={18} className="text-cyan-500" />,
    'Autre': <MoreHorizontal size={18} className="text-gray-500" />
};

const ExpenseCard = ({ expense, onDelete, themeColor }) => (
    <div className={`bg-white rounded-[2rem] shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
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
                {expense.demand_id ? `Lié à la demande : #${expense.demand_id.substring(0,8)}` : "Dépense générale"}
            </div>
            <button onClick={() => onDelete(expense.id)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 size={16} />
            </button>
        </div>
    </div>
);

const Depenses = () => {
    const { businessUnit } = useBusinessUnit();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('list'); // 'list', 'add'
    const [isAdding, setIsAdding] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        expense_date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        category: '',
        demand_id: '',
        business_unit: businessUnit
    });

    // Filter state
    const [filters, setFilter] = useState({ category: '', start: '', end: '', search: '' });

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';
    const categories = ['Matières Premières', 'Déplacement', 'Fournitures', 'Salaires', 'Marketing', 'Abonnement', 'Autre'];

    const fetchExpenses = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-expenses?business_unit=${businessUnit}`;
            if (filters.category) url += `&category=${filters.category}`;
            if (filters.start) url += `&start_date=${filters.start}`;
            if (filters.end) url += `&end_date=${filters.end}`;

            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Erreur de chargement");
            setExpenses(data || []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [businessUnit, filters]);

    useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-expense`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({...formData, amount: parseFloat(formData.amount)}),
            });
            if (!response.ok) throw new Error("Erreur lors de l'ajout");
            
            setFormData({ expense_date: new Date().toISOString().split('T')[0], description: '', amount: '', category: '', demand_id: '', business_unit: businessUnit });
            setActiveTab('list');
            fetchExpenses();
        } catch (err) { setError(err.message); }
        finally { setIsAdding(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer cette dépense ?")) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-expense?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            fetchExpenses(true);
        } catch (err) { alert(err.message); }
    };

    const filteredList = expenses.filter(e => 
        e.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        e.category.toLowerCase().includes(filters.search.toLowerCase())
    );

    const totalPeriod = filteredList.reduce((sum, e) => sum + parseFloat(e.amount), 0);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-wrap justify-between items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Gestion des Flux Sortants</h1>
                        <p className="text-gray-500 font-medium italic">Suivez vos charges et optimisez votre rentabilité ({businessUnit}).</p>
                    </div>
                    <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Période</p>
                        <p className="text-xl font-black text-red-600">-{totalPeriod.toFixed(2)} €</p>
                    </div>
                </div>

                {/* --- NAVIGATION PAR ONGLETS --- */}
                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-md">
                    <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={16} className="inline mr-2"/> Journal
                    </button>
                    <button onClick={() => setActiveTab('add')} className={`flex-1 py-3 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'add' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>
                        <PlusCircle size={16} className="inline mr-2"/> Nouvelle Dépense
                    </button>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-3xl mb-8 flex items-center gap-3 border border-red-100 font-bold"><AlertCircle /> {error}</div>}

                {activeTab === 'add' ? (
                    <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3"><PlusCircle className={`text-${themeColor}-500`}/> Enregistrer un achat</h2>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Date</label><input required type="date" value={formData.expense_date} onChange={e => setFormData({...formData, expense_date: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Catégorie</label><select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold"><option value="">Choisir...</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            </div>
                            <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Description / Fournisseur</label><input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" placeholder="Ex: Achat légumes Marché, Loyer, etc." /></div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Montant (€)</label><div className="relative"><input required type="number" step="0.01" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl pl-12" placeholder="0.00" /><Euro className="absolute left-4 top-4 text-gray-300" size={20}/></div></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">ID Demande (Optionnel)</label><input type="text" value={formData.demand_id} onChange={e => setFormData({...formData, demand_id: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-mono text-xs" placeholder="UUID..." /></div>
                            </div>
                            <div className="pt-6 flex gap-4">
                                <button type="submit" disabled={isAdding} className="flex-1 bg-gray-800 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 flex items-center justify-center gap-3">{isAdding ? <RefreshCw className="animate-spin" /> : <Save />} VALIDER LA DÉPENSE</button>
                                <button type="button" onClick={() => setActiveTab('list')} className="px-10 py-5 bg-gray-100 text-gray-500 rounded-[2rem] font-black hover:bg-gray-200 transition-all">ANNULER</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-700">
                        {/* --- BARRE DE FILTRES --- */}
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[250px] relative">
                                <Search size={18} className="absolute left-3 top-3 text-gray-400"/>
                                <input type="text" placeholder="Rechercher une dépense..." value={filters.search} onChange={e => setFilter({...filters, search: e.target.value})} className="w-full pl-10 pr-4 py-2.5 border-0 bg-gray-50 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" />
                            </div>
                            <select value={filters.category} onChange={e => setFilter({...filters, category: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs"><option value="">Toutes les catégories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            <div className="flex items-center gap-2">
                                <input type="date" value={filters.start} onChange={e => setFilter({...filters, start: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" />
                                <ArrowRight size={14} className="text-gray-300"/>
                                <input type="date" value={filters.end} onChange={e => setFilter({...filters, end: e.target.value})} className="p-2.5 bg-gray-50 border-0 rounded-xl font-bold text-xs" />
                            </div>
                            <button onClick={() => setFilter({category:'', start:'', end:'', search:''})} className="p-2.5 text-gray-400 hover:text-gray-600 transition-colors"><XCircle size={20}/></button>
                        </div>

                        {loading ? (
                            <div className="flex justify-center py-32"><RefreshCw className="animate-spin text-amber-500" size={48} /></div>
                        ) : filteredList.length === 0 ? (
                            <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-gray-200">
                                <PieChart size={60} className="mx-auto text-gray-100 mb-4"/>
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Aucune dépense trouvée.</p>
                            </div>
                        ) : (
                            <>
                                {/* Vue Desktop */}
                                <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100 mb-8">
                                    <table className="min-w-full divide-y divide-gray-100">
                                        <thead className="bg-gray-50/50">
                                            <tr>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Date</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Détails</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-left">Catégorie</th>
                                                <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Montant</th>
                                                <th className="px-8 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredList.map(e => (
                                                <tr key={e.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-8 py-5 text-sm font-bold text-gray-500">{new Date(e.expense_date).toLocaleDateString('fr-FR')}</td>
                                                    <td className="px-8 py-5 font-black text-gray-800">{e.description}</td>
                                                    <td className="px-8 py-5 text-xs">
                                                        <div className="flex items-center gap-2">
                                                            {categoryIcons[e.category]}
                                                            <span className="font-bold text-gray-600">{e.category}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-red-600">-{parseFloat(e.amount).toFixed(2)} €</td>
                                                    <td className="px-8 py-5 text-right"><button onClick={() => handleDelete(e.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={18}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Vue Mobile */}
                                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {filteredList.map(e => (
                                        <ExpenseCard key={e.id} expense={e} onDelete={handleDelete} themeColor={themeColor} />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Depenses;