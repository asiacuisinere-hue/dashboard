import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';

const Devis = () => {
    const location = useLocation();
    const navigate = useNavigate(); // ADDED: Initialize useNavigate
    const prefilledCustomer = location.state?.customer;

    const [clients, setClients] = useState([]);
    const [entreprises, setEntreprises] = useState([]);
    const [searchTerm, setSearchTerm] = useState(''); // Search term for customer selection
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Selected customer for new quote
    const [services, setServices] = useState([]); // Available services for new quote
    const [quoteItems, setQuoteItems] = useState([]); // Items for the new quote
    const [isSearching, setIsSearching] = useState(false); // Loading state for customer search
    
    // --- State for existing quotes list ---
    const [existingQuotes, setExistingQuotes] = useState([]); // Raw list of existing quotes
    const [selectedQuote, setSelectedQuote] = useState(null); // Selected quote for detail modal
    const [quoteSearchTerm, setQuoteSearchTerm] = useState(''); // Search term for existing quotes table
    const [statusFilter, setStatusFilter] = useState('all'); // Status filter for existing quotes table

    // --- General component states ---
    const [isLoading, setIsLoading] = useState(false); // General loading state
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch available services
    const fetchServices = useCallback(async () => {
        const { data, error } = await supabase.from('services').select('*').order('name', { ascending: true });
        if (error) {
            console.error('Error fetching services:', error);
        } else {
            setServices(data);
        }
    }, []);

    useEffect(() => {
        if (prefilledCustomer && !selectedCustomer) { // Only pre-fill if customer hasn't been selected yet
            setSelectedCustomer(prefilledCustomer);
            if (prefilledCustomer.type === 'client') {
                setSearchTerm(`${prefilledCustomer.last_name} ${prefilledCustomer.first_name || ''}`.trim());
            } else if (prefilledCustomer.type === 'entreprise') {
                setSearchTerm(prefilledCustomer.nom_entreprise);
            }
        }
    }, [prefilledCustomer, selectedCustomer, setSearchTerm, setSelectedCustomer]);

    const fetchExistingQuotes = useCallback(async () => {
        setIsLoading(true);
        let query = supabase.from('quotes').select(`
            *,
            clients (first_name, last_name),
            entreprises (nom_entreprise)
        `).order('created_at', { ascending: false });

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (quoteSearchTerm) {
            const searchTerm = `%${quoteSearchTerm}%`;
            query = query.or(
                `document_number.ilike.${searchTerm}`,
                `clients.last_name.ilike.${searchTerm}`,
                `entreprises.nom_entreprise.ilike.${searchTerm}`
            );
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

    useEffect(() => {
        fetchServices();
    }, [fetchServices]);

    useEffect(() => {
        // Debounce search input to avoid excessive API calls
        const timer = setTimeout(() => {
            fetchExistingQuotes();
        }, 500);

        return () => clearTimeout(timer);
    }, [fetchExistingQuotes]); // Removed quoteSearchTerm and statusFilter from deps as fetchExistingQuotes already depends on them.

    // Search clients and entreprises
    const handleSearch = useCallback(async () => {
        setIsSearching(true);
        setClients([]);
        setEntreprises([]);
        setSelectedCustomer(null);

        if (searchTerm.length < 3) {
            setIsSearching(false);
            return;
        }

        // Search clients
        const { data: clientsData, error: clientsError } = await supabase
            .from('clients')
            .select('*')
            .ilike('last_name', `%${searchTerm}%`);
        if (clientsError) console.error('Error searching clients:', clientsError);
        else setClients(clientsData);

        // Search entreprises
        const { data: entreprisesData, error: entreprisesError } = await supabase
            .from('entreprises')
            .select('*')
            .ilike('nom_entreprise', `%${searchTerm}%`);
        if (entreprisesError) console.error('Error searching entreprises:', entreprisesError);
        else setEntreprises(entreprisesData);

        setIsSearching(false);
    }, [searchTerm]);

    const handleSelectCustomer = (customer, type) => {
        setSelectedCustomer({ ...customer, type });
        setSearchTerm(type === 'client' ? `${customer.last_name} ${customer.first_name || ''}`.trim() : customer.nom_entreprise); // Keep name in search bar
        setClients([]);
        setEntreprises([]);
    };

    const handleAddServiceToQuote = (service) => {
        setQuoteItems(prev => [
            ...prev,
            {
                id: Date.now(), // Unique ID for the quote item
                service_id: service.id,
                name: service.name,
                description: service.description,
                price: service.default_price,
                quantity: 1,
            }
        ]);
    };

    const handleUpdateQuoteItem = (id, field, value) => {
        setQuoteItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveQuoteItem = (id) => {
        setQuoteItems(prev => prev.filter(item => item.id !== id));
    };

    const calculateTotal = () => {
        return quoteItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

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
        items: quoteItems.map(item => ({
            service_id: item.service_id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            price: item.price
        })),
        total: total,
        type: 'service_reservation'
    };

    try {
        setSuccessMessage('Génération du devis en cours...');

        // Appel à la Supabase Edge Function
        const response = await fetch(
            `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/generate-quote`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur lors de la génération du devis');
        }

        // Télécharger le PDF
        const blob = await response.blob();
        const documentNumber = response.headers.get('X-Document-Number') || 'devis-nouveau';
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devis-${documentNumber}.pdf`; // Removed .substring(0, 8)
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccessMessage('Devis généré, envoyé par email et téléchargé avec succès !');
        
        // Reset form
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
        console.log('--- [DEBUG] handleUpdateQuoteStatus: Démarrage pour devis', quoteId, 'avec statut', newStatus);
        if (!window.confirm(`Confirmer le changement de statut du devis ${quoteId.substring(0, 8)} à "${newStatus}" ?`)) {
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            alert("Utilisateur non authentifié.");
            return;
        }
        console.log('--- [DEBUG] handleUpdateQuoteStatus: Session authentifiée.');

        try {
            console.log('--- [DEBUG] handleUpdateQuoteStatus: Mise à jour du statut dans Supabase...');
            const { error: updateError } = await supabase
                .from('quotes')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', quoteId);

            if (updateError) throw updateError;
            console.log('--- [DEBUG] handleUpdateQuoteStatus: Statut mis à jour avec succès.');

            if (newStatus === 'accepted') {
                console.log('--- [DEBUG] handleUpdateQuoteStatus: Le statut est "accepted", tentative de création de la facture...');
                // Appel de la fonction Cloudflare pour générer la facture
                const response = await fetch('/create-invoice-from-quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({ quoteId: quoteId }),
                });
                console.log('--- [DEBUG] handleUpdateQuoteStatus: Réponse reçue du serveur pour create-invoice-from-quote, statut:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('--- [ERREUR] handleUpdateQuoteStatus: Réponse non-OK de create-invoice-from-quote', errorData);
                    throw new Error(errorData.details || 'Erreur inconnue lors de la création de la facture.');
                }

                const result = await response.json();
                console.log('--- [DEBUG] handleUpdateQuoteStatus: Facture créée avec succès, résultat:', result);
                alert(`Devis ${quoteId.substring(0, 8)} accepté et facture générée !`);
                navigate('/factures'); // Redirect to invoices page
            } else {
                alert(`Statut du devis ${quoteId.substring(0, 8)} mis à jour à "${newStatus}".`);
            }
            fetchExistingQuotes(); // Refresh the list
            setSelectedQuote(null); // Close details if open

        } catch (error) {
            console.error('--- [ERREUR] handleUpdateQuoteStatus: Erreur capturée dans le catch de création de facture:', error);
            alert(`Erreur lors de la mise à jour du statut ou de la génération de facture : ${error.message}`);
        }
    };

    const renderCustomerName = (quote) => {
        if (quote.clients) {
            return `${quote.clients.last_name} ${quote.clients.first_name || ''}`.trim();
        } else if (quote.entreprises) {
            return quote.entreprises.nom_entreprise;
        }
        return 'N/A';
    };

    return (
        <div style={containerStyle}>
            <h1>Gestion des Devis</h1>

            {/* Display loading, success, error messages */}
            {isLoading && <p>Génération du devis en cours...</p>}
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

            {/* Section de création de nouveau devis */}
            <div style={sectionStyle}>
                <h2>Créer un nouveau devis</h2>

                {/* Section de recherche de client */}
                <div style={subSectionStyle}>
                    <h3>1. Sélectionner un client / une entreprise</h3>
                    <div style={searchCustomerContainerStyle}>
                        <input
                            type="text"
                            placeholder="Rechercher par nom ou nom d'entreprise..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={inputStyle}
                        />
                        <button onClick={handleSearch} style={{ ...addServiceButtonStyle, width: 'auto' }}>Rechercher</button>
                    </div>
                    {isSearching && <p>Recherche en cours...</p>}
                    {(clients.length > 0 || entreprises.length > 0) && !selectedCustomer && (
                        <div style={searchResultsStyle}>
                            {clients.map(client => (
                                <div key={client.id} style={searchResultItemStyle} onClick={() => handleSelectCustomer(client, 'client')}>
                                    {client.last_name} {client.first_name} (Particulier)
                                </div>
                            ))}
                            {entreprises.map(entreprise => (
                                <div key={entreprise.id} style={searchResultItemStyle} onClick={() => handleSelectCustomer(entreprise, 'entreprise')}>
                                    {entreprise.nom_entreprise} (Entreprise)
                                </div>
                            ))}
                        </div>
                    )}
                    {selectedCustomer && (
                        <div style={selectedCustomerStyle}>
                            Client sélectionné: <strong>
                                {selectedCustomer.type === 'client' ?
                                    `${selectedCustomer.last_name} ${selectedCustomer.first_name || ''}`.trim() :
                                    selectedCustomer.nom_entreprise
                                }
                            </strong>
                            <button onClick={() => { setSelectedCustomer(null); setSearchTerm(''); }} style={clearCustomerButtonStyle}>X</button>
                        </div>
                    )}
                </div>

                {/* Section d'ajout de services */}
                <div style={subSectionStyle}>
                    <h3>2. Ajouter des services au devis</h3>
                    <div style={servicesGridStyle}>
                        {services.map(service => (
                            <div key={service.id} style={serviceCardStyle} onClick={() => handleAddServiceToQuote(service)}>
                                <h3>{service.name}</h3>
                                <p>{service.description}</p>
                                <p>Prix par défaut: {service.default_price} €</p>
                                <button style={addServiceButtonStyle}>Ajouter</button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section des lignes du devis */}
                <div style={subSectionStyle}>
                    <h3>3. Lignes du devis</h3>
                    {quoteItems.length === 0 ? (
                        <p>Aucun service ajouté au devis.</p>
                    ) : (
                        <div style={quoteItemsTableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Service</th>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Quantité</th>
                                        <th style={thStyle}>Prix unitaire (€)</th>
                                        <th style={thStyle}>Total (€)</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quoteItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={tdStyle}>{item.name}</td>
                                            <td style={tdStyle}>{item.description}</td>
                                            <td style={tdStyle}>
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateQuoteItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                                    style={smallInputStyle}
                                                />
                                            </td>
                                            <td style={tdStyle}>
                                                <input
                                                    type="number"
                                                    value={item.price}
                                                    onChange={(e) => handleUpdateQuoteItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                                    style={smallInputStyle}
                                                />
                                            </td>
                                            <td style={tdStyle}>{(item.price * item.quantity).toFixed(2)}</td>
                                            <td style={tdStyle}>
                                                <button onClick={() => handleRemoveQuoteItem(item.id)} style={removeServiceButtonStyle}>X</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="4" style={{ ...thStyle, textAlign: 'right' }}>Total du devis:</td>
                                        <td style={thStyle}>{calculateTotal().toFixed(2)} €</td>
                                        <td style={thStyle}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Section de génération */}
                <div style={subSectionStyle}>
                    <h3>4. Générer le devis</h3>
                    <button onClick={handleGenerateQuote} style={generateQuoteButtonStyle} disabled={isLoading}>
                        {isLoading ? 'Génération en cours...' : 'Générer et Télécharger le Devis PDF'}
                    </button>
                </div>
            </div>

            {/* Section des devis existants */}
            <div style={sectionStyle}>
                <h2>Devis existants</h2>
                <div style={filterContainerStyle}>
                    <input
                        type="text"
                        placeholder="Rechercher par N° ou client..."
                        value={quoteSearchTerm}
                        onChange={(e) => setQuoteSearchTerm(e.target.value)}
                        style={inputStyle}
                    />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={inputStyle}>
                        <option value="all">Tous les statuts</option>
                        <option value="draft">Brouillon</option>
                        <option value="sent">Envoyé</option>
                        <option value="accepted">Accepté</option>
                        <option value="rejected">Refusé</option>
                    </select>
                </div>
                                
                {existingQuotes.length === 0 ? (
                    <p>Aucun devis existant.</p>
                ) : (
                    <div style={tableContainerStyle}>
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>ID Devis</th>
                                    <th style={thStyle}>Client / Entreprise</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Total</th>
                                    <th style={thStyle}>Statut</th>
                                    <th style={thStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {existingQuotes.map(quote => (
                                    <tr key={quote.id}>
                                        <td style={tdStyle}>{quote.document_number?.substring(0, 18) || quote.id.substring(0, 8)}</td>
                                        <td style={tdStyle}>{renderCustomerName(quote)}</td>
                                        <td style={tdStyle}>{new Date(quote.created_at).toLocaleDateString('fr-FR')}</td>
                                        <td style={tdStyle}>{quote.total_amount.toFixed(2)} €</td>
                                        <td style={tdStyle}><span style={statusBadgeStyle(quote.status)}>{quote.status}</span></td>
                                        <td style={tdStyle}>
                                            <button onClick={() => setSelectedQuote(quote)} style={detailsButtonStyle}>Voir Détails</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modale de détails du devis */}
            {selectedQuote && (
                <QuoteDetailModal
                    quote={selectedQuote}
                    onClose={() => setSelectedQuote(null)}
                    onUpdateStatus={handleUpdateQuoteStatus}
                />
            )}
        </div>
    );
};

// --- Quote Detail Modal Component ---
const QuoteDetailModal = ({ quote, onClose, onUpdateStatus }) => {
    const [quoteItems, setQuoteItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(true);

    const fetchQuoteItems = useCallback(async () => {
        setLoadingItems(true);
        const { data, error } = await supabase
            .from('quote_items')
            .select('*')
            .eq('quote_id', quote.id);

        if (error) {
            console.error('Error fetching quote items:', error);
        } else {
            setQuoteItems(data);
        }
        setLoadingItems(false);
    }, [quote.id]);

    useEffect(() => {
        fetchQuoteItems();
    }, [fetchQuoteItems]);

    const renderCustomerInfo = () => {
        if (quote.clients) {
            return (
                <>
                    <p><strong>Nom:</strong> {quote.clients.last_name} {quote.clients.first_name}</p>
                    <p><strong>Email:</strong> {quote.clients.email}</p>
                </>
            );
        } else if (quote.entreprises) {
            return (
                <>
                    <p><strong>Nom de l'entreprise:</strong> {quote.entreprises.nom_entreprise}</p>
                    <p><strong>Contact:</strong> {quote.entreprises.contact_name}</p>
                    <p><strong>Email du contact:</strong> {quote.entreprises.contact_email}</p>
                </>
            );
        }
        return <p>Informations client non disponibles.</p>;
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails du Devis #{quote.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Informations du Devis</h3>
                    <p><strong>Date du devis:</strong> {new Date(quote.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(quote.status)}>{quote.status}</span></p>
                    <p><strong>Total:</strong> {quote.total_amount.toFixed(2)} €</p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Services inclus</h3>
                    {loadingItems ? (
                        <p>Chargement des services...</p>
                    ) : quoteItems.length === 0 ? (
                        <p>Aucun service détaillé.</p>
                    ) : (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Service</th>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Qté</th>
                                        <th style={thStyle}>Prix U. (€)</th>
                                        <th style={thStyle}>Total (€)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {quoteItems.map(item => (
                                        <tr key={item.id}>
                                            <td style={tdStyle}>{item.name || 'N/A'}</td>
                                            <td style={tdStyle}>{item.description}</td>
                                            <td style={tdStyle}>{item.quantity}</td>
                                            <td style={tdStyle}>{item.unit_price.toFixed(2)}</td>
                                            <td style={tdStyle}>{(item.quantity * item.unit_price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={modalActionsStyle}>
                    {quote.status === 'sent' && (
                        <>
                            <button onClick={() => onUpdateStatus(quote.id, 'accepted')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Accepter</button>
                            <button onClick={() => onUpdateStatus(quote.id, 'rejected')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Refuser</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
};

const sectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const filterContainerStyle = { display: 'flex', gap: '15px', marginBottom: '20px' };

const subSectionStyle = {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f0f0f0',
};

const searchCustomerContainerStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap', // Permet aux éléments de passer à la ligne
};

const inputStyle = {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
    minWidth: '150px', // Largeur minimale pour l'input de recherche
};

const searchResultsStyle = {
    border: '1px solid #eee',
    borderRadius: '4px',
    marginTop: '10px',
    maxHeight: '200px',
    overflowY: 'auto',
};

const searchResultItemStyle = {
    padding: '10px',
    borderBottom: '1px solid #eee',
    cursor: 'pointer',
    backgroundColor: 'white',
};

const selectedCustomerStyle = {
    marginTop: '15px',
    padding: '10px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap', // Permet au texte de passer à la ligne
};

const clearCustomerButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    fontSize: '18px',
    cursor: 'pointer',
};

const servicesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '20px',
    marginTop: '20px',
};

const serviceCardStyle = {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '15px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    cursor: 'pointer',
    transition: 'transform 0.2s ease-in-out',
    backgroundColor: '#f8f9fa',
};

const addServiceButtonStyle = {
    marginTop: '10px',
    padding: '8px 15px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
};

const quoteItemsTableContainerStyle = {
    overflowX: 'auto', // Permet le défilement horizontal
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne
};

const smallInputStyle = {
    width: '80px',
    padding: '5px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
};

const removeServiceButtonStyle = {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '5px 10px',
    cursor: 'pointer',
};

const generateQuoteButtonStyle = {
    padding: '12px 25px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '20px',
};

const modalOverlayStyle = { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0, 0, 0, 0.6)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1000 
};
const modalContentStyle = { 
    background: 'white', 
    padding: '30px', 
    borderRadius: '8px', 
    width: '90%', 
    maxWidth: '700px', 
    maxHeight: '90vh', 
    overflowY: 'auto', 
    position: 'relative',
    boxSizing: 'border-box',
};
const closeButtonStyle = { 
    position: 'absolute', 
    top: '15px', 
    right: '15px', 
    background: 'transparent', 
    border: 'none', 
    fontSize: '24px', 
    cursor: 'pointer' 
};
const detailSectionStyle = { 
    marginBottom: '20px', 
    paddingBottom: '20px', 
    borderBottom: '1px solid #f0f0f0',
};

const detailTitleStyle = { 
    fontSize: '18px', 
    color: '#d4af37', 
    marginBottom: '10px' 
};
const actionButtonStyle = { 
    padding: '10px 15px', 
    border: 'none', 
    borderRadius: '5px', 
    cursor: 'pointer', 
    color: 'white', 
    fontWeight: 'bold' 
};
const statusBadgeStyle = (status) => {
    const colors = {
        'draft': '#6c757d',
        'sent': '#17a2b8',
        'accepted': '#28a745',
        'rejected': '#dc3545',
    };
    return {
        padding: '4px 8px', borderRadius: '12px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        backgroundColor: colors[status] || '#6c757d'
    };
};

const modalActionsStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap',
};

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto',
    background: 'white'
};

const detailsButtonStyle = {
    padding: '8px 12px',
    background: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginRight: '5px',
};


export default Devis;