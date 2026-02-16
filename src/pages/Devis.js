import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import QuoteDetailModal from './QuoteDetailModal';
import ReactPaginate from 'react-paginate';
import { useBusinessUnit } from '../BusinessUnitContext';
import { PlusCircle, List, Search, User, ClipboardList, Utensils, FileText, Fingerprint, XCircle, Trash2, RefreshCw } from 'lucide-react';

const QuoteCard = ({ quote, onSelect, statusBadgeStyle, renderCustomerName, themeColor }) => {
    let dueDate = null;
    if (quote.status === 'sent' || quote.status === 'accepted') {
        const createdDate = new Date(quote.created_at);
        createdDate.setDate(createdDate.getDate() + 30);
        dueDate = createdDate.toLocaleDateString('fr-FR');
    }

    return (
        <div className={`bg-white rounded-xl shadow-sm border-t-4 p-5 mb-4 hover:shadow-md transition-shadow ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-800">{renderCustomerName(quote)}</h3>
                    <p className="text-xs text-gray-500 font-medium">
                        {quote.document_number || `ID: ${quote.id.substring(0, 8)}`}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <span style={statusBadgeStyle(quote.status)} className="uppercase tracking-wider">{quote.status}</span>
                    {quote.requires_signature && !quote.signed_at && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100 flex items-center gap-1"><Fingerprint size={10}/> SIGNATURE ATTENDUE</span>}
                    {quote.signed_at && <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md border border-green-100 flex items-center gap-1"><Fingerprint size={10}/> SIGNÉ</span>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Montant</p>
                    <p className="text-gray-800 font-bold">{(quote.total_amount || 0).toFixed(2)} €</p> 
                </div>
                <div>
                    <p className="text-gray-500 text-xs uppercase font-bold mb-1">Échéance</p>
                    <p className="text-gray-800">{dueDate || '—'}</p>
                </div>
            </div>

            <button
                onClick={() => onSelect(quote)}
                className={`w-full text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}      
            >
                Voir les détails
            </button>
        </div>
    );
};

const Devis = () => {
    const { businessUnit } = useBusinessUnit();
    const location = useLocation();
    const navigate = useNavigate();
    const { customer: prefilledCustomer, demandeId } = location.state || {};

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const [activeTab, setActiveTab] = useState(prefilledCustomer ? 'create' : 'list');
    const [clients, setClients] = useState([]);
    const [entreprises, setEntreprises] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [services, setServices] = useState([]);
    const [quoteItems, setQuoteItems] = useState([]);
    const [menuDetails, setMenuDetails] = useState('');
    const [requiresSignature, setRequiresSignature] = useState(false);

    const [existingQuotes, setExistingQuotes] = useState([]);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchServices = useCallback(async () => {
        const { data, error } = await supabase.from('services').select('*').order('name', { ascending: true });
        if (!error) setServices(data);
    }, []);

    useEffect(() => {
        if (prefilledCustomer && !selectedCustomer) {
            setSelectedCustomer(prefilledCustomer);
            setSearchTerm(prefilledCustomer.type === 'client' ? `${prefilledCustomer.last_name} ${prefilledCustomer.first_name || ''}`.trim() : prefilledCustomer.nom_entreprise);
        }
    }, [prefilledCustomer, selectedCustomer]);

    const fetchExistingQuotes = useCallback(async () => {
        setIsLoading(true);
        console.log(`📡 Chargement manuel des devis pour BU: ${businessUnit}`);
        
        try {
            // 1. Charger les devis seuls (sans jointure auto qui bugue)
            let query = supabase.from('quotes').select('*').eq('business_unit', businessUnit).order('created_at', { ascending: false });
            if (statusFilter !== 'all') query = query.eq('status', statusFilter);
            
            const { data: quotes, error: qError } = await query;
            if (qError) throw qError;

            // 2. Charger les clients et entreprises pour faire la correspondance manuellement
            const { data: allClients } = await supabase.from('clients').select('id, first_name, last_name');
            const { data: allEntreprises } = await supabase.from('entreprises').select('id, nom_entreprise');

            // 3. Fusionner les données
            const enrichedQuotes = (quotes || []).map(q => ({
                ...q,
                clients: allClients?.find(c => c.id === q.client_id) || null,
                entreprises: allEntreprises?.find(e => e.id === q.entreprise_id) || null
            }));

            // 4. Filtrage par recherche (si nécessaire)
            let finalData = enrichedQuotes;
            if (quoteSearchTerm) {
                const term = quoteSearchTerm.toLowerCase();
                finalData = enrichedQuotes.filter(q => 
                    q.document_number?.toLowerCase().includes(term) ||
                    q.clients?.last_name?.toLowerCase().includes(term) ||
                    q.entreprises?.nom_entreprise?.toLowerCase().includes(term)
                );
            }

            console.log(`✅ ${finalData.length} devis chargés et enrichis.`);
            setExistingQuotes(finalData);

        } catch (error) {
            console.error("❌ Erreur chargement devis:", error.message);
            setErrorMessage("Erreur lors du chargement des devis.");
        } finally {
            setIsLoading(false);
        }
    }, [quoteSearchTerm, statusFilter, businessUnit]);

    useEffect(() => { fetchServices(); }, [fetchServices]);
    useEffect(() => { fetchExistingQuotes(); }, [fetchExistingQuotes]);

    const handleSearch = async () => {
        if (searchTerm.length < 3) return;
        const { data: c } = await supabase.from('clients').select('*').ilike('last_name', `%${searchTerm}%`);
        const { data: e } = await supabase.from('entreprises').select('*').ilike('nom_entreprise', `%${searchTerm}%`);
        setClients(c || []);
        setEntreprises(e || []);
    };

    const handleSelectCustomer = (customer, type) => {
        setSelectedCustomer({ ...customer, type });
        setSearchTerm(type === 'client' ? `${customer.last_name} ${customer.first_name || ''}`.trim() : customer.nom_entreprise);
        setClients([]);
        setEntreprises([]);
    };

    const handleAddServiceToQuote = (service) => {
        setQuoteItems(prev => [...prev, { id: Date.now(), service_id: service.id, name: service.name, description: service.description, price: service.default_price, quantity: 1 }]);
    };

    const calculateTotal = () => quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0); 

    const handleGenerateQuote = async () => {
        if (!selectedCustomer || quoteItems.length === 0) {
            setErrorMessage('Veuillez sélectionner un client et ajouter au moins un service.');
            return;
        }
        setIsLoading(true);
        try {
            const payload = {
                customer: selectedCustomer,
                items: quoteItems.map(item => ({ service_id: item.service_id, name: item.name, description: item.description, quantity: item.quantity, price: item.price })),
                total: calculateTotal(),
                type: 'service_reservation',
                menu_details: menuDetails,
                business_unit: businessUnit,
                demandeId: demandeId || null,
                requires_signature: requiresSignature
            };

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/generate-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Erreur lors de la génération');
            setSuccessMessage('Devis créé avec succès !');
            setSelectedCustomer(null);
            setQuoteItems([]);
            setMenuDetails('');
            setRequiresSignature(false);
            fetchExistingQuotes();
            setActiveTab('list');
        } catch (error) { setErrorMessage(error.message); }
        finally { setIsLoading(false); }
    };

    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        if (!window.confirm(`Confirmer le changement de statut ?`)) return;
        try {
            await supabase.from('quotes').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', quoteId);
            if (newStatus === 'accepted') {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-invoice-from-quote`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
                    body: JSON.stringify({ quoteId }),
                });
                navigate('/factures');
            }
            fetchExistingQuotes();
            setSelectedQuote(null);
        } catch (error) { alert(error.message); }
    };

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };

    const renderCustomerName = (quote) => {
        if (quote.clients) return `${quote.clients.last_name} ${quote.clients.first_name || ''}`.trim();  
        if (quote.entreprises) return quote.entreprises.nom_entreprise;
        return 'N/A';
    };

    const offset = currentPage * itemsPerPage;
    const currentQuotes = existingQuotes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(existingQuotes.length / itemsPerPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-black text-gray-800 mb-8">Gestion des Devis</h1>

                <div className="flex space-x-1 bg-gray-200 p-1.5 rounded-[2rem] mb-8 max-w-md">
                    <button onClick={() => setActiveTab('create')} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <PlusCircle size={16} className="mr-2" /> Créer un devis
                    </button>
                    <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center py-3.5 rounded-[1.5rem] text-xs font-black transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={16} className="mr-2" /> Devis existants
                    </button>
                </div>

                {successMessage && <div className="bg-green-100 text-green-700 p-4 rounded-2xl mb-6 text-center font-bold border border-green-200 animate-in slide-in-from-top-4 duration-300">{successMessage}</div>}
                {errorMessage && <div className="bg-red-100 text-red-700 p-4 rounded-2xl mb-6 text-center font-bold border border-red-200 animate-in slide-in-from-top-4 duration-300">{errorMessage}</div>}

                {activeTab === 'create' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">    
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">       
                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3"><User className="text-amber-500"/> 1. Sélection du Client</h3>
                            <div className="flex gap-2 mb-4">
                                <input type="text" placeholder="Tapez le nom d'un client ou d'une entreprise..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500" />        
                                <button onClick={handleSearch} className="bg-gray-800 text-white px-8 rounded-2xl font-black uppercase text-xs tracking-widest">Rechercher</button>
                            </div>
                            {selectedCustomer && (
                                <div className="p-4 bg-amber-50 text-amber-800 rounded-2xl flex justify-between items-center border border-amber-100 shadow-sm animate-in zoom-in duration-200">
                                    <span>
                                        Client sélectionné : <strong>
                                            {selectedCustomer.type === 'client' 
                                                ? `${selectedCustomer.first_name || ''} ${selectedCustomer.last_name || ''}`.trim()
                                                : selectedCustomer.nom_entreprise
                                            }
                                        </strong>
                                    </span>
                                    <button onClick={() => setSelectedCustomer(null)} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-50 transition-colors shadow-sm">
                                        <XCircle size={18}/>
                                    </button>
                                </div>
                            )}
                            {(clients.length > 0 || entreprises.length > 0) && !selectedCustomer && (     
                                <div className="mt-2 border border-gray-100 rounded-2xl shadow-xl bg-white overflow-hidden animate-in fade-in duration-200">
                                    {clients.map(c => <div key={c.id} onClick={() => handleSelectCustomer(c, 'client')} className="p-4 hover:bg-gray-50 cursor-pointer border-b flex items-center gap-3 font-bold text-gray-700">👤 {c.last_name} {c.first_name}</div>)}
                                    {entreprises.map(e => <div key={e.id} onClick={() => handleSelectCustomer(e, 'entreprise')} className="p-4 hover:bg-gray-50 cursor-pointer border-b flex items-center gap-3 font-bold text-gray-700">🏢 {e.nom_entreprise}</div>)}
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">       
                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3"><Utensils className="text-amber-500"/> 2. Détails du Menu</h3>
                            <textarea value={menuDetails} onChange={(e) => setMenuDetails(e.target.value)} placeholder="Décrivez le menu, les allergies, ou toute information spécifique à la prestation..." className="w-full h-40 p-5 bg-gray-50 border-0 rounded-3xl font-medium focus:ring-2 focus:ring-amber-500" />
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">       
                            <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-3"><ClipboardList className="text-amber-500"/> 3. Services & Lignes</h3>
                            <div className="flex flex-wrap gap-3 mb-8">
                                {services.map(s => <button key={s.id} onClick={() => handleAddServiceToQuote(s)} className="px-6 py-3 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:border-amber-500 hover:shadow-md transition-all text-left"><p className="font-black text-gray-800 text-xs mb-1">{s.name}</p><p className="text-[10px] font-bold text-amber-600">{s.default_price} €</p></button>)}        
                            </div>
                            {quoteItems.length > 0 && (
                                <div className="overflow-hidden border border-gray-100 rounded-3xl shadow-inner bg-gray-50/50">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-100/50"><tr><th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Désignation</th><th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Qté</th><th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix HT</th><th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th><th className="px-6 py-4"></th></tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {quoteItems.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-6 py-4"><p className="font-bold text-gray-800 text-sm">{item.name}</p><p className="text-[10px] text-gray-400 font-medium italic">{item.description?.substring(0,60)}...</p></td>    
                                                    <td className="px-6 py-4 text-center"><input type="number" value={item.quantity} onChange={(e) => setQuoteItems(prev => prev.map(i => i.id === item.id ? {...i, quantity: parseInt(e.target.value)} : i))} className="w-16 p-2 bg-gray-50 border-0 rounded-xl text-center font-black" /></td>        
                                                    <td className="px-6 py-4 text-right"><input type="number" value={item.price} onChange={(e) => setQuoteItems(prev => prev.map(i => i.id === item.id ? {...i, price: parseFloat(e.target.value)} : i))} className="w-24 p-2 bg-gray-50 border-0 rounded-xl text-right font-black" /></td>
                                                    <td className="px-6 py-4 text-right font-black text-gray-900">{(item.price * item.quantity).toFixed(2)} €</td>
                                                    <td className="px-6 py-4 text-center"><button onClick={() => setQuoteItems(prev => prev.filter(i => i.id !== item.id))} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={18}/></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-800 text-white font-black"><tr><td colSpan="3" className="px-6 py-5 text-right text-xs uppercase tracking-widest">Montant Total Devis</td><td className="px-6 py-5 text-right text-2xl">{(calculateTotal()).toFixed(2)} €</td><td></td></tr></tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* --- OPTION SIGNATURE ÉLECTRONIQUE --- */}
                        <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-200 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100"><Fingerprint size={32}/></div>
                                <div>
                                    <h4 className="font-black text-amber-900 uppercase text-xs tracking-widest mb-1">Signature Électronique</h4>
                                    <p className="text-xs text-amber-700/70 font-medium leading-relaxed">Exiger que le client signe le devis en ligne avant de pouvoir l'accepter.<br/>Recommandé pour les entreprises et gros budgets.</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} className="sr-only peer" />
                                <div className="w-14 h-8 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-600"></div>
                                <span className="ms-3 text-xs font-black text-amber-900 uppercase tracking-widest">{requiresSignature ? 'ACTIVÉE' : 'DÉSACTIVÉE'}</span>
                            </label>
                        </div>

                        <button onClick={handleGenerateQuote} disabled={isLoading} className={`w-full py-6 rounded-[2rem] text-white font-black text-xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{isLoading ? <RefreshCw className="animate-spin"/> : <FileText/>} GÉNÉRER LE DEVIS</button>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[250px] relative"><Search size={18} className="absolute left-3 top-3 text-gray-400"/><input type="text" placeholder="Rechercher par client ou numéro..." value={quoteSearchTerm} onChange={(e) => setQuoteSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 border-0 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-medium" /></div>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-3 border-0 bg-gray-50 rounded-2xl outline-none font-bold text-gray-700">
                                <option value="all">Tous les statuts</option><option value="draft">Brouillon</option><option value="sent">Envoyé</option><option value="accepted">Accepté</option><option value="rejected">Refusé</option>
                            </select>
                        </div>
                        {existingQuotes.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-200"><FileText size={64} className="mx-auto text-gray-200 mb-4"/><p className="text-gray-400 font-bold">Aucun devis trouvé dans vos archives.</p></div>
                        ) : (
                            <>
                                <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-sm overflow-hidden border border-gray-100">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50/50"><tr><th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">N° Document</th><th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Client</th><th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Émission</th><th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total TTC</th><th className="px-8 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Statut</th><th className="px-8 py-5 text-right"></th></tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {currentQuotes.map(q => (
                                                <tr key={q.id} className="hover:bg-gray-50/50 cursor-pointer transition-colors" onClick={() => setSelectedQuote(q)}>
                                                    <td className="px-8 py-5 font-black text-gray-900">{q.document_number || q.id.substring(0, 8)}</td>
                                                    <td className="px-8 py-5">
                                                        <p className="font-bold text-gray-700">{renderCustomerName(q)}</p>
                                                        {q.requires_signature && !q.signed_at && <p className="text-[8px] font-black text-amber-500 uppercase flex items-center gap-1 mt-1"><Fingerprint size={10}/> Signature attendue</p>}
                                                        {q.signed_at && <p className="text-[8px] font-black text-green-500 uppercase flex items-center gap-1 mt-1"><Fingerprint size={10}/> Signé le {new Date(q.signed_at).toLocaleDateString()}</p>}
                                                    </td>
                                                    <td className="px-8 py-5 text-center text-gray-500 text-sm font-bold">{new Date(q.created_at).toLocaleDateString('fr-FR')}</td>
                                                    <td className="px-8 py-5 text-right font-black text-gray-900 text-lg">{q.total_amount.toFixed(2)} €</td>
                                                    <td className="px-8 py-5 text-center"><span style={statusBadgeStyle(q.status)}>{q.status}</span></td>
                                                    <td className="px-8 py-5 text-right"><button className={`font-black text-xs uppercase tracking-widest ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Détails</button></td>       
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuotes.map(q => <QuoteCard key={q.id} quote={q} onSelect={setSelectedQuote} statusBadgeStyle={statusBadgeStyle} renderCustomerName={renderCustomerName} themeColor={themeColor} />)}
                                </div>
                                <div className="mt-10">
                                    <ReactPaginate previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick} containerClassName={'flex justify-center items-center space-x-3'} pageLinkClassName={'w-10 h-10 flex items-center justify-center border rounded-xl hover:bg-gray-100 font-black text-sm transition-all'} activeClassName={'bg-amber-500 text-white border-amber-500 shadow-md scale-110'} previousLinkClassName={'font-black text-gray-400 hover:text-gray-800'} nextLinkClassName={'font-black text-gray-400 hover:text-gray-800'} />
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
            {selectedQuote && <QuoteDetailModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} onUpdateStatus={handleUpdateQuoteStatus} fetchExistingQuotes={fetchExistingQuotes} />}
        </div>
    );
};

const statusBadgeStyle = (status) => {
    const colors = { draft: '#6c757d', sent: '#17a2b8', accepted: '#28a745', rejected: '#dc3545' };       
    return { backgroundColor: colors[status] || '#6c757d', color: 'white', padding: '6px 14px', borderRadius: '20px', fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', trackingWidest: '0.1em' };
};

export default Devis;
