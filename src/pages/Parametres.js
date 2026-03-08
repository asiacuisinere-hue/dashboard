import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
    Building2, MessageSquare, UtensilsCrossed,
    Save, Calendar, Users, ShieldCheck, Megaphone,
    MailX, Layout, Info, Euro, Clock, MapPin, Globe, Trash2, PlusCircle, FileText, Star,
    AlertTriangle, Languages, Bell, BellRing, BellOff, RefreshCw, XCircle
} from 'lucide-react';

const communesReunion = [
    "Bras-Panon", "Cilaos", "Entre-Deux", "L'Étang-Salé", "La Plaine-des-Palmistes",
    "La Possession", "Le Port", "Le Tampon", "Les Avirons", "Les Trois-Bassins",
    "Petite-Île", "Saint-André", "Saint-Benoît", "Saint-Denis", "Saint-Joseph",
    "Saint-Leu", "Saint-Louis", "Saint-Paul", "Saint-Philippe", "Saint-Pierre",
    "Sainte-Marie", "Sainte-Rose", "Sainte-Suzanne", "Salazie"
];

const Parametres = () => {
    const { businessUnit } = useBusinessUnit();
    const [activeTab, setActiveTab] = useState('company');
    const [status, setStatus] = useState({ message: '', type: 'info' });
    const [inputLang, setInputLang] = useState('fr');

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const [companySettings, setCompanySettings] = useState({
        id: null, name: '', owner: '', address: '', city: '', phone: '', email: '',
        website: '', siret: '', tva_message: '', logo_url: '',
        order_cutoff_days: 2, order_cutoff_hour: 11,
        payment_conditions: '', payment_methods: ''
    });

    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [refusalTemplate, setRefusalTemplate] = useState('');

    const [menuDecouverte, setMenuDecouverte] = useState({ fr: '', en: '', zh: '' });
    const [menuStandard, setMenuStandard] = useState({ fr: '', en: '', zh: '' });
    const [menuConfort, setMenuConfort] = useState({ fr: '', en: '', zh: '' });
    const [menuDuo, setMenuDuo] = useState({ fr: '', en: '', zh: '' });

    const [weeklyMenuEnabled, setWeeklyMenuEnabled] = useState(true);
    const [priorityCity, setPriorityCity] = useState('');
    const [menuOverrideMessage, setMenuOverrideMessage] = useState('');
    const [menuOverrideEnabled, setMenuOverrideEnabled] = useState(false);
    const [menuDecouvertePrice, setMenuDecouvertePrice] = useState('');
    const [menuStandardPrice, setMenuStandardPrice] = useState('');
    const [menuConfortPrice, setMenuConfortPrice] = useState('');
    const [menuDuoPrice, setMenuDuoPrice] = useState('');
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementStyle, setAnnouncementStyle] = useState('info');
    const [announcementEnabled, setAnnouncementEnabled] = useState(false);

    const [specialOfferEnabled, setSpecialOfferEnabled] = useState(false);
    const [specialOffer, setSpecialOffer] = useState({
        title: { fr: '', en: '', zh: '' },
        description: { fr: '', en: '', zh: '' },
        period: '',
        cutoff: '',
        eventDate: '',
        dishes: []
    });
    const [specialOfferDisablesFormulas, setSpecialOfferDisablesFormulas] = useState(true);
    
    const [notifyCustomers, setNotifyCustomers] = useState(false);
    const [isPushEnabled, setIsPushEnabled] = useState(false);
    const [isPushLoading, setIsPushLoading] = useState(false);

    const checkPushSubscription = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsPushEnabled(!!subscription);
    }, []);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
        return outputArray;
    };

    const handleEnablePush = async () => {
        setIsPushLoading(true);
        try {
            if (!('serviceWorker' in navigator)) throw new Error("Navigateur incompatible.");
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') throw new Error("Permission refusée.");
            const registration = await navigator.serviceWorker.ready;
            const VAPID_PUBLIC_KEY = "BLjAkonu9QmbdntAaPmgfo0H_9qCHZ-MDnzLZnDtwZz077Nlhte6gptHMrg5hU7dZzw9XnKa6gd7zpKeDEz19VA"; 
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            await supabase.from('push_subscriptions').insert({ subscription: subscription.toJSON(), user_agent: navigator.userAgent, role: 'admin' });
            setIsPushEnabled(true);
            setStatus({ message: "Notifications activées !", type: 'success' });
        } catch (error) { setStatus({ message: error.message, type: 'error' }); }
        finally { setIsPushLoading(false); }
    };

    const handleDisablePush = async () => {
        setIsPushLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) await subscription.unsubscribe();
            setIsPushEnabled(false);
            setStatus({ message: "Notifications désactivées.", type: 'info' });
        } catch (error) { setStatus({ message: error.message, type: 'error' }); }
        finally { setIsPushLoading(false); }
    };

    const announcementStyles = [
        { value: 'info', label: '🔵 Info', color: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' },
        { value: 'attention', label: '⚠️ Attention', color: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b' },
        { value: 'fete', label: '🎉 Fête', color: 'rgba(236, 72, 153, 0.1)', border: '#ec4899' },
        { value: 'promotion', label: '⭐ Promotion', color: 'rgba(212, 175, 55, 0.1)', border: '#d4af37' },
        { value: 'annonce', label: '📢 Annonce', color: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6' }    
    ];

    const saveSetting = async (key, value, silent = false) => {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        const { error } = await supabase.from('settings').upsert({ key, value: stringValue }, { onConflict: 'key' });
        return !error;
    };

    const parseLangField = (val) => {
        if (!val) return { fr: '', en: '', zh: '' };
        if (typeof val === 'object') return { fr: val.fr || '', en: val.en || '', zh: val.zh || '' };     
        try {
            if (String(val).trim().startsWith('{')) {
                const parsed = JSON.parse(val);
                if (typeof parsed === 'object' && parsed !== null) return { fr: parsed.fr || '', en: parsed.en || '', zh: parsed.zh || '' };
            }
            return { fr: val, en: '', zh: '' };
        } catch (e) { return { fr: val, en: '', zh: '' }; }
    };

    const fetchAllSettings = useCallback(async () => {
        const { data: companyData } = await supabase.from('company_settings').select('*').limit(1).single();
        if (companyData) setCompanySettings(companyData);
        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
            const map = settingsData.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
            setWelcomeMessage(map.welcomePopupMessage || '');
            setRefusalTemplate(map.refusalEmailTemplate || '');
            setMenuDecouverte(parseLangField(map.menu_decouverte));
            setMenuStandard(parseLangField(map.menu_standard));
            setMenuConfort(parseLangField(map.menu_confort));
            setMenuDuo(parseLangField(map.menu_duo));
            setWeeklyMenuEnabled(map.weekly_menu_enabled !== 'false');
            setPriorityCity(map.priority_city || '');
            setMenuOverrideMessage(map.menu_override_message || '');
            setMenuOverrideEnabled(map.menu_override_enabled === 'true');
            setMenuDecouvertePrice(map.menu_decouverte_price || '39');
            setMenuStandardPrice(map.menu_standard_price || '49');
            setMenuConfortPrice(map.menu_confort_price || '59');
            setMenuDuoPrice(map.menu_duo_price || '94');
            setAnnouncementMessage(map.announcement_message || '');
            setAnnouncementStyle(map.announcement_style || 'info');
            setAnnouncementEnabled(map.announcement_enabled === 'true');
            setSpecialOfferEnabled(map.special_offer_enabled === 'true');
            setSpecialOfferDisablesFormulas(map.special_offer_disables_formulas === 'true');
            if (map.special_offer_details) {
                try {
                    const parsed = JSON.parse(map.special_offer_details);
                    const ensureLang = (f) => (typeof f === 'object' ? { fr: f.fr || '', en: f.en || '', zh: f.zh || '' } : { fr: String(f || ''), en: '', zh: '' });
                    setSpecialOffer({ title: ensureLang(parsed.title), description: ensureLang(parsed.description), period: parsed.period || '', cutoff: parsed.cutoff || '', eventDate: parsed.eventDate || '', dishes: (parsed.dishes || []).map(d => ({ ...d, name: ensureLang(d.name) })) });
                } catch(e) {}
            }
        }
    }, []);

    useEffect(() => { fetchAllSettings(); checkPushSubscription(); }, [fetchAllSettings, checkPushSubscription]);

    const handleSaveMenus = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        try {
            await Promise.all([ saveSetting('menu_decouverte', menuDecouverte, true), saveSetting('menu_standard', menuStandard, true), saveSetting('menu_confort', menuConfort, true), saveSetting('menu_duo', menuDuo, true), saveSetting('weekly_menu_enabled', weeklyMenuEnabled, true), saveSetting('menu_decouverte_price', menuDecouvertePrice, true), saveSetting('menu_standard_price', menuStandardPrice, true), saveSetting('menu_confort_price', menuConfortPrice, true), saveSetting('menu_duo_price', menuDuoPrice, true), saveSetting('priority_city', priorityCity, true) ]);
            if (notifyCustomers) { await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push-notification`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ title: "🍱 Nouveau Menu de la Semaine !", body: "Découvrez nos nouvelles saveurs authentiques.", url: "https://www.asiacuisine.re/menu.html", targetRole: "customer" }) }); }
            setStatus({ message: 'Menus mis à jour !', type: 'success' });
        } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    };

    const handleSaveSpecialOffer = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        try {
            await Promise.all([ saveSetting('special_offer_enabled', specialOfferEnabled, true), saveSetting('special_offer_details', specialOffer, true), saveSetting('special_offer_disables_formulas', specialOfferDisablesFormulas, true) ]);
            if (notifyCustomers && specialOfferEnabled) { await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-push-notification`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` }, body: JSON.stringify({ title: `✨ ${specialOffer.title.fr || 'Nouvelle Offre !'}`, body: "Une offre exclusive vient d'arriver.", url: "https://www.asiacuisine.re/menu.html", targetRole: "customer" }) }); }
            setStatus({ message: 'Offre mise à jour !', type: 'success' });
        } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    };

    const handleSaveCompany = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Enregistrement...', type: 'info' });
        const { error } = await supabase.from('company_settings').upsert(companySettings);
        if (!error) setStatus({ message: 'Identité mise à jour !', type: 'success' });
        else setStatus({ message: error.message, type: 'error' });
    };

    const handleSaveMessages = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        await Promise.all([ saveSetting('welcomePopupMessage', welcomeMessage, true), saveSetting('refusalEmailTemplate', refusalTemplate, true), saveSetting('announcement_message', announcementMessage, true), saveSetting('announcement_style', announcementStyle, true), saveSetting('announcement_enabled', announcementEnabled, true), saveSetting('menu_override_message', menuOverrideMessage, true), saveSetting('menu_override_enabled', menuOverrideEnabled, true) ]);
        setStatus({ message: 'Messages mis à jour !', type: 'success' });
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Configuration Système</h1>
                        <p className="text-gray-500 font-medium italic">Personnalisez votre interface et vos offres.</p>
                    </div>
                    {status.message && (
                        <div className={`px-6 py-3 rounded-2xl text-xs font-black shadow-md animate-in slide-in-from-top-4 ${status.type === 'success' ? 'bg-green-500 text-white' : (status.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white')}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-10 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('company')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'company' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Building2 size={16} className="mr-2"/> Identité</button>
                    <button onClick={() => setActiveTab('notifications')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'notifications' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Bell size={16} className="mr-2"/> Notifications</button>
                    <button onClick={() => setActiveTab('messages')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'messages' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><MessageSquare size={16} className="mr-2"/> Messages</button>
                    <button onClick={() => setActiveTab('menus')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'menus' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><UtensilsCrossed size={16} className="mr-2"/> Cartes & Menus</button>
                    <button onClick={() => setActiveTab('links')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'links' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Layout size={16} className="mr-2"/> Raccourcis</button>
                </div>

                <div className="animate-in fade-in duration-700">
                    {activeTab === 'notifications' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 text-center">
                                <div className={`w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg ${isPushEnabled ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                                    {isPushEnabled ? <BellRing size={48} className="animate-bounce" /> : <BellOff size={48} />}
                                </div>
                                <h2 className="text-2xl font-black text-gray-800 mb-4">Notifications sur cet appareil</h2>
                                <p className="text-gray-500 font-medium leading-relaxed mb-10">Activez les notifications push pour recevoir une alerte immédiate.</p>
                                {isPushEnabled ? (
                                    <div className="space-y-6">
                                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-green-700 font-bold text-sm inline-flex items-center gap-2"><ShieldCheck size={18}/> Notifications ACTIVES</div>
                                        <button onClick={handleDisablePush} disabled={isPushLoading} className="w-full py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-xs uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-2">{isPushLoading ? <RefreshCw className="animate-spin" size={16}/> : <XCircle size={16}/>} Désactiver</button>
                                    </div>
                                ) : (
                                    <button onClick={handleEnablePush} disabled={isPushLoading} className="w-full py-6 rounded-[2rem] bg-amber-500 text-white font-black text-lg shadow-xl hover:bg-amber-600 transition-all active:scale-95 flex items-center justify-center gap-3">{isPushLoading ? <RefreshCw className="animate-spin" size={24}/> : <Bell size={24}/>} ACTIVER LES NOTIFICATIONS</button>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'company' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-2"><Info className={`text-${themeColor}-500`}/> Informations Identité</h2>
                                    <form onSubmit={handleSaveCompany} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Nom de l'enseigne</label><input type="text" value={companySettings.name} onChange={e => setCompanySettings({...companySettings, name: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Propriétaire</label><input type="text" value={companySettings.owner} onChange={e => setCompanySettings({...companySettings, owner: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">SIRET</label><input type="text" value={companySettings.siret} onChange={e => setCompanySettings({...companySettings, siret: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div className="md:col-span-2 pt-6 border-t"><button type="submit" className="w-full py-4 bg-amber-500 rounded-2xl text-white font-black shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2"><Save size={18}/> ENREGISTRER L'IDENTITÉ</button></div>
                                    </form>
                                </div>
                                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-2"><MapPin className="text-amber-500"/> Contact & Localisation</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Adresse</label><input type="text" value={companySettings.address} onChange={e => setCompanySettings({...companySettings, address: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Ville</label><input type="text" value={companySettings.city} onChange={e => setCompanySettings({...companySettings, city: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Téléphone</label><input type="tel" value={companySettings.phone} onChange={e => setCompanySettings({...companySettings, phone: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Email Public</label><input type="email" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Clock className="text-red-500"/> Délais</h2>
                                    <div className="space-y-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Jours battement</label><input type="number" value={companySettings.order_cutoff_days} onChange={e => setCompanySettings({...companySettings, order_cutoff_days: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Heure limite</label><input type="number" value={companySettings.order_cutoff_hour} onChange={e => setCompanySettings({...companySettings, order_cutoff_hour: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black" /></div>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Globe className="text-indigo-500"/> Logo Public</h2>
                                    <input type="text" value={companySettings.logo_url} onChange={e => setCompanySettings({...companySettings, logo_url: e.target.value})} className="w-full p-3 bg-gray-50 border-0 rounded-xl text-[10px] font-mono" />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'messages' && (
                        <div className="space-y-8 max-w-4xl mx-auto">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Megaphone className="text-purple-500"/> Annonce Temporaire</h2>
                                <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <input type="checkbox" checked={announcementEnabled} onChange={e => setAnnouncementEnabled(e.target.checked)} className="w-6 h-6 rounded-lg text-purple-500" />
                                    <label className="font-bold text-gray-700">Activer le message d'annonce</label>
                                </div>
                                <div className={`space-y-6 ${announcementEnabled ? '' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {announcementStyles.map(s => (
                                            <button key={s.value} onClick={() => setAnnouncementStyle(s.value)} className={`py-2 rounded-xl text-[10px] font-black border-2 ${announcementStyle === s.value ? 'border-gray-800 bg-white' : 'border-transparent bg-gray-50'}`}>{s.label}</button>
                                        ))}
                                    </div>
                                    <textarea value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" placeholder="Ex: Fermeture exceptionnelle..." />
                                </div>
                            </div>
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-red-100 bg-red-50/10">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><AlertTriangle className="text-red-500"/> Suspension des Commandes</h2>
                                <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-red-100"><input type="checkbox" checked={menuOverrideEnabled} onChange={e => setMenuOverrideEnabled(e.target.checked)} className="w-6 h-6 text-red-500" /><label className="font-bold text-red-600">DÉSACTIVER LES COMMANDES</label></div>
                                <textarea value={menuOverrideMessage} onChange={e => setMenuOverrideMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100"><h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Layout className="text-amber-500"/> Popup Bienvenue</h2><textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-48" /></div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100"><h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><MailX className="text-red-500"/> Email de Refus</h2><textarea value={refusalTemplate} onChange={e => setRefusalTemplate(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-48" /></div>
                            </div>
                            <div className="pt-8 flex justify-end"><button onClick={handleSaveMessages} className="bg-gray-800 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all">SAUVEGARDER MESSAGES</button></div>
                        </div>
                    )}

                    {activeTab === 'menus' && (
                        <div className="space-y-8">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border-2 border-amber-400 flex justify-between items-center">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Bell className="text-amber-500 animate-pulse"/> Notifier les clients ?</h2>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked={notifyCustomers} onChange={e => setNotifyCustomers(e.target.checked)} className="sr-only peer" />
                                    <div className="w-14 h-8 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-600 after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all"></div>
                                </label>
                            </div>
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Star className="text-amber-500 fill-amber-500"/> Ville Star</h2>
                                <select value={priorityCity} onChange={e => setPriorityCity(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl">{communesReunion.map(c => <option key={c} value={c}>{c}</option>)}</select>
                            </div>
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Euro className="text-green-500"/> Tarifs Formules</h2>
                                    <button onClick={() => setWeeklyMenuEnabled(!weeklyMenuEnabled)} className={`px-6 py-3 rounded-2xl font-black text-xs ${weeklyMenuEnabled ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{weeklyMenuEnabled ? 'MENU ACTIF' : 'DÉSACTIVÉ'}</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">DÉCOUVERTE</label><input type="number" value={menuDecouvertePrice} onChange={e => setMenuDecouvertePrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">STANDARD</label><input type="number" value={menuStandardPrice} onChange={e => setMenuStandardPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">CONFORT</label><input type="number" value={menuConfortPrice} onChange={e => setMenuConfortPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">DUO</label><input type="number" value={menuDuoPrice} onChange={e => setMenuDuoPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                </div>
                            </div>
                            <div className={`bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 ${weeklyMenuEnabled ? '' : 'opacity-40'}`}>
                                <div className="flex items-center gap-2 mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit">
                                    <Languages size={16} className="text-gray-400 ml-2"/>
                                    {['fr', 'en', 'zh'].map(lang => (
                                        <button key={lang} onClick={() => setInputLang(lang)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${inputLang === lang ? 'bg-amber-500 text-white' : 'bg-gray-50 text-gray-400'}`}>{lang}</button>
                                    ))}
                                </div>
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><FileText className="text-amber-500"/> Composition ({inputLang.toUpperCase()})</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">Découverte</label><textarea value={menuDecouverte[inputLang]} onChange={e => setMenuDecouverte({...menuDecouverte, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">Standard</label><textarea value={menuStandard[inputLang]} onChange={e => setMenuStandard({...menuStandard, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">Confort</label><textarea value={menuConfort[inputLang]} onChange={e => setMenuConfort({...menuConfort, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 block mb-2">Duo</label><textarea value={menuDuo[inputLang]} onChange={e => setMenuDuo({...menuDuo, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                </div>
                                <div className="pt-10 mt-10 border-t flex justify-end"><button onClick={handleSaveMenus} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"><Save size={18}/> SAUVEGARDER & NOTIFIER</button></div>
                            </div>
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-red-100 bg-red-50/20">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><PlusCircle className="text-red-500"/> Gestion Offre Spéciale ({inputLang.toUpperCase()})</h2>
                                <div className="flex flex-wrap gap-6 mb-8">
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 shadow-sm"><input type="checkbox" checked={specialOfferEnabled} onChange={e => setSpecialOfferEnabled(e.target.checked)} className="w-6 h-6 text-red-500 rounded-lg"/><label className="font-bold text-gray-700">Activer l'offre spéciale</label></div>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"><input type="checkbox" checked={specialOfferDisablesFormulas} onChange={e => setSpecialOfferDisablesFormulas(e.target.checked)} className="w-6 h-6 text-gray-400 rounded-lg"/><label className="font-bold text-gray-500">Désactiver menus habituels</label></div>
                                </div>
                                <div className={`space-y-8 ${specialOfferEnabled ? '' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Titre Offre</label><input type="text" value={specialOffer.title[inputLang]} onChange={e => setSpecialOffer({...specialOffer, title: {...specialOffer.title, [inputLang]: e.target.value}})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-black" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Période (ex: 10 au 14 fév.)</label><input type="text" value={specialOffer.period} onChange={e => setSpecialOffer({...specialOffer, period: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl" /></div>
                                    </div>
                                    <div className="space-y-4">
                                        {specialOffer.dishes?.map((dish, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-end relative group">
                                                <button onClick={() => { const d = [...specialOffer.dishes]; d.splice(idx, 1); setSpecialOffer({...specialOffer, dishes: d}) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                                <div className="flex-1 min-w-[200px]"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Désignation ({inputLang})</label><input type="text" value={dish.name[inputLang]} onChange={e => { const d = [...specialOffer.dishes]; d[idx].name[inputLang] = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-bold" /></div>
                                                <div className="w-24"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Prix 1 (€)</label><input type="number" value={dish.price1} onChange={e => { const d = [...specialOffer.dishes]; d[idx].price1 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-black text-center" /></div>
                                                <div className="w-24"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Prix 2 (€)</label><input type="number" value={dish.price2} onChange={e => { const d = [...specialOffer.dishes]; d[idx].price2 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-black text-center" /></div>
                                            </div>
                                        ))}
                                        <button onClick={() => setSpecialOffer({...specialOffer, dishes: [...(specialOffer.dishes || []), {name: {fr:'', en:'', zh:''}, label1:'Portion A', price1:'', label2:'Portion B', price2:''}]})} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"><PlusCircle size={18}/> Ajouter un plat</button>
                                    </div>
                                </div>
                                <div className="pt-10 mt-10 border-t flex justify-end"><button onClick={handleSaveSpecialOffer} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95">SAUVEGARDER OFFRE & NOTIFIER</button></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <Link to="/calendrier" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center"><div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Calendar size={40}/></div><h3 className="text-xl font-black text-gray-800 mb-2">Calendrier</h3><p className="text-sm text-gray-400 font-medium leading-relaxed">Indisponibilités.</p></Link>
                            <Link to="/abonnements" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center"><div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Users size={40}/></div><h3 className="text-xl font-black text-gray-800 mb-2">Abonnements</h3><p className="text-sm text-gray-400 font-medium leading-relaxed">Contrats récurrents.</p></Link>
                            <Link to="/admin-account" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center"><div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><ShieldCheck size={40}/></div><h3 className="text-xl font-black text-gray-800 mb-2">Accès Sécurité</h3><p className="text-sm text-gray-400 font-medium leading-relaxed">Connexion.</p></Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Parametres;
