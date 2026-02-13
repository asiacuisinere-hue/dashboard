import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import {
    RefreshCw, ChefHat, Calendar,
    Printer, Star, Info, Scale
} from 'lucide-react';

const Consolidation = () => {
    const { businessUnit } = useBusinessUnit();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [menuSettings, setMenuSettings] = useState({});
    const [consolidatedData, setConsolidation] = useState({ dishes: {}, specialItems: {} });
    const [marketList, setMarketList] = useState({ poulet: 0, porc: 0, boeuf: 0, poisson: 0, riz: 0, nouilles: 0 });
    const [dateFilter, setDateFilter] = useState('');

    const getLangText = (dataField) => {
        if (!dataField) return "";
        let obj = dataField;
        if (typeof dataField === 'string') {
            try { obj = JSON.parse(dataField); } catch(e) { return dataField; }
        }
        if (typeof obj !== 'object' || obj === null) return String(dataField);
        return obj['fr'] || obj['en'] || obj['zh'] || Object.values(obj).find(v => v !== "") || "";       
    };

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const { data: settingsData } = await supabase.from('settings').select('key, value')
            .in('key', ['menu_decouverte', 'menu_standard', 'menu_confort', 'menu_duo']);

        const settingsMap = settingsData?.reduce((acc, s) => {
            try { acc[s.key] = JSON.parse(s.value); } catch(e) { acc[s.key] = { fr: s.value }; }
            return acc;
        }, {}) || {};
        setMenuSettings(settingsMap);

        const toPrepareStatuses = ['En attente de préparation', 'Préparation en cours', 'Prêt pour livraison'];
        let query = supabase.from('demandes').select(`*, details_json`).in('status', toPrepareStatuses).eq('business_unit', businessUnit);
        if (dateFilter) { query = query.eq('request_date', dateFilter); }

        const { data: ordersData, error } = await query;
        if (!error) setOrders(ordersData || []);
        setLoading(false);
    }, [businessUnit, dateFilter]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const parseMenuContent = (contentStr) => {
        if (!contentStr) return [];
        const regex = /(\d+)\s*x\s*([^*+\n<]+)/gi;
        const dishes = [];
        let match;
        while ((match = regex.exec(contentStr)) !== null) {
            dishes.push({ qty: parseInt(match[1]), name: match[2].trim() });
        }
        return dishes;
    };

    const calculateMarketNeeds = (dishes, specials) => {
        const needs = { poulet: 0, porc: 0, boeuf: 0, poisson: 0, riz: 0, nouilles: 0 };
        
        const processItem = (name, qty) => {
            const n = name.toLowerCase();
            
            // --- PROTEIN DETECTION (150g per portion) ---
            if (n.includes('poulet') || n.includes('canard') || n.includes('dinde') || n.includes('oie') || n.includes('volaille')) {
                needs.poulet += qty * 0.15;
            }
            else if (n.includes('porc') || n.includes('cochon') || n.includes('lard') || n.includes('poitrine') || n.includes('travers')) {
                needs.porc += qty * 0.15;
            }
            else if (n.includes('boeuf') || n.includes('bœuf') || n.includes('veau')) {
                needs.boeuf += qty * 0.15;
            }
            else if (n.includes('poisson') || n.includes('crevette') || n.includes('gambas') || n.includes('thon') || n.includes('saumon') || 
                     n.includes('calamar') || n.includes('encornet') || n.includes('seiche') || n.includes('crabe') || n.includes('langouste') || 
                     n.includes('jacques') || n.includes('daurade') || n.includes('cabillaud') || n.includes('lotte') || n.includes('mer')) {
                needs.poisson += qty * 0.15;
            }

            // --- STARCH DETECTION (100g raw per portion) ---
            if (n.includes('nouilles') || n.includes('ramen') || n.includes('udon') || n.includes('soba') || n.includes('somen') || n.includes('vermicelle')) {
                needs.nouilles += qty * 0.1;
            } else {
                needs.riz += qty * 0.1; 
            }
        };

        Object.entries(dishes).forEach(([name, qty]) => processItem(name, qty));
        Object.entries(specials).forEach(([name, qty]) => processItem(name, qty));

        return needs;
    };

    const consolidate = useCallback(() => {
        const dishTotals = {};
        const specialTotals = {};
        orders.forEach(order => {
            let details = order.details_json;
            if (typeof details === 'string') { try { details = JSON.parse(details); } catch(e) {} }
            if (details && details["0"] !== undefined) { try { details = JSON.parse(Object.values(details).join('')); } catch(e) {} }

            if (order.type === 'COMMANDE_MENU') {
                const formula = details?.formulaName || "";
                const option = details?.formulaOption || "Option A";
                
                let settingKey = 'menu_standard';
                if (formula.includes('Découverte')) settingKey = 'menu_decouverte';
                else if (formula.includes('Standard')) settingKey = 'menu_standard';
                else if (formula.includes('Confort')) {
                    settingKey = menuSettings['menu_confort']?.fr ? 'menu_confort' : 'menu_standard';
                }
                else if (formula.includes('Duo')) settingKey = 'menu_standard';

                const menuObj = menuSettings[settingKey];
                if (menuObj) {
                    const fullText = menuObj.fr || "";
                    const parts = fullText.split(/Option\s*[AB][:.-]?/i);
                    let baseText = parts[0]; 
                    let optionText = "";
                    if (option.toUpperCase().includes('OPTION A') && parts.length > 1) { optionText = parts[1]; } 
                    else if (option.toUpperCase().includes('OPTION B') && parts.length > 2) { optionText = parts[2]; }
                    const relevantText = baseText + " " + optionText;
                    const dishes = parseMenuContent(relevantText);
                    const multiplier = formula.includes('Duo') ? 2 : 1;
                    dishes.forEach(d => { dishTotals[d.name] = (dishTotals[d.name] || 0) + (d.qty * multiplier); });
                }
            } else if (order.type === 'COMMANDE_SPECIALE') {
                const items = Array.isArray(details) ? details : (details?.cart || []);
                items.forEach(item => {
                    const dishName = getLangText(item.name);
                    const key = `${dishName} (${item.portion})`;
                    specialTotals[key] = (specialTotals[key] || 0) + parseInt(item.quantity || 0);        
                });
            }
        });
        setConsolidation({ dishes: dishTotals, specialItems: specialTotals });
        setMarketList(calculateMarketNeeds(dishTotals, specialTotals));
    }, [orders, menuSettings]);

    useEffect(() => { if (!loading) consolidate(); }, [orders, loading, consolidate]);

    const handlePrint = () => window.print();

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="print-only hidden print:block mb-10 border-b-4 border-gray-800 pb-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900">ASIACUISINE.RE</h1>
                        <p className="text-xl font-bold text-gray-600 uppercase tracking-widest mt-2">Bon de Production & Achats</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-gray-400 uppercase">Prévu pour le</p>
                        <p className="text-2xl font-black text-gray-900">{dateFilter ? new Date(dateFilter).toLocaleDateString('fr-FR', {weekday:'long', day:'numeric', month:'long'}) : 'Toutes dates'}</p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-center mb-8 no-print">
                    <div>
                        <h1 className="text-3xl font-black text-gray-800 mb-2">Consolidation de Cuisine</h1>
                        <p className="text-gray-500 font-medium italic">Assistant intelligent pour votre production et vos achats.</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={fetchAllData} className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-amber-500 transition-all"><RefreshCw size={20}/></button>      
                        <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-4 bg-gray-800 text-white rounded-2xl font-black shadow-lg hover:bg-black transition-all active:scale-95"><Printer size={18}/> IMPRIMER BON</button>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-wrap items-center gap-6 no-print">
                    <div className="flex items-center gap-3">
                        <Calendar className="text-amber-500" size={24}/>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Filtrer par date</p>
                            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-transparent border-0 font-black text-gray-800 outline-none" />
                        </div>
                    </div>
                    <div className="h-10 w-px bg-gray-100"></div>
                    <div className="flex-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Commandes analysées</p>
                        <p className="text-lg font-black text-gray-800">{orders.length} dossier(s)</p>    
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 text-center no-print"><RefreshCw className="animate-spin text-amber-500 mx-auto" size={48}/></div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><ChefHat className="text-amber-500"/> Menus Hebdomadaires</h2>
                                <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden print:border-0 print:shadow-none">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 print:bg-gray-100">
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 w-16 text-center">Qté</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400">Plat</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 w-16 text-center print:table-cell hidden">Fait</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {Object.entries(consolidatedData.dishes).map(([name, qty]) => (
                                                <tr key={name} className="hover:bg-gray-50 transition-colors">
                                                    <td className="p-4 text-center font-black text-lg text-amber-600">{qty}</td>
                                                    <td className="p-4 font-bold text-gray-700">{name}</td>
                                                    <td className="p-4 text-center print:table-cell hidden text-gray-200">[ ]</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Star className="text-red-500"/> Offres Spéciales</h2>
                                <div className="bg-white rounded-[2rem] shadow-sm border border-red-100 overflow-hidden print:border-0 print:shadow-none">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-red-50/30 print:bg-gray-100">
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 w-16 text-center">Qté</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400">Article</th>
                                                <th className="p-4 text-[10px] font-black uppercase text-gray-400 w-16 text-center print:table-cell hidden">Fait</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {Object.entries(consolidatedData.specialItems).map(([name, qty]) => (
                                                <tr key={name} className="hover:bg-red-50/10 transition-colors">
                                                    <td className="p-4 text-center font-black text-lg text-red-600">{qty}</td>
                                                    <td className="p-4 font-bold text-gray-700">{name}</td>
                                                    <td className="p-4 text-center print:table-cell hidden text-gray-200">[ ]</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h2 className="text-xl font-black text-gray-800 flex items-center gap-3"><Scale className="text-green-600"/> 🛒 LISTE DE MARCHÉ (POIDS CRUS)</h2>
                            <div className="bg-white rounded-[2rem] shadow-sm border border-green-100 overflow-hidden">
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-50">
                                    {marketList.poulet > 0 && <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🍗 Poulet</p><p className="text-xl font-black text-gray-800">{marketList.poulet.toFixed(2)} kg</p></div>}
                                    {marketList.porc > 0 && <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🥩 Porc</p><p className="text-xl font-black text-gray-800">{marketList.porc.toFixed(2)} kg</p></div>}
                                    {marketList.boeuf > 0 && <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🐂 Bœuf</p><p className="text-xl font-black text-gray-800">{marketList.boeuf.toFixed(2)} kg</p></div>}
                                    {marketList.poisson > 0 && <div className="p-6 text-center"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🐟 Poisson</p><p className="text-xl font-black text-gray-800">{marketList.poisson.toFixed(2)} kg</p></div>}
                                    {marketList.riz > 0 && <div className="p-6 text-center bg-gray-50/50"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🍚 Riz (Cru)</p><p className="text-xl font-black text-blue-600">{marketList.riz.toFixed(2)} kg</p></div>}
                                    {marketList.nouilles > 0 && <div className="p-6 text-center bg-gray-50/50"><p className="text-[10px] font-black text-gray-400 uppercase mb-1">🍜 Nouilles</p><p className="text-xl font-black text-blue-600">{marketList.nouilles.toFixed(2)} kg</p></div>}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                <div className="mt-12 p-8 bg-blue-50 rounded-[2rem] border border-blue-100 no-print flex items-start gap-4">
                    <Info className="text-blue-500 mt-1" size={24}/>
                    <div>
                        <h3 className="text-sm font-black text-blue-800 uppercase tracking-widest mb-2">Informations Techniques</h3>
                        <p className="text-sm text-blue-700 font-medium leading-relaxed">
                            Calculs basés sur vos fiches techniques : Viandes (150g), Riz (100g cru pour 250g cuit), Nouilles (100g cru pour 200g cuit). Les légumes sont à ajuster selon la saison.
                        </p>
                    </div>
                </div>

                <div className="print-only hidden print:block mt-20 border-t pt-6 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                    Généré par le Dashboard Asiacuisine.re – {new Date().toLocaleString('fr-FR')}    
                </div>
            </div>

            <style>{`
                @media print {
                    @page { margin: 1cm; size: auto; }
                    aside, nav, header, .no-print, button, .sidebar, .navbar { display: none !important; }
                    body, html { background: white !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
                    main, .p-6, .max-w-5xl { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 !important; background: white !important; box-shadow: none !important; overflow: visible !important; }
                    .grid { display: block !important; }
                    .space-y-6 { margin-bottom: 2rem !important; }
                    table { border: 1px solid #eee !important; width: 100% !important; }
                    th, td { border-bottom: 1px solid #eee !important; padding: 12px !important; }        
                    .print-only { display: block !important; visibility: visible !important; }
                }
            `}</style>
        </div>
    );
};

export default Consolidation;
