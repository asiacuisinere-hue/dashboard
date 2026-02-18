import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import ReactPaginate from 'react-paginate';
import { useLocation } from 'react-router-dom';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    CreditCard, CheckCircle, Send, Clock, AlertTriangle, 
    Search, List, BellRing, User, Calendar, FileText, ArrowRight, Mail
} from 'lucide-react';

const getFrenchStatus = (status) => {
    switch (status) {
        case 'pending': return 'En attente';
        case 'deposit_paid': return 'Acompte versé';
        case 'paid': return 'Payée';
        case 'cancelled': return 'Annulée';
        default: return status;
    }
};

const statusBadgeStyle = (status) => {
    const colors = {
        'pending': { bg: 'rgba(212, 175, 55, 0.1)', text: '#d4af37' },
        'deposit_paid': { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' },
        'paid': { bg: 'rgba(40, 167, 69, 0.1)', text: '#28a745' },
        'cancelled': { bg: 'rgba(220, 53, 69, 0.1)', text: '#dc3545' }
    };
    const style = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return { 
        backgroundColor: style.bg, 
        color: style.text, 
        padding: '4px 12px', 
        borderRadius: '20px', 
        fontSize: '11px', 
        fontWeight: 'bold', 
        textTransform: 'uppercase' 
    };
};

const InvoiceCard = ({ invoice, onSelect, renderCustomerName, themeColor }) => (
    <div className={`bg-white rounded-2xl shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${themeColor === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                    <User size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800">{renderCustomerName(invoice)}</h3>
                    <p className="text-xs text-gray-400 font-medium">
                        {invoice.document_number || `ID: ${invoice.id.substring(0, 8)}`}
                    </p>
                </div>
            </div>
            <span style={statusBadgeStyle(invoice.status)}>
                {getFrenchStatus(invoice.status)}
            </span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Montant Total</p>
                <p className="text-gray-800 font-black text-lg">{(invoice.total_amount || 0).toFixed(2)} €</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Date Émission</p>
                <p className="text-gray-700 font-bold text-sm flex items-center gap-1.5">
                    <Calendar size={12} /> {new Date(invoice.created_at).toLocaleDateString('fr-FR')}
                </p>
            </div>
        </div>

        {invoice.last_email_sent_at && (
            <div className="flex items-center text-[10px] text-blue-500 mb-4 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                <Clock size={12} className="mr-1.5" /> Envoyée le {new Date(invoice.last_email_sent_at).toLocaleString('fr-FR')}
            </div>
        )}

        <button 
            onClick={() => onSelect(invoice)}
            className={`w-full text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
        >
            Gérer la facture <ArrowRight size={16} />
        </button>
    </div>
);

const Factures = () => {
    const { businessUnit } = useBusinessUnit();
    const location = useLocation();
    const [invoices, setInvoices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [activeTab, setActiveTab] = useState('all');
    const itemsPerPage = 10;

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const urlStatus = searchParams.get('status');
        if (urlStatus) setStatusFilter(urlStatus);
    }, [location.search]);

    const fetchInvoices = useCallback(async () => {
        let query = supabase.from('invoices').select(`
            *,
            demand_id,
            clients (first_name, last_name, email),
            entreprises (nom_entreprise, contact_email),
            demandes (type, status, details_json)
        `)
        .eq('business_unit', businessUnit);

        if (activeTab === 'overdue') {
            query = query.in('status', ['pending', 'deposit_paid']);
        } else if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (searchTerm) {
            const searchPattern = `%${searchTerm}%`;
            query = query.or(
                `document_number.ilike.${searchPattern},clients.first_name.ilike.${searchPattern},clients.last_name.ilike.${searchPattern},entreprises.nom_entreprise.ilike.${searchPattern}`
            );
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) console.error('Erreur:', error);
        else setInvoices(data || []);
    }, [searchTerm, statusFilter, businessUnit, activeTab]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    useEffect(() => {
        if (selectedInvoice && invoices.length > 0) {
            const updated = invoices.find(i => i.id === selectedInvoice.id);
            if (updated && JSON.stringify(updated) !== JSON.stringify(selectedInvoice)) {
                setSelectedInvoice(updated);
            }
        }
    }, [invoices, selectedInvoice]);

    const renderCustomerName = (invoice) => {
        if (invoice.clients) return `${invoice.clients.first_name || ''} ${invoice.clients.last_name || ''}`.trim() || 'Client Inconnu';
        if (invoice.entreprises) return invoice.entreprises.nom_entreprise;
        return 'N/A';
    };

    const handlePageClick = (event) => setCurrentPage(event.selected);
    const offset = currentPage * itemsPerPage;
    const currentInvoices = invoices.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(invoices.length / itemsPerPage);

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Factures</h1>
                    <p className="text-gray-600">Suivez vos paiements et acomptes pour l'unité {businessUnit}.</p>
                </div>

                <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 max-w-md">
                    <button
                        onClick={() => { setActiveTab('all'); setStatusFilter('all'); }}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'all' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <List size={16} className="mr-2" /> Toutes
                    </button>
                    <button 
                        onClick={() => setActiveTab('overdue')}
                        className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'overdue' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <BellRing size={16} className="mr-2 text-red-500" /> À Relancer
                    </button>
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center animate-in fade-in duration-500">
                    <div className="flex-1 min-w-[250px] relative">
                        <Search size={18} className="absolute left-3 top-3 text-gray-400"/>
                        <input 
                            type="text" 
                            placeholder="Rechercher par N° ou client..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 border-gray-200"
                        />
                    </div>
                    {activeTab === 'all' && (
                        <select 
                            value={statusFilter} 
                            onChange={e => setStatusFilter(e.target.value)}
                            className="p-2.5 border border-gray-200 rounded-xl outline-none bg-white font-bold text-gray-700 min-w-[180px]"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="pending">En attente</option>
                            <option value="deposit_paid">Acompte versé</option>
                            <option value="paid">Payée</option>
                            <option value="cancelled">Annulée</option>
                        </select>
                    )}
                </div>

                <div className="hidden lg:block bg-white rounded-3xl shadow-sm overflow-hidden border border-gray-100 animate-in fade-in duration-700">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Facture</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Client</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Date</th>
                                <th className="px-8 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Montant</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Statut</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {currentInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-20 text-center text-gray-400 italic">Aucune facture trouvée.</td>
                                </tr>
                            ) : currentInvoices.map(invoice => (
                                <tr key={invoice.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-bold text-gray-900">{invoice.document_number || invoice.id.substring(0, 8)}</div>
                                        {invoice.last_email_sent_at && <div className="text-[9px] text-blue-500 flex items-center mt-1"><Clock size={10} className="mr-1"/> Envoyée le {new Date(invoice.last_email_sent_at).toLocaleDateString('fr-FR')}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">{renderCustomerName(invoice)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">{new Date(invoice.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-8 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900">{(invoice.total_amount || 0).toFixed(2)} €</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center"><span style={statusBadgeStyle(invoice.status)}>{getFrenchStatus(invoice.status)}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(invoice); }} className={`font-bold ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Détails</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="block lg:hidden space-y-4 animate-in fade-in duration-700">
                    {currentInvoices.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                            <FileText size={48} className="mx-auto text-gray-200 mb-4"/>
                            <p className="text-gray-500 font-medium">Aucune facture trouvée.</p>
                        </div>
                    ) : currentInvoices.map(invoice => (
                        <InvoiceCard key={invoice.id} invoice={invoice} onSelect={setSelectedInvoice} renderCustomerName={renderCustomerName} themeColor={themeColor} />
                    ))}
                </div>

                <div className="mt-10 flex justify-center">
                    <ReactPaginate
                        previousLabel={'<'} nextLabel={'>'} pageCount={pageCount} onPageChange={handlePageClick}
                        containerClassName={'flex space-x-2 pagination'} activeClassName={'bg-amber-500 text-white rounded-xl'}
                        pageLinkClassName={'px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-100 font-bold transition-all'}
                    />
                </div>
            </div>

            {selectedInvoice && (
                <InvoiceDetailModal 
                    invoice={selectedInvoice} 
                    onClose={() => setSelectedInvoice(null)} 
                    onUpdate={() => fetchInvoices()}
                    themeColor={themeColor}
                />
            )}
        </div>
    );
};

const InvoiceDetailModal = ({ invoice, onClose, onUpdate, themeColor }) => {
    const [actionLoading, setActionLoading] = useState(false);
    const [stripeLink, setStripeLink] = useState(invoice.payment_link || '');

    useEffect(() => {
        setStripeLink(invoice.payment_link || '');
    }, [invoice.id, invoice.payment_link]);

    const handleGenerateStripe = async (type = 'deposit') => {
        if (invoice.status === 'paid') {
            alert("Cette facture est déjà entièrement payée.");
            return;
        }
        if (stripeLink && !window.confirm("Un lien de paiement a déjà été généré. Le remplacer ?")) return;

        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-stripe-checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ invoice_id: invoice.id, amount_type: type })
            });
            const res = await response.json();
            if (!response.ok) throw new Error(res.error);

            setStripeLink(res.url);
            onUpdate();
            alert("Lien Stripe prêt !");
        } catch (err) { alert(err.message); }
        finally { setActionLoading(false); }
    };

    const handleUpdateStatus = async (s) => {
        const confirmMsg = s === 'paid' ? "Marquer cette facture comme 'Payée' et envoyer la facture finale au client ?" : `Passer cette facture en '${getFrenchStatus(s)}' ?`;
        if (!window.confirm(confirmMsg)) return;
        
        setActionLoading(true);
        try {
            const { error } = await supabase.from('invoices').update({ status: s }).eq('id', invoice.id);
            if (error) throw error;

            if (invoice.demand_id) {
                await supabase.from('demandes').update({ payment_status: s }).eq('id', invoice.demand_id);
            }

            if (s === 'paid') {
                const { data: { session } } = await supabase.auth.getSession();
                await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                    body: JSON.stringify({ invoiceId: invoice.id }),
                });
                alert("Facture marquée comme payée et envoyée au client !");
            } else {
                alert("Statut mis à jour.");
            }
            onUpdate();
            onClose();
        } catch (err) {
            alert("Erreur: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendInvoice = async () => {
        if (!window.confirm('Confirmer l\'envoi de la facture par email ?')) return;
        setActionLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
                body: JSON.stringify({ invoiceId: invoice.id, stripeUrl: stripeLink }),
            });
            if (!response.ok) throw new Error('Erreur lors de l\'envoi.');
            alert('Facture envoyée avec succès !');
            onUpdate();
        } catch (error) { alert(`Erreur: ${error.message}`); }
        finally { setActionLoading(false); }
    };

    const isFullyPaid = invoice.status === 'paid';

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>
                
                <div className="mb-8">
                    <span style={statusBadgeStyle(invoice.status)} className="mb-2 inline-block">{getFrenchStatus(invoice.status)}</span>
                    <h2 className="text-3xl font-black text-gray-800">Facture #{invoice.document_number || invoice.id.substring(0, 8)}</h2>
                </div>

                {invoice.last_email_sent_at && (
                    <div className="flex items-center text-xs text-blue-600 font-bold mb-8 bg-blue-50 px-4 py-3 rounded-2xl border border-blue-100">
                        <Clock size={16} className="mr-2" /> 
                        Dernier envoi client : {new Date(invoice.last_email_sent_at).toLocaleString('fr-FR')}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                        <h3 className={`text-xs font-black uppercase tracking-widest opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Informations Client</h3>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <p className="font-bold text-gray-900 text-lg">{invoice.clients ? `${invoice.clients.first_name || ''} ${invoice.clients.last_name || ''}`.trim() || 'Client Inconnu' : invoice.entreprises?.nom_entreprise}</p>
                            <p className="text-gray-500 text-sm mt-1 flex items-center gap-2"><Mail size={14}/> {invoice.clients?.email || invoice.entreprises?.contact_email}</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className={`text-xs font-black uppercase tracking-widest opacity-40 ${themeColor === 'blue' ? 'text-blue-600' : 'text-amber-600'}`}>Récapitulatif Financier</h3>
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-gray-500 font-medium">Total Facturé :</span> <span className="font-black text-gray-900">{invoice.total_amount?.toFixed(2)} €</span></div>
                            {invoice.deposit_amount > 0 && <div className="flex justify-between text-sm text-blue-600"><span className="font-medium opacity-70 text-gray-500">Acompte payé :</span> <span className="font-black">-{invoice.deposit_amount?.toFixed(2)} €</span></div>}
                            <hr className="border-gray-200" />
                            <div className="flex justify-between text-lg"><span className="text-gray-800 font-bold">Reste à payer :</span> <span className="font-black text-green-600">{(invoice.total_amount - (invoice.deposit_amount || 0)).toFixed(2)} €</span></div>
                        </div>
                    </div>
                </div>

                {stripeLink ? (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 mb-10 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3 text-indigo-700 font-black text-xs uppercase tracking-widest">
                            <CheckCircle size={16} /> Lien de paiement actif
                        </div>
                        <div className="flex gap-2">
                            <input readOnly value={stripeLink} className="flex-1 p-3 bg-white border border-indigo-200 rounded-xl text-xs font-mono focus:ring-0 outline-none shadow-inner" />
                            <button onClick={() => { navigator.clipboard.writeText(stripeLink); alert('Copié !'); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-sm hover:bg-indigo-700 transition-all active:scale-95 shadow-md">Copier</button>
                        </div>
                    </div>
                ) : !isFullyPaid && (
                    <div className="bg-amber-50 border border-amber-100 rounded-3xl p-6 mb-10 flex items-start gap-4 text-amber-800 animate-in fade-in">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><AlertTriangle size={24} /></div>
                        <div>
                            <p className="font-black text-sm uppercase tracking-tight mb-1">Action Requise</p>
                            <p className="text-sm opacity-80 leading-relaxed font-medium">Générez un lien Stripe ci-dessous pour activer l'envoi de la facture par email.</p>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-4 justify-between border-t pt-8">
                    <button 
                        onClick={handleSendInvoice}
                        disabled={actionLoading || !stripeLink || isFullyPaid}
                        className={`px-8 py-4 rounded-2xl flex items-center gap-3 transition-all font-black shadow-lg active:scale-95 ${(!stripeLink || isFullyPaid) ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-700'}`}
                    >
                        <Send size={20} /> {actionLoading ? '...' : 'Envoyer par mail'}
                    </button>

                    <div className="flex gap-3">
                        {!isFullyPaid && (
                            <>
                                {invoice.status === 'pending' && <button onClick={() => handleGenerateStripe('deposit')} disabled={actionLoading} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95"><CreditCard size={20} /> {actionLoading ? '...' : 'Lien Acompte'}</button>}
                                {invoice.status === 'deposit_paid' && <button onClick={() => handleGenerateStripe('total')} disabled={actionLoading} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95"><CreditCard size={20} /> {actionLoading ? '...' : 'Lien Solde'}</button>}
                                <button onClick={() => handleUpdateStatus('paid')} className="bg-green-600 text-white px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-green-700 transition-all font-black shadow-md active:scale-95"><CheckCircle size={20} /> Payée</button>
                            </>
                        )}
                        <button onClick={onClose} className="bg-gray-100 text-gray-600 px-8 py-4 rounded-2xl hover:bg-gray-200 transition-all font-bold">Fermer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Factures;
