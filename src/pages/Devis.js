import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import QuoteDetailModal from './QuoteDetailModal';

const Devis = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { customer: prefilledCustomer, demandeId } = location.state || {};

    const [clients, setClients] = useState([]);
    const [entreprises, setEntreprises] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [services, setServices] = useState([]);
    const [quoteItems, setQuoteItems] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    
    const [existingQuotes, setExistingQuotes] = useState([]);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [isLoading, setIsLoading] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchServices = useCallback(async () => {
        const { data, error } = await supabase.from('services').select('*').order('name', { ascending: true });
        if (error) console.error('Error fetching services:', error);
        else setServices(data);
    }, []);

    useEffect(() => {
        if (prefilledCustomer && !selectedCustomer) {
            setSelectedCustomer(prefilledCustomer);
            if (prefilledCustomer.type === 'client') {
                setSearchTerm(`${prefilledCustomer.last_name} ${prefilledCustomer.first_name || ''}`.trim());
            } else if (prefilledCustomer.type === 'entreprise') {
                setSearchTerm(prefilledCustomer.nom_entreprise);
            }
        }
    }, [prefilledCustomer, selectedCustomer]);

    const fetchExistingQuotes = useCallback(async () => {
        setIsLoading(true);
        let query = supabase.from('quotes').select(`*, clients (first_name, last_name), entreprises (nom_entreprise)`).order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (quoteSearchTerm) {
            const searchTerm = `%${quoteSearchTerm}%`;
            query = query.or(`document_number.ilike.${searchTerm},clients.last_name.ilike.${searchTerm},entreprises.nom_entreprise.ilike.${searchTerm}`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching existing quotes:', error);
            setErrorMessage('Erreur lors du chargement des devis.');
        } else {
            setExistingQuotes(data);
        }
        setIsLoading(false);
    }, [quoteSearchTerm, statusFilter]);

    useEffect(() => { fetchServices(); }, [fetchServices]);
    useEffect(() => { const timer = setTimeout(() => { fetchExistingQuotes(); }, 500); return () => clearTimeout(timer); }, [fetchExistingQuotes]);

    const handleSearch = useCallback(async () => {
        setIsSearching(true);
        setClients([]);
        setEntreprises([]);
        setSelectedCustomer(null);
        if (searchTerm.length < 3) {
            setIsSearching(false);
            return;
        }
        const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*').ilike('last_name', `%${searchTerm}%`);
        if (clientsError) console.error('Error searching clients:', clientsError);
        else setClients(clientsData);

        const { data: entreprisesData, error: entreprisesError } = await supabase.from('entreprises').select('*').ilike('nom_entreprise', `%${searchTerm}%`);
        if (entreprisesError) console.error('Error searching entreprises:', entreprisesError);
        else setEntreprises(entreprisesData);
        setIsSearching(false);
    }, [searchTerm]);

    const handleSelectCustomer = (customer, type) => {
        setSelectedCustomer({ ...customer, type });
        setSearchTerm(type === 'client' ? `${customer.last_name} ${customer.first_name || ''}`.trim() : customer.nom_entreprise);
        setClients([]);
        setEntreprises([]);
    };

    const handleAddServiceToQuote = (service) => {
        setQuoteItems(prev => [...prev, { id: Date.now(), service_id: service.id, name: service.name, description: service.description, price: service.default_price, quantity: 1 }]);
    };

    const handleUpdateQuoteItem = (id, field, value) => {
        setQuoteItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleRemoveQuoteItem = (id) => {
        setQuoteItems(prev => prev.filter(item => item.id !== id));
    };

    const calculateTotal = () => quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleGenerateQuote = async () => {
        setIsLoading(true);
        setErrorMessage('');
        setSuccessMessage('');

        if (!selectedCustomer || !selectedCustomer.id || quoteItems.length === 0) {
            setErrorMessage('Veuillez sélectionner un client et ajouter au moins un service.');
            setIsLoading(false);
            return;
        }

        const total = calculateTotal();
        const payload = {
            customer: selectedCustomer,
            items: quoteItems.map(item => ({ service_id: item.service_id, name: item.name, description: item.description, quantity: item.quantity, price: item.price })),
            total: total,
            type: 'service_reservation',
        };

        if (demandeId) {
            payload.demandId = demandeId; // Correction de la faute de frappe ici
            console.log('Creating quote WITH demand:', demandeId);
        } else {
            console.log('Creating quote WITHOUT demand (direct creation)');
        }

        try {
            setSuccessMessage('Génération du devis en cours...');
            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/generate-quote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de la génération du devis');
            }

            const blob = await response.blob();
            const documentNumber = response.headers.get('X-Document-Number') || 'devis-nouveau';
            
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `devis-${documentNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setSuccessMessage(demandeId ? 'Devis généré et lié à la demande avec succès !' : 'Devis généré avec succès (création directe) !');
            setSelectedCustomer(null);
            setQuoteItems([]);
            setSearchTerm('');
            fetchExistingQuotes();

        } catch (error) {
            console.error('--- [ERROR] handleGenerateQuote:', error);
            setErrorMessage(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        // ... (existing code for updating status)
    };

    const renderCustomerName = (quote) => {
        if (quote.clients) return `${quote.clients.last_name} ${quote.clients.first_name || ''}`.trim();
        if (quote.entreprises) return quote.entreprises.nom_entreprise;
        return 'N/A';
    };

    return (
        <div style={containerStyle}>
            <h1>Gestion des Devis</h1>
            {/* ... JSX complet ... */}
        </div>
    );
};

// ... Styles ...

export default Devis;