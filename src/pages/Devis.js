import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Devis = () => {
    const [clients, setClients] = useState([]);
    const [entreprises, setEntreprises] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Peut être un client ou une entreprise
    const [services, setServices] = useState([]); // Services disponibles
    const [quoteItems, setQuoteItems] = useState([]); // Lignes du devis pour le nouveau devis
    const [isSearching, setIsSearching] = useState(false);
    const [existingQuotes, setExistingQuotes] = useState([]); // Liste des devis existants
    const [selectedQuote, setSelectedQuote] = useState(null); // Devis sélectionné pour les détails

    // Fetch available services
    const fetchServices = useCallback(async () => {
        const { data, error } = await supabase.from('services').select('*').order('name', { ascending: true });
        if (error) {
            console.error('Error fetching services:', error);
        } else {
            setServices(data);
        }
    }, []);

    // Fetch existing quotes
    const fetchExistingQuotes = useCallback(async () => {
        const { data, error } = await supabase
            .from('quotes')
            .select(`
                *,
                clients!client_id(*),
                entreprises!entreprise_id(*) 
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching existing quotes:', error);
        } else {
            setExistingQuotes(data);
        }
    }, []);

    useEffect(() => {
        fetchServices();
        fetchExistingQuotes();
        // Optionnel: Déclencher la recherche initiale si un terme pré-existant est là ou un auto-focus.
        // if (searchTerm) handleSearch();
    }, [fetchServices, fetchExistingQuotes]);

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
        setSearchTerm(type === 'client' ? `${customer.last_name} ${customer.first_name}` : customer.nom_entreprise); // Keep name in search bar
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
        console.log('--- [DEBUG] handleGenerateQuote: Démarrage');
        console.log('--- [DEBUG] handleGenerateQuote: Valeur de selectedCustomer:', selectedCustomer);

        if (!selectedCustomer) {
            console.log('--- [DEBUG] handleGenerateQuote: Pas de client sélectionné');
            alert('Veuillez sélectionner un client ou une entreprise.');
            return;
        }
        if (quoteItems.length === 0) {
            console.log('--- [DEBUG] handleGenerateQuote: Pas de services dans le devis');
            alert('Veuillez ajouter au moins un service au devis.');
            return;
        }

        console.log('--- [DEBUG] handleGenerateQuote: Début du try/catch');
        try {
            const payload = {
                customer: selectedCustomer,
                items: quoteItems,
                total: calculateTotal()
            };
            console.log('--- [DEBUG] handleGenerateQuote: Payload envoyé:', JSON.stringify(payload, null, 2));

            const response = await fetch('https://www.asiacuisine.re/api/create-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            console.log('--- [DEBUG] handleGenerateQuote: Réponse reçue du serveur, statut:', response.status);

            if (!response.ok) {
                const errorData = await response.json();
                console.error('--- [ERREUR] handleGenerateQuote: Réponse non-OK', errorData);
                throw new Error(errorData.details || 'Erreur inconnue lors de la création du devis.');
            }

            const result = await response.json();
            console.log('--- [DEBUG] handleGenerateQuote: Réponse OK, résultat:', result);
            alert(`Devis ${result.quoteId.substring(0, 8)} créé et envoyé avec succès !`);

            // Reset form
            setSelectedCustomer(null);
            setQuoteItems([]);
            setSearchTerm('');
            fetchExistingQuotes(); // Refresh the list of existing quotes

        } catch (error) {
            console.error('--- [ERREUR] handleGenerateQuote: Erreur capturée dans le catch', error);
            alert(`Erreur lors de la génération du devis : ${error.message}`);
        }
    };

    const handleCreateInvoice = async (quoteId) => {
        if (!window.confirm(`Confirmer la création d'une facture pour le devis ${quoteId.substring(0, 8)} ?`)) {
            return;
        }
        try {
            const response = await fetch('https://www.asiacuisine.re/api/create-invoice-from-quote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quote_id: quoteId })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || 'Erreur inconnue lors de la création de la facture.');
            }

            const result = await response.json();
            alert(`Facture ${result.invoiceId.substring(0, 8)} créée avec succès !`);
            fetchExistingQuotes(); // Refresh the list to show the new 'invoiced' status

        } catch (error) {
            alert(`Erreur lors de la création de la facture : ${error.message}`);
        }
    };

    const handleUpdateQuoteStatus = async (quoteId, newStatus) => {
        if (!window.confirm(`Confirmer le changement de statut du devis ${quoteId.substring(0, 8)} à "${newStatus}" ?`)) {
            return;
        }
        const { error } = await supabase
            .from('quotes')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', quoteId);

        if (error) {
            alert(`Erreur lors de la mise à jour du statut : ${error.message}`);
        } else {
            alert(`Statut du devis ${quoteId.substring(0, 8)} mis à jour à "${newStatus}".`);
            fetchExistingQuotes(); // Refresh the list
            setSelectedQuote(null); // Close details if open
        }
    };

    const renderCustomerName = (quote) => {
        if (quote.clients) {
            return `${quote.clients.last_name} ${quote.clients.first_name}`;
        } else if (quote.entreprises) {
            return quote.entreprises.nom_entreprise;
        }
        return 'N/A';
    };

    return (
        <div style={containerStyle}>
            <h1>Gestion des Devis</h1>

            {/* Section de création de nouveau devis */}
            <div style={sectionStyle}>
                <h2>Créer un nouveau devis</h2>
                {/* Section de recherche de client */}
                <div style={subSectionStyle}>
                    <h3>1. Sélectionner un client / une entreprise</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
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
                                    `${selectedCustomer.last_name} ${selectedCustomer.first_name}` :
                                    selectedCustomer.nom_entreprise
                                }
                            </strong>
                            <button onClick={() => setSelectedCustomer(null)} style={clearCustomerButtonStyle}>X</button>
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
                        <table style={tableStyle}>
                            <thead>
                                <tr>
                                    <th style={thStyle}>Service</th>
                                    <th style={thStyle}>Description</th>
                                    <th style={thStyle}>Qté</th>
                                    <th style={thStyle}>Prix U. (€)</th>
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
                    )}
                </div>

                {/* Section de génération */}
                <div style={subSectionStyle}>
                    <h3>4. Générer le devis</h3>
                    <button onClick={handleGenerateQuote} style={generateQuoteButtonStyle}>Générer et Envoyer le Devis</button>
                </div>
            </div>

            {/* Section des devis existants */}
            <div style={sectionStyle}>
                <h2>Devis existants</h2>
                {existingQuotes.length === 0 ? (
                    <p>Aucun devis existant.</p>
                ) : (
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
                                    <td style={tdStyle}>{quote.id.substring(0, 8)}</td>
                                    <td style={tdStyle}>{renderCustomerName(quote)}</td>
                                    <td style={tdStyle}>{new Date(quote.quote_date).toLocaleDateString('fr-FR')}</td>
                                    <td style={tdStyle}>{quote.total_amount.toFixed(2)} €</td>
                                    <td style={tdStyle}><span style={statusBadgeStyle(quote.status)}>{quote.status}</span></td>
                                    <td style={tdStyle}>
                                        <button onClick={() => setSelectedQuote(quote)} style={detailsButtonStyle}>Voir Détails</button>
                                        {quote.status === 'sent' && (
                                            <>
                                                <button onClick={() => handleUpdateQuoteStatus(quote.id, 'accepted')} style={{ ...actionButtonStyle, backgroundColor: '#28a745', marginLeft: '5px' }}>Accepter</button>
                                                <button onClick={() => handleUpdateQuoteStatus(quote.id, 'rejected')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545', marginLeft: '5px' }}>Refuser</button>
                                            </>
                                        )}
                                        {quote.status === 'accepted' && (
                                            <button onClick={() => handleCreateInvoice(quote.id)} style={{ ...actionButtonStyle, backgroundColor: '#007bff', marginLeft: '5px' }}>Créer la facture</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
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
                    <p><strong>Date du devis:</strong> {new Date(quote.quote_date).toLocaleDateString('fr-FR')}</p>
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
                                        <td style={tdStyle}>{item.name}</td>
                                        <td style={tdStyle}>{item.description}</td>
                                        <td style={tdStyle}>{item.quantity}</td>
                                        <td style={tdStyle}>{item.unit_price.toFixed(2)}</td>
                                        <td style={tdStyle}>{(item.quantity * item.unit_price).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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

const subSectionStyle = {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f0f0f0',
};

const inputStyle = {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
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
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
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
    position: 'relative'
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
    borderBottom: '1px solid #f0f0f0'
};

const detailTitleStyle = {
    fontSize: '18px',
    color: '#d4af37',
    marginBottom: '10px'
};

const statusBadgeStyle = (status) => {
    const colors = {
        'pending': '#007bff',
        'sent': '#ffc107',
        'accepted': '#28a745',
        'rejected': '#dc3545',
        'expired': '#6c757d',
    };
    return {
        padding: '4px 8px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '12px',
        backgroundColor: colors[status] || '#6c757d'
    };
};

const actionButtonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    color: 'white',
    backgroundColor: '#d4af37',
    fontWeight: 'bold'
};

const detailsButtonStyle = {
    padding: '8px 12px',
    background: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
};

export default Devis;
