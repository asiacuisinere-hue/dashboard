import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import {
    Euro, ClipboardList,
    RefreshCw, FilePlus, QrCode, Mail,
    Phone, Save, ShoppingCart, ChefHat, XCircle,
    MessageCircle, PackageCheck, Truck, ListChecks,
    Gift, Tag, History, Heart
} from 'lucide-react';

const communesReunion = [
    "Bras-Panon", "Cilaos", "Entre-Deux", "L'Étang-Salé", "La Plaine-des-Palmistes",
    "La Possession", "Le Port", "Le Tampon", "Les Avirons", "Les Trois-Bassins",
    "Petite-Île", "Saint-André", "Saint-Benoît", "Saint-Denis", "Saint-Joseph",
    "Saint-Leu", "Saint-Louis", "Saint-Paul", "Saint-Philippe", "Saint-Pierre",
    "Sainte-Marie", "Sainte-Rose", "Sainte-Suzanne", "Salazie"
];

const DemandeDetail = ({ demande, onClose, onUpdateStatus, onRefresh }) => {
    const navigate = useNavigate();
    const { businessUnit } = useBusinessUnit();
    const initializedRef = useRef(null);

    const [details, setDetails] = useState({});
    const [requestDate, setRequestDate] = useState('');
    const [totalAmount, setTotalAmount] = useState(demande.total_amount || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
    const [isSendingQrCode, setIsSendingQrCode] = useState(false);
    const [isGeneratingStripeLink, setIsGeneratingStripeLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');

    // --- CRM STATES ---
    const [customerHistory, setCustomerHistory] = useState([]);
    const [customerNotes, setCustomerNotes] = useState('');
    const [isSavingNotes, setIsSavingNotes] = useState(false);

    const [discount, setDiscount] = useState(0);
    const [freeDelivery, setFreeDelivery] = useState(false);

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const getLangText = (dataField) => {
        if (!dataField) return "";
        let obj = dataField;
        if (typeof dataField === 'string') {
            try { obj = JSON.parse(dataField); } catch(e) { return dataField; }
        }
        if (typeof obj !== 'object' || obj === null) return String(dataField);
        return obj['fr'] || obj['en'] || obj['zh'] || Object.values(obj).find(v => v !== "") || "";       
    };

    const fetchCustomerCRM = useCallback(async (email) => {
        if (!email) return;
        const { data: history } = await supabase
            .from('demandes')
            .select('id, request_date, type, total_amount, status')
            .eq('customer_email', email)
            .neq('id', demande.id)
            .order('request_date', { ascending: false });
        setCustomerHistory(history || []);

        const table = demande.clients ? 'clients' : 'entreprises';
        const id = demande.clients?.id || demande.entreprises?.id;
        if (id) {
            const { data: profile } = await supabase.from(table).select('internal_notes').eq('id', id).single();
            setCustomerNotes(profile?.internal_notes || '');
        }
    }, [demande.id, demande.clients, demande.entreprises]);

    const initializeModal = useCallback(async () => {
        let rawData = demande.details_json || {};
        let parsedDetails = rawData;
        if (typeof rawData === 'string') {
            try { parsedDetails = JSON.parse(rawData); } catch (e) {}
        }
        if (typeof rawData === 'object' && rawData !== null && rawData["0"] !== undefined) {
            try {
                const reconstructedString = Object.values(rawData).join('');
                parsedDetails = JSON.parse(reconstructedString);
            } catch (e) { console.error("JSON reconstruction failed", e); }
        }

        setDetails(parsedDetails);
        setDiscount(parsedDetails.discount || 0);
        setFreeDelivery(parsedDetails.freeDelivery || false);
        setRequestDate(demande.request_date ? new Date(demande.request_date).toISOString().split('T')[0] : '');

        const email = demande.clients?.email || demande.entreprises?.contact_email || demande.customer_email;
        fetchCustomerCRM(email);

        let initialAmount = demande.total_amount;
        if ((!initialAmount || initialAmount <= 0) && demande.type === 'COMMANDE_MENU') {
            try {
                const { data: settingsList } = await supabase
                    .from('settings').select('key, value')
                    .in('key', ['menu_decouverte_price', 'menu_standard_price', 'menu_duo_price', 'menu_confort_price']);
                if (settingsList) {
                    const prices = {};
                    settingsList.forEach(s => { prices[s.key] = parseFloat(s.value); });
                    const formula = parsedDetails?.formulaName || "";
                    let calculated = 0;
                    if (formula.includes('Découverte')) calculated = prices['menu_decouverte_price'];    
                    else if (formula.includes('Standard')) calculated = prices['menu_standard_price'];    
                    else if (formula.includes('Confort')) calculated = prices['menu_confort_price'];      
                    else if (formula.includes('Duo')) calculated = prices['menu_duo_price'];
                    if (calculated > 0) {
                        initialAmount = calculated;
                        setTotalAmount(calculated);
                        await supabase.from('demandes').update({ total_amount: calculated }).eq('id', demande.id);
                    }
                }
            } catch (err) {}
        }
        setTotalAmount(initialAmount || '');
    }, [demande, fetchCustomerCRM]);

    useEffect(() => {
        if (initializedRef.current === demande.id) return;
        initializedRef.current = demande.id;
        initializeModal();
    }, [demande.id, initializeModal]);

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleDiscountChange = (val) => {
        const newDiscount = parseFloat(val) || 0;
        const diff = newDiscount - discount;
        setDiscount(newDiscount);
        if (totalAmount !== '') {
            setTotalAmount(prev => Math.max(0, parseFloat(prev) - diff).toFixed(2));
        }
    };

    const handleSaveCustomerNotes = async () => {
        setIsSavingNotes(true);
        const table = demande.clients ? 'clients' : 'entreprises';
        const id = demande.clients?.id || demande.entreprises?.id;
        const { error } = await supabase.from(table).update({ internal_notes: customerNotes }).eq('id', id);
        if (!error) alert('Notes client enregistrées !');
        setIsSavingNotes(false);
    };

    const handleSave = async (silent = false) => {
        const finalDetails = { ...details, discount, freeDelivery };
        const { error } = await supabase.from('demandes').update({
            details_json: finalDetails,
            request_date: requestDate,
            total_amount: totalAmount === '' ? null : parseFloat(totalAmount)
        }).eq('id', demande.id);
        if (!error) { if (!silent) alert('Enregistré !'); if (onRefresh) onRefresh(); }
    };

    const handleSendConfirmation = async () => {
        if (!window.confirm("Valider officiellement ce dossier et envoyer l'email de confirmation au client ?")) return;
        setIsSendingConfirmation(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-confirmation-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ demandeId: demande.id })
            });
            if (response.ok) { alert('Dossier validé !'); if (onRefresh) onRefresh(); onClose(); }       
        } catch (error) { alert(error.message); }
        finally { setIsSendingConfirmation(false); }
    };

    const handleGenerateStripeLink = async (amountType = 'total') => {
        await handleSave(true);
        setIsGeneratingStripeLink(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-stripe-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ demand_id: demande.id, amount_type: amountType })
            });
            const result = await response.json();
            if (response.ok) { setPaymentLink(result.url); alert('Lien Stripe généré !'); }
        } catch (error) { alert(error.message); }
        finally { setIsGeneratingStripeLink(false); }
    };

    const handleSendWhatsApp = () => {
        const target = demande.clients || demande.entreprises;
        const phone = target.phone || target.contact_phone;
        let cleaned = phone?.replace(/\D/g, '');
        if (cleaned?.startsWith('0')) cleaned = '262' + cleaned.substring(1);
        const clientName = demande.clients ? target.first_name : (target.contact_name || target.nom_entreprise);
        const formattedDate = new Date(requestDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const message = `🍜 *Asiacuisine.re - Confirmation*\n\nBonjour ${clientName},\n\nJe valide votre demande pour le *${formattedDate}*.\n\n💰 *Total :* ${totalAmount}€\n\n⚠️ *Lien valable 3 HEURES :*\n🔗 Règlement sécurisé : ${paymentLink}\n\n_Note : Passé ce délai, la réservation sera automatiquement annulée pour libérer le créneau._\n\nÀ très bientôt !`;
        window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleAction = async () => {
        if (demande.type === 'COMMANDE_MENU' || demande.type === 'COMMANDE_SPECIALE') {
            if (!window.confirm("Envoyer la facture par email ?")) return;
            setIsGenerating(true);
            try {
                const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
                    body: JSON.stringify({ demandeId: demande.id })
                });
                if (response.ok) { alert('Facture envoyée !'); if (onRefresh) onRefresh(); onClose(); }  
            } catch (error) { alert(error.message); }
            finally { setIsGenerating(false); }
        } else {
            const clientInfo = demande.clients ? {...demande.clients, type: 'client'} : {...demande.entreprises, type: 'entreprise'};
            navigate('/devis', { state: { customer: clientInfo, demandeId: demande.id } });
            onClose();
        }
    };

    const handleSendQr = async () => {
        if (!window.confirm("Valider le paiement et envoyer le QR Code ?")) return;
        setIsSendingQrCode(true);
        try {
            const { data: company } = await supabase.from('company_settings').select('*').limit(1).single();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-qrcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
                body: JSON.stringify({ demandeId: demande.id, companySettings: company })
            });
            if (response.ok) { alert('QR Code envoyé !'); if (onRefresh) onRefresh(); onClose(); }       
        } catch (error) { alert(error.message); }
        finally { setIsSendingQrCode(false); }
    };

    const renderExtraDetails = () => {
        if (Array.isArray(details) || (details && details["0"] !== undefined)) return null;
        const excludeKeys = ['ville', 'deliveryCity', 'heure', 'numberOfPeople', 'customerMessage', 'notes', 'cart', 'items', 'total', 'discount', 'freeDelivery', 'address', 'serviceType', 'budget', 'allergies'];
        const keyMap = { formulaName: 'Formule', formulaOption: 'Option', serviceType: 'Prestation', budget: 'Budget', allergies: 'Allergies / Régime' };

        const extraDetailsToRender = Object.entries(details).filter(([key, value]) => {
            return !excludeKeys.includes(key) && value && typeof value === 'string';
        });

        return (
            <>
                {demande.type === 'RESERVATION_SERVICE' && (
                    <>
                        {details.serviceType && <div className="bg-white/50 p-3 rounded-xl border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">{keyMap.serviceType}</p><p className="text-xs font-bold text-gray-700">{String(details.serviceType)}</p></div>}
                        {details.budget && <div className="bg-white/50 p-3 rounded-xl border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">{keyMap.budget}</p><p className="text-xs font-bold text-gray-700">{String(details.budget)}</p></div>}
                        {details.allergies && <div className="bg-white/50 p-3 rounded-xl border border-gray-100 shadow-sm"><p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">{keyMap.allergies}</p><p className="text-xs font-bold text-gray-700">{String(details.allergies)}</p></div>}
                    </>
                )}
                {extraDetailsToRender.map(([key, value]) => (
                    <div key={key} className="bg-white/50 p-3 rounded-xl border border-gray-100 shadow-sm">
                        <p className="text-[9px] font-black text-gray-400 uppercase mb-0.5">{keyMap[key] || key}</p>
                        <p className="text-xs font-bold text-gray-700">{String(value)}</p>
                    </div>
                ))}
            </>
        );
    };

    const client = demande.clients || demande.entreprises;
    const clientName = demande.clients ? `${client.last_name || ''} ${client.first_name || ''}`.trim() : (client.nom_entreprise || 'Inconnu');
    const specialItems = Array.isArray(details) ? details : (details?.cart || []);

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-6xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>

                <div className="mb-10 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className={`p-5 rounded-[1.5rem] bg-${themeColor}-50 text-${themeColor}-600 shadow-sm border border-${themeColor}-100`}>
                            {demande.type === 'COMMANDE_MENU' && <Truck size={32}/>}
                            {demande.type === 'COMMANDE_SPECIALE' && <ShoppingCart size={32}/>}
                            {demande.type === 'RESERVATION_SERVICE' && <ChefHat size={32}/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>{demande.status}</span>
                                {customerHistory.length > 0 && <span className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5"><Heart size={10} fill="white"/> FIDÈLE ({customerHistory.length + 1})</span>}
                            </div>
                            <h2 className="text-3xl font-black text-gray-800 flex items-center gap-4">
                                {clientName}
                                {demande.clients?.client_id && (
                                    <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-lg text-sm font-mono tracking-[0.2em] border border-gray-200">
                                        #{demande.clients.client_id}
                                    </span>
                                )}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        <div className={`p-8 rounded-[2rem] border-2 space-y-6 ${themeColor === 'blue' ? 'border-blue-200 bg-blue-50/20' : 'border-amber-200 bg-amber-50/20'}`}>
                            <div>
                                <label className="text-xs font-black uppercase text-gray-400 block mb-4">Montant Total (€)</label>
                                <div className="relative">
                                    <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-white p-5 rounded-2xl font-black text-3xl outline-none shadow-sm focus:ring-2 focus:ring-amber-500" />
                                    <Euro className="absolute right-5 top-6 text-gray-200" size={30} />   
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                    <label className="text-[10px] font-black text-gray-400 uppercase block mb-2 flex items-center gap-2"><Tag size={12}/> Remise (€)</label>
                                    <input type="number" value={discount} onChange={e => handleDiscountChange(e.target.value)} className="w-full p-2 bg-gray-50 border-0 rounded-lg font-bold text-lg" />
                                </div>
                                <div onClick={() => setFreeDelivery(!freeDelivery)} className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${freeDelivery ? 'bg-green-50 border-green-500' : 'bg-white border-gray-100 opacity-60'}`}>
                                    <p className={`font-black text-xs ${freeDelivery ? 'text-green-600' : 'text-gray-400'}`}>LIVRAISON OFFERTE</p>
                                    <Gift className={freeDelivery ? 'text-green-500' : 'text-gray-300'} size={24}/>
                                </div>
                            </div>
                        </div>

                        {demande.type === 'COMMANDE_SPECIALE' && specialItems.length > 0 && (
                            <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 shadow-sm">
                                <h3 className="text-sm font-black uppercase text-amber-600 mb-6 flex items-center gap-2"><ListChecks size={18}/> Sélection Spéciale</h3>
                                <div className="space-y-3">
                                    {specialItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-amber-50 shadow-sm">
                                            <div><p className="font-black text-gray-800 text-sm">{getLangText(item.name)}</p><p className="text-[10px] font-bold text-gray-400 uppercase">{item.portion}</p></div>  
                                            <div className="text-right"><p className="text-xs font-black text-gray-700">x{item.quantity}</p><p className="text-[10px] font-bold text-amber-600">{(item.price * item.quantity).toFixed(2)}€</p></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                            <h3 className="text-sm font-black uppercase text-gray-400 mb-6 flex items-center gap-2"><ClipboardList size={16}/> Détails Logistiques</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase block">Date</label><input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase block">Ville</label><select name="ville" value={details.ville || details.deliveryCity || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm"><option value="">Choisir...</option>{communesReunion.map(c => <option key={c} value={c}>{c}</option>)}</select></div>

                                {demande.type === 'RESERVATION_SERVICE' && (
                                    <>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block">Heure</label><input type="text" name="heure" value={details.heure || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" placeholder="Ex: 19h30" /></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase block">Convives</label><input type="text" name="numberOfPeople" value={details.numberOfPeople || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                        <div className="md:col-span-2"><label className="text-[10px] font-black text-gray-400 uppercase block">Adresse complète</label><input type="text" name="address" value={details.address || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                    </>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">{renderExtraDetails()}</div>
                            <div className="mt-6"><label className="text-[10px] font-black text-gray-400 uppercase block">Notes / Besoins spécifiques</label><textarea name="customerMessage" value={details.customerMessage || details.notes || ''} onChange={handleDetailChange} className="w-full p-4 bg-white border-0 rounded-xl font-medium shadow-sm h-24" /></div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        {/* MÉMOIRE DU CHEF (CRM) */}
                        <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 shadow-sm ring-4 ring-amber-500/5">
                            <h3 className="text-sm font-black uppercase text-amber-600 mb-4 flex items-center gap-2"><Heart size={18} fill="#d97706"/> Mémoire du Chef</h3>
                            <textarea value={customerNotes} onChange={e => setCustomerNotes(e.target.value)} className="w-full p-4 bg-white border-0 rounded-2xl font-medium text-sm h-32 focus:ring-2 focus:ring-amber-500 outline-none" placeholder="Préférences permanentes..." />
                            <button onClick={handleSaveCustomerNotes} disabled={isSavingNotes} className="w-full mt-3 py-3 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2">{isSavingNotes ? <RefreshCw className="animate-spin" size={14}/> : <Save size={14}/>} Sauvegarder Préférences</button>
                        </div>

                        {customerHistory.length > 0 && (
                            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2"><History size={14}/> Historique ({customerHistory.length})</h3>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin">  
                                    {customerHistory.map(h => (
                                        <div key={h.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div><p className="text-[10px] font-black text-gray-700">{new Date(h.request_date).toLocaleDateString()}</p><p className="text-[9px] font-bold text-gray-400 uppercase">{h.type.replace('_',' ')}</p></div>
                                            <p className="text-xs font-black text-gray-800">{h.total_amount}€</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                            <h3 className="text-[10px] font-black uppercase text-gray-400 mb-4">Contact Direct</h3>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Mail size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700 truncate">{client.email || client.contact_email}</span></div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700">{client.phone || client.contact_phone || '—'}</span></div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <button onClick={() => handleSave(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Save size={16}/> Mettre à jour le dossier</button>

                            {paymentLink && <button onClick={handleSendWhatsApp} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-lg active:scale-95 uppercase tracking-widest"><MessageCircle size={20}/> Envoyer WhatsApp</button>}

                            {demande.status === 'Intention WhatsApp' && <button onClick={handleSendConfirmation} disabled={isSendingConfirmation} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3 uppercase active:scale-95"><Mail size={20}/> Valider & Envoyer Confirmation</button>}

                            {demande.status === 'En attente de préparation' && <button onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center gap-2 uppercase"><ChefHat size={16}/> Lancer la cuisine</button>}

                            {demande.status === 'Préparation en cours' && <button onClick={() => onUpdateStatus(demande.id, 'Prêt pour livraison')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase"><PackageCheck size={16}/> Marquer comme prêt</button>}

                            {demande.status === 'Prêt pour livraison' && <button onClick={() => onUpdateStatus(demande.id, 'completed')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase"><Truck size={16}/> Livraison effectuée</button>}

                            {(demande.status === 'Nouvelle' || demande.status === 'En attente de paiement' || demande.status === 'confirmed' || demande.status === 'En attente de validation de devis') && (        
                                <>
                                    {demande.type !== 'RESERVATION_SERVICE' && (
                                        <button onClick={() => handleGenerateStripeLink('total')} disabled={isGeneratingStripeLink} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                            {isGeneratingStripeLink ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} Générer lien Stripe
                                        </button>
                                    )}
                                    <button onClick={handleAction} disabled={isGenerating} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">{isGenerating ? <RefreshCw className="animate-spin" size={16}/> : (demande.type === 'RESERVATION_SERVICE' ? <FilePlus size={16}/> : <Mail size={16}/>)} {demande.type === 'RESERVATION_SERVICE' ? 'Créer Devis' : 'Envoyer Facture'}</button>
                                    <button onClick={handleSendQr} disabled={isSendingQrCode} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase"><QrCode size={16}/> Paiement reçu & Env. QR</button>
                                </>
                            )}

                            <button onClick={() => window.confirm('Annuler ?') && onUpdateStatus(demande.id, 'cancelled')} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 uppercase"><XCircle size={16}/> Annuler le dossier</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemandeDetail;
