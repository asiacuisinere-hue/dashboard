import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign, Package, Clock, Star } from 'lucide-react';

const StatCard = ({ title, value, change, icon: Icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-600 text-sm font-medium">{title}</span>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <div className="text-3xl font-bold text-gray-800 mb-1">{value}</div>
    {change && (
      <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        <span>{Math.abs(change)}% vs période précédente</span>
      </div>
    )}
  </div>
);

const Statistiques = () => {
  const [period, setPeriod] = useState('last30days');
  const [loading, setLoading] = useState(false);

  // Données de démonstration - à remplacer par vos vraies données
  const kpis = {
    revenue: '45,230',
    revenueChange: 12,
    orders: 156,
    ordersChange: 8,
    newClients: 23,
    clientsChange: 15,
    avgOrderValue: '289.94',
    avgChange: 5,
    completionRate: '94',
    satisfactionScore: '4.7'
  };

  // Données pour graphique évolution CA
  const revenueData = [
    { name: 'Sem 1', ca: 8200, commandes: 35 },
    { name: 'Sem 2', ca: 9800, commandes: 42 },
    { name: 'Sem 3', ca: 11200, commandes: 38 },
    { name: 'Sem 4', ca: 16030, commandes: 41 }
  ];

  // Données par type de demande
  const orderTypeData = [
    { name: 'Menus', value: 45, color: '#3b82f6' },
    { name: 'Commandes Spéciales', value: 30, color: '#10b981' },
    { name: 'Réservations', value: 25, color: '#f59e0b' }
  ];

  // Top produits/services
  const topProducts = [
    { name: 'Menu Découverte', orders: 42, revenue: 8400 },
    { name: 'Plateau Sushi', orders: 38, revenue: 7220 },
    { name: 'Menu Prestige', orders: 28, revenue: 11200 },
    { name: 'Service Traiteur', orders: 15, revenue: 9750 },
    { name: 'Menu Végétarien', orders: 22, revenue: 3960 }
  ];

  // Performance par jour de la semaine
  const weekdayData = [
    { day: 'Lun', commandes: 18, ca: 5200 },
    { day: 'Mar', commandes: 22, ca: 6400 },
    { day: 'Mer', commandes: 25, ca: 7300 },
    { day: 'Jeu', commandes: 20, ca: 5800 },
    { day: 'Ven', commandes: 35, ca: 10200 },
    { day: 'Sam', commandes: 28, ca: 8100 },
    { day: 'Dim', commandes: 8, ca: 2230 }
  ];

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

        {/* KPIs principaux */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Chiffre d'affaires"
            value={`${kpis.revenue}€`}
            change={kpis.revenueChange}
            icon={DollarSign}
            color="text-green-600"
          />
          <StatCard
            title="Nombre de commandes"
            value={kpis.orders}
            change={kpis.ordersChange}
            icon={ShoppingCart}
            color="text-blue-600"
          />
          <StatCard
            title="Nouveaux clients"
            value={kpis.newClients}
            change={kpis.clientsChange}
            icon={Users}
            color="text-purple-600"
          />
          <StatCard
            title="Panier moyen"
            value={`${kpis.avgOrderValue}€`}
            change={kpis.avgChange}
            icon={Package}
            color="text-orange-600"
          />
        </div>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Taux de complétion</h3>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{kpis.completionRate}%</div>
            <p className="text-sm text-gray-600 mt-2">Commandes livrées à temps</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Satisfaction client</h3>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-3xl font-bold text-gray-800">{kpis.satisfactionScore}/5</div>
            <p className="text-sm text-gray-600 mt-2">Note moyenne sur les avis</p>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Évolution du CA */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Évolution du chiffre d'affaires</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ca" stroke="#3b82f6" strokeWidth={2} name="CA (€)" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Répartition par type */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Répartition par type de demande</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {orderTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance par jour */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Performance par jour de la semaine</h3>
          <ResponsiveContainer width="100%" height={300}>
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
          </ResponsiveContainer>
        </div>

        {/* Top produits/services */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top produits/services</h3>
          <div className="overflow-x-auto">
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
                    <td className="text-right py-3 px-4 text-gray-800 font-semibold">{product.revenue}€</td>
                    <td className="text-right py-3 px-4 text-gray-600">
                      {(product.revenue / product.orders).toFixed(2)}€
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistiques;