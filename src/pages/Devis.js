import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import QuoteDetailModal from './QuoteDetailModal';
import ReactPaginate from 'react-paginate';
import { useBusinessUnit } from '../BusinessUnitContext';
import { PlusCircle, List, Search, User, ClipboardList, Utensils, FileText } from 'lucide-react';

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
                <span style={statusBadgeStyle(quote.status)} className="uppercase tracking-wider">        
                    {quote.status}
                </span>
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
        let query = supabase.from('quotes').select(`*, clients (first_name, last_name), entreprises (nom_entreprise)`).eq('business_unit', businessUnit).order('created_at', { ascending: false });
        if (statusFilter !== 'all') query = query.eq('status', statusFilter);
        if (quoteSearchTerm) {
            const term = `%${quoteSearchTerm}%`;
            query = query.or(`document_number.ilike.${term},clients.last_name.ilike.${term},entreprises.nom_entreprise.ilike.${term}`);
        }
        const { data, error } = await query;
        if (!error) setExistingQuotes(data || []);
        setIsLoading(false);
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
                demandeId: demandeId || null
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
                <h1 className="text-3xl font-bold text-gray-800 mb-8">Gestion des Devis</h1>

                <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 max-w-md">
                    <button onClick={() => setActiveTab('create')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'create' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <PlusCircle size={16} className="mr-2" /> Créer un devis
                    </button>
                    <button onClick={() => setActiveTab('list')} className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                        <List size={16} className="mr-2" /> Devis existants
                    </button>
                </div>

                {successMessage && <div className="bg-green-100 text-green-700 p-4 rounded-lg mb-6 text-center font-bold border border-green-200">{successMessage}</div>}
                {errorMessage && <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6 text-center font-bold border border-red-200">{errorMessage}</div>}

                {activeTab === 'create' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><User size={20} className="mr-2 text-amber-500"/> 1. Client / Entreprise</h3>
                            <div className="flex gap-2">
                                <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 p-2.5 border rounded-lg outline-none" />
                                <button onClick={handleSearch} className="bg-gray-800 text-white px-6 rounded-lg font-bold">Rechercher</button>
                            </div>
                            {selectedCustomer && <div className="mt-4 p-3 bg-amber-50 text-amber-800 rounded-lg flex justify-between border border-amber-100"><span>Sélection : <strong>{selectedCustomer.type === 'client' ? `${selectedCustomer.last_name} ${selectedCustomer.first_name}` : selectedCustomer.nom_entreprise}</strong></span><button onClick={() => setSelectedCustomer(null)} className="text-red-500 font-bold">X</button></div>}
                            {(clients.length > 0 || entreprises.length > 0) && !selectedCustomer && (
                                <div className="mt-2 border rounded-lg shadow-lg bg-white absolute z-10 w-full max-w-lg">
                                    {clients.map(c => <div key={c.id} onClick={() => handleSelectCustomer(c, 'client')} className="p-3 hover:bg-gray-50 cursor-pointer border-b">👤 {c.last_name} {c.first_name}</div>)}
                                    {entreprises.map(e => <div key={e.id} onClick={() => handleSelectCustomer(e, 'entreprise')} className="p-3 hover:bg-gray-50 cursor-pointer border-b">🏢 {e.nom_entreprise}</div>)}
                                </div>
                            )}
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Utensils size={20} className="mr-2 text-amber-500"/> 2. Détails du Menu</h3>
                            <textarea value={menuDetails} onChange={(e) => setMenuDetails(e.target.value)} placeholder="Décrivez le menu..." className="w-full h-32 p-3 border rounded-lg outline-none" />
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><ClipboardList size={20} className="mr-2 text-amber-500"/> 3. Services & Lignes</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {services.map(s => <button key={s.id} onClick={() => handleAddServiceToQuote(s)} className="p-4 border rounded-xl hover:border-amber-500 text-left group"><p className="font-bold text-gray-800">{s.name}</p><p className="text-xs text-gray-500">{s.default_price} €</p></button>)}
                            </div>
                            {quoteItems.length > 0 && (
                                <div className="overflow-x-auto border rounded-xl">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Désignation</th><th className="px-4 py-2 text-center text-xs font-bold text-gray-500">Qté</th><th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Prix (€)</th><th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Total</th><th className="px-4 py-2 text-center"></th></tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {quoteItems.map(item => (
                                                <tr key={item.id}>
                                                    <td className="px-4 py-3 text-sm">{item.name}</td>
                                                    <td className="px-4 py-3 text-center"><input type="number" value={item.quantity} onChange={(e) => setQuoteItems(prev => prev.map(i => i.id === item.id ? {...i, quantity: parseInt(e.target.value)} : i))} className="w-16 p-1 border rounded text-center" /></td>
                                                    <td className="px-4 py-3 text-right"><input type="number" value={item.price} onChange={(e) => setQuoteItems(prev => prev.map(i => i.id === item.id ? {...i, price: parseFloat(e.target.value)} : i))} className="w-20 p-1 border rounded text-right" /></td>
                                                    <td className="px-4 py-3 text-right font-bold">{(item.price * item.quantity).toFixed(2)} €</td>
                                                    <td className="px-4 py-3 text-center"><button onClick={() => setQuoteItems(prev => prev.filter(i => i.id !== item.id))} className="text-red-500 font-bold">×</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-amber-50 font-black"><tr><td colSpan="3" className="px-4 py-3 text-right">TOTAL</td><td className="px-4 py-3 text-right text-lg">{calculateTotal().toFixed(2)} €</td><td></td></tr></tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                        <button onClick={handleGenerateQuote} disabled={isLoading} className={`w-full py-4 rounded-2xl text-white font-black text-lg shadow-lg ${isLoading ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>CRÉER LE DEVIS</button>
                    </div>
                )}

                {activeTab === 'list' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                            <div className="flex-1 min-w-[250px] relative"><Search size={18} className="absolute left-3 top-3 text-gray-400"/><input type="text" placeholder="Rechercher..." value={quoteSearchTerm} onChange={(e) => setQuoteSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500" /></div>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="p-2.5 border rounded-xl outline-none bg-white font-bold text-gray-700">
                                <option value="all">Tous les statuts</option><option value="draft">Brouillon</option><option value="sent">Envoyé</option><option value="accepted">Accepté</option><option value="rejected">Refusé</option>
                            </select>
                        </div>
                        {existingQuotes.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200"><FileText size={48} className="mx-auto text-gray-300 mb-4"/><p className="text-gray-500">Aucun devis trouvé.</p></div>
                        ) : (
                            <>
                                <div className="hidden lg:block bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50"><tr><th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">N°</th><th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase">Client</th><th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase">Date</th><th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase">Total</th><th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase">Statut</th><th className="px-6 py-4 text-right"></th></tr></thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {currentQuotes.map(q => (
                                                <tr key={q.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedQuote(q)}>
                                                    <td className="px-6 py-4 font-bold text-gray-900">{q.document_number || q.id.substring(0, 8)}</td>
                                                    <td className="px-6 py-4 text-gray-600">{renderCustomerName(q)}</td>
                                                    <td className="px-6 py-4 text-center text-gray-500 text-sm">{new Date(q.created_at).toLocaleDateString('fr-FR')}</td>
                                                    <td className="px-6 py-4 text-right font-black text-gray-900">{q.total_amount.toFixed(2)} €</td>
                                                    <td className="px-6 py-4 text-center"><span style={statusBadgeStyle(q.status)}>{q.status}</span></td>
                                                    <td className="px-6 py-4 text-right"><button className={`font-bold ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Détails</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuotes.map(q => <QuoteCard key={q.id} quote={q} onSelect={setSelectedQuote} statusBadgeStyle={statusBadgeStyle} renderCustomerName={renderCustomerName} themeColor={themeColor} />)}
                                </div>
                                <div className="mt-8">
                                    <ReactPaginate previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick} containerClassName={'flex justify-center space-x-2'} pageLinkClassName={'px-4 py-2 border rounded-xl hover:bg-gray-100 font-bold'} activeClassName={'bg-amber-500 text-white rounded-xl'} />
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
    return { backgroundColor: colors[status] || '#6c757d', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'black', textTransform: 'uppercase' };
};

export default Devis;