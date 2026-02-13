import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
    Building2, MessageSquare, UtensilsCrossed,
    Save, Calendar, Users, ShieldCheck, Megaphone,
    MailX, Layout, Info, Euro, Clock, MapPin, Globe, Trash2, PlusCircle, FileText, ToggleLeft, ToggleRight, Star,
    AlertTriangle, Languages
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
    const [inputLang, setInputLang] = useState('fr'); // 'fr', 'en', 'zh'

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const [companySettings, setCompanySettings] = useState({
        id: null, name: '', owner: '', address: '', city: '', phone: '', email: '',
        website: '', siret: '', tva_message: '', logo_url: '',
        order_cutoff_days: 2, order_cutoff_hour: 11,
        payment_conditions: '', payment_methods: ''
    });

    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [refusalTemplate, setRefusalTemplate] = useState('');
    
    // Multi-language states for Menus
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
        try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null && (parsed.fr || parsed.en || parsed.zh)) {
                return { fr: parsed.fr || '', en: parsed.en || '', zh: parsed.zh || '' };
            }
            return { fr: val, en: '', zh: '' }; // Legacy string
        } catch (e) {
            return { fr: val, en: '', zh: '' }; // Plain string
        }
    };

    const fetchAllSettings = useCallback(async () => {
        const { data: companyData } = await supabase.from('company_settings').select('*').limit(1).single();
        if (companyData) setCompanySettings(companyData);

        const { data: settingsData } = await supabase.from('settings').select('key, value');
        if (settingsData) {
            const map = settingsData.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
            setWelcomeMessage(map.welcomePopupMessage || '');
            setRefusalTemplate(map.refusalEmailTemplate || '');
            
            // Parse menu fields with multi-lang support
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
                    // Handle multi-lang conversion for legacy titles/descriptions
                    const ensureLang = (f) => typeof f === 'object' ? { fr: f.fr || '', en: f.en || '', zh: f.zh || '' } : { fr: f || '', en: '', zh: '' };
                    
                    setSpecialOffer({
                        title: ensureLang(parsed.title),
                        description: ensureLang(parsed.description),
                        period: parsed.period || '',
                        cutoff: parsed.cutoff || '',
                        eventDate: parsed.eventDate || '',
                        dishes: (parsed.dishes || []).map(d => ({
                            ...d,
                            name: ensureLang(d.name)
                        }))
                    });
                } catch(e) {
                    setSpecialOffer({ title: {fr:'', en:'', zh:''}, description: {fr:'', en:'', zh:''}, period: '', cutoff: '', eventDate: '', dishes:[] });
                }
            }
        }
    }, []);

    useEffect(() => { fetchAllSettings(); }, [fetchAllSettings]);

    const handleSaveMenus = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        await Promise.all([
            saveSetting('menu_decouverte', menuDecouverte, true),
            saveSetting('menu_standard', menuStandard, true),
            saveSetting('menu_confort', menuConfort, true),
            saveSetting('menu_duo', menuDuo, true),
            saveSetting('weekly_menu_enabled', String(weeklyMenuEnabled), true),
            saveSetting('priority_city', priorityCity, true),
            saveSetting('menu_decouverte_price', menuDecouvertePrice, true),
            saveSetting('menu_standard_price', menuStandardPrice, true),
            saveSetting('menu_confort_price', menuConfortPrice, true),
            saveSetting('menu_duo_price', menuDuoPrice, true),
        ]);
        setStatus({ message: 'Carte et Ville Prioritaire enregistrées !', type: 'success' });
        setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
    };

    const handleSaveCompany = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('company_settings').upsert(companySettings, { onConflict: 'id' });
        if (!error) setStatus({ message: 'Infos mises à jour !', type: 'success' });
        setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
    };

    const handleSaveMessages = async () => {
        await Promise.all([
            saveSetting('welcomePopupMessage', welcomeMessage, true),
            saveSetting('refusalEmailTemplate', refusalTemplate, true),
            saveSetting('announcement_message', announcementMessage, true),
            saveSetting('announcement_style', announcementStyle, true),
            saveSetting('announcement_enabled', String(announcementEnabled), true),
            saveSetting('menu_override_message', menuOverrideMessage, true),
            saveSetting('menu_override_enabled', String(menuOverrideEnabled), true),
        ]);
        setStatus({ message: 'Messages mis à jour !', type: 'success' });
        setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
    };

    const handleSaveSpecialOffer = async () => {
        await Promise.all([
            saveSetting('special_offer_enabled', String(specialOfferEnabled), true),
            saveSetting('special_offer_details', JSON.stringify(specialOffer), true),
            saveSetting('special_offer_disables_formulas', String(specialOfferDisablesFormulas), true),   
        ]);
        setStatus({ message: 'Offre spéciale enregistrée !', type: 'success' });
        setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Configuration Système</h1>
                        <p className="text-gray-500 font-medium italic">Gérez vos infos, vos messages et vos cartes tarifaires.</p>
                    </div>
                    {status.message && (
                        <div className={`px-6 py-3 rounded-2xl text-white font-bold shadow-lg animate-in slide-in-from-top-4 duration-300 ${status.type === 'success' ? 'bg-green-500' : (status.type === 'error' ? 'bg-red-500' : 'bg-blue-500')}`}>
                            {status.message}
                        </div>
                    )}
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-10 max-w-4xl overflow-x-auto scrollbar-hide">
                    <button onClick={() => setActiveTab('company')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'company' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Building2 size={16} className="mr-2"/> Entreprise</button>
                    <button onClick={() => setActiveTab('messages')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'messages' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><MessageSquare size={16} className="mr-2"/> Messages</button>
                    <button onClick={() => setActiveTab('menus')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'menus' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><UtensilsCrossed size={16} className="mr-2"/> Cartes & Menus</button>
                    <button onClick={() => setActiveTab('links')} className={`flex-1 min-w-[140px] flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'links' ? 'bg-white text-gray-800 shadow-md' : 'text-gray-500 hover:text-gray-700'}`}><Layout size={16} className="mr-2"/> Raccourcis</button>
                </div>

                <div className="animate-in fade-in duration-700">
                    {/* --- SELECTEUR DE LANGUE FLOTTANT --- */}
                    {(activeTab === 'menus') && (
                        <div className="flex items-center gap-2 mb-6 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-fit mx-auto lg:mx-0">
                            <Languages size={16} className="text-gray-400 ml-2"/>
                            {['fr', 'en', 'zh'].map(lang => (
                                <button 
                                    key={lang} 
                                    onClick={() => setInputLang(lang)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${inputLang === lang ? 'bg-amber-500 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                                >
                                    {lang}
                                </button>
                            ))}
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
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Mention légale TVA</label><input type="text" value={companySettings.tva_message} onChange={e => setCompanySettings({...companySettings, tva_message: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div className="md:col-span-2 pt-6 border-t"><button type="submit" className={`w-full py-4 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}><Save size={18}/> ENREGISTRER L'IDENTITÉ</button></div>
                                    </form>
                                </div>
                                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-2"><MapPin className={`text-${themeColor}-500`}/> Contact & Localisation</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Adresse</label><input type="text" value={companySettings.address} onChange={e => setCompanySettings({...companySettings, address: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Ville</label><input type="text" value={companySettings.city} onChange={e => setCompanySettings({...companySettings, city: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Téléphone</label><input type="tel" value={companySettings.phone} onChange={e => setCompanySettings({...companySettings, phone: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Email Public</label><input type="email" value={companySettings.email} onChange={e => setCompanySettings({...companySettings, email: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold" /></div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Site Web</label><input type="text" value={companySettings.website} onChange={e => setCompanySettings({...companySettings, website: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-mono text-xs" /></div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Clock className="text-red-500"/> Délais de Commande</h2>
                                    <div className="space-y-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-2">Jours de battement</label><input type="number" value={companySettings.order_cutoff_days} onChange={e => setCompanySettings({...companySettings, order_cutoff_days: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 ml-2">Heure limite (0-23)</label><input type="number" value={companySettings.order_cutoff_hour} onChange={e => setCompanySettings({...companySettings, order_cutoff_hour: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-xl" /></div>
                                    </div>
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Globe className="text-indigo-500"/> Logo Public</h2>
                                    <div className="mb-6 aspect-video bg-gray-50 rounded-2xl overflow-hidden border border-dashed border-gray-200 flex items-center justify-center">
                                        {companySettings.logo_url ? <img src={companySettings.logo_url} alt="Logo Preview" className="max-h-20" /> : <Building2 size={40} className="text-gray-200"/>}
                                    </div>
                                    <input type="text" value={companySettings.logo_url} onChange={e => setCompanySettings({...companySettings, logo_url: e.target.value})} placeholder="URL de l'image..." className="w-full p-3 bg-gray-50 border-0 rounded-xl text-[10px] font-mono" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- ONGLET MESSAGES --- */}
                    {activeTab === 'messages' && (
                        <div className="space-y-8 max-w-4xl mx-auto">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Megaphone className="text-purple-500"/> Annonce Temporaire</h2>
                                <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <input type="checkbox" checked={announcementEnabled} onChange={e => setAnnouncementEnabled(e.target.checked)} className="w-6 h-6 rounded-lg text-purple-500" />
                                    <label className="font-bold text-gray-700">Activer l'affichage du message d'annonce</label>
                                </div>
                                <div className={`space-y-6 transition-all ${announcementEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Style visuel</label>
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                            {announcementStyles.map(s => (
                                                <button key={s.value} onClick={() => setAnnouncementStyle(s.value)} className={`py-2 rounded-xl text-[10px] font-black transition-all border-2 ${announcementStyle === s.value ? 'border-gray-800 bg-white shadow-md' : 'border-transparent bg-gray-50 opacity-60'}`}>{s.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Texte du message</label>
                                        <textarea value={announcementMessage} onChange={e => setAnnouncementMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32 focus:ring-2 focus:ring-purple-500" placeholder="Ex: Fermeture exceptionnelle..." />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-red-100 bg-red-50/10">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><AlertTriangle className="text-red-500"/> Message de Fermeture / Suspension</h2>
                                <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                                    <input type="checkbox" checked={menuOverrideEnabled} onChange={e => setMenuOverrideEnabled(e.target.checked)} className="w-6 h-6 rounded-lg text-red-500" />
                                    <label className="font-bold text-gray-700 text-red-600">DÉSACTIVER TOTALEMENT LES COMMANDES (Message Prioritaire)</label>
                                </div>
                                <div className={`space-y-4 ${menuOverrideEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Message affiché à la place du semainier (Markdown)</label>
                                    <textarea value={menuOverrideMessage} onChange={e => setMenuOverrideMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32 border border-gray-100" placeholder="Ex: ## Désolé ! Notre cuisine est en travaux jusqu'au 15 Mars." />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><Layout className="text-amber-500"/> Popup Bienvenue</h2>
                                    <textarea value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-48 focus:ring-2 focus:ring-amber-500" placeholder="Message qui s'affiche à l'ouverture du site..." />
                                </div>
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                                    <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2"><MailX className="text-red-500"/> Email de Refus</h2>
                                    <textarea value={refusalTemplate} onChange={e => setRefusalTemplate(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-48 focus:ring-2 focus:ring-red-500" placeholder="Modèle de réponse pour les dates indisponibles..." />
                                </div>
                            </div>
                            <div className="pt-8 flex justify-end"><button onClick={handleSaveMessages} className="bg-gray-800 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95">SAUVEGARDER COMMUNICATIONS</button></div>
                        </div>
                    )}

                    {/* --- ONGLET MENUS --- */}
                    {activeTab === 'menus' && (
                        <div className="space-y-8">
                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border-2 border-amber-400 bg-amber-50/10">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Star className="text-amber-500 fill-amber-500"/> Ville Prioritaire de la Semaine (Star City)</h2>    
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Sélectionnez la ville mise en avant</label>
                                        <select
                                            value={priorityCity}
                                            onChange={e => setPriorityCity(e.target.value)}
                                            className="w-full p-4 bg-white border-0 rounded-2xl font-black text-xl shadow-inner ring-1 ring-gray-200 focus:ring-2 focus:ring-amber-500"
                                        >
                                            <option value="">-- Aucune ville prioritaire --</option>      
                                            {communesReunion.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl border border-amber-100 shadow-sm">
                                        <p className="text-xs font-medium text-gray-500 italic">Cette ville sera mise en avant sur vos cartes logistiques avec un badge doré 🌟.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Euro className="text-green-500"/> Tarification des Formules (€)</h2>
                                    <button
                                        onClick={() => setWeeklyMenuEnabled(!weeklyMenuEnabled)}
                                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs transition-all ${weeklyMenuEnabled ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}
                                    >
                                        {weeklyMenuEnabled ? <ToggleRight size={24}/> : <ToggleLeft size={24}/>}
                                        {weeklyMenuEnabled ? 'MENU SEMAINE ACTIF' : 'MENU SEMAINE DÉSACTIVÉ'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">DÉCOUVERTE</label><input type="number" value={menuDecouvertePrice} onChange={e => setMenuDecouvertePrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">STANDARD</label><input type="number" value={menuStandardPrice} onChange={e => setMenuStandardPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">CONFORT</label><input type="number" value={menuConfortPrice} onChange={e => setMenuConfortPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">DUO</label><input type="number" value={menuDuoPrice} onChange={e => setMenuDuoPrice(e.target.value)} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-black text-2xl" /></div>
                                </div>
                            </div>

                            <div className={`bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 transition-opacity ${weeklyMenuEnabled ? 'opacity-100' : 'opacity-40'}`}>
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><FileText className="text-amber-500"/> Composition du Menu Semaine <span className="text-amber-500 font-black uppercase text-xs ml-auto">En {inputLang}</span></h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Contenu Découverte ({inputLang})</label><textarea value={menuDecouverte[inputLang]} onChange={e => setMenuDecouverte({...menuDecouverte, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Contenu Standard ({inputLang})</label><textarea value={menuStandard[inputLang]} onChange={e => setMenuStandard({...menuStandard, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Contenu Confort ({inputLang})</label><textarea value={menuConfort[inputLang]} onChange={e => setMenuConfort({...menuConfort, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                    <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 block mb-2">Contenu Duo ({inputLang})</label><textarea value={menuDuo[inputLang]} onChange={e => setMenuDuo({...menuDuo, [inputLang]: e.target.value})} className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium h-32" /></div>
                                </div>
                                <div className="pt-10 mt-10 border-t flex justify-end">
                                    <button onClick={handleSaveMenus} className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all active:scale-95 flex items-center gap-2"><Save size={18}/> SAUVEGARDER TOUTES LES LANGUES</button>
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-red-100 bg-red-50/20">
                                <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><PlusCircle className="text-red-500"/> Gestion Offre Spéciale <span className="text-red-500 font-black uppercase text-xs ml-auto">En {inputLang}</span></h2>
                                <div className="flex flex-wrap gap-6 mb-8">
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-red-100 shadow-sm"><input type="checkbox" checked={specialOfferEnabled} onChange={e => setSpecialOfferEnabled(e.target.checked)} className="w-6 h-6 text-red-500 rounded-lg"/><label className="font-bold text-gray-700">Activer l'offre spéciale</label></div>
                                    <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"><input type="checkbox" checked={specialOfferDisablesFormulas} onChange={e => setSpecialOfferDisablesFormulas(e.target.checked)} className="w-6 h-6 text-gray-400 rounded-lg"/><label className="font-bold text-gray-500">Désactiver menus habituels</label></div>
                                </div>
                                <div className={`space-y-8 transition-all ${specialOfferEnabled ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Titre de l'Offre ({inputLang})</label><input type="text" value={specialOffer.title[inputLang]} onChange={e => setSpecialOffer({...specialOffer, title: {...specialOffer.title, [inputLang]: e.target.value}})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-black" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Description ({inputLang})</label><input type="text" value={specialOffer.description[inputLang]} onChange={e => setSpecialOffer({...specialOffer, description: {...specialOffer.description, [inputLang]: e.target.value}})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Période de l'offre (ex: 10 au 14 fév.)</label><input type="text" value={specialOffer.period} onChange={e => setSpecialOffer({...specialOffer, period: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Date de l'événement (Fixe pour la commande)</label><input type="date" value={specialOffer.eventDate} onChange={e => setSpecialOffer({...specialOffer, eventDate: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-bold" /></div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase block mb-2 ml-2">Date limite de commande (pour compte à rebours)</label><input type="datetime-local" value={specialOffer.cutoff} onChange={e => setSpecialOffer({...specialOffer, cutoff: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl font-bold" /></div>
                                    </div>
                                    <div className="space-y-4">
                                        {specialOffer.dishes?.map((dish, idx) => (
                                            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-wrap gap-4 items-end relative group">
                                                <button onClick={() => { const d = [...specialOffer.dishes]; d.splice(idx, 1); setSpecialOffer({...specialOffer, dishes: d}) }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                                <div className="flex-1 min-w-[200px]"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Désignation ({inputLang})</label><input type="text" value={dish.name[inputLang]} onChange={e => { const d = [...specialOffer.dishes]; d[idx].name[inputLang] = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-bold" /></div>
                                                <div className="w-32"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Unité 1</label><input type="text" value={dish.label1} onChange={e => { const d = [...specialOffer.dishes]; d[idx].label1 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-medium" /></div>
                                                <div className="w-24"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Prix 1 (€)</label><input type="number" value={dish.price1} onChange={e => { const d = [...specialOffer.dishes]; d[idx].price1 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-black text-center" /></div>
                                                <div className="w-32"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Unité 2</label><input type="text" value={dish.label2} onChange={e => { const d = [...specialOffer.dishes]; d[idx].label2 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-medium" /></div>
                                                <div className="w-24"><label className="text-[9px] font-black text-gray-300 uppercase block mb-1">Prix 2 (€)</label><input type="number" value={dish.price2} onChange={e => { const d = [...specialOffer.dishes]; d[idx].price2 = e.target.value; setSpecialOffer({...specialOffer, dishes: d}) }} className="w-full p-3 bg-gray-50 border-0 rounded-xl font-black text-center" /></div>
                                            </div>
                                        ))}
                                        <button onClick={() => setSpecialOffer({...specialOffer, dishes: [...(specialOffer.dishes || []), {name: {fr:'', en:'', zh:''}, label1:'Portion A', price1:'', label2:'Portion B', price2:''}]})} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"><PlusCircle size={18}/> Ajouter un plat</button>
                                    </div>
                                </div>
                                <div className="pt-10 mt-10 border-t flex justify-end"><button onClick={handleSaveSpecialOffer} className="bg-red-600 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-red-700 transition-all active:scale-95">SAUVEGARDER TOUTES LES LANGUES (OFFRE)</button></div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <Link to="/calendrier" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Calendar size={40}/></div>
                                <h3 className="text-xl font-black text-gray-800 mb-2">Calendrier</h3>     
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">Gérez vos jours de fermeture et les indisponibilités.</p>
                            </Link>
                            <Link to="/abonnements" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center">
                                <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><Users size={40}/></div> 
                                <h3 className="text-xl font-black text-gray-800 mb-2">Abonnements</h3>    
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">Pilotez vos contrats récurrents.</p>
                            </Link>
                            <Link to="/admin-account" className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl transition-all group text-center">
                                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform"><ShieldCheck size={40}/></div>
                                <h3 className="text-xl font-black text-gray-800 mb-2">Accès Sécurité</h3>
                                <p className="text-sm text-gray-400 font-medium leading-relaxed">Mettez à jour vos informations de connexion.</p>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Parametres;
