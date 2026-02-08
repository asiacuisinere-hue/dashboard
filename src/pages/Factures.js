import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import ReactPaginate from 'react-paginate';
import { useLocation } from 'react-router-dom';
import { useBusinessUnit } from '../BusinessUnitContext';
import { CreditCard, CheckCircle, Send } from 'lucide-react'; 

const getFrenchStatus = (status) => {
    switch (status) {
        case 'pending': return 'En attente';
        case 'deposit_paid': return 'Acompte versé';
        case 'paid': return 'Payée';
        case 'cancelled': return 'Annulée';
        default: return status;
    }
};

const InvoiceCard = ({ invoice, onSelect, statusBadgeStyle, renderCustomerName, themeColor }) => (   
    <div className={`bg-white rounded-xl shadow-sm border-t-4 p-5 mb-4 hover:shadow-md transition-shadow ${themeColor === 'courtage' ? 'border-blue-500' : 'border-amber-500'}`}>
        <div className="flex justify-between items-start mb-4">
            <div>
                <h3 className="font-bold text-gray-800">{renderCustomerName(invoice)}</h3>
                <p className="text-xs text-gray-500 font-medium">
                    {invoice.document_number || `ID: ${invoice.id.substring(0, 8)}`}
                </p>
            </div>
            <span style={statusBadgeStyle(invoice.status)} className="uppercase tracking-wider">
                {getFrenchStatus(invoice.status)}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
            <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Montant</p>
                <p className="text-gray-800 font-bold">{(invoice.total_amount || 0).toFixed(2)} €</p>   
            </div>
            <div>
                <p className="text-gray-500 text-xs uppercase font-bold mb-1">Date</p>
                <p className="text-gray-800">{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
        </div>

        <button
            onClick={() => onSelect(invoice)}
            className={`w-full text-white font-bold py-2.5 rounded-lg transition-colors text-sm shadow-sm ${themeColor === 'courtage' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
        >
            Voir les détails
        </button>
    </div>
);

const Factures = () => {
    const { businessUnit } = useBusinessUnit();
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const urlStatus = searchParams.get('status');
        setStatusFilter(urlStatus || 'all');
    }, [location.search]);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('invoices').select(`
            *,
            demand_id,
            clients (first_name, last_name, email),
            entreprises (nom_entreprise, contact_email),
            demandes (type, status, details_json)
        `)
        .eq('business_unit', businessUnit);

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            query = query.or(
                `document_number.ilike.${searchPattern},clients.first_name.ilike.${searchPattern},clients.last_name.ilike.${searchPattern},entreprises.nom_entreprise.ilike.${searchPattern}`
            );
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur:', error);
        } else {
            setInvoices(data || []);
        }
        setLoading(false);
    }, [searchTerm, statusFilter, businessUnit]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const renderCustomerName = (invoice) => {
        if (invoice.clients) return `${invoice.clients.first_name || ''} ${invoice.clients.last_name || ''}`.trim();
        if (invoice.entreprises) return invoice.entreprises.nom_entreprise;
        return 'N/A';
    };

    const handlePageClick = (event) => setCurrentPage(event.selected);
    const offset = currentPage * itemsPerPage;
    const currentInvoices = invoices.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(invoices.length / itemsPerPage);

    if (loading) return <div className="p-6 text-center text-gray-500">Chargement des factures...</div>;  

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Factures</h1>
                    <p className="text-gray-600">Suivez vos paiements et acomptes pour l'unité {businessUnit}.</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-4 mb-6 flex flex-wrap gap-4">
                    <input
                        type="text"
                        placeholder="Rechercher par N° ou client..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="p-2 border rounded-md flex-1 min-w-[200px]"
                    />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md">
                        <option value="all">Tous les statuts</option>
                        <option value="pending">En attente</option>
                        <option value="deposit_paid">Acompte versé</option>
                        <option value="paid">Payée</option>
                        <option value="cancelled">Annulée</option>
                    </select>
                </div>

                {/* Desktop View */}
                <div className="hidden lg:block bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N° Facture</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client / Entreprise</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{invoice.document_number || invoice.id.substring(0, 8)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{renderCustomerName(invoice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">{(invoice.total_amount || 0).toFixed(2)} €</td> 
                                    <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`px-2 py-1 rounded-full text-xs font-bold text-white ${invoice.status === 'paid' ? 'bg-green-500' : (invoice.status === 'deposit_paid' ? 'bg-blue-500' : 'bg-amber-500')}`}>{getFrenchStatus(invoice.status)}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => setSelectedInvoice(invoice)} className={`font-bold ${themeColor === 'courtage' ? 'text-blue-600' : 'text-amber-600'}`}>Détails</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile View */}
                <div className="block lg:hidden space-y-4">
                    {currentInvoices.map(invoice => (
                        <InvoiceCard key={invoice.id} invoice={invoice} onSelect={setSelectedInvoice} statusBadgeStyle={statusBadgeStyle} renderCustomerName={renderCustomerName} themeColor={businessUnit === 'courtage' ? 'courtage' : 'cuisine'} />
                    ))}
                </div>

                <div className="mt-8 flex justify-center">
                    <ReactPaginate
                        previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick}
                        containerClassName={'flex space-x-2 pagination'} activeClassName={'bg-amber-500 text-white rounded-md'}
                        pageLinkClassName={'px-3 py-1 border rounded-md hover:bg-gray-100'}
                    />
                </div>
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                    onUpdate={fetchInvoices}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
};

const InvoiceDetailModal = ({ invoice, onClose, onUpdate, themeColor }) => {
    const [loading, setLoading] = useState(false);
    const [stripeLink, setStripeLink] = useState('');

    const handleGenerateStripe = async (type = 'deposit') => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-stripe-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ 
                    invoice_id: invoice.id,
                    amount_type: type
                })
            });
            const res = await response.json();
            if (!response.ok) throw new Error(res.error);
            setStripeLink(res.url);
        } catch (err) { alert(err.message); }
        finally { setLoading(false); }
    };

    const handleUpdateStatus = async (s) => {
        setLoading(true);
        await supabase.from('invoices').update({ status: s }).eq('id', invoice.id);
        onUpdate();
        onClose();
    };

    const handleSendInvoice = async () => {
        if (!window.confirm('Confirmer l\'envoi de la facture par email ?')) return;
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ 
                    invoiceId: invoice.id,
                    stripeUrl: stripeLink 
                }),
            });
            if (!response.ok) throw new Error('Erreur lors de l\'envoi.');
            alert('Facture envoyée avec succès !');
        } catch (error) { alert(`Erreur: ${error.message}`); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-8 shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-4">Facture #{invoice.document_number || invoice.id.substring(0, 8)}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-widest ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Client</h3>
                        <p className="font-bold text-gray-900">{invoice.clients ? `${invoice.clients.first_name} ${invoice.clients.last_name}` : invoice.entreprises?.nom_entreprise}</p>
                        <p className="text-gray-500">{invoice.clients?.email || invoice.entreprises?.contact_email}</p>
                    </div>
                    <div className="space-y-3">
                        <h3 className={`text-sm font-bold uppercase tracking-widest ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Informations</h3>
                        <div className="flex justify-between"><span className="text-gray-500">Statut:</span> <span className="font-bold">{getFrenchStatus(invoice.status)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Total:</span> <span className="font-bold text-lg">{invoice.total_amount?.toFixed(2)} €</span></div>
                        {invoice.deposit_amount > 0 && <div className="flex justify-between text-blue-600"><span className="text-gray-500">Acompte payé:</span> <span>{invoice.deposit_amount?.toFixed(2)} €</span></div>}
                    </div>
                </div>

                {stripeLink && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 flex items-center gap-4">
                        <input readOnly value={stripeLink} className="flex-1 p-2 bg-white border rounded text-xs" />
                        <button onClick={() => { navigator.clipboard.writeText(stripeLink); alert('Copié !'); }} className="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm">Copier</button>
                    </div>
                )}

                <div className="flex flex-wrap gap-3 justify-end border-t pt-6">
                    <button 
                        onClick={handleSendInvoice} 
                        disabled={loading || !stripeLink} 
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all font-bold mr-auto ${!stripeLink ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
                    >
                        <Send size={18} /> {loading ? '...' : 'Envoyer par mail'}
                    </button>
                    {invoice.status === 'pending' && (
                        <button onClick={() => handleGenerateStripe('deposit')} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                            <CreditCard size={18} /> {loading ? '...' : 'Lien Acompte (30%)'}
                        </button>
                    )}
                    {invoice.status === 'deposit_paid' && (
                        <button onClick={() => handleGenerateStripe('total')} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors">
                            <CreditCard size={18} /> {loading ? '...' : 'Lien Solde'}
                        </button>
                    )}
                    <button onClick={() => handleUpdateStatus('paid')} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors">
                        <CheckCircle size={18} /> Marquer comme Payée
                    </button>
                    <button onClick={onClose} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors font-bold">Fermer</button>
                </div>
            </div>
        </div>
    );
};

const statusBadgeStyle = (status) => {
    const colors = { 'pending': '#ffc107', 'deposit_paid': '#007bff', 'paid': '#28a745', 'cancelled': '#dc3545' };
    return { padding: '4px 10px', borderRadius: '20px', color: 'white', fontWeight: 'bold', fontSize: '11px', backgroundColor: colors[status] || '#6c757d' };
};

export default Factures;
