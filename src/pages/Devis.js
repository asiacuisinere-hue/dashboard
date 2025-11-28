import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import QuoteDetailModal from '../QuoteDetailModal';

const Devis = () => {
    const location = useLocation();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [status, setStatus] = useState({ message: '', type: '' });
    const [isLoading, setIsLoading] = useState(false);

    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('quotes')
            .select('*, clients(first_name, last_name, email), entreprises(nom_entreprise, contact_email)')
            .order('created_at', { ascending: false });

        if (error) {
            setError(error.message);
        } else {
            setQuotes(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchQuotes();
    }, [fetchQuotes]);

    const handleGenerateQuote = useCallback(async (customer, items, total, type) => {
        setIsLoading(true);
        setStatus({ message: 'Génération du devis...', type: 'info' });

        const demandId = location.state?.demandeId || null;
        console.log("Creating quote WITH demand:", demandId);

        try {
            const { data, error } = await supabase.functions.invoke('generate-quote', {
                body: { customer, items, total, type, demandId }
            });

            if (error) throw error;
            
            const documentNumber = error ? 'N/A' : (data.headers['X-Document-Number'] || 'N/A');
            setStatus({ message: `Devis #${documentNumber} généré et envoyé avec succès !`, type: 'success' });
            fetchQuotes();
            
        } catch (error) {
            console.error('Erreur génération devis:', error);
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, [fetchQuotes, location.state]);

    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        setStatus({ message: `Mise à jour du statut pour le devis ${quoteId}...`, type: 'info' });

        const { error } = await supabase
            .from('quotes')
            .update({ status: newStatus })
            .eq('id', quoteId);

        if (error) {
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
            return;
        }

        setStatus({ message: 'Statut mis à jour avec succès.', type: 'success' });

        if (newStatus === 'accepted') {
            try {
                const { data, error: invoiceError } = await supabase.functions.invoke('create-invoice-from-quote', {
                    body: { quoteId: quoteId }
                });

                if (invoiceError) throw invoiceError;

                setStatus({ message: `Facture créée avec succès pour le devis ${quoteId} !`, type: 'success' });
                
            } catch (err) {
                 setStatus({ message: `Erreur création facture: ${err.details || err.message}`, type: 'error' });
            }
        }
        fetchQuotes();
    };

    if (loading) return <p>Chargement des devis...</p>;
    if (error) return <p style={{color: 'red'}}>Erreur: {error}</p>;

    return (
        <div>
            <h1>Gestion des Devis</h1>
            {/* The rest of the JSX for displaying quotes, buttons, etc. */}
        </div>
    );
};

export default Devis;
