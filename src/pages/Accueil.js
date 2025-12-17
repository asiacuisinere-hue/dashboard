import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { DollarSign, Calendar, Hash, TrendingUp, TrendingDown } from 'lucide-react'; // Ajout des icônes manquantes et suppression des inutilisées

// Définition du composant StatCard (copié depuis Statistiques.js)
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

const Accueil = () => {
    const [stats, setStats] = useState({ revenueCurrentMonth: '0.00', newOrdersCurrentMonth: 0 });
    const [recentDemandes, setRecentDemandes] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Pourrait être remplacé par un appel à une fonction edge dédiée plus tard
                const { data: kpisData, error: kpisError } = await supabase.rpc('get_dashboard_kpis');
                if (kpisError) throw kpisError;
                setStats({
                    revenueCurrentMonth: kpisData?.[0]?.total_revenue || '0.00',
                    newOrdersCurrentMonth: kpisData?.[0]?.total_orders || 0,
                });

                const { data: demandesData, error: demandesError } = await supabase
                    .from('demandes')
                    .select('id, created_at, type, clients(first_name, last_name)')
                    .eq('status', 'Nouvelle')
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (demandesError) throw demandesError;
                setRecentDemandes(demandesData);

                const { data: eventsData, error: eventsError } = await supabase
                    .from('events')
                    .select('id, event_name, start_date')
                    .gte('start_date', new Date().toISOString())
                    .order('start_date', { ascending: true })
                    .limit(3);
                if (eventsError) throw eventsError;
                setUpcomingEvents(eventsData);

            } catch (err) {
                console.error("Erreur lors du chargement des données du tableau de bord:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const renderType = (type) => {
        const typeMap = {
            'RESERVATION_SERVICE': { text: 'Réservation', color: 'bg-sky-100 text-sky-800' },
            'COMMANDE_MENU': { text: 'Commande Menu', color: 'bg-green-100 text-green-800' },
            'COMMANDE_SPECIALE': { text: 'Cmd Spéciale', color: 'bg-amber-100 text-amber-800' },
        };
        const { text, color } = typeMap[type] || { text: type, color: 'bg-gray-100 text-gray-800' };
        return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${color}`}>{text}</span>;
    };
    
    if (error) {
        return <div className="p-4 text-red-700 bg-red-100 rounded-md">Erreur: {error}</div>;
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Tableau de bord</h1>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard 
                    title="CA (Mois en cours)"
                    value={`${parseFloat(stats.revenueCurrentMonth).toFixed(2)}€`}
                    icon={DollarSign}
                    color="text-green-600"
                    isLoading={loading}
                    change={null}
                />
                <StatCard 
                    title="Nouvelles Commandes (Mois)"
                    value={stats.newOrdersCurrentMonth}
                    icon={Hash}
                    color="text-blue-600"
                    isLoading={loading}
                    change={null}
                />
            </div>

            {/* Widgets pour les demandes et événements */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Dernières demandes */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Dernières Demandes en Attente</h2>
                    {loading ? <p>Chargement...</p> : recentDemandes.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {recentDemandes.map(demande => (
                                <li key={demande.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {demande.clients ? `${demande.clients.first_name || ''} ${demande.clients.last_name || ''}`.trim() : 'Client non spécifié'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(demande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    {renderType(demande.type)}
                                    <Link to="/" className="text-sm text-amber-600 hover:text-amber-800">Voir</Link>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">Aucune nouvelle demande.</p>}
                </div>

                {/* Prochains événements */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Prochains Événements</h2>
                    {loading ? <p>Chargement...</p> : upcomingEvents.length > 0 ? (
                        <ul className="space-y-4">
                            {upcomingEvents.map(event => (
                                <li key={event.id} className="flex items-start">
                                    <Calendar className="w-5 h-5 text-amber-500 mr-3 mt-1"/>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{event.event_name}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(event.start_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-gray-500">Aucun événement à venir.</p>}
                </div>
            </div>
        </div>
    );
};

export default Accueil;
