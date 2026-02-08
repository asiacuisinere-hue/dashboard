import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useBusinessUnit } from './BusinessUnitContext';
import { 
    User, Building2, 
    Euro, ClipboardList, CheckCircle2, 
    RefreshCw, FilePlus, QrCode, Mail, 
    Phone, Save, ShoppingCart, ChefHat, XCircle
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

    const handleGenerateStripeLink = async (amountType = 'total') => {
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

    const handleSave = async () => {
        const { error } = await supabase.from('demandes').update({
            details_json: details,
            request_date: requestDate,
            total_amount: totalAmount === '' ? null : parseFloat(totalAmount)
        }).eq('id', demande.id);

        if (!error) {
            alert('Enregistré !');
            if (onRefresh) onRefresh();
            onClose();
        }
    };

    const handleAction = async () => {
        const client = demande.clients || demande.entreprises;
        if (isMenuOrder && (demande.status === 'confirmed' || demande.status === 'En attente de traitement')) {
            if (!window.confirm("Générer et envoyer la facture par email ?")) return;
            setIsGenerating(true);
            try {
                const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
                    body: JSON.stringify({ demandeId: demande.id })
                });
                if (response.ok) {
                    alert('Facture envoyée !');
                    if (onRefresh) onRefresh();
                    onClose();
                }
            } catch (error) { alert(error.message); }
            finally { setIsGenerating(false); }
        } else if (!isMenuOrder && demande.status === 'confirmed') {
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
            if (response.ok) {
                alert('QR Code envoyé !');
                if (onRefresh) onRefresh();
                onClose();
            }
        } catch (error) { alert(error.message); }
        finally { setIsSendingQrCode(false); }
    };

    const client = demande.clients || demande.entreprises;
    const clientName = demande.clients ? `${client.last_name} ${client.first_name}` : client.nom_entreprise;

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
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date Demande</p>
                        <p className="text-lg font-black text-gray-800">{new Date(demande.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        <div className={`p-8 rounded-[2rem] border-2 border-dashed ${themeColor === 'blue' ? 'border-blue-100 bg-blue-50/30' : 'border-amber-100 bg-amber-50/30'}`}>
                            <label className={`text-xs font-black uppercase tracking-widest block mb-4 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Montant de la Prestation (€)</label>
                            <div className="relative">
                                <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-white p-5 rounded-2xl font-black text-3xl outline-none shadow-sm focus:ring-2 focus:ring-amber-500" placeholder="0.00" />
                                <Euro className="absolute right-5 top-6 text-gray-200" size={30} />
                            </div>
                        </div>

                        <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><ClipboardList size={16}/> Détails du Projet</h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Date Souhaitée</label><input type="date" value={requestDate} onChange={e => setRequestDate(e.target.value)} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Ville</label><select name="ville" value={details.ville || details.deliveryCity || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm"><option value="">Choisir...</option>{communesReunion.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                
                                {!isMenuOrder && (
                                    <>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Heure</label><select name="heure" value={details.heure || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm"><option value="">Non défini</option><option value="Midi">Midi</option><option value="Soir">Soir</option></select></div>
                                        <div><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Nombre d'invités</label><input type="text" name="numberOfPeople" value={details.numberOfPeople || ''} onChange={handleDetailChange} className="w-full p-3 bg-white border-0 rounded-xl font-bold shadow-sm" /></div>
                                    </>
                                )}
                            </div>

                            <div className="mt-6"><label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Note / Message Client</label><textarea name="customerMessage" value={details.customerMessage || details.notes || ''} onChange={handleDetailChange} className="w-full p-4 bg-white border-0 rounded-xl font-medium shadow-sm h-24" /></div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2"><User size={16}/> Fiche Contact</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Mail size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700 truncate">{client.email || client.contact_email}</span></div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Phone size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700">{client.phone || client.contact_phone || '—'}</span></div>
                                {client.nom_entreprise && <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><Building2 size={16} className="text-gray-400"/><span className="text-sm font-bold text-gray-700 truncate">{client.nom_entreprise}</span></div>}
                            </div>
                        </div>

                        {paymentLink && (
                            <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2rem] animate-in slide-in-from-right-4">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Lien Stripe Actif</p>
                                <div className="flex gap-2">
                                    <input readOnly value={paymentLink} className="flex-1 p-2 bg-white rounded-lg text-[10px] font-mono border-0 outline-none" />
                                    <button onClick={() => { navigator.clipboard.writeText(paymentLink); alert('Copié !'); }} className="bg-indigo-600 text-white px-3 py-2 rounded-lg font-black text-[10px]">COPIER</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button onClick={handleSave} className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><Save size={16}/> SAUVEGARDER DÉTAILS</button>
                            {demande.status === 'En attente de traitement' && <button onClick={() => onUpdateStatus(demande.id, 'confirmed')} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><CheckCircle2 size={16}/> CONFIRMER LA DEMANDE</button>}
                            
                            {isMenuOrder && (demande.status === 'En attente de paiement' || demande.status === 'confirmed') && (
                                <button onClick={() => handleGenerateStripeLink('total')} disabled={isGeneratingStripeLink} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                                    {isGeneratingStripeLink ? <RefreshCw className="animate-spin" size={16}/> : <RefreshCw size={16}/>} GÉNÉRER LIEN STRIPE (TOTAL)
                                </button>
                            )}

                            {demande.status === 'En attente de paiement' && <button onClick={handleSendQr} disabled={isSendingQrCode} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><QrCode size={16}/> PAIEMENT REÇU & ENV. QR</button>}
                            {(demande.status === 'confirmed' && !isMenuOrder) && <button onClick={handleAction} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><FilePlus size={16}/> CRÉER UN DEVIS</button>}
                            {isMenuOrder && (demande.status === 'confirmed' || demande.status === 'En attente de traitement') && <button onClick={handleAction} disabled={isGenerating} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">{isGenerating ? <RefreshCw className="animate-spin" size={16}/> : <Mail size={16}/>} GÉNÉRER & ENVOYER FACTURE</button>}
                            
                            <button onClick={() => window.confirm('Annuler ce dossier ?') && onUpdateStatus(demande.id, 'cancelled')} className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-black text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"><XCircle size={16}/> ANNULER LE DOSSIER</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DemandeDetail;