import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// --- Composants ---

const DetailsRenderer = ({ details }) => {
    if (!details) return null;

    // Handle COMMANDE_SPECIALE
    if (details.items && Array.isArray(details.items)) {
        const total = details.total || details.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);

        return (
            <div>
                <ul style={{ listStyleType: 'none', padding: 0, marginBottom: '10px' }}>
                    {details.items.map((item, index) => (
                        <li key={index} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{item.quantity} x {item.name} ({item.portion})</span>
                            <span>{(item.quantity * item.price).toFixed(2)} €</span>
                        </li>
                    ))}
                </ul>
                <hr style={{ margin: '10px 0' }} />
                <p style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem' }}>
                    <strong>Total:</strong> {parseFloat(total).toFixed(2)} €
                </p>
                {details.deliveryCity && <p style={{marginTop: '10px'}}><strong>Ville de livraison:</strong> {details.deliveryCity}</p>}
            </div>
        );
    }

    // Handle SOUSCRIPTION_ABONNEMENT
    if (details.formula) {
         const keyMap = {
            formula: 'Formule d\'abonnement',
            notes: 'Notes du client',
            customerName: 'Client'
        };
        return (
            <ul style={{ listStyleType: 'none', padding: 0 }}>
                {Object.entries(details).map(([key, value]) => {
                    if (!value) return null;
                    const label = keyMap[key] || key;
                    return (
                        <li key={key} style={{ marginBottom: '8px' }}>
                            <strong style={{ color: '#333' }}>{label}:</strong>
                            <span style={{ marginLeft: '8px', color: '#555' }}>{String(value)}</span>     
                        </li>
                    );
                })}
            </ul>
        );
    }

    const keyMap = {
        customerType: 'Type de client',
        serviceType: 'Type de service',
        numberOfPeople: 'Nombre de personnes',
        customerMessage: 'Message du client',
        formulaName: 'Formule',
        formulaOption: 'Option de la formule',
        deliveryCity: 'Ville de livraison'
    };

    return (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
            {Object.entries(details).map(([key, value]) => {
                if (!value) return null;
                const label = keyMap[key] || key;
                return (
                    <li key={key} style={{ marginBottom: '8px' }}>
                        <strong style={{ color: '#333' }}>{label}:</strong>
                        <span style={{ marginLeft: '8px', color: '#555' }}>{String(value)}</span>
                    </li>
                );
            })}
        </ul>
    );
};

const DemandeModal = ({ demande, onClose, onUpdate }) => {
    if (!demande) return null;

    const handleUpdateStatus = async (newStatus) => {
        const { error } = await supabase
            .from('demandes')
            .update({ status: newStatus })
            .eq('id', demande.id);

        if (error) {
            alert(`Erreur lors de la mise à jour : ${error.message}`);
            return false;
        }
        alert(`La demande a été marquée comme "${newStatus}".`);
        onUpdate();
        onClose();
        return true;
    };

    const handleRefuseDemande = async () => {
        const statusUpdated = await handleUpdateStatus('Refusée');
        if (!statusUpdated) return;

        try {
            const response = await fetch('https://www.asiacuisine.re/send-refusal-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ demandeId: demande.id })
            });
            if (!response.ok) throw new Error((await response.json()).error || 'Erreur inconnue lors de l\'envoi de l\'e-mail de refus.');
            alert('E-mail de refus envoyé au client.');
        } catch (error) {
            alert(`Erreur lors de l'envoi de l'e-mail de refus : ${error.message}`);
        }
    };

    const renderCustomerDetails = () => {
        if (demande.clients) { // C'est un particulier
            return (
                <>
                    <p><strong>Nom:</strong> {demande.clients.last_name} {demande.clients.first_name}</p> 
                    <p><strong>Email:</strong> {demande.clients.email}</p>
                    <p><strong>Téléphone:</strong> {demande.clients.phone}</p>
                    <p><strong>ID Client:</strong> {demande.clients.client_id}</p>
                </>
            );
        } else if (demande.entreprises) { // C'est une entreprise
            return (
                <>
                    <p><strong>Nom de l'entreprise:</strong> {demande.entreprises.nom_entreprise}</p>    
                    <p><strong>SIRET:</strong> {demande.entreprises.siret}</p>
                    <p><strong>Nom du contact:</strong> {demande.entreprises.contact_name}</p>
                    <p><strong>Email du contact:</strong> {demande.entreprises.contact_email}</p>
                    <p><strong>Téléphone du contact:</strong> {demande.entreprises.contact_phone}</p>
                </>
            );
        }
        return <p>Informations client non disponibles.</p>;
    };

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails de la nouvelle demande</h2>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerDetails()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Demande</h3>
                    <p><strong>Type:</strong> {demande.type}</p>
                    <p><strong>Date souhaitée:</strong> {new Date(demande.request_date).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut actuel:</strong> <span style={statusBadgeStyle(demande.status)}>{demande.status}</span></p>
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Détails Spécifiques</h3>
                    <DetailsRenderer details={demande.details_json} />
                </div>

                <div style={modalActionsStyle}>
                    <button onClick={handleRefuseDemande} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>Refuser & Envoyer E-mail</button>
                    <button onClick={() => handleUpdateStatus('En attente de traitement')} style={actionButtonStyle}>Accepter</button>
                </div>
            </div>
        </div>
    );
};


const DemandeCard = ({ demande, onSelect }) => {
    const typeIcons = {
        'RESERVATION_SERVICE': '🏠',
        'COMMANDE_MENU': '🚚',
        'COMMANDE_SPECIALE': '⭐',
        'SOUSCRIPTION_ABONNEMENT': '🔄'
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                    <span className="text-2xl mr-3" title={demande.type}>
                        {typeIcons[demande.type] || '📩'}
                    </span>
                    <div>
                        <h3 className="font-bold text-gray-800">
                            {demande.clients?.last_name || demande.entreprises?.nom_entreprise || 'Client Inconnu'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            Reçue le {new Date(demande.created_at).toLocaleDateString('fr-FR')}
                        </p>
                    </div>
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
                    {demande.status}
                </span>
            </div>

            <div className="space-y-2 mb-5">
                <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-32">Date souhaitée:</span>
                    <span>{new Date(demande.request_date).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-32">Type:</span>
                    <span>{demande.type.replace('_', ' ')}</span>
                </div>
            </div>

            <button
                onClick={() => onSelect(demande)}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-lg transition-colors text-sm"
            >
                Gérer la demande
            </button>
        </div>
    );
};

const Demandes = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('demandes')
            .select(`
                *,
                clients (*),
                entreprises (*)
            `)
            .eq('status', 'Nouvelle')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des demandes:', error);
            alert('Erreur de chargement des demandes.');
        } else {
            setDemandes(data);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchDemandes();
    }, [fetchDemandes]);

    if (loading) {
        return <div className="p-6 text-center text-gray-500">Chargement des nouvelles demandes...</div>; 
    }

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Nouvelles Demandes</h1>
                <p className="text-gray-600">Voici la liste des nouvelles demandes en attente de traitement.</p>
            </div>

            {/* Vue Tableau (Desktop) */}
            <div className="hidden lg:block">
                <div style={tableContainerStyle}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Date Demande</th>
                                <th style={thStyle}>Client / Entreprise</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Date Souhaitée</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {demandes.map(demande => (
                                <tr key={demande.id}>
                                    <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                    <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || '—'}</td>
                                    <td style={{...tdStyle, textAlign: 'center', fontSize: '18px'}}>      
                                        {demande.type === 'RESERVATION_SERVICE' && <span title="RESERVATION_SERVICE">🏠</span>}
                                        {demande.type === 'COMMANDE_MENU' && <span title="COMMANDE_MENU">🚚</span>}
                                        {demande.type === 'COMMANDE_SPECIALE' && <span title="COMMANDE_SPECIALE">⭐</span>}
                                        {demande.type === 'SOUSCRIPTION_ABONNEMENT' && <span title="SOUSCRIPTION_ABONNEMENT">🔄</span>}
                                    </td>
                                    <td style={tdStyle}>{new Date(demande.request_date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                    <td style={tdStyle}>
                                        <button onClick={() => setSelectedDemande(demande)} style={detailsButtonStyle}>
                                            Voir Détails
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vue Cartes (Mobile/Tablette) */}
            <div className="block lg:hidden">
                {demandes.length === 0 ? (
                    <p className="text-center text-gray-500 py-10 bg-white rounded-xl">Aucune nouvelle demande.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {demandes.map(demande => (
                            <DemandeCard
                                key={demande.id}
                                demande={demande}
                                onSelect={setSelectedDemande}
                            />
                        ))}
                    </div>
                )}
            </div>

            {selectedDemande && (
                <DemandeModal
                    demande={selectedDemande}
                    onClose={() => setSelectedDemande(null)}
                    onUpdate={fetchDemandes}
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

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto', // Permet le défilement horizontal sur les petits écrans
    background: 'white'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
};

const thStyle = {
    background: '#f4f7fa',
    padding: '12px 15px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #ddd',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne pour les en-têtes
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap', // Empêche le retour à la ligne pour les cellules
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
    boxSizing: 'border-box', // Ajout pour le responsif
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

const statusBadgeStyle = (status) => ({
    padding: '4px 8px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    backgroundColor: status === 'Nouvelle' ? '#007bff' : (status === 'Confirmée' ? '#28a745' : '#dc3545')
});

const actionButtonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    color: 'white',
    backgroundColor: '#28a745',
    fontWeight: 'bold'
};

const modalActionsStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap', // Permet aux boutons de passer à la ligne
};

export default Demandes;
