import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient'; // Assurez-vous que le chemin est correct

const Parametres = () => {
    // State pour les paramètres existants
    const [status, setStatus] = useState({ message: '', type: '' });

    // State pour les informations de l'entreprise
    const [companySettings, setCompanySettings] = useState({
        id: null,
        name: '',
        owner: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        website: '',
        siret: '',
        tva_message: 'TVA non applicable, art. 293 B du CGI',
        logo_url: ''
    });
    const [isCompanyLoading, setIsCompanyLoading] = useState(true);

    // Fonction pour charger tous les paramètres
    const fetchAllSettings = useCallback(async () => {
        // Charger les paramètres de l'entreprise
        setIsCompanyLoading(true);
        const { data: companyData, error: companyError } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .single(); // .single() pour obtenir un objet unique ou null

        if (companyError && companyError.code !== 'PGRST116') { // PGRST116 = 0 rows
            console.error("Erreur de chargement des paramètres de l'entreprise:", companyError);
            setStatus({ message: `Erreur entreprise: ${companyError.message}`, type: 'error' });
        } else if (companyData) {
            setCompanySettings(companyData);
        }
        setIsCompanyLoading(false);
    }, []);

    useEffect(() => {
        fetchAllSettings();
    }, [fetchAllSettings]);

    // --- Handlers pour les informations de l'entreprise ---

    const handleCompanyInputChange = (e) => {
        const { name, value } = e.target;
        setCompanySettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveCompanySettings = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Enregistrement...', type: 'info' });

        // Les données à mettre à jour (excluant id et created_at qui ne changent pas)
        const { id, created_at, ...updateData } = companySettings;

        const { error } = await supabase
            .from('company_settings')
            .update(updateData)
            .eq('id', companySettings.id);

        if (error) {
            setStatus({ message: `Erreur lors de la mise à jour : ${error.message}`, type: 'error' });
        } else {
            setStatus({ message: 'Informations de l\'entreprise enregistrées avec succès !', type: 'success' });
        }
    };
    
    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            
            {status.message && <div style={statusStyle(status.type)}>{status.message}</div>}

            {/* Section pour les informations de l'entreprise */}
            <div style={sectionStyle}>
                <h2>Informations de l'entreprise</h2>
                {isCompanyLoading ? (
                    <p>Chargement des informations...</p>
                ) : (
                    <form onSubmit={handleSaveCompanySettings}>
                        <div style={formGridStyle}>
                            <div style={inputGroupStyle}>
                                <label htmlFor="name" style={labelStyle}>Nom de l\'entreprise</label>
                                <input type="text" id="name" name="name" value={companySettings.name || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="owner" style={labelStyle}>Nom du propriétaire</label>
                                <input type="text" id="owner" name="owner" value={companySettings.owner || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="address" style={labelStyle}>Adresse</label>
                                <input type="text" id="address" name="address" value={companySettings.address || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="city" style={labelStyle}>Ville</label>
                                <input type="text" id="city" name="city" value={companySettings.city || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="phone" style={labelStyle}>Téléphone</label>
                                <input type="text" id="phone" name="phone" value={companySettings.phone || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="email" style={labelStyle}>Email</label>
                                <input type="email" id="email" name="email" value={companySettings.email || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="siret" style={labelStyle}>SIRET</label>
                                <input type="text" id="siret" name="siret" value={companySettings.siret || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={inputGroupStyle}>
                                <label htmlFor="website" style={labelStyle}>Site Web</label>
                                <input type="text" id="website" name="website" value={companySettings.website || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                            <div style={{...inputGroupStyle, gridColumn: '1 / -1'}}>
                                <label htmlFor="logo_url" style={labelStyle}>URL du Logo</label>
                                <input type="text" id="logo_url" name="logo_url" value={companySettings.logo_url || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                             <div style={{...inputGroupStyle, gridColumn: '1 / -1'}}>
                                <label htmlFor="tva_message" style={labelStyle}>Mention TVA</label>
                                <input type="text" id="tva_message" name="tva_message" value={companySettings.tva_message || ''} onChange={handleCompanyInputChange} style={inputStyle} />
                            </div>
                        </div>
                        <button type="submit" style={saveButtonStyle}>Enregistrer les informations</button>
                    </form>
                )}
            </div>

        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: 'Arial, sans-serif'
};

const sectionStyle = {
    background: 'white',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px'
};

const inputGroupStyle = {
    display: 'flex',
    flexDirection: 'column',
};

const labelStyle = {
    marginBottom: '5px',
    fontWeight: 'bold',
    color: '#333'
};

const inputStyle = {
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    width: '100%'
};

const saveButtonStyle = {
    marginTop: '20px',
    padding: '12px 25px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
};

const statusStyle = (type) => ({
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '5px',
    color: 'white',
    backgroundColor: type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8')
});


export default Parametres;