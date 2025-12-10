import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Abonnements = () => {
    const [abonnements, setAbonnements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAbonnement, setSelectedAbonnement] = useState(null);
    const [filter, setFilter] = useState({ status: '' });
    const [isGenerating, setIsGenerating] = useState(null); // To track loading state for each button

    const fetchAbonnements = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from('abonnements')
            .select(`
                *,
                clients (first_name, last_name, email, phone),
                entreprises (nom_entreprise, contact_name, contact_email, contact_phone)
            `);

        if (filter.status) {
            query = query.eq('status', filter.status);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Erreur de chargement des abonnements:', error);
            alert(`Une erreur est survenue lors du chargement des abonnements : ${error.message}`);
        } else {
            setAbonnements(data);
        }
        setLoading(false);
    }, [filter]);

    useEffect(() => {
        fetchAbonnements();
    }, [fetchAbonnements]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateAbonnement = async (abonnementId, updates) => {
        const { error } = await supabase
            .from('abonnements')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', abonnementId);

        if (error) {
            alert(`Erreur lors de la mise à jour : ${error.message}`);
        } else {
            alert(`Abonnement ${abonnementId.substring(0, 8)} mis à jour.`);
            fetchAbonnements(); // Rafraîchir la liste
            setSelectedAbonnement(null); // Fermer les détails si ouverts
        }
    };

    const handleGenerateInvoice = async (abonnementId) => {
        if (!window.confirm("Confirmer la génération d'une nouvelle facture pour cet abonnement ?")) return;

        setIsGenerating(abonnementId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch('/generate-recurring-invoice/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ abonnementId }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || result.details || 'Erreur inconnue lors de la génération de la facture.');
            }

            alert(result.message || 'Facture générée avec succès !');
            fetchAbonnements(); // Refresh data to show new invoice date etc.

        } catch (error) {
            console.error('Error generating recurring invoice:', error);
            alert(`Erreur: ${error.message}`);
        } finally {
            setIsGenerating(null);
        }
    };


    const renderCustomerName = (abonnement) => {
        if (abonnement.clients) {
            return `${abonnement.clients.last_name}${abonnement.clients.first_name ? ` ${abonnement.clients.first_name}` : ''}`;
        } else if (abonnement.entreprises) {
            return abonnement.entreprises.nom_entreprise;
        }
        return 'N/A';
    };

    if (loading) {
        return <div>Chargement des abonnements...</div>;
    }

    return (
        <div style={containerStyle}>
            <h1>Gestion des Abonnements</h1>
            <p>Liste et gestion des abonnements actifs, en pause ou terminés.</p>

            <div style={filterContainerStyle}>
                <select
                    name="status"
                    value={filter.status}
                    onChange={handleFilterChange}
                    style={filterInputStyle}
                >
                    <option value="">Tous les statuts</option>
                    <option value="actif">Actif</option>
                    <option value="en_pause">En pause</option>
                    <option value="termine">Terminé</option>
                </select>
            </div>

            <div style={tableContainerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>ID Abonnement</th>
                            <th style={thStyle}>Client / Entreprise</th>
                            <th style={thStyle}>Formule de base</th>
                            <th style={thStyle}>Statut</th>
                            <th style={thStyle}>Date de début</th>
                            <th style={thStyle}>Facturation</th>
                            <th style={thStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {abonnements.map(abonnement => (
                            <tr key={abonnement.id}>
                                <td style={tdStyle}>{abonnement.id.substring(0, 8)}</td>
                                <td style={tdStyle}>{renderCustomerName(abonnement)}</td>
                                <td style={tdStyle}>{abonnement.formule_base}</td>
                                <td style={tdStyle}><span style={statusBadgeStyle(abonnement.status)}>{abonnement.status}</span></td>
                                <td style={tdStyle}>{abonnement.start_date ? new Date(abonnement.start_date).toLocaleDateString('fr-FR') : 'N/A'}</td>
                                <td style={tdStyle}>
                                    {abonnement.status === 'actif' && (
                                        <button 
                                            onClick={() => handleGenerateInvoice(abonnement.id)} 
                                            style={{...detailsButtonStyle, backgroundColor: '#28a745', opacity: isGenerating === abonnement.id ? 0.7 : 1}}
                                            disabled={isGenerating === abonnement.id}
                                        >
                                            {isGenerating === abonnement.id ? 'Génération...' : 'Générer Facture'}
                                        </button>
                                    )}
                                </td>
                                <td style={tdStyle}>
                                    <button onClick={() => setSelectedAbonnement(abonnement)} style={detailsButtonStyle}>Voir Détails</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedAbonnement && (
                <AbonnementDetailModal
                    abonnement={selectedAbonnement}
                    onClose={() => setSelectedAbonnement(null)}
                    onUpdate={handleUpdateAbonnement}
                />
            )}
        </div>
    );
};

// --- Abonnement Detail Modal Component ---
const AbonnementDetailModal = ({ abonnement, onClose, onUpdate }) => {
    const [editedAbonnement, setEditedAbonnement] = useState(abonnement);

    const handleFieldChange = (e) => {
        const { name, value } = e.target;
        setEditedAbonnement(prev => ({ ...prev, [name]: value }));
    };

        const handleSave = () => {
            const updates = {
                notes: editedAbonnement.notes,
                start_date: editedAbonnement.start_date,
                end_date: editedAbonnement.end_date,
                monthly_price: editedAbonnement.monthly_price,
                next_billing_date: editedAbonnement.next_billing_date,
            };
            onUpdate(abonnement.id, updates);
        };
    
        const handleUpdateStatus = (newStatus) => {
            onUpdate(abonnement.id, { status: newStatus });
        };
    
        const renderCustomerInfo = () => {
            if (abonnement.clients) {
                return (
                    <>
                        <p><strong>Nom:</strong> {abonnement.clients.last_name} {abonnement.clients.first_name}</p>
                        <p><strong>Email:</strong> {abonnement.clients.email}</p>
                        <p><strong>Téléphone:</strong> {abonnement.clients.phone}</p>
                    </>
                );
            } else if (abonnement.entreprises) {
                return (
                    <>
                        <p><strong>Nom de l'entreprise:</strong> {abonnement.entreprises.nom_entreprise}</p>
                        <p><strong>Contact:</strong> {abonnement.entreprises.contact_name}</p>
                        <p><strong>Email du contact:</strong> {abonnement.entreprises.contact_email}</p>
                        <p><strong>Téléphone du contact:</strong> {abonnement.entreprises.contact_phone}</p>
                    </>
                );
            }
            return <p>Informations client non disponibles.</p>;
        };
    
        return (
            <div style={modalOverlayStyle}>
                <div style={modalContentStyle}>
                    <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                    <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Détails Abonnement #{abonnement.id.substring(0, 8)}</h2>
    
                    <div style={detailSectionStyle}>
                        <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                        {renderCustomerInfo()}
                    </div>
    
                    <div style={detailSectionStyle}>
                        <h3 style={detailTitleStyle}>Informations de l'Abonnement</h3>
                        <p><strong>Formule:</strong> {abonnement.formule_base}</p>
                        <p><strong>Statut:</strong> <span style={statusBadgeStyle(abonnement.status)}>{abonnement.status}</span></p>
                        {abonnement.last_invoice_date && <p><strong>Dernière facture:</strong> {new Date(abonnement.last_invoice_date).toLocaleDateString('fr-FR')}</p>}
    
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Prix Mensuel (€):</label>
                                <input type="number" name="monthly_price" value={editedAbonnement.monthly_price || ''} onChange={handleFieldChange} style={inputStyle} />
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Prochaine facturation:</label>
                                <input type="date" name="next_billing_date" value={editedAbonnement.next_billing_date || ''} onChange={handleFieldChange} style={inputStyle} />
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Date de début:</label>
                                <input type="date" name="start_date" value={editedAbonnement.start_date || ''} onChange={handleFieldChange} style={inputStyle} />
                            </div>
                            <div style={formGroupStyle}>
                                <label style={labelStyle}>Date de fin:</label>
                                <input type="date" name="end_date" value={editedAbonnement.end_date || ''} onChange={handleFieldChange} style={inputStyle} />
                            </div>
                        </div>
                        <div style={formGroupStyle}>
                            <label style={labelStyle}>Notes:</label>
                            <textarea name="notes" value={editedAbonnement.notes || ''} onChange={handleFieldChange} style={{...inputStyle, minHeight: '80px'}}></textarea>
                        </div>
                        <button onClick={handleSave} style={{...actionButtonStyle, backgroundColor: '#007bff', marginTop: '10px' }}>Enregistrer les modifications</button>
                    </div>
                    <div style={modalActionsStyle}>
                    <h3 style={detailTitleStyle}>Changer le statut</h3>
                    {abonnement.status === 'actif' && (
                        <button onClick={() => handleUpdateStatus('en_pause')} style={{ ...actionButtonStyle, backgroundColor: '#ffc107' }}>Mettre en pause</button>
                    )}
                    {abonnement.status === 'en_pause' && (
                        <button onClick={() => handleUpdateStatus('actif')} style={{ ...actionButtonStyle, backgroundColor: '#28a745' }}>Réactiver</button>
                    )}
                    {['en_attente', 'actif', 'en_pause'].includes(abonnement.status) && (
                        <button onClick={() => handleUpdateStatus('termine')} style={{ ...actionButtonStyle, backgroundColor: '#dc3545' }}>Terminer</button>
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

const filterContainerStyle = {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
    alignItems: 'center',
    flexWrap: 'wrap',
};

const filterInputStyle = {
    padding: '8px',
    borderRadius: '5px',
    border: '1px solid #ccc',
    flex: '1 1 auto',
    minWidth: '150px',
};

const tableContainerStyle = {
    marginTop: '2rem',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    borderRadius: '8px',
    overflowX: 'auto',
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
    whiteSpace: 'nowrap',
};

const tdStyle = {
    padding: '12px 15px',
    borderBottom: '1px solid #eee',
    color: '#555',
    whiteSpace: 'nowrap',
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

const actionButtonStyle = {
    padding: '10px 15px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold',
};

const statusBadgeStyle = (status) => {
    const colors = {
        'en_attente': '#007bff',
        'actif': '#28a745',
        'en_pause': '#ffc107',
        'termine': '#6c757d',
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
    borderBottom: '1px solid #f0f0f0' 
};
const detailTitleStyle = { 
    fontSize: '18px', 
    color: '#d4af37', 
    marginBottom: '10px' 
};

const modalActionsStyle = {
    marginTop: '30px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    flexWrap: 'wrap',
};

const formGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: '15px',
};

const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    width: '100%',
};

export default Abonnements;