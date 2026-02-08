import React, { useState, useEffect, useCallback } from 'react';
import { 
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
    CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
    TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, 
    Package, AlertCircle, Download, Calendar, PieChart as PieIcon, 
    BarChart3, Activity, ArrowRight, Filter
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';

const StatCard = ({ title, value, change, icon: Icon, color, isLoading, themeColor }) => (
  <div className={`bg-white rounded-[2rem] shadow-sm p-8 hover:shadow-md transition-all border-t-4 border-transparent hover:border-${themeColor}-500 group`}>
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-2xl bg-gray-50 group-hover:bg-${themeColor}-50 transition-colors`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      {change !== null && !isLoading && (
        <div className={`flex items-center px-2 py-1 rounded-full text-xs font-bold ${parseFloat(change) >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {parseFloat(change) >= 0 ? <TrendingUp size={12} className="mr-1" /> : <TrendingDown size={12} className="mr-1" />}
          {Math.abs(parseFloat(change)).toFixed(1)}%
        </div>
      )}
    </div>
    {isLoading ? (
      <div className="space-y-2">
        <div className="h-8 w-3/4 bg-gray-100 animate-pulse rounded-md"></div>
        <div className="h-4 w-1/2 bg-gray-50 animate-pulse rounded-md"></div>
      </div>
    ) : (
      <>
        <div className="text-3xl font-black text-gray-800 mb-1">{value}</div>
        <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{title}</span>
      </>
    )}
  </div>
);

const Statistiques = () => {
    const { businessUnit } = useBusinessUnit();
    const [period, setPeriod] = useState('last30days');
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'sales', 'expenses', 'export'

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';
    const mainHexColor = businessUnit === 'courtage' ? '#3b82f6' : '#d4af37';

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [kpis, setKpis] = useState({
        revenue: '0.00', revenueChange: 0, totalExpenses: '0.00', expensesChange: 0,
        totalGrossMargin: '0.00', grossMarginChange: 0, orders: 0, ordersChange: 0,
        newClients: 0, clientsChange: 0, avgOrderValue: '0.00',
    });

    const [revenueData, setRevenueData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);
    const [weekdayData, setWeekdayData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [expenseDistributionData, setExpenseDistributionData] = useState([]);
    const [monthlyPerformanceData, setMonthlyPerformanceData] = useState([]);
    const [eventsData, setEventsData] = useState([]);
    const [exportDates, setExportDates] = useState({ start: '', end: '' });
    const [isExporting, setIsExporting] = useState(false);

    const fetchKpis = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Non authentifié");

            const response = await fetch(
                `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-kpis?period=${period}&businessUnit=${businessUnit}`,
                { headers: { 'Authorization': `Bearer ${session.access_token}` } }
            );

            if (!response.ok) throw new Error("Erreur serveur");
            const data = await response.json();

            setKpis({
                revenue: data.revenue || '0.00', revenueChange: data.revenueChange || 0,
                totalExpenses: data.totalExpenses || '0.00', expensesChange: data.expensesChange || 0,
                totalGrossMargin: data.totalGrossMargin || '0.00', grossMarginChange: data.grossMarginChange || 0,
                orders: data.totalOrders || 0, ordersChange: data.ordersChange || 0,
                newClients: data.newClients || 0, clientsChange: data.clientsChange || 0,
                avgOrderValue: data.avgOrderValue || '0.00',
            });

            setRevenueData((data.revenueData || []).map(item => ({
                name: new Date(item.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                ca: parseFloat(item.revenue),
            })));

            const typeLabels = { 'COMMANDE_MENU': 'Menus', 'COMMANDE_SPECIALE': 'Spéciales', 'RESERVATION_SERVICE': 'Prestations', 'SOUSCRIPTION_ABONNEMENT': 'Abonnements' };
            const colorMapping = { 'COMMANDE_MENU': '#3b82f6', 'COMMANDE_SPECIALE': '#10b981', 'RESERVATION_SERVICE': '#f59e0b', 'SOUSCRIPTION_ABONNEMENT': '#8b5cf6' };
            
            setOrderTypeData((data.orderTypeData || []).map(item => ({
                name: typeLabels[item.type] || item.type,
                value: Number(item.count),
                color: colorMapping[item.type] || '#6b7280'
            })));

            setWeekdayData((data.weekdayData || []).map(item => ({
                day: item.day_name,
                commandes: item.total_orders,
                ca: parseFloat(item.total_revenue),
            })));

            setTopProducts((data.topProductsData || []).map(item => ({
                name: item.item_name, orders: item.total_orders, revenue: parseFloat(item.total_revenue), avgRevenue: parseFloat(item.average_revenue),
            })));

            setExpenseDistributionData((data.expenseDistributionData || []).map(item => ({
                name: item.name, value: Number(item.value)
            })));

            setMonthlyPerformanceData((data.monthlyPerformanceData || []).map(item => ({
                name: new Date(item.month_start).toISOString().substring(0, 7),
                commandes: item.total_orders, ca: parseFloat(item.total_revenue),
            })));

            setEventsData(data.eventsData || []);
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, [period, businessUnit]);

    useEffect(() => { fetchKpis(); }, [fetchKpis]);

    const handleExport = async () => {
        if (!exportDates.start || !exportDates.end) return alert("Dates requises.");
        setIsExporting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/export-data?startDate=${exportDates.start}&endDate=${exportDates.end}&businessUnit=${businessUnit}`;
            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!response.ok) throw new Error("Erreur export");
            const blob = await response.blob();
            const a = document.createElement('a');
            a.href = window.URL.createObjectURL(blob);
            a.download = `export_${businessUnit}_${exportDates.start}.csv`;
            a.click();
        } catch (err) { alert(err.message); }
        finally { setIsExporting(false); }
    };

    const formatMonthTick = (tick) => {
        const d = new Date(tick + '-02');
        return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Centre Analytics</h1>
                        <p className="text-gray-500 font-medium">Performance de l'unité {businessUnit === 'courtage' ? 'Luxilo' : 'Asiacuisine'}</p>
                    </div>
                    
                    <div className="flex bg-gray-200 p-1 rounded-2xl">
                        {[
                            { v: 'last7days', l: '7j' },
                            { v: 'last30days', l: '30j' },
                            { v: 'currentMonth', l: 'Mois' },
                            { v: 'currentYear', l: 'Année' }
                        ].map(p => (
                            <button key={p.v} onClick={() => setPeriod(p.v)} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${period === p.v ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                {p.l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- NAVIGATION PAR ONGLETS --- */}
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-2xl mb-8 max-w-2xl">
                    <button onClick={() => setActiveTab('overview')} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Activity size={14} className="mr-2"/> Vue d'ensemble</button>
                    <button onClick={() => setActiveTab('sales')} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'sales' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><ShoppingCart size={14} className="mr-2"/> Ventes & Produits</button>
                    <button onClick={() => setActiveTab('expenses')} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'expenses' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><TrendingDown size={14} className="mr-2"/> Dépenses</button>
                    <button onClick={() => setActiveTab('export')} className={`flex-1 flex items-center justify-center py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'export' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Download size={14} className="mr-2"/> Exports</button>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-4 rounded-3xl mb-8 flex items-center gap-3 border border-red-100 font-bold"><AlertCircle /> {error}</div>}

                {/* --- CONTENU DES ONGLETS --- */}
                {activeTab === 'overview' && (
                    <div className="animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <StatCard title="Chiffre d'Affaires" value={`${parseFloat(kpis.revenue).toFixed(2)} €`} change={kpis.revenueChange} icon={DollarSign} color={`text-${themeColor}-600`} isLoading={loading} themeColor={themeColor} />
                            <StatCard title="Marge Brute" value={`${parseFloat(kpis.totalGrossMargin).toFixed(2)} €`} change={kpis.grossMarginChange} icon={TrendingUp} color="text-green-600" isLoading={loading} themeColor={themeColor} />
                            <StatCard title="Panier Moyen" value={`${parseFloat(kpis.avgOrderValue).toFixed(2)} €`} change={null} icon={Package} color="text-indigo-600" isLoading={loading} themeColor={themeColor} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><BarChart3 size={16} className="text-amber-500"/> Évolution du CA</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={revenueData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                            <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                                            <Line type="monotone" dataKey="ca" stroke={mainHexColor} strokeWidth={4} dot={{r: 4, fill: mainHexColor}} activeDot={{r: 8}} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><PieIcon size={16} className="text-blue-500"/> Mix de Ventes</h3>
                                <div className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={orderTypeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                                {orderTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" align="center" iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <StatCard title="Total Commandes" value={kpis.orders} change={kpis.ordersChange} icon={ShoppingCart} color="text-blue-600" isLoading={loading} themeColor={themeColor} />
                            <StatCard title="Nouveaux Clients" value={kpis.newClients} change={kpis.clientsChange} icon={Users} color="text-purple-600" isLoading={loading} themeColor={themeColor} />
                        </div>
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400">Top Performance Produits</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Produit/Service</th>
                                            <th className="px-8 py-4 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Ventes</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">CA Total</th>
                                            <th className="px-8 py-4 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Moyenne</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-medium">
                                        {topProducts.map((p, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-5 text-gray-800">{p.name}</td>
                                                <td className="px-8 py-5 text-center text-gray-500">{p.orders}</td>
                                                <td className="px-8 py-5 text-right font-black text-gray-900">{p.revenue.toFixed(2)} €</td>
                                                <td className="px-8 py-5 text-right text-green-600">{p.avgRevenue.toFixed(2)} €</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'expenses' && (
                    <div className="animate-in fade-in duration-700">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <StatCard title="Total Dépenses" value={`${parseFloat(kpis.totalExpenses).toFixed(2)} €`} change={kpis.expensesChange} icon={TrendingDown} color="text-red-600" isLoading={loading} themeColor={themeColor} />
                            <div className="bg-white rounded-[2.5rem] shadow-sm p-8 border border-gray-100 flex items-center justify-between">
                                <div>
                                    <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Ratio Dépenses/CA</p>
                                    <p className="text-2xl font-black text-gray-800">{((parseFloat(kpis.totalExpenses) / (parseFloat(kpis.revenue) || 1)) * 100).toFixed(1)}%</p>
                                </div>
                                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center text-red-500"><TrendingDown /></div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 min-h-[400px]">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8">Répartition des charges</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={expenseDistributionData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                        {expenseDistributionData.map((e, i) => <Cell key={i} fill={['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981'][i % 5]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeTab === 'export' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-xl mx-auto">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100 text-center">
                            <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6"><Download size={40}/></div>
                            <h2 className="text-2xl font-black text-gray-800 mb-2">Export Comptable</h2>
                            <p className="text-gray-500 mb-8 font-medium">Générez un fichier CSV complet de vos données pour la période sélectionnée.</p>
                            
                            <div className="grid grid-cols-2 gap-4 mb-8 text-left">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Date Début</label>
                                    <input type="date" value={exportDates.start} onChange={e => setExportDates({...exportDates, start: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-green-500" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Date Fin</label>
                                    <input type="date" value={exportDates.end} onChange={e => setExportDates({...exportDates, end: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-green-500" />
                                </div>
                            </div>

                            <button onClick={handleExport} disabled={isExporting || !exportDates.start || !exportDates.end} className="w-full py-5 bg-gray-800 text-white rounded-[2rem] font-black text-lg shadow-lg hover:bg-black transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400">
                                {isExporting ? 'Préparation...' : 'Lancer l\'export (CSV)'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- ÉVOLUTION MENSUELLE (TOUJOURS VISIBLE EN BAS) --- */}
                {activeTab === 'overview' && (
                    <div className="mt-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 animate-in fade-in duration-1000">
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-8 flex items-center gap-2"><Calendar size={16}/> Performance Mensuelle (24 mois)</h3>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyPerformanceData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" tickFormatter={formatMonthTick} axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} />
                                    <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.05)'}} />
                                    <Bar dataKey="ca" fill={mainHexColor} radius={[6, 6, 0, 0]} name="CA (€)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Statistiques;
