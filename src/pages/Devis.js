import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useLocation, useNavigate } from 'react-router-dom';
import QuoteDetailModal from './QuoteDetailModal';
import ReactPaginate from 'react-paginate';

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
    
    // --- State for existing quotes list ---
    const [existingQuotes, setExistingQuotes] = useState([]);
    const [selectedQuote, setSelectedQuote] = useState(null);
    const [quoteSearchTerm, setQuoteSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 10;

    // --- General component states ---
    const [isLoading, setIsLoading] = useState(false);
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
                `document_number.ilike.${searchTerm},clients.last_name.ilike.${searchTerm},entreprises.nom_entreprise.ilike.${searchTerm}`
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
        const timer = setTimeout(() => {
            fetchExistingQuotes();
        }, 500);

        return () => clearTimeout(timer);
    }, [fetchExistingQuotes]);

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
        setSearchTerm(type === 'client' ? `${customer.last_name} ${customer.first_name || ''}`.trim() : customer.nom_entreprise);
        setClients([]);
        setEntreprises([]);
    };

    const handleAddServiceToQuote = (service) => {
        setQuoteItems(prev => [
            ...prev,
            {
                id: Date.now(),
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
        
        // Construire le payload de base
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
            type: 'service_reservation',
        };

        // Ajouter demandeId SEULEMENT s'il existe (workflow avec demande)
        if (demandeId) {
            payload.demandeId = demandeId;
            console.log('Creating quote WITH demande:', demandeId);
        } else {
            console.log('Creating quote WITHOUT demande (direct creation)');
        }

        try {
            setSuccessMessage('Création du devis en cours...');

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

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erreur lors de la génération du devis');
            }

            setSuccessMessage(result.message || 'Devis créé avec succès !');
            
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
                const response = await fetch(
                    `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-invoice-from-quote`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({ quoteId: quoteId }),
                    }
                );
                console.log('--- [DEBUG] handleUpdateQuoteStatus: Réponse reçue du serveur pour create-invoice-from-quote, statut:', response.status);

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('--- [ERREUR] handleUpdateQuoteStatus: Réponse non-OK de create-invoice-from-quote', errorData);
                    throw new Error(errorData.details || 'Erreur inconnue lors de la création de la facture.');
                }

                const result = await response.json();
                console.log('--- [DEBUG] handleUpdateQuoteStatus: Facture créée avec succès, résultat:', result);
                
                const workflowMessage = result.workflow === 'with_demande' 
                    ? ' (liée à la demande)' 
                    : ' (création directe)';
                
                alert(`Devis ${quoteId.substring(0, 8)} accepté et facture générée${workflowMessage} !`);
                navigate('/factures');
            } else {
                alert(`Statut du devis ${quoteId.substring(0, 8)} mis à jour à "${newStatus}".`);
            }
            fetchExistingQuotes();
            setSelectedQuote(null);

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

    // --- PAGINATION LOGIC ---
    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };
    const offset = currentPage * itemsPerPage;
    const currentQuotes = existingQuotes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(existingQuotes.length / itemsPerPage);


    return (
        <div style={containerStyle}>
            <h1>Gestion des Devis</h1>

            {/* Display loading, success, error messages */}
            {isLoading && <p>Génération du devis en cours...</p>}
            {successMessage && <p style={{ color: 'green' }}>{successMessage}</p>}
            {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

            {/* Indicator for workflow type */}
            {demandeId && (
                <div style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    color: '#155724'
                }}>
                    ✓ Création de devis depuis une demande (ID: {demandeId.substring(0, 8)}...)
                </div>
            )}

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
                        {isLoading ? 'Création en cours...' : 'Créer le brouillon du devis'}
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
                    <>
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>ID Devis</th>
                                        <th style={thStyle}>Client / Entreprise</th>
                                        <th style={thStyle}>Date</th>
                                        <th style={thStyle}>Échéance</th>
                                        <th style={thStyle}>Total</th>
                                        <th style={thStyle}>Statut</th>
                                        <th style={thStyle}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentQuotes.map(quote => {
                                        let dueDate = null;
                                        // Calculate due date only for 'sent' or 'accepted' quotes (30 days validity)
                                        if (quote.status === 'sent' || quote.status === 'accepted') {
                                            const createdDate = new Date(quote.created_at);
                                            createdDate.setDate(createdDate.getDate() + 30);
                                            dueDate = createdDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
                                        }

                                        return (
                                            <tr key={quote.id}>
                                                <td style={tdStyle}>{quote.document_number?.substring(0, 18) || quote.id.substring(0, 8)}</td>
                                                <td style={tdStyle}>{renderCustomerName(quote)}</td>
                                                <td style={tdStyle}>{new Date(quote.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                                <td style={tdStyle}>{dueDate || '—'}</td>
                                                <td style={tdStyle}>{quote.total_amount.toFixed(2)} €</td>
                                                <td style={tdStyle}><span style={statusBadgeStyle(quote.status)}>{quote.status}</span></td>
                                                <td style={tdStyle}>
                                                    <button onClick={() => setSelectedQuote(quote)} style={detailsButtonStyle}>Voir Détails</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        
                        <div style={{ borderTop: '1px solid #eee', marginTop: '2rem', paddingTop: '1rem' }}>
                            <style>{`
                                .pagination {
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    list-style: none;
                                    padding: 0;
                                    font-family: Arial, sans-serif;
                                }
                                .pagination li {
                                    margin: 0 4px;
                                }
                                .pagination li a {
                                    padding: 8px 14px;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    color: #333;
                                    text-decoration: none;
                                    transition: background-color 0.2s, color 0.2s;
                                    border: 1px solid #ddd;
                                    font-weight: bold;
                                }
                                .pagination li.active a {
                                    background-color: #d4af37;
                                    color: white;
                                    border-color: #d4af37;
                                }
                                .pagination li.disabled a {
                                    color: #ccc;
                                    cursor: not-allowed;
                                }
                                .pagination li a:hover:not(.disabled) {
                                    background-color: #f5f5f5;
                                }
                            `}</style>
                            <ReactPaginate
                                previousLabel={'<'}
                                nextLabel={'>'}
                                breakLabel={'...'}
                                pageCount={pageCount}
                                marginPagesDisplayed={1}
                                pageRangeDisplayed={3}
                                onPageChange={handlePageClick}
                                containerClassName={'pagination'}
                                activeClassName={'active'}
                                disabledClassName={'disabled'}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Modale de détails du devis */}
            {selectedQuote && (
                <QuoteDetailModal
                    quote={selectedQuote}
                    onClose={() => setSelectedQuote(null)}
                    onUpdateStatus={handleUpdateQuoteStatus}
                    fetchExistingQuotes={fetchExistingQuotes}
                />
            )}
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

const filterContainerStyle = { display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' };

const subSectionStyle = {
    marginBottom: '20px',
    paddingBottom: '20px',
    borderBottom: '1px solid #f0f0f0',
};

const searchCustomerContainerStyle = {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
};

const inputStyle = {
    flex: 1,
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
    minWidth: '150px',
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
    flexWrap: 'wrap',
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
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
};

const removeServiceButtonStyle = {
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '25px',
    height: '25px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

const generateQuoteButtonStyle = {
    padding: '12px 25px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
};

const detailsButtonStyle = {
    padding: '5px 10px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
};

const statusBadgeStyle = (status) => {
    let backgroundColor;
    switch (status) {
        case 'draft': backgroundColor = '#6c757d'; break;
        case 'sent': backgroundColor = '#17a2b8'; break;
        case 'accepted': backgroundColor = '#28a745'; break;
        case 'rejected': backgroundColor = '#dc3545'; break;
        default: backgroundColor = '#6c757d';
    }
    return {
        backgroundColor,
        color: 'white',
        padding: '4px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'capitalize',
    };
};

// --- Table Styles ---
const tableContainerStyle = {
    overflowX: 'auto',
};

const quoteItemsTableContainerStyle = {
    overflowX: 'auto',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '10px',
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '20px',
};

const thStyle = {
    border: '1px solid #ddd',
    padding: '10px',
    textAlign: 'left',
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold',
};

const tdStyle = {
    border: '1px solid #ddd',
    padding: '10px',
    textAlign: 'left',
};

const smallInputStyle = {
    width: '70px',
    padding: '5px',
    borderRadius: '4px',
    border: '1px solid #ccc',
};

export default Devis;
