import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import { 
    DollarSign, Calendar, Hash, Bell, Utensils, QrCode, 
    BarChart3, ChevronRight, Clock, MapPin 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const ActionTile = ({ title, count, icon: Icon, to, colorClass, bgColorClass }) => (
    <Link to={to} className={`flex flex-col justify-between p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 ${bgColorClass}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl ${colorClass} bg-white shadow-sm`}>
                <Icon size={24} />
            </div>
            {count !== undefined && (
                <span className="text-3xl font-black text-gray-800">{count}</span>
            )}
        </div>
        <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
                <span>Accéder</span>
                <ChevronRight size={14} className="ml-1" />
            </div>
        </div>
    </Link>
);

const Accueil = () => {
    const [counts, setCounts] = useState({ newDemandes: 0, toPrepare: 0 });
    const [stats, setStats] = useState({ revenueCurrentMonth: '0.00' });
    const [recentDemandes, setRecentDemandes] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Key Counts
                const { count: newCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('status', 'Nouvelle');
                const { count: prepCount } = await supabase.from('demandes').select('*', { count: 'exact', head: true }).in('status', ['En attente de préparation', 'Préparation en cours']);
                setCounts({ newDemandes: newCount || 0, toPrepare: prepCount || 0 });

                // 2. Fetch CA and Recent Demandes
                const { data: kpisData } = await supabase.rpc('get_dashboard_kpis');
                setStats({ revenueCurrentMonth: kpisData?.[0]?.total_revenue || '0.00' });

                const { data: demandesData } = await supabase
                    .from('demandes')
                    .select('id, created_at, type, details_json, clients(first_name, last_name)')
                    .eq('status', 'Nouvelle')
                    .order('created_at', { ascending: false })
                    .limit(3);
                setRecentDemandes(demandesData || []);

                // 3. Mock Weekly Data (for demonstration, can be replaced by real RPC later)
                setWeeklyData([
                    { day: 'Lun', val: 120 }, { day: 'Mar', val: 450 }, { day: 'Mer', val: 300 },
                    { day: 'Jeu', val: 200 }, { day: 'Ven', val: 600 }, { day: 'Sam', val: 850 }, { day: 'Dim', val: 150 }
                ]);

            } catch (err) {
                console.error("Dashboard error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (error) return <div className="p-10 text-center text-red-600 bg-red-50 m-6 rounded-xl">Erreur: {error}</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-10">
                <h1 className="text-3xl font-black text-gray-800">Centre de Pilotage</h1>
                <p className="text-gray-500 font-medium">Bon retour, voici l'état de votre activité aujourd'hui.</p>
            </header>

            {/* --- GRILLE D'ACTIONS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <ActionTile 
                    title="Nouvelles Demandes" 
                    count={counts.newDemandes} 
                    icon={Bell} 
                    to="/nouvelles-demandes"
                    colorClass="text-green-600"
                    bgColorClass="bg-green-50/50"
                />
                <ActionTile 
                    title="À Préparer" 
                    count={counts.toPrepare} 
                    icon={Utensils} 
                    to="/a-preparer"
                    colorClass="text-purple-600"
                    bgColorClass="bg-purple-50/50"
                />
                <ActionTile 
                    title="Scanner QR" 
                    icon={QrCode} 
                    to="/scanner"
                    colorClass="text-blue-600"
                    bgColorClass="bg-blue-50/50"
                />
                <ActionTile 
                    title="Statistiques" 
                    icon={BarChart3} 
                    to="/statistiques"
                    colorClass="text-amber-600"
                    bgColorClass="bg-amber-50/50"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- APERÇU ACTIVITÉ HEBDOMADAIRE --- */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Activité de la semaine</h2>
                            <p className="text-sm text-gray-500">Volume de commandes quotidien</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-green-600">{parseFloat(stats.revenueCurrentMonth).toFixed(2)}€</p>
                            <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">CA du mois</p>
                        </div>
                    </div>
                    
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="val" fill="#d4af37" radius={[6, 6, 6, 6]} barSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* --- DERNIÈRES NOUVELLES DEMANDES --- */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Dernières Alertes</h2>
                        <Link to="/nouvelles-demandes" className="text-xs font-bold text-amber-600 uppercase hover:underline">Tout voir</Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? <p className="text-center py-4 text-gray-400">Chargement...</p> : recentDemandes.length > 0 ? recentDemandes.map(demande => (
                            <div key={demande.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                <div className="flex justify-between items-start">
                                    <p className="font-bold text-gray-800">
                                        {demande.clients ? `${demande.clients.first_name || ''} ${demande.clients.last_name || ''}` : 'Client Web'}
                                    </p>
                                    <span className="text-[10px] bg-white px-2 py-1 rounded-md shadow-xs border border-gray-100 font-bold text-gray-400">NOUVEAU</span>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 gap-3">
                                    <div className="flex items-center"><Clock size={12} className="mr-1"/> {new Date(demande.created_at).toLocaleDateString('fr-FR', {day: 'numeric', month: 'short'})}</div>
                                    <div className="flex items-center"><MapPin size={12} className="mr-1"/> {demande.details_json?.deliveryCity || '—'}</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-10">
                                <div className="bg-green-50 text-green-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle size={24} />
                                </div>
                                <p className="text-sm text-gray-500">Tout est à jour !</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Accueil;