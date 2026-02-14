import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
    Calendar, Save, ChevronLeft, ChevronRight, 
    Copy, RefreshCw, Info, PlusSquare, Search, X, ListPlus, Trash2
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
    const [status, setStatus] = useState({ message: '', type: 'info' });
    const [week, setWeek] = useState(getWeekNumber(new Date()));
    const [year, setYear] = useState(new Date().getFullYear());
    const [menuData, setMenuData] = useState({
        menu_decouverte: { fr: '', en: '', zh: '' },
        menu_standard: { fr: '', en: '', zh: '' },
        menu_confort: { fr: '', en: '', zh: '' },
        menu_duo: { fr: '', en: '', zh: '' }
    });

    const [library, setLibrary] = useState([]);
    const [showLibrary, setShowLibrary] = useState(false);
    const [targetFormula, setTargetFormula] = useState(null);
    const [libSearch, setLibSearch] = useState('');
    const [selectedDishes, setSelectedDishes] = useState({});

    const fetchMenu = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('menus_planning')
                .select('*')
                .eq('year', year)
                .eq('week_number', week)
                .maybeSingle();

            if (error) {
                console.error("❌ Error fetching menu:", error);
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
            console.error("Fetch failed:", e);
        }
        setLoading(false);
    }, [week, year]);

    const fetchLibrary = useCallback(async () => {
        const { data } = await supabase.from('dishes_library').select('*').eq('is_active', true).order('name->fr', { ascending: true });
        if (data) setLibrary(data);
    }, []);

    useEffect(() => {
        fetchMenu();
        fetchLibrary();
    }, [fetchMenu, fetchLibrary]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('menus_planning')
                .upsert({
                    year,
                    week_number: week,
                    ...menuData
                }, { onConflict: 'year, week_number' });

            if (error) throw error;
            setStatus({ message: `Semaine ${week} enregistrée !`, type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
        } catch (e) {
            alert("Erreur: " + e.message);
        }
        setSaving(false);
    };

    const handleCopyPrevious = async () => {
        let prevWeek = week - 1;
        let prevYear = year;
        if (prevWeek === 0) { prevWeek = 52; prevYear--; }
        const { data } = await supabase.from('menus_planning').select('*').eq('year', prevYear).eq('week_number', prevWeek).single();
        if (data) {
            setMenuData({
                menu_decouverte: data.menu_decouverte,
                menu_standard: data.menu_standard,
                menu_confort: data.menu_confort,
                menu_duo: data.menu_duo
            });
            setStatus({ message: 'Menu copié !', type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
        } else {
            alert("Aucun menu trouvé pour la semaine précédente.");
        }
    };

    const handleClearMenu = () => {
        if (!window.confirm("Êtes-vous sûr de vouloir vider tout le contenu de ce planning ? Cette action effacera les 3 langues.")) return;
        setMenuData({
            menu_decouverte: { fr: '', en: '', zh: '' },
            menu_standard: { fr: '', en: '', zh: '' },
            menu_confort: { fr: '', en: '', zh: '' },
            menu_duo: { fr: '', en: '', zh: '' }
        });
        setStatus({ message: 'Planning vidé !', type: 'success' });
        setTimeout(() => setStatus({ message: '', type: 'info' }), 2000);
    };

    const updateField = (formula, lang, value) => {
        setMenuData(prev => ({
            ...prev,
            [formula]: { ...prev[formula], [lang]: value }
        }));
    };

    const updateSelectedQty = (id, delta) => {
        setSelectedDishes(prev => {
            const currentQty = prev[id] || 0;
            const newQty = currentQty + delta;
            if (newQty <= 0) {
                const { [id]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [id]: newQty };
        });
    };

    const validateLibrarySelection = () => {
        if (!targetFormula || Object.keys(selectedDishes).length === 0) {
            setShowLibrary(false);
            return;
        }
        const newMenuData = { ...menuData };
        Object.entries(selectedDishes).forEach(([dishId, qty]) => {
            const dish = library.find(d => d.id === dishId);
            if (!dish) return;
            ['fr', 'en', 'zh'].forEach(lang => {
                const dishName = dish.name[lang] || dish.name['fr'];
                const currentText = newMenuData[targetFormula][lang] || '';
                const prefix = currentText.trim() === '' ? '' : (currentText.includes('Option') ? '\n' : '\n+ ');
                newMenuData[targetFormula][lang] = currentText + prefix + `${qty}x ${dishName}`;
            });
        });
        setMenuData(newMenuData);
        setShowLibrary(false);
        setTargetFormula(null);
        setSelectedDishes({});
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

    const filteredLibrary = library.filter(d => 
        d.name.fr.toLowerCase().includes(libSearch.toLowerCase()) ||
        d.protein_type.toLowerCase().includes(libSearch.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                            <Calendar className="text-amber-500" size={32} />
                            Planning des Menus
                        </h1>
                        <p className="text-gray-500 font-medium italic mt-1">Composez vos semaines en puisant dans votre bibliothèque.</p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                        {status.message && (
                            <div className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-4">
                                {status.message}
                            </div>
                        )}
                        <div className="flex items-center gap-4 bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100">
                            <button onClick={() => navigateWeek(-1)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all text-amber-600"><ChevronLeft/></button>
                            <div className="px-6 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Semaine</p>
                                <p className="text-xl font-black text-gray-800">{week} <span className="text-gray-300 font-light">/</span> {year}</p>
                            </div>
                            <button onClick={() => navigateWeek(1)} className="p-3 hover:bg-gray-50 rounded-2xl transition-all text-amber-600"><ChevronRight/></button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-8">
                        {formulas.map(f => (
                            <div key={f.key} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50 p-6 border-b border-gray-100 flex justify-between items-center">
                                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tight">Formule {f.label}</h2>
                                    <button 
                                        onClick={() => { setTargetFormula(f.key); setShowLibrary(true); }}
                                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase hover:bg-amber-600 transition-all shadow-sm active:scale-95"
                                    >
                                        <PlusSquare size={14}/> Bibliothèque
                                    </button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">🇫🇷 Français</label>
                                        <textarea 
                                            value={menuData[f.key].fr} 
                                            onChange={(e) => updateField(f.key, 'fr', e.target.value)}
                                            className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-sm h-24 focus:ring-2 focus:ring-amber-500 outline-none shadow-inner"
                                            placeholder="Ex: 1x Riz..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇬🇧 English</label>
                                            <textarea 
                                                value={menuData[f.key].en} 
                                                onChange={(e) => updateField(f.key, 'en', e.target.value)}
                                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-xs h-20 outline-none shadow-inner"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">🇨🇳 中文</label>
                                            <textarea 
                                                value={menuData[f.key].zh} 
                                                onChange={(e) => updateField(f.key, 'zh', e.target.value)}
                                                className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-medium text-xs h-20 outline-none text-right shadow-inner"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-amber-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-amber-600/20 sticky top-6">
                            <h3 className="text-xl font-black mb-6 uppercase tracking-tighter">Actions Semaine {week}</h3>
                            <div className="space-y-4">
                                <button onClick={handleSave} disabled={saving || loading} className="w-full py-4 bg-white text-amber-600 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-amber-50 transition-all active:scale-95 shadow-md">
                                    {saving ? <RefreshCw className="animate-spin" size={18}/> : <Save size={18}/>} Enregistrer
                                </button>
                                <button onClick={handleCopyPrevious} className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 border-2 border-amber-400/50 hover:bg-amber-400 transition-all shadow-md"><Copy size={18}/> Copier semaine {week-1}</button>
                                <button onClick={handleClearMenu} className="w-full py-4 bg-red-500/20 text-white border-2 border-red-500/30 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-500/40 transition-all active:scale-95 shadow-md">
                                    <Trash2 size={18}/> Vider le planning
                                </button>
                            </div>
                            <div className="mt-10 p-6 bg-black/10 rounded-3xl border border-white/10">
                                <h4 className="flex items-center gap-2 text-[10px] font-black uppercase mb-3"><Info size={14}/> Aide à la saisie</h4>
                                <div className="space-y-3 text-xs font-medium leading-relaxed opacity-80">
                                    <p>Utilisez le format <strong>"1x Nom du plat"</strong>.</p>
                                    <p className="bg-white/10 p-3 rounded-xl border border-white/5 font-mono text-[10px]">1x Riz (Base)<br/>Option A: 1x Poulet<br/>Option B: 1x Porc</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showLibrary && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="text-xl font-black text-gray-800">Sélection multiple</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Ajoutez plusieurs plats d'un coup</p>
                            </div>
                            <button onClick={() => { setShowLibrary(false); setSelectedDishes({}); }} className="p-3 hover:bg-white rounded-full transition-all text-gray-400 hover:text-gray-600 shadow-sm"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 bg-white border-b border-gray-50">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-gray-300" size={20}/>
                                <input 
                                    type="text" 
                                    placeholder="Rechercher par nom ou viande..." 
                                    value={libSearch}
                                    onChange={(e) => setLibSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-0 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-3 scrollbar-thin">
                            {filteredLibrary.map(dish => {
                                const qty = selectedDishes[dish.id] || 0;
                                return (
                                    <div key={dish.id} className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${qty > 0 ? 'border-amber-500 bg-amber-50/20' : 'border-gray-100 hover:border-amber-200'}`}>
                                        <div className="flex items-center gap-4 flex-1">
                                            <span className="text-2xl opacity-80">
                                                {dish.protein_type === 'poulet' ? '🍗' : dish.protein_type === 'porc' ? '🥩' : dish.protein_type === 'boeuf' ? '🐂' : dish.protein_type === 'poisson' ? '🐟' : '🍲'}
                                            </span>
                                            <div>
                                                <p className="font-black text-gray-800 leading-tight">{dish.name.fr}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{dish.protein_type} • {dish.starch_type}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-4">
                                            <div className={`flex items-center rounded-xl p-1 ${qty > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                                                <button onClick={() => updateSelectedQty(dish.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-amber-600 transition-all font-bold">-</button>
                                                <span className="w-8 text-center font-black text-sm">{qty}</span>
                                                <button onClick={() => updateSelectedQty(dish.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm hover:text-amber-600 transition-all font-bold">+</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <div className="text-xs font-bold text-gray-400 uppercase">
                                {Object.keys(selectedDishes).length} plat(s) sélectionné(s)
                            </div>
                            <button 
                                onClick={validateLibrarySelection}
                                disabled={Object.keys(selectedDishes).length === 0}
                                className="px-8 py-4 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-amber-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale"
                            >
                                <ListPlus size={18}/> Valider la sélection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenusPlanning;
