import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import {
    Bell, Utensils, QrCode,
    BarChart3, ChevronRight, Clock, MapPin, CheckCircle, RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useBusinessUnit } from '../BusinessUnitContext';
import ProductionCalendar from '../components/ProductionCalendar';

const ActionTile = ({ title, count, icon: Icon, to, themeColor }) => {
    const isCourtage = themeColor === 'courtage';
    const colorClass = isCourtage ? "text-blue-600" : "text-amber-600";
    const bgColorClass = isCourtage ? "bg-blue-50/50" : "bg-green-50/50";
    const borderColorClass = isCourtage ? "border-blue-200" : "border-amber-200";

    return (
        <Link to={to} className={`flex flex-col justify-between p-6 rounded-2xl shadow-sm border-t-4 hover:shadow-md transition-all duration-200 ${bgColorClass} ${borderColorClass}`}>
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
};

const MenuReminder = () => {
    const today = new Date();
    const day = today.getDay(); // 0 = Dimanche, 4 = Jeudi, 5 = Vendredi
    const isReminderDay = (day === 4 || day === 5);

    if (!isReminderDay) return null;

    return (
        <div className="mb-8 p-6 bg-gradient-to-r from-amber-500 to-orange-600 rounded-[2rem] text-white shadow-xl flex items-center justify-between animate-bounce-subtle">
            <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                    <Utensils size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">Anticipation Menu</h2>
                    <p className="text-sm font-medium opacity-90">Chef, c'est le moment de mettre à jour le menu de la semaine prochaine !</p>
                </div>
            </div>
            <Link to="/parametres" className="bg-white text-amber-600 px-6 py-3 rounded-xl font-black text-xs uppercase hover:bg-amber-50 transition-colors shadow-lg">
                Mettre à jour
            </Link>
        </div>
    );
};

const Accueil = () => {
    const { businessUnit } = useBusinessUnit();
    const [counts, setCounts] = useState({ newDemandes: 0, toPrepare: 0 });
    const [stats, setStats] = useState({ revenueCurrentMonth: '0.00' });
    const [recentDemandes, setRecentDemandes] = useState([]);
    const [weeklyData, setWeeklyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Theme Variables
    const mainHexColor = businessUnit === 'courtage' ? '#3b82f6' : '#d4af37';

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Key Counts
            const { count: newCount } = await supabase.from('demandes')
                .select('*', { count: 'exact', head: true })
                .in('status', ['Nouvelle', 'Intention WhatsApp', 'En attente de traitement'])
                .eq('business_unit', businessUnit);

            const { count: prepCount } = await supabase.from('demandes')
                .select('*', { count: 'exact', head: true })
                .in('status', ['En attente de préparation', 'Préparation en cours'])
                .eq('business_unit', businessUnit);

            setCounts({ newDemandes: newCount || 0, toPrepare: prepCount || 0 });

            // 2. Fetch CA and Recent Demandes
            const { data: kpisData } = await supabase.rpc('get_dashboard_kpis', {
                p_period: 'currentMonth',
                p_business_unit: businessUnit
            });

            setStats({ revenueCurrentMonth: kpisData?.[0]?.total_revenue || '0.00' });

            const { data: demandesData } = await supabase
                .from('demandes')
                .select('id, created_at, type, details_json, clients(first_name, last_name)')
                .in('status', ['Nouvelle', 'Intention WhatsApp', 'En attente de traitement'])
                .eq('business_unit', businessUnit)
                .order('created_at', { ascending: false })
                .limit(3);
            setRecentDemandes(demandesData || []);

            // 3. Weekly Data (Mock)
            setWeeklyData([
                { day: 'Lun', val: businessUnit === 'cuisine' ? 120 : 0 },
                { day: 'Mar', val: businessUnit === 'cuisine' ? 450 : 0 },
                { day: 'Mer', val: businessUnit === 'cuisine' ? 300 : 0 },
                { day: 'Jeu', val: businessUnit === 'cuisine' ? 200 : 0 },
                { day: 'Ven', val: businessUnit === 'cuisine' ? 600 : 0 },
                { day: 'Sam', val: businessUnit === 'cuisine' ? 850 : 0 },
                { day: 'Dim', val: businessUnit === 'cuisine' ? 150 : 0 }
            ]);

        } catch (err) {
            console.error("Dashboard error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [businessUnit]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (error) return <div className="p-10 text-center text-red-600 bg-red-50 m-6 rounded-xl">Erreur: {error}</div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <header className="mb-10 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-black text-gray-800">Centre de Pilotage</h1>
                    <p className="text-gray-500 font-medium italic">Bon retour, voici l'état de votre activité aujourd'hui.</p>
                </div>
                <button 
                    onClick={fetchDashboardData}
                    disabled={loading}
                    className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-amber-500 transition-all active:scale-90 disabled:opacity-50"
                    title="Actualiser les données"
                >
                    <RefreshCw className={`${loading ? 'animate-spin text-amber-500' : ''}`} size={20} />
                </button>
            </header>

            {/* --- RAPPEL MISE À JOUR MENU --- */}
            <MenuReminder />

            {/* --- GRILLE D'ACTIONS --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <ActionTile
                    title="Nouvelles Demandes"
                    count={counts.newDemandes}
                    icon={Bell}
                    to="/nouvelles-demandes"
                    themeColor={businessUnit}
                />
                <ActionTile
                    title="À Préparer"
                    count={counts.toPrepare}
                    icon={Utensils}
                    to="/a-preparer"
                    themeColor={businessUnit}
                />
                <ActionTile
                    title="Scanner QR"
                    icon={QrCode}
                    to="/scanner"
                    themeColor={businessUnit}
                />
                <ActionTile
                    title="Statistiques"
                    icon={BarChart3}
                    to="/statistiques"
                    themeColor={businessUnit}
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
                            <p className={`text-2xl font-black ${businessUnit === 'courtage' ? 'text-blue-600' : 'text-green-600'}`}>{parseFloat(stats.revenueCurrentMonth).toFixed(2)}€</p>
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
                                <Bar dataKey="val" fill={mainHexColor} radius={[6, 6, 6, 6]} barSize={35} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* VUE PLANNING DE PRODUCTION */}
                    <ProductionCalendar businessUnit={businessUnit} />
                </div>

                {/* --- DERNIÈRES NOUVELLES DEMANDES --- */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800">Dernières Alertes</h2>
                        <Link to="/nouvelles-demandes" className="text-xs font-bold text-amber-600 uppercase hover:underline">Tout voir</Link>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <RefreshCw className="animate-spin text-amber-500" size={24} />
                            </div>
                        ) : recentDemandes.length > 0 ? recentDemandes.map(demande => (
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
