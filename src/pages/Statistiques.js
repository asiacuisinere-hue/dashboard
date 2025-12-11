/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
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
    const [kpis, setKpis] = useState({});
    const [revenueData, setRevenueData] = useState([]);
    const [orderTypeData, setOrderTypeData] = useState([]);

    useEffect(() => {
        const fetchKpis = async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) throw new Error("Utilisateur non authentifié.");

                const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-kpis?period=${period}`, {
                    headers: { 'Authorization': `Bearer ${session.access_token}` }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(errorText || `Erreur du serveur (status ${response.status})`);
                }

                const data = await response.json();

                setKpis({
                    revenue: data.revenue,
                    revenueChange: data.revenueChange,
                    orders: data.orders,
                    ordersChange: data.ordersChange,
                    newClients: data.newClients,
                    clientsChange: data.clientsChange,
                    avgOrderValue: data.avgOrderValue,
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

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchKpis();
    }, [period]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Statistiques</h1>
          <p className="text-gray-600">Aperçu complet de la performance de votre activité</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {['last7days', 'last30days', 'currentMonth', 'currentYear'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${period === p ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                {p === 'last7days' && '7 jours'}
                {p === 'last30days' && '30 jours'}
                {p === 'currentMonth' && 'Ce mois'}
                {p === 'currentYear' && 'Cette année'}
              </button>
            ))}
          </div>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Chiffre d'affaires" value={`${kpis.revenue || 0}€`} change={kpis.revenueChange} icon={DollarSign} color="text-green-600" isLoading={loading} />
          <StatCard title="Nombre de commandes" value={kpis.orders || 0} change={kpis.ordersChange} icon={ShoppingCart} color="text-blue-600" isLoading={loading} />
          <StatCard title="Nouveaux clients" value={kpis.newClients || 0} change={kpis.clientsChange} icon={Users} color="text-purple-600" isLoading={loading} />
          <StatCard title="Panier moyen" value={`${kpis.avgOrderValue || 0}€`} change={null} icon={Package} color="text-orange-600" isLoading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
      </div>
    </div>
  );
};

export default Statistiques;