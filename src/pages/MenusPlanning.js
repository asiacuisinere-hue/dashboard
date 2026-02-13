import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Calendar, Save, ChevronLeft, ChevronRight, 
    Copy, RefreshCw, Languages, Info
} from 'lucide-react';

const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const MenusPlanning = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [week, setWeek] = useState(getWeekNumber(new Date()));
    const [year, setYear] = useState(new Date().getFullYear());
    const [menuData, setMenuData] = useState({
        menu_decouverte: { fr: '', en: '', zh: '' },
        menu_standard: { fr: '', en: '', zh: '' },
        menu_confort: { fr: '', en: '', zh: '' },
        menu_duo: { fr: '', en: '', zh: '' }
    });

    const fetchMenu = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menus_planning')
                .select('*')
                .eq('year', year)
                .eq('week_number', week)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error("Error fetching menu:", error);
            }

            if (data) {
                setMenuData({
                    menu_decouverte: data.menu_decouverte || { fr: '', en: '', zh: '' },
                    menu_standard: data.menu_standard || { fr: '', en: '', zh: '' },
                    menu_confort: data.menu_confort || { fr: '', en: '', zh: '' },
                    menu_duo: data.menu_duo || { fr: '', en: '', zh: '' }
                });
            } else {
                setMenuData({
                    menu_decouverte: { fr: '', en: '', zh: '' },
                    menu_standard: { fr: '', en: '', zh: '' },
                    menu_confort: { fr: '', en: '', zh: '' },
                    menu_duo: { fr: '', en: '', zh: '' }
                });
            }
        } catch (e) {
            console.error("Fetch error:", e);
        }
        setLoading(false);
    }, [week, year]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('menus_planning')
                .upsert({
                    year,
                    week_number: week,
                    ...menuData,
                    updated_at: new Date()
                }, { onConflict: 'year, week_number' });

            if (error) throw error;
            alert(`Menu de la Semaine ${week} enregistré !`);
        } catch (e) {
            alert("Erreur: " + e.message);
        }
        setSaving(false);
    };

    const handleCopyPrevious = async () => {
        let prevWeek = week - 1;
        let prevYear = year;
        if (prevWeek === 0) {
            prevWeek = 52;
            prevYear--;
        }

        const { data } = await supabase
            .from('menus_planning')
            .select('*')
            .eq('year', prevYear)
            .eq('week_number', prevWeek)
            .single();

        if (data) {
            setMenuData({
                menu_decouverte: data.menu_decouverte,
                menu_standard: data.menu_standard,
                menu_confort: data.menu_confort,
                menu_duo: data.menu_duo
            });
            alert(`Menu copié de la semaine ${prevWeek} ! N'oubliez pas d'enregistrer.`);
        } else {
            alert("Aucun menu trouvé pour la semaine précédente.");
        }
    };

    const updateField = (formula, lang, value) => {
        setMenuData(prev => ({
            ...prev,
            [formula]: { ...prev[formula], [lang]: value }
        }));
    };

    const navigateWeek = (dir) => {
        let newWeek = week + dir;
        let newYear = year;
        if (newWeek > 52) { newWeek = 1; newYear++; }
        if (newWeek < 1) { newWeek = 52; newYear--; }
        setWeek(newWeek);
        setYear(newYear);
    };

    const formulas = [
        { key: 'menu_decouverte', label: 'Découverte' },
        { key: 'menu_standard', label: 'Standard' },
        { key: 'menu_confort', label: 'Confort' },
        { key: 'menu_duo', label: 'Duo' }
    ];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                            <Calendar className="text-amber-500" size={32} />
                            Planning des Menus
                        </h1>
                        <p className="text-gray-500 font-medium italic mt-1">Anticipez vos créations culinaires pour les semaines à venir.</p>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100">
                        <button onClick={() => navigateWeek(-1)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all text-amber-600"><ChevronLeft/></button>
                        <div className="px-6 text-center">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Semaine</p>
                            <p className="text-xl font-black text-gray-800">{week} <span className="text-gray-300 font-light">/</span> {year}</p>
                        </div>
                        <button onClick={() => navigateWeek(1)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all text-amber-600"><ChevronRight/></button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {formulas.map(f => (
                            <div key={f.key} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Formule {f.label}</h2>
                                    <Languages size={20} className="text-gray-300" />
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">🇫🇷 Français</label>
                                        <textarea 
                                            value={menuData[f.key].fr} 
                                            onChange={(e) => updateField(f.key, 'fr', e.target.value)}
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-sm h-24 focus:ring-2 focus:ring-amber-500 outline-none"
                                            placeholder="Ex: 1x Poulet Sichuan + 1x Riz..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇬🇧 English</label>
                                            <textarea 
                                                value={menuData[f.key].en} 
                                                onChange={(e) => updateField(f.key, 'en', e.target.value)}
                                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-xs h-20 outline-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇨🇳 中文</label>
                                            <textarea 
                                                value={menuData[f.key].zh} 
                                                onChange={(e) => updateField(f.key, 'zh', e.target.value)}
                                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-xs h-20 outline-none text-right"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-amber-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-600/20 sticky top-6">
                            <h3 className="text-xl font-black mb-6">Actions Semaine {week}</h3>
                            
                            <div className="space-y-4">
                                <button 
                                    onClick={handleSave} 
                                    disabled={saving || loading}
                                    className="w-full py-4 bg-white text-amber-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-50 transition-all active:scale-95"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>}
                                    Enregistrer le Menu
                                </button>

                                <button 
                                    onClick={handleCopyPrevious}
                                    className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-amber-400/50 hover:bg-amber-400 transition-all"
                                >
                                    <Copy size={18}/> Copier semaine {week-1}
                                </button>
                            </div>

                            <div className="mt-10 p-6 bg-black/10 rounded-3xl border border-white/10">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase mb-3"><Info size={14}/> Aide à la saisie</h4>
                                <div className="space-y-3 text-xs font-medium leading-relaxed opacity-80">
                                    <p>Utilisez le format <strong>"1x Nom du plat"</strong> pour le calculateur.</p>
                                    <p className="bg-white/10 p-3 rounded-xl border border-white/5 font-mono text-[10px]">
                                        1x Riz (Base)<br/>
                                        Option A: 1x Poulet<br/>
                                        Option B: 1x Porc
                                    </p>
                                    <p>Tout ce qui est avant "Option A" est compté pour tout le monde.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MenusPlanning;
