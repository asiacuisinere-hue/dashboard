import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import {
    User,
    Euro, ClipboardList, CheckCircle2,
    RefreshCw, FilePlus, QrCode, Mail,
    Phone, Save, ShoppingCart, ChefHat, XCircle,
    MessageCircle, PackageCheck, Truck
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

    const [details, setDetails] = useState(demande.details_json || {});
    const [requestDate, setRequestDate] = useState('');
    const [totalAmount, setTotalAmount] = useState(demande.total_amount || '');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSendingConfirmation, setIsSendingConfirmation] = useState(false);
    const [isSendingQrCode, setIsSendingQrCode] = useState(false);
    const [isGeneratingStripeLink, setIsGeneratingStripeLink] = useState(false);
    const [paymentLink, setPaymentLink] = useState('');

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';
    const isMenuOrder = demande.type === 'COMMANDE_MENU' || demande.type === 'COMMANDE_SPECIALE';

    useEffect(() => {
        if (initializedRef.current === demande.id) return;
        initializedRef.current = demande.id;

        const initializeModal = async () => {
            setDetails(demande.details_json || {});
            setRequestDate(demande.request_date ? new Date(demande.request_date).toISOString().split('T')[0] : '');
            setPaymentLink('');

            let initialAmount = demande.total_amount;

            // --- RESTAURATION : Auto-fill price from settings for Menus ---
            if ((!initialAmount || initialAmount <= 0) && demande.type === 'COMMANDE_MENU') {
                try {
                    const { data: settingsList } = await supabase
                        .from('settings')
                        .select('key, value')
                        .in('key', ['menu_decouverte_price', 'menu_standard_price', 'menu_duo_price', 'menu_confort_price']);

                    if (settingsList) {
                        const prices = {};
                        settingsList.forEach(s => { prices[s.key] = parseFloat(s.value); });
                        const formula = demande.details_json?.formulaName || "";
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
                } catch (err) { console.error("Error in auto-fill:", err); }
            }
            setTotalAmount(initialAmount || '');
        };
        initializeModal();
    }, [demande.id, demande.details_json, demande.request_date, demande.total_amount, demande.type]);     

    if (!demande) return null;

    const handleDetailChange = (e) => {
        const { name, value } = e.target;
        setDetails(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (silent = false) => {
        const { error } = await supabase.from('demandes').update({
            details_json: details,
            request_date: requestDate,
            total_amount: totalAmount === '' ? null : parseFloat(totalAmount)
        }).eq('id', demande.id);

        if (!error) {
            if (!silent) alert('Enregistré !');
            if (onRefresh) onRefresh();
        } else alert(error.message);
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
            if (response.ok) {
                alert('Dossier validé et email envoyé !');
                if (onRefresh) onRefresh();
                onClose();
            } else {
                const err = await response.json();
                throw new Error(err.error || "Erreur lors de l'envoi");
            }
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
            if (!response.ok) throw new Error(result.error);
            setPaymentLink(result.url);
            alert('Lien Stripe généré !');
        } catch (error) { alert(`Erreur: ${error.message}`); }
        finally { setIsGeneratingStripeLink(false); }
    };

    const handleSendWhatsApp = () => {
        const client = demande.clients || demande.entreprises;
        const phone = client.phone || client.contact_phone;
        let cleaned = phone?.replace(/\D/g, '');
        if (cleaned?.startsWith('0')) cleaned = '262' + cleaned.substring(1);
        else if (cleaned && !cleaned.startsWith('262') && !cleaned.startsWith('33')) cleaned = '262' + cleaned;

        if (!cleaned) return alert("Numéro manquant.");
        const clientName = demande.clients ? client.first_name : (client.contact_name || client.nom_entreprise);
        const formattedDate = new Date(requestDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        const message = `🍱 *Asiacuisine.re - Confirmation de Commande*\n\nBonjour ${clientName},\n\nC'est avec plaisir que je valide votre demande pour le *${formattedDate}*.\n\n💰 *Montant total :* ${totalAmount}€\n\nPour confirmer votre réservation, merci de procéder au règlement via notre lien sécurisé Stripe ci-dessous :\n\n🔗 ${paymentLink}\n\n_Note : Une fois le règlement effectué, vous recevrez automatiquement votre QR code par e-mail._\n\nÀ très bientôt !\n👨‍🍳 *Le Chef*`;
        window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const handleAction = async () => {
        const client = demande.clients || demande.entreprises;
        if (isMenuOrder) {
            if (!window.confirm("Générer et envoyer la facture par email ?")) return;
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
            const clientInfo = {...client, type: demande.clients ? 'client' : 'entreprise'};
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

    const client = demande.clients || demande.entreprises;
    const clientName = demande.clients
        ? `${demande.clients.last_name || ''} ${demande.clients.first_name || ''}`.trim()
        : (demande.entreprises?.nom_entreprise || 'Inconnu');

    // --- NEW: Helper to render additional details from JSON ---
    const renderExtraDetails = () => {
        const excludeKeys = ['ville', 'deliveryCity', 'heure', 'numberOfPeople', 'customerMessage', 'notes', 'items', 'total'];
        const keyMap = {
            formulaName: 'Formule',
            formulaOption: 'Option Sélectionnée',
            serviceType: 'Type de Service',
            budget: 'Budget Estimé',
            allergies: 'Allergies / Régimes'
        };

        return Object.entries(details).map(([key, value]) => {
            if (excludeKeys.includes(key) || !value) return null;
            return (
                <div key={key} className="bg-white/50 p-3 rounded-xl border border-gray-100 shadow-sm">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">{keyMap[key] || key}</p>
                    <p className="text-xs font-bold text-gray-700">{String(value)}</p>
                </div>
            );
        });
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>

                <div className="mb-10 flex items-start justify-between">
                    <div className="flex items-center gap-5">
                        <div className={`p-5 rounded-[1.5rem] bg-${themeColor}-50 text-${themeColor}-600 shadow-sm border border-${themeColor}-100`}>
                            {isMenuOrder ? <ShoppingCart size={32}/> : <ChefHat size={32}/>}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${themeColor === 'blue' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'}`}>{demande.status}</span>
                                <span className="text-xs font-bold text-gray-400">ID: {demande.id.substring(0,8)}</span>
                            </div>
                            <h2 className="text-3xl font-black text-gray-800">{clientName}</h2>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        <div className={`p-8 rounded-[2rem] border-2 ${themeColor === 'blue' ? 'border-blue-200 bg-blue-50/20' : 'border-amber-200 bg-amber-50/20'}`}>
                            <label className={`text-xs font-black uppercase tracking-widest block mb-4 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Montant Total (€)</label>
                            <div className="relative">
                                <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-white p-5 rounded-2xl font-black text-3xl outline-none shadow-sm focus:ring-2 focus:ring-amber-500" placeholder="0.00" />
                                <Euro className="absolute right-5 top-6 text-gray-200" size={30} />       
                            </div>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><ClipboardList size={16}/> Détails du Projet</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Date Souhaitée</label><input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Ville</label><select name="ville" value={details.ville || details.deliveryCity || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm"><option value="">Choisir...</option>{communesReunion.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                
                                {!isMenuOrder && (
                                    <>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Heure</label><select name="heure" value={details.heure || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm"><option value="">Non défini</option><option value="Midi">Midi</option><option value="Soir">Soir</option></select></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nombre d'invités</label><input type="text" name="numberOfPeople" value={details.numberOfPeople || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                    </>
                                )}
                            </div>

                            {/* EXTRA DETAILS (Formula, Option, etc.) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                                {renderExtraDetails()}
                            </div>

                            <div className="mt-6"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Notes / Message Client</label><textarea name="customerMessage" value={details.customerMessage || details.notes || ''} onChange={handleDetailChange} className="w-full p-4 bg-white border-0 rounded-xl font-medium shadow-sm h-24" /></div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">    
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><User size={16}/> Contact</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Mail size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700 truncate">{client.email || client.contact_email}</span></div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700">{client.phone || client.contact_phone || '—'}</span></div>
                            </div>
                        </div>

                        {paymentLink && (
                            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] animate-in slide-in-from-right-4 ring-4 ring-indigo-500/10">
                                <button onClick={handleSendWhatsApp} className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-green-600 transition-all shadow-lg active:scale-95">
                                    <MessageCircle size={20}/> ENVOYER LIEN PAR WHATSAPP
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button onClick={() => handleSave(false)} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Save size={16}/> SAUVEGARDER MODIFS</button>

                            {demande.status === 'Intention WhatsApp' && (
                                <button onClick={handleSendConfirmation} disabled={isSendingConfirmation} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3 uppercase tracking-widest active:scale-95">        
                                    {isSendingConfirmation ? <RefreshCw className="animate-spin" size={20}/> : <Mail size={20}/>} VALIDER & ENVOYER EMAIL
                                </button>
                            )}

                            {demande.status === 'En attente de préparation' && (
                                <button onClick={() => onUpdateStatus(demande.id, 'Préparation en cours')} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-cyan-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><ChefHat size={16}/> LANCER LA CUISINE</button>
                            )}
                            
                            {demande.status === 'Préparation en cours' && (
                                <button onClick={() => onUpdateStatus(demande.id, 'Prêt pour livraison')} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><PackageCheck size={16}/> MARQUER COMME PRÊT</button>
                            )}

                            {demande.status === 'Prêt pour livraison' && (
                                <button onClick={() => onUpdateStatus(demande.id, 'completed')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Truck size={16}/> LIVRAISON EFFECTUÉE (CLÔTURER)</button>
                            )}

                            {(demande.status === 'Nouvelle' || demande.status === 'En attente de paiement' || demande.status === 'confirmed') && (
                                <>
                                    <button onClick={() => handleGenerateStripeLink('total')} disabled={isGeneratingStripeLink} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                        {isGeneratingStripeLink ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} GÉNÉRER LIEN STRIPE
                                    </button>

                                    {(demande.status === 'Nouvelle' && !isMenuOrder) && <button onClick={() => onUpdateStatus(demande.id, 'confirmed')} className="w-full py-4 bg-green-100 text-green-700 border border-green-200 rounded-2xl font-black text-xs hover:bg-green-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><CheckCircle2 size={16}/> CONFIRMER LOGISTIQUE</button>}

                                    {(!isMenuOrder) && <button onClick={handleAction} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><FilePlus size={16}/> CRÉER UN DEVIS</button>}
                                    {(isMenuOrder && demande.status !== 'En attente de traitement') && <button onClick={handleAction} disabled={isGenerating} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">{isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Mail size={16}/>} GÉNÉRER & ENVOYER FACTURE</button>}

                                    <button onClick={handleSendQr} disabled={isSendingQrCode} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><QrCode size={16}/> PAIEMENT REÇU & ENV. QR</button>
                                </>
                            )}

                            <button onClick={() => window.confirm('Annuler ce dossier ?') && onUpdateStatus(demande.id, 'cancelled')} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><XCircle size={16}/> ANNULER LE DOSSIER</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemandeDetail;