import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../supabaseClient';

const StatCard = ({ title, value, change, icon: Icon, color, isLoading }) => (
  <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-600 text-sm font-medium">{title}</span>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    {isLoading ? (
      <div className="space-y-2">
        <div className="h-8 w-3/4 bg-gray-200 animate-pulse rounded-md"></div>
        <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded-md"></div>
      </div>
    ) : (
      <>
        <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
        {change !== null && change !== undefined && (
          <div className={`flex items-center text-sm ${parseFloat(change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {parseFloat(change) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            <span>{Math.abs(parseFloat(change)).toFixed(1)}% vs période précédente</span>
          </div>
        )}
      </>
    )}
  </div>
);

const Statistiques = () => {
    const [period, setPeriod] = useState('last30days');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [kpis, setKpis] = useState({
        revenue: '0.00',
        revenueChange: 0,
        totalExpenses: '0.00',
        expensesChange: 0,
        totalGrossMargin: '0.00',
        grossMarginChange: 0,
        orders: 0,
        ordersChange: 0,
        newClients: 0,
        clientsChange: 0,
        avgOrderValue: '0.00',
    });

    const [revenueData, setRevenueData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);
    const [weekdayData, setWeekdayData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [expenseDistributionData, setExpenseDistributionData] = useState([]);

    useEffect(() => {
        const fetchKpis = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw new Error(`Erreur de session: ${sessionError.message}`);
                if (!session) throw new Error("Utilisateur non authentifié.");

                const response = await fetch(
                    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-kpis?period=${period}`,
                    {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                        }
                    }
                );

                if (!response.ok) {
                    const contentType = response.headers.get('content-type');
                    let errorMessage = `Erreur du serveur (status ${response.status})`;
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await response.json();
                        errorMessage = errorData.details || errorData.error || errorMessage;
                    } else {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                    }
                    throw new Error(errorMessage);
                }

                const data = await response.json();
                
                setKpis({
                    revenue: data.revenue || '0.00',
                    revenueChange: data.revenueChange || 0,
                    totalExpenses: data.totalExpenses || '0.00',
                    expensesChange: data.expensesChange || 0,
                    totalGrossMargin: data.totalGrossMargin || '0.00',
                    grossMarginChange: data.grossMarginChange || 0,
                    orders: data.totalOrders || 0,
                    ordersChange: data.ordersChange || 0,
                    newClients: data.newClients || 0,
                    clientsChange: data.clientsChange || 0,
                    avgOrderValue: data.avgOrderValue || '0.00',
                });

                const formattedRevenueData = (data.revenueData || []).map(item => ({
                    name: new Date(item.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    ca: parseFloat(item.revenue),
                }));
                setRevenueData(formattedRevenueData);
                
                const typeLabels = {
                    'COMMANDE_MENU': 'Menus',
                    'COMMANDE_SPECIALE': 'Commandes Spéciales',
                    'RESERVATION_SERVICE': 'Réservations',
                    'SOUSCRIPTION_ABONNEMENT': 'Abonnements'
                };
                const colorMapping = {
                    'COMMANDE_MENU': '#3b82f6',
                    'COMMANDE_SPECIALE': '#10b981',
                    'RESERVATION_SERVICE': '#f59e0b',
                    'SOUSCRIPTION_ABONNEMENT': '#8b5cf6'
                };
                const formattedOrderTypeData = (data.orderTypeData || []).map(item => ({
                    name: typeLabels[item.type] || item.type,
                    value: Number(item.count),
                    color: colorMapping[item.type] || '#6b7280'
                }));
                setOrderTypeData(formattedOrderTypeData);

                const formattedWeekdayData = (data.weekdayData || []).map(item => ({
                    day: item.day_name,
                    commandes: item.total_orders,
                    ca: parseFloat(item.total_revenue)
                }));
                setWeekdayData(formattedWeekdayData);

                const formattedTopProducts = (data.topProductsData || []).map(item => ({
                    name: item.item_name,
                    orders: item.total_orders,
                    revenue: parseFloat(item.total_revenue),
                    avgRevenue: parseFloat(item.average_revenue)
                }));
                setTopProducts(formattedTopProducts);

                const formattedExpenseData = (data.expenseDistributionData || []).map(item => ({
                    name: item.name,
                    value: Number(item.value)
                }));
                setExpenseDistributionData(formattedExpenseData);

            } catch (err) {
                console.error('Error fetching KPIs:', err);
                setError(err.message);
                // Reset all states on error
                setKpis({ 
                    revenue: '0.00', revenueChange: 0, totalExpenses: '0.00', expensesChange: 0,
                    totalGrossMargin: '0.00', grossMarginChange: 0, orders: 0, ordersChange: 0, 
                    newClients: 0, clientsChange: 0, avgOrderValue: '0.00' 
                });
                setRevenueData([]);
                setOrderTypeData([]);
                setWeekdayData([]);
                setTopProducts([]);
                setExpenseDistributionData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchKpis();
    }, [period]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
                    <p className="font-semibold text-gray-800">{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color }}>
                            {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
                            {entry.name.includes('CA') && '€'}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Statistiques</h1>
                    <p className="text-gray-600">Aperçu complet de la performance de votre activité</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-wrap gap-2">
                        {[
                            { value: 'last7days', label: '7 derniers jours' },
                            { value: 'last30days', label: '30 derniers jours' },
                            { value: 'currentMonth', label: 'Ce mois' },
                            { value: 'currentYear', label: 'Cette année' }
                        ].map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    period === p.value
                                        ? 'bg-amber-500 text-white shadow-md'
                                        : 'bg-white text-amber-500 border border-amber-500 hover:bg-amber-50'
                                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-lg flex items-start"><AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" /><div><h3 className="text-red-800 font-semibold">Erreur de chargement</h3><p className="text-red-700 text-sm mt-1">{error}</p></div></div>}

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-6">
                    <StatCard title="Chiffre d'affaires" value={`${parseFloat(kpis.revenue).toFixed(2)}€`} change={kpis.revenueChange} icon={DollarSign} color="text-green-600" isLoading={loading} />
                    <StatCard title="Total Dépenses" value={`${parseFloat(kpis.totalExpenses).toFixed(2)}€`} change={kpis.expensesChange} icon={Package} color="text-red-600" isLoading={loading} />
                    <StatCard title="Marge Brute" value={`${parseFloat(kpis.totalGrossMargin).toFixed(2)}€`} change={kpis.grossMarginChange} icon={DollarSign} color="text-green-600" isLoading={loading} />
                    <StatCard title="Nombre de commandes" value={kpis.orders} change={kpis.ordersChange} icon={ShoppingCart} color="text-blue-600" isLoading={loading} />
                    <StatCard title="Nouveaux clients" value={kpis.newClients} change={kpis.clientsChange} icon={Users} color="text-purple-600" isLoading={loading} />
                    <StatCard title="Panier moyen" value={`${parseFloat(kpis.avgOrderValue).toFixed(2)}€`} change={null} icon={Package} color="text-orange-600" isLoading={loading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Évolution du chiffre d'affaires</h3>
                        {loading ? <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div> : revenueData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={revenueData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="name" stroke="#6b7280" />
                                    <YAxis stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Line type="monotone" dataKey="ca" stroke="#3b82f6" strokeWidth={2} name="CA (€)" dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Aucune donnée disponible pour cette période</div>}
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par type de demande</h3>
                        {loading ? <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div> : orderTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={orderTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {orderTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Aucune donnée disponible pour cette période</div>}
                    </div>
                    
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition des Dépenses</h3>
                        {loading ? <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div> : expenseDistributionData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie data={expenseDistributionData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                                        {expenseDistributionData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(value) => `${value.toFixed(2)}€`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Aucune donnée de dépense pour cette période</div>}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance par jour de la semaine</h3>
                        {loading ? <div className="h-[300px] flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div> : weekdayData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={weekdayData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="day" stroke="#6b7280" />
                                    <YAxis yAxisId="left" stroke="#6b7280" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="commandes" fill="#3b82f6" name="Commandes" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="ca" fill="#10b981" name="CA (€)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="h-[300px] flex items-center justify-center text-gray-500">Aucune donnée disponible pour cette période</div>}
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Top produits/services</h3>
                    {loading ? <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-200 animate-pulse rounded-md"></div>)}</div> : topProducts.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b-2 border-gray-200">
                                        <th className="text-left py-3 px-4 text-gray-700 font-semibold">Produit/Service</th>
                                        <th className="text-right py-3 px-4 text-gray-700 font-semibold">Commandes</th>
                                        <th className="text-right py-3 px-4 text-gray-700 font-semibold">CA généré</th>
                                        <th className="text-right py-3 px-4 text-gray-700 font-semibold">CA moyen</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topProducts.map((product, idx) => (
                                        <tr key={idx} className="border-b border-gray-100 hover:bg-amber-50 transition-colors">
                                            <td className="py-3 px-4 text-gray-800 font-medium">{product.name}</td>
                                            <td className="text-right py-3 px-4 text-gray-600">{product.orders}</td>
                                            <td className="text-right py-3 px-4 text-gray-800 font-semibold">{product.revenue.toFixed(2)}€</td>
                                            <td className="text-right py-3 px-4 text-gray-600">{product.avgRevenue.toFixed(2)}€</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <div className="py-8 text-center text-gray-500">Aucune donnée disponible pour cette période</div>}
                </div>
            </div>
        </div>
    );
};

export default Statistiques;