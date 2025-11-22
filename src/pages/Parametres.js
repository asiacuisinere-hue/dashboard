import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const Parametres = () => {
    // State global
    const [status, setStatus] = useState({ message: '', type: '' });

    // State pour les informations de l'entreprise
    const [companySettings, setCompanySettings] = useState({
        id: null, name: '', owner: '', address: '', city: '', phone: '', email: '',
        website: '', siret: '', tva_message: '', logo_url: ''
    });
    const [isCompanyLoading, setIsCompanyLoading] = useState(true);

    // State pour les autres paramètres
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [refusalTemplate, setRefusalTemplate] = useState('');
    const [isOtherSettingsLoading, setIsOtherSettingsLoading] = useState(true);

    // Fonction pour charger tous les paramètres
    const fetchAllSettings = useCallback(async () => {
        setIsCompanyLoading(true);
        setIsOtherSettingsLoading(true);

        // 1. Charger les paramètres de l'entreprise
        const { data: companyData, error: companyError } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .single();

        if (companyError && companyError.code !== 'PGRST116') {
            console.error("Erreur chargement infos entreprise:", companyError);
            setStatus({ message: `Erreur entreprise: ${companyError.message}`, type: 'error' });
        } else if (companyData) {
            setCompanySettings(companyData);
        }
        setIsCompanyLoading(false);

        // 2. Charger les autres paramètres (welcome message, etc.)
        const { data: settingsData, error: settingsError } = await supabase
            .from('settings')
            .select('key, value');

        if (settingsError) {
            console.error("Erreur chargement settings:", settingsError);
            setStatus({ message: `Erreur settings: ${settingsError.message}`, type: 'error' });
        } else if (settingsData) {
            const settingsMap = settingsData.reduce((acc, setting) => {
                acc[setting.key] = setting.value;
                return acc;
            }, {});
            setWelcomeMessage(settingsMap.welcomePopupMessage || '');
            setRefusalTemplate(settingsMap.refusalEmailTemplate || '');
        }
        setIsOtherSettingsLoading(false);
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
        const { id, created_at, ...updateData } = companySettings;

        const { error } = await supabase.from('company_settings').update(updateData).eq('id', companySettings.id);
        if (error) setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        else setStatus({ message: 'Informations de l\'entreprise enregistrées !', type: 'success' });
    };

    // --- Handlers pour les autres paramètres ---
    const handleSaveSetting = async (key, value) => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        const { error } = await supabase.from('settings').update({ value }).eq('key', key);
        if (error) setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        else setStatus({ message: `Paramètre '${key}' enregistré !`, type: 'success' });
    };

    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            {status.message && <div style={statusStyle(status.type)}>{status.message}</div>}

            {/* Section pour les informations de l'entreprise */}
            <div style={sectionStyle}>
                <h2>Informations de l\'entreprise</h2>
                {isCompanyLoading ? <p>Chargement...</p> : (
                    <form onSubmit={handleSaveCompanySettings}>
                        <div style={formGridStyle}>
                            <InputField label="Nom de l\'entreprise" name="name" value={companySettings.name} onChange={handleCompanyInputChange} />
                            <InputField label="Nom du propriétaire" name="owner" value={companySettings.owner} onChange={handleCompanyInputChange} />
                            <InputField label="Adresse" name="address" value={companySettings.address} onChange={handleCompanyInputChange} />
                            <InputField label="Ville" name="city" value={companySettings.city} onChange={handleCompanyInputChange} />
                            <InputField label="Téléphone" name="phone" value={companySettings.phone} onChange={handleCompanyInputChange} />
                            <InputField label="Email" name="email" type="email" value={companySettings.email} onChange={handleCompanyInputChange} />
                            <InputField label="SIRET" name="siret" value={companySettings.siret} onChange={handleCompanyInputChange} />
                            <InputField label="Site Web" name="website" value={companySettings.website} onChange={handleCompanyInputChange} />
                            <div style={{gridColumn: '1 / -1'}}><InputField label="URL du Logo" name="logo_url" value={companySettings.logo_url} onChange={handleCompanyInputChange} /></div>
                            <div style={{gridColumn: '1 / -1'}}><InputField label="Mention TVA" name="tva_message" value={companySettings.tva_message} onChange={handleCompanyInputChange} /></div>
                        </div>
                        <button type="submit" style={saveButtonStyle}>Enregistrer les informations</button>
                    </form>
                )}
            </div>

            {/* Section pour les autres paramètres */}
            <div style={sectionStyle}>
                <h2>Autres paramètres</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <div style={inputGroupStyle}>
                            <label htmlFor="welcomeMessage" style={labelStyle}>Message popup de bienvenue</label>
                            <textarea id="welcomeMessage" value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={{...inputStyle, height: '100px'}} />
                            <button onClick={() => handleSaveSetting('welcomePopupMessage', welcomeMessage)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le message</button>
                        </div>
                        <div style={inputGroupStyle}>
                            <label htmlFor="refusalTemplate" style={labelStyle}>Modèle e-mail de refus</label>
                            <textarea id="refusalTemplate" value={refusalTemplate} onChange={(e) => setRefusalTemplate(e.target.value)} style={{...inputStyle, height: '150px'}} />
                            <button onClick={() => handleSaveSetting('refusalEmailTemplate', refusalTemplate)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le modèle</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

// Composant pour les champs de formulaire
const InputField = ({ label, name, value, onChange, type = 'text' }) => (
    <div style={inputGroupStyle}>
        <label htmlFor={name} style={labelStyle}>{label}</label>
        <input type={type} id={name} name={name} value={value || ''} onChange={onChange} style={inputStyle} />
    </div>
);


// --- Styles ---
const containerStyle = { padding: '20px', maxWidth: '900px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };
const sectionStyle = { background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '30px' };
const formGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', marginBottom: '15px' };
const labelStyle = { marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', width: '100%' };
const saveButtonStyle = { marginTop: '20px', padding: '12px 25px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' };
const statusStyle = (type) => ({ padding: '15px', marginBottom: '20px', borderRadius: '5px', color: 'white', backgroundColor: type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8') });

export default Parametres;
