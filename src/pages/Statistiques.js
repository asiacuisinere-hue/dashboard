import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, Clock, Star } from 'lucide-react';
import { supabase } from '../supabaseClient';

const StatCard = ({ title, value, change, icon: Icon, color, isLoading }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-600 text-sm font-medium">{title}</span>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    {isLoading ? <div className="h-12 w-3/4 bg-gray-200 animate-pulse rounded-md mt-2"></div> : (
      <>
        <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
        {change && (
          <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
            <span>{Math.abs(change)}% vs période précédente</span>
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
    
    // State for KPIs
    const [kpis, setKpis] = useState({
        revenue: '0.00',
        revenueChange: 0,
        orders: 0,
        ordersChange: 0,
        newClients: 0,
        clientsChange: 0,
        avgOrderValue: '0.00',
    });

    // State for Chart Data
    const [revenueData, setRevenueData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);
    const [weekdayData, setWeekdayData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);


    useEffect(() => {
        const fetchKpis = async () => {
            setLoading(true);
            setError(null);
            
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                if (sessionError) throw new Error(`Erreur de session: ${sessionError.message}`);
                if (!session) throw new Error("Utilisateur non authentifié");

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
                
                const colorMapping = {
                    'COMMANDE_MENU': '#3b82f6',
                    'COMMANDE_SPECIALE': '#10b981',
                    'RESERVATION_SERVICE': '#f59e0b',
                    'SOUSCRIPTION_ABONNEMENT': '#8b5cf6'
                };
                const formattedOrderTypeData = (data.orderTypeData || []).map(item => ({
                    name: item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
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


            } catch (err) {
                setError(err.message);
                setKpis({ 
                    revenue: '0.00', 
                    revenueChange: 0, 
                    orders: 0, 
                    ordersChange: 0, 
                    newClients: 0, 
                    clientsChange: 0, 
                    avgOrderValue: '0.00' 
                });
                setRevenueData([]);
                setOrderTypeData([]);
                setWeekdayData([]);
                setTopProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchKpis();
    }, [period]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Statistiques</h1>
          <p className="text-gray-600">Aperçu complet de la performance de votre activité</p>
        </div>

        {/* Filtres de période */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex gap-2">
            {['last7days', 'last30days', 'currentMonth', 'currentYear'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-amber-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'last7days' && '7 derniers jours'}
                {p === 'last30days' && '30 derniers jours'}
                {p === 'currentMonth' && 'Ce mois'}
                {p === 'currentYear' && 'Cette année'}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Chiffre d'affaires" value={`${kpis.revenue || '0.00'}€`} change={kpis.revenueChange} icon={DollarSign} color="text-green-600" isLoading={loading} />
          <StatCard title="Nombre de commandes" value={kpis.orders || 0} change={kpis.ordersChange} icon={ShoppingCart} color="text-blue-600" isLoading={loading} />
          <StatCard title="Nouveaux clients" value={kpis.newClients || 0} change={kpis.clientsChange} icon={Users} color="text-purple-600" isLoading={loading} />
          <StatCard title="Panier moyen" value={`${kpis.avgOrderValue || '0.00'}€`} change={null} icon={Package} color="text-orange-600" isLoading={loading} />
        </div>

        {/* Métriques secondaires (static for now) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Taux de complétion</h3>
            <Clock className="w-5 h-5 text-blue-600" />
            <div className="text-3xl font-bold text-gray-800">N/A%</div>
            <p className="text-sm text-gray-600 mt-2">Commandes livrées à temps</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Satisfaction client</h3>
            <Star className="w-5 h-5 text-yellow-500" />
            <div className="text-3xl font-bold text-gray-800">N/A/5</div>
            <p className="text-sm text-gray-600 mt-2">Note moyenne sur les avis</p>
          </div>
        </div>


        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Évolution du CA */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Évolution du chiffre d'affaires</h3>
            <ResponsiveContainer width="100%" height={300}>
                {loading ? <p>Chargement...</p> : 
                    <LineChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${value}€`} />
                        <Legend />
                        <Line type="monotone" dataKey="ca" stroke="#3b82f6" strokeWidth={2} name="CA (€)" />
                    </LineChart>
                }
            </ResponsiveContainer>
          </div>

          {/* Répartition par type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par type de demande</h3>
            <ResponsiveContainer width="100%" height={300}>
                {loading ? <p>Chargement...</p> : 
                    <PieChart>
                        <Pie data={orderTypeData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={100} fill="#8884d8" dataKey="value">
                        {orderTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]}/>
                        <Legend />
                    </PieChart>
                }
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Performance par jour */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance par jour de la semaine</h3>
          <ResponsiveContainer width="100%" height={300}>
            {loading ? <p>Chargement...</p> :
                <BarChart data={weekdayData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="commandes" fill="#3b82f6" name="Commandes" />
                  <Bar yAxisId="right" dataKey="ca" fill="#10b981" name="CA (€)" />
                </BarChart>
            }
          </ResponsiveContainer>
        </div>

        {/* Top produits/services */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top produits/services</h3>
          <div className="overflow-x-auto">
            {loading ? <p>Chargement...</p> :
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-gray-700 font-semibold">Produit/Service</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">Commandes</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">CA généré</th>
                      <th className="text-right py-3 px-4 text-gray-700 font-semibold">CA moyen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-800">{product.name}</td>
                        <td className="text-right py-3 px-4 text-gray-600">{product.orders}</td>
                        <td className="text-right py-3 px-4 text-gray-800 font-semibold">{product.revenue.toFixed(2)}€</td>
                        <td className="text-right py-3 px-4 text-gray-600">
                          {product.avgRevenue.toFixed(2)}€
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistiques;