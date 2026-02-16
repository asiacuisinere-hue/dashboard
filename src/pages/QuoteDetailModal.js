import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
    FileText, Download, Eye, Send,
    CheckCircle2, XCircle, Clock,
    RefreshCw, FileCheck, Fingerprint
} from 'lucide-react';

const QuoteDetailModal = ({ quote, onClose, onUpdateStatus, fetchExistingQuotes }) => {
    const [isSending, setIsSending] = useState(false);
    const [isLoadingAction, setIsLoadingAction] = useState(false);

    const handleView = async () => {
        setIsLoadingAction(true);
        if (!quote.storage_path) {
            alert("Aucun document à afficher.");
            setIsLoadingAction(false);
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/view-document?path=${quote.storage_path}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            if (!response.ok) throw new Error("Le fichier n'a pas pu être chargé.");

            const blob = await response.blob();
            const fileURL = URL.createObjectURL(blob);
            window.open(fileURL, '_blank');
        } catch (error) {
            alert(`Erreur d'affichage: ${error.message}`);
        } finally {
            setIsLoadingAction(false);
        }
    };

    const handleDownload = async () => {
        setIsLoadingAction(true);
        if (!quote.storage_path) {
            alert("Aucun document à télécharger.");
            setIsLoadingAction(false);
            return;
        }
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/view-document?path=${quote.storage_path}`;
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });

            if (!response.ok) throw new Error("Le fichier n'a pas pu être téléchargé.");

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = quote.document_number ? `devis-${quote.document_number}.pdf` : 'devis.pdf';      
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            setIsLoadingAction(false);
        }
    };

    const handleSend = async () => {
        if (!window.confirm("Confirmer l'envoi du devis par email au client ?")) return;
        setIsSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-quote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ quoteId: quote.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            alert(result.message || 'Devis envoyé avec succès.');
            fetchExistingQuotes();
            onClose();
        } catch (error) {
            alert(`Erreur: ${error.message}`);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-10 shadow-2xl animate-in zoom-in duration-300">
                <button onClick={onClose} className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors text-3xl font-light">&times;</button>

                <div className="mb-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span style={statusBadgeStyle(quote.status)} className="inline-block">{quote.status}</span>
                        {quote.requires_signature && !quote.signed_at && <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1.5"><Fingerprint size={12}/> SIGNATURE ATTENDUE</span>}
                        {quote.signed_at && <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100 flex items-center gap-1.5"><Fingerprint size={12}/> DEVIS SIGNÉ</span>}
                    </div>
                    <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <FileText className="text-amber-500" size={32} />
                        Devis #{quote.document_number}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <Clock size={14}/> Historique & Montant
                        </h3>
                        <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-3">     
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Créé le :</span>
                                <span className="font-bold text-gray-700">{new Date(quote.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Total :</span>
                                <span className="font-black text-gray-900 text-lg">{(quote.total_amount || 0).toFixed(2)} €</span>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                            <FileCheck size={14}/> Document PDF
                        </h3>
                        <div className="flex gap-3">
                            <button onClick={handleView} disabled={isLoadingAction} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50">
                                {isLoadingAction ? <RefreshCw className="animate-spin" size={16}/> : <Eye size={18}/>} VOIR
                            </button>
                            <button onClick={handleDownload} disabled={isLoadingAction} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50">
                                <Download size={18}/> PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- BLOC DE SIGNATURE ÉLECTRONIQUE --- */}
                {quote.signed_at && (
                    <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <h3 className="text-xs font-black uppercase tracking-widest text-green-600 flex items-center gap-2 mb-4">
                            <Fingerprint size={14}/> Preuve de signature électronique
                        </h3>
                        <div className="p-6 bg-green-50/50 rounded-3xl border border-green-100 flex flex-wrap md:flex-nowrap gap-8 items-center">
                            <div className="bg-white p-4 rounded-2xl border border-green-100 shadow-sm">
                                <img src={quote.signature_image} alt="Signature client" className="h-20 w-auto mix-blend-multiply" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-bold text-gray-800">Signé par : <span className="font-black text-green-700">{quote.signer_name}</span></p>
                                <p className="text-xs text-gray-500 font-medium">Date : {new Date(quote.signed_at).toLocaleString('fr-FR')}</p>
                                <p className="text-[10px] text-gray-400 font-mono uppercase tracking-tighter">Adresse IP : {quote.signature_ip || 'Audit log disponible'}</p>
                                <div className="pt-2">
                                    <span className="text-[9px] font-black text-green-600 bg-white px-2 py-1 rounded border border-green-200 uppercase tracking-widest">Document certifié</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap gap-4 pt-8 border-t">
                    <div className="flex-1 flex gap-3">
                        {quote.status === 'draft' && (
                            <button onClick={handleSend} disabled={isSending} className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95">
                                {isSending ? <RefreshCw className="animate-spin" /> : <Send size={22} />} 
                                ENVOYER PAR EMAIL
                            </button>
                        )}
                        {quote.status === 'sent' && !quote.requires_signature && (
                            <button onClick={() => onUpdateStatus(quote.id, 'accepted')} className="flex-1 flex items-center justify-center gap-3 py-5 rounded-[2rem] bg-green-600 text-white font-black text-lg shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95">
                                <CheckCircle2 size={22} /> ACCEPTER
                            </button>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {quote.status !== 'accepted' && quote.status !== 'rejected' && (
                            <button onClick={() => onUpdateStatus(quote.id, 'rejected')} className="px-6 py-5 rounded-2xl bg-red-50 text-red-600 font-black hover:bg-red-100 transition-all">
                                <XCircle size={22} />
                            </button>
                        )}
                        <button onClick={onClose} className="px-8 py-5 rounded-2xl bg-gray-50 text-gray-400 font-bold hover:bg-gray-100 transition-all">FERMER</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const statusBadgeStyle = (status) => {
    const colors = {
        'draft': { bg: 'rgba(108, 117, 125, 0.1)', text: '#6c757d' },
        'sent': { bg: 'rgba(23, 162, 184, 0.1)', text: '#17a2b8' },
        'accepted': { bg: 'rgba(40, 167, 69, 0.1)', text: '#28a745' },
        'rejected': { bg: 'rgba(220, 53, 69, 0.1)', text: '#dc3545' }
    };
    const style = colors[status] || { bg: '#f3f4f6', text: '#6b7280' };
    return {
        backgroundColor: style.bg,
        color: style.text,
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '10px',
        fontWeight: '900',
        textTransform: 'uppercase'
    };
};

export default QuoteDetailModal;
