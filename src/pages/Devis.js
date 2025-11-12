import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Devis = () => {
    const [clients, setClients] = useState([]);
    const [entreprises, setEntreprises] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null); // Peut être un client ou une entreprise
    const [services, setServices] = useState([]); // Services disponibles
    const [quoteItems, setQuoteItems] = useState([]); // Lignes du devis
    const [isSearching, setIsSearching] = useState(false);

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
        fetchServices();
    }, [fetchServices]);

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

    useEffect(() => {
        const handler = setTimeout(() => {
            handleSearch();
        }, 500); // Debounce search

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm, handleSearch]);

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
        if (!selectedCustomer) {
            alert('Veuillez sélectionner un client ou une entreprise.');
            return;
        }
        if (quoteItems.length === 0) {
            alert('Veuillez ajouter au moins un service au devis.');
            return;
        }

        // Logic to save quote to DB and generate PDF (to be implemented)
        alert('Fonctionnalité de génération de devis à implémenter.');
        console.log('Devis à générer:', {
            customer: selectedCustomer,
            items: quoteItems,
            total: calculateTotal()
        });
    };

    return (
        <div style={containerStyle}>
            <h1>Créer un Devis</h1>

            {/* Section de recherche de client */}
            <div style={sectionStyle}>
                <h2>1. Sélectionner un client / une entreprise</h2>
                <input
                    type="text"
                    placeholder="Rechercher par nom ou nom d'entreprise..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={inputStyle}
                />
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
            <div style={sectionStyle}>
                <h2>2. Ajouter des services au devis</h2>
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
            <div style={sectionStyle}>
                <h2>3. Lignes du devis</h2>
                {quoteItems.length === 0 ? (
                    <p>Aucun service ajouté au devis.</p>
                ) : (
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
                )}
            </div>

            {/* Section de génération */}
            <div style={sectionStyle}>
                <h2>4. Générer le devis</h2>
                <button onClick={handleGenerateQuote} style={generateQuoteButtonStyle}>Générer et Envoyer le Devis</button>
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

const inputStyle = {
    width: '100%',
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
    backgroundColor: '#28a745',
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

export default Devis;