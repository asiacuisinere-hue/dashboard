import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    Users, Building2, Search, PlusCircle, User, Edit3, Trash2, 
    Mail, Phone, ChevronRight, 
    ShoppingCart, Truck, ChefHat, RefreshCw, BarChart3, Clock, 
    Calendar, Utensils, TrendingUp, Star, History
} from 'lucide-react';

const getDemandeIcon = (t) => {
    if (t === 'COMMANDE_MENU') return <Truck size={16} className="text-blue-500" />;
    if (t === 'COMMANDE_SPECIALE') return <ShoppingCart size={16} className="text-purple-500" />;
    return <ChefHat size={16} className="text-amber-500" />;
};

const getLocalizedText = (dataField) => {
    if (!dataField) return "";
    let obj = dataField;
    if (typeof dataField === 'string' && dataField.trim().startsWith('{')) {
        try { obj = JSON.parse(dataField); } catch(e) { return dataField; }
    }
    if (typeof obj === 'object' && obj !== null) {
        return obj['fr'] || obj['en'] || Object.values(obj).find(v => v !== "") || "";
    }
    return String(dataField);
};

const statusBadgeStyle = (type) => ({
    backgroundColor: type === 'Particulier' || type === 'client' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)',
    color: type === 'Particulier' || type === 'client' ? '#d4af37' : '#3b82f6',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 'bold',
    textTransform: 'uppercase'
});

const ClientCard = ({ client, type, onSelect, onEdit, onDelete, themeColor }) => (
    <div 
        onClick={() => onSelect(client)}
        className={`bg-white rounded-2xl shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all cursor-pointer group ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}
    >
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 transition-transform group-hover:scale-110 ${type === 'client' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {type === 'client' ? <User size={24} /> : <Building2 size={24} />}
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg line-clamp-1">
                        {type === 'client' ? `${client.last_name || ''} ${client.first_name || ''}`.trim() : (client.nom_entreprise || 'Entreprise')}
                    </h3>
                    <span style={statusBadgeStyle(type === 'client' ? 'Particulier' : 'Entreprise')}>     
                        {type === 'client' ? 'Particulier' : 'Entreprise'}
                    </span>
                </div>
            </div>
            <ChevronRight className="text-gray-300 group-hover:text-gray-500" size={20} />
        </div>

        <div className="space-y-2 mb-4 text-sm text-gray-600">
            <div className="flex items-center">
                <Mail size={14} className="mr-2 opacity-50" />
                <a 
                    href={`mailto:${type === 'client' ? client.email : client.contact_email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="truncate hover:text-amber-600 hover:underline transition-colors"
                >
                    {type === 'client' ? client.email : client.contact_email}
                </a>
            </div>
            <div className="flex items-center">
                <Phone size={14} className="mr-2 opacity-50" />
                <a 
                    href={`tel:${type === 'client' ? client.phone : client.contact_phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-amber-600 hover:underline transition-colors"
                >
                    {type === 'client' ? (client.phone || '—') : (client.contact_phone || '—')}
                </a>
            </div>
        </div>
        
        <div className="flex gap-2 border-t pt-4 mt-auto">
            <button 
                onClick={(e) => { e.stopPropagation(); onEdit(client); }} 
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 text-gray-600 font-bold hover:bg-gray-100 transition-colors text-xs"
            >
                <Edit3 size={14} /> Modifier
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onDelete(client.id); }} 
                className="flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            >
                <Trash2 size={16} />
            </button>
        </div>
    </div>
);

const ClientProfileModal = ({ client, type, onClose, onEdit, themeColor }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('stats');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        const clientIdField = type === 'client' ? 'client_id' : 'entreprise_id';
        const { data } = await supabase.from('demandes').select('*').eq(clientIdField, client.id).order('request_date', { ascending: false });
        setHistory(data || []);
        setLoading(false);
    }, [client.id, type]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const stats = useMemo(() => {
        if (history.length === 0) return null;
        const res = {
            totalSpent: 0,
            formulas: {},
            options: { 'Option A': 0, 'Option B': 0 },
            days: { 'Lundi': 0, 'Mardi': 0, 'Mercredi': 0, 'Jeudi': 0, 'Vendredi': 0, 'Samedi': 0, 'Dimanche': 0 },
            proteins: { 'Poulet': 0, 'Porc': 0, 'Boeuf': 0, 'Poisson/Crevettes': 0, 'Végétarien': 0 },
            avgLeadTime: 0,
            topDishes: {}
        };
        let totalLeadTime = 0;
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        history.forEach(d => {
            res.totalSpent += (d.total_amount || 0);
            const fName = d.details_json?.formulaName;
            if (fName) res.formulas[fName] = (res.formulas[fName] || 0) + 1;
            const opt = d.details_json?.formulaOption;
            if (opt && res.options[opt] !== undefined) res.options[opt]++;
            const reqDate = new Date(d.request_date);
            const dayName = dayNames[reqDate.getDay()];
            res.days[dayName]++;
            const created = new Date(d.created_at);
            const diffDays = Math.max(0, Math.ceil((reqDate - created) / (1000 * 60 * 60 * 24)));
            totalLeadTime += diffDays;
            if (d.details_json?.cart) {
                d.details_json.cart.forEach(item => {
                    const name = getLocalizedText(item.name).toLowerCase();
                    res.topDishes[name] = (res.topDishes[name] || 0) + item.quantity;
                    if (name.includes('poulet')) res.proteins['Poulet'] += item.quantity;
                    else if (name.includes('porc')) res.proteins['Porc'] += item.quantity;
                    else if (name.includes('boeuf')) res.proteins['Boeuf'] += item.quantity;
                    else if (name.includes('poisson') || name.includes('crevette') || name.includes('camaron')) res.proteins['Poisson/Crevettes'] += item.quantity;
                    else res.proteins['Végétarien'] += item.quantity;
                });
            }
        });
        res.avgLeadTime = (totalLeadTime / history.length).toFixed(1);
        return res;
    }, [history]);

    const clientName = type === 'client' ? `${client.first_name || ''} ${client.last_name || ''}`.trim() : client.nom_entreprise;

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col relative shadow-2xl animate-in zoom-in duration-300">
                
                {/* Header Profil */}
                <div className={`p-8 pb-6 border-b-4 relative ${themeColor === 'blue' ? 'border-blue-500 bg-blue-50/30' : 'border-amber-500 bg-amber-50/30'}`}>
                    <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light z-10">&times;</button>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-start pr-12">
                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg ${type === 'client' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}>
                            {type === 'client' ? <User size={40} /> : <Building2 size={40} />}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h2 className="text-3xl font-black text-gray-800">{clientName}</h2>
                                {history.length > 0 && (
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm">
                                        <Star size={10} fill="white"/> {history.length} COMMANDES
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm font-bold text-gray-500">
                                <div className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
                                    <Mail size={14}/> 
                                    <a href={`mailto:${type === 'client' ? client.email : client.contact_email}`}>
                                        {type === 'client' ? client.email : client.contact_email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-1.5 hover:text-amber-600 transition-colors">
                                    <Phone size={14}/> 
                                    <a href={`tel:${type === 'client' ? client.phone : client.contact_phone}`}>
                                        {type === 'client' ? client.phone : client.contact_phone}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Dépensé</p>
                            <p className="text-3xl font-black text-amber-600 leading-tight">{stats?.totalSpent.toFixed(2)} €</p>
                            <button onClick={() => { onEdit(client); onClose(); }} className="mt-3 px-4 py-2 bg-gray-800 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all flex items-center gap-2 shadow-md">
                                <Edit3 size={12} /> Modifier Fiche
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex bg-gray-50 px-8 border-b">
                    <button onClick={() => setActiveTab('stats')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'stats' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        <BarChart3 size={14} className="inline mr-2 mb-0.5" /> Analyse Client
                    </button>
                    <button onClick={() => setActiveTab('list')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'list' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                        <History size={14} className="inline mr-2 mb-0.5" /> Historique Brut
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    {loading ? (
                        <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-amber-500" size={40}/></div>
                    ) : activeTab === 'stats' && stats ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Utensils size={14}/> Top Formules</h3>
                                    <div className="space-y-3">
                                        {Object.entries(stats.formulas).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                                            <div key={name}>
                                                <div className="flex justify-between text-xs font-bold mb-1">
                                                    <span className="text-gray-700">{name}</span>
                                                    <span className="text-amber-600">{count}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(count/history.length)*100}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 flex gap-4 border-t pt-4">
                                        <div className="flex-1 text-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Option A</p>
                                            <p className="text-lg font-black text-gray-800">{stats.options['Option A']}</p>
                                        </div>
                                        <div className="w-px bg-gray-200 h-8 mt-2"></div>
                                        <div className="flex-1 text-center">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Option B</p>
                                            <p className="text-lg font-black text-gray-800">{stats.options['Option B']}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Calendar size={14}/> Jours Préférés</h3>
                                    <div className="grid grid-cols-7 gap-1 items-end h-24 mb-2">
                                        {Object.entries(stats.days).map(([day, count]) => (
                                            <div key={day} className="flex flex-col items-center gap-2 group relative">
                                                <div className="bg-blue-500 w-full rounded-t-sm transition-all hover:bg-blue-600" style={{ height: `${(count/Math.max(...Object.values(stats.days), 1))*100}%`, minHeight: count > 0 ? '4px' : '0' }}></div>
                                                <span className="text-[8px] font-black text-gray-400">{day.substring(0, 1)}</span>
                                                <div className="absolute -top-8 bg-gray-800 text-white text-[8px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    {day}: {count}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 border-t pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <Clock size={14}/>
                                                <span className="text-[10px] font-black uppercase">Délai de commande</span>
                                            </div>
                                            <span className="text-sm font-black text-blue-600">{stats.avgLeadTime} jours</span>
                                        </div>
                                        <p className="text-[9px] text-gray-400 mt-1 italic">En moyenne avant la livraison.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                                    <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={14}/> Goûts & Protéines</h3>
                                    <div className="space-y-3">
                                        {Object.entries(stats.proteins).filter(([_, count]) => count > 0).map(([name, count]) => (
                                            <div key={name} className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-600">{name}</span>
                                                <span className="bg-white px-2 py-0.5 rounded-lg border border-amber-200 text-[10px] font-black text-amber-700">{count}</span>
                                            </div>
                                        ))}
                                        {Object.values(stats.proteins).every(v => v === 0) && (
                                            <p className="text-[10px] text-gray-400 italic">Données protéines disponibles pour les commandes spéciales uniquement.</p>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-inner">
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Note CRM</h3>
                                    <p className="text-xs text-gray-600 italic leading-relaxed">
                                        {client.internal_notes || "Aucune préférence particulière notée pour ce client."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map(item => (
                                <div key={item.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4 hover:border-amber-200 transition-colors">
                                    <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                                        {getDemandeIcon(item.type)}
                                    </div>
                                    <div className="flex-1 text-sm">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                {new Date(item.request_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                            <span className="text-sm font-black text-gray-800">{item.total_amount?.toFixed(2)} €</span>
                                        </div>
                                        <p className="font-bold text-gray-700">
                                            {item.details_json?.formulaName || (item.details_json?.cart ? 'Panier Spécial' : item.type.replace('_',' '))}
                                            {item.details_json?.formulaOption && <span className="text-amber-600 ml-1">({item.details_json.formulaOption})</span>}
                                        </p>
                                        
                                        {item.details_json?.cart && (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {item.details_json.cart.map((dish, idx) => (
                                                    <span key={idx} className="bg-white px-2 py-1 rounded-md text-[10px] border border-gray-200 text-gray-500">
                                                        {dish.quantity}x {getLocalizedText(dish.name)}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        
                                        <div className="mt-2 flex items-center gap-3">
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${item.payment_status === 'paid' ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                                                {item.payment_status === 'paid' ? 'Payée' : 'Non réglée'}
                                            </span>
                                            <span className="text-[9px] font-bold text-gray-400 italic">Statut: {item.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Clients = () => {
    const { businessUnit } = useBusinessUnit();
    const [activeTab, setActiveTab] = useState('particuliers');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedClient, setSelectedClient] = useState(null);

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchData = useCallback(async () => {
        setLoading(true);
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        let query = supabase.from(table).select('*');
        if (searchTerm) {
            if (activeTab === 'particuliers') query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            else query = query.or(`nom_entreprise.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`);
        }
        const orderBy = activeTab === 'particuliers' ? 'last_name' : 'nom_entreprise';
        const { data: results, error } = await query.order(orderBy, { ascending: true });
        if (!error) setData(results || []);
        setLoading(false);
    }, [activeTab, searchTerm]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOpenEdit = (item) => {
        let initialData = { ...item };
        if (activeTab === 'particuliers') initialData.fullName = `${item.last_name || ''} ${item.first_name || ''}`.trim();
        setFormData(initialData); setEditId(item.id); setIsEditing(true);
    };

    const handleCloseEdit = () => { setIsEditing(false); setEditId(null); setFormData({}); };

    const handleSave = async (e) => {
        e.preventDefault();
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        let payload = {};
        if (activeTab === 'particuliers') {
            const fullName = formData.fullName || '';
            const spaceIndex = fullName.indexOf(' ');
            let lastName = fullName; let firstName = '';
            if (spaceIndex !== -1) { lastName = fullName.substring(0, spaceIndex).trim(); firstName = fullName.substring(spaceIndex + 1).trim(); }
            payload = { last_name: lastName, first_name: firstName, email: formData.email, phone: formData.phone || '', address: formData.address || '', type: 'client' };
        } else {
            payload = { nom_entreprise: formData.nom_entreprise, siret: formData.siret || '', contact_email: formData.contact_email, contact_name: formData.contact_name || '', contact_phone: formData.contact_phone || '' };
        }

        if (editId) {
            try {
                await supabase.functions.invoke('update-client', { body: { id: editId, table: table, ...payload } });
                alert('Mise à jour réussie !'); handleCloseEdit(); fetchData();
            } catch (err) {
                const { error } = await supabase.from(table).update(payload).eq('id', editId);
                if (error) alert(error.message); else { alert('Sauvegarde réussie.'); handleCloseEdit(); fetchData(); }
            }
        } else {
            const { error } = await supabase.from(table).insert([payload]);
            if (error) alert(error.message); else { alert('Ajout réussi !'); handleCloseEdit(); fetchData(); }
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer définitivement ?")) return;
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) fetchData(); else alert(error.message);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Annuaire Clients</h1>       
                        <p className="text-gray-600 font-medium">Gérez vos contacts et analysez les habitudes culinaires.</p>
                    </div>
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            <PlusCircle size={20} /> Ajouter
                        </button>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[1.5rem] mb-8 max-md shadow-inner">
                        <button onClick={() => setActiveTab('particuliers')} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'particuliers' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Users size={14} className="mr-2" /> Particuliers</button>
                        <button onClick={() => setActiveTab('entreprises')} className={`flex-1 flex items-center justify-center py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'entreprises' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Building2 size={14} className="mr-2" /> Entreprises</button>
                    </div>
                )}

                {isEditing ? (
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center">
                            {editId ? <Edit3 className="mr-2 text-blue-500"/> : <PlusCircle className="mr-2 text-green-500"/>}
                            {editId ? 'Modifier' : 'Nouveau'} {activeTab === 'particuliers' ? 'Particulier' : 'Entreprise'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            {activeTab === 'particuliers' ? (
                                <>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Nom Complet</label><input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" placeholder="Ex: Jean Dupont" /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Email</label><input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Téléphone</label><input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    </div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Adresse</label><textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold h-24" /></div>
                                </>
                            ) : (
                                <>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Nom Entreprise</label><input required type="text" value={formData.nom_entreprise || ''} onChange={e => setFormData({...formData, nom_entreprise: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">SIRET</label><input type="text" value={formData.siret || ''} onChange={e => setFormData({...formData, siret: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Email de contact</label><input required type="email" value={formData.contact_email || ''} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Nom contact</label><input type="text" value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div><label className="block text-[10px] font-black text-gray-400 uppercase mb-1 ml-2">Téléphone</label><input type="tel" value={formData.contact_phone || ''} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 pt-6">
                                <button type="submit" className="flex-1 bg-gray-800 text-white py-4 rounded-[1.5rem] font-black shadow-lg hover:bg-black transition-all">ENREGISTRER</button>
                                <button type="button" onClick={handleCloseEdit} className="px-10 py-4 bg-gray-100 text-gray-600 rounded-[1.5rem] font-black hover:bg-gray-200 transition-all">ANNULER</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex items-center">
                            <Search size={18} className="text-gray-400 mr-3 ml-2" />
                            <input type="text" placeholder={`Rechercher un ${activeTab === 'particuliers' ? 'client' : 'établissement'}...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-1 py-2 outline-none text-gray-700 font-bold" />
                        </div>

                        {loading && data.length === 0 ? (
                            <div className="flex justify-center py-20"><RefreshCw className="animate-spin text-amber-500" size={40}/></div>
                        ) : data.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200">
                                <Users size={48} className="mx-auto text-gray-200 mb-4"/>
                                <p className="text-gray-400 font-bold">Aucun résultat trouvé.</p>     
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">        
                                {data.map(item => (
                                    <ClientCard
                                        key={item.id}
                                        client={item}
                                        type={activeTab === 'particuliers' ? 'client' : 'entreprise'}     
                                        onSelect={setSelectedClient}
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                        themeColor={themeColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedClient && (
                <ClientProfileModal
                    client={selectedClient}
                    type={activeTab === 'particuliers' ? 'client' : 'entreprise'}
                    onClose={() => setSelectedClient(null)}
                    onEdit={handleOpenEdit}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
};

export default Clients;
