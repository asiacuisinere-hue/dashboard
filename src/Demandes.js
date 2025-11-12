import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

// --- Composants ---

const DetailsRenderer = ({ details }) => {
    if (!details) return null;

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
                        <span style={{ marginLeft: '8px', color: '#555' }}>{value}</span>
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
            alert(`Erreur lors de l\'envoi de l\'e-mail de refus : ${error.message}`);
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
                    <p><strong>Nom de l\'entreprise:</strong> {demande.entreprises.nom_entreprise}</p>
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

                <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button onClick={handleRefuseDemande} style={{...actionButtonStyle, backgroundColor: '#dc3545'}}>Refuser & Envoyer E-mail</button>
                    <button onClick={() => handleUpdateStatus('En attente de traitement')} style={actionButtonStyle}>Accepter</button>
                </div>
            </div>
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
        return <div>Chargement des nouvelles demandes...</div>;
    }

    return (
        <div>
            <h1>Nouvelles Demandes</h1>
            <p>Voici la liste des nouvelles demandes en attente de traitement.</p>
            
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
                            <tr key={demande.id} style={trStyle}>
                                <td style={tdStyle}>{new Date(demande.created_at).toLocaleDateString('fr-FR')}</td>
                                <td style={tdStyle}>{demande.clients?.last_name || demande.entreprises?.nom_entreprise || 'N/A'}</td>
                                <td style={tdStyle}>{demande.type}</td>
                                <td style={tdStyle}>{new Date(demande.request_date).toLocaleDateString('fr-FR')}</td>
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

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflow: 'hidden',
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
    borderBottom: '2px solid #ddd'
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555'
};

const trStyle = {
    transition: 'background-color 0.2s ease'
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

export default Demandes;
