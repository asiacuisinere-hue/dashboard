import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Parametres = () => {
    // --- États Généraux ---
    const [status, setStatus] = useState({ message: '', type: 'info' });

    // --- États pour les informations de l'entreprise ---
    const [companySettings, setCompanySettings] = useState({
        id: null, name: '', owner: '', address: '', city: '', phone: '', email: '',
        website: '', siret: '', tva_message: '', logo_url: '',
        order_cutoff_days: 2, // Ajout du champ avec valeur par défaut
        order_cutoff_hour: 11  // Ajout du champ avec valeur par défaut
    });
    const [isCompanyLoading, setIsCompanyLoading] = useState(true);

    // --- Autres états ---
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [refusalTemplate, setRefusalTemplate] = useState('');
    const [isOtherSettingsLoading, setIsOtherSettingsLoading] = useState(true);
    const [menuDecouverte, setMenuDecouverte] = useState('');
    const [menuStandard, setMenuStandard] = useState('');
    const [menuConfort, setMenuConfort] = useState('');
    const [menuDuo, setMenuDuo] = useState('');
    const [menuOverrideMessage, setMenuOverrideMessage] = useState('');
    const [menuOverrideEnabled, setMenuOverrideEnabled] = useState(false);
    const [isMenuLoading, setIsMenuLoading] = useState(true);


    const saveSetting = async (key, value) => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        if (error) {
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        } else {
            setStatus({ message: `Paramètre '${key}' enregistré !`, type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
        }
    };

    const fetchAllSettings = useCallback(async () => {
        setIsCompanyLoading(true);
        const { data: companyDataArray, error: companyError } = await supabase.from('company_settings').select('*').limit(1);

        if (companyError) {
            console.error("Erreur chargement infos entreprise:", companyError);
        } else if (companyDataArray && companyDataArray.length > 0) {
            // Fusionne les données récupérées avec l'état initial pour ne pas perdre les nouvelles propriétés
            setCompanySettings(prev => ({
                ...prev,
                ...companyDataArray[0]
            }));
        }
        setIsCompanyLoading(false);

        setIsOtherSettingsLoading(true);
        setIsMenuLoading(true);
        const { data: settingsData, error: settingsError } = await supabase.from('settings').select('key, value');
        if (settingsError) {
            console.error("Erreur chargement settings:", settingsError);
        } else if (settingsData) {
            const settingsMap = settingsData.reduce((acc, setting) => { acc[setting.key] = setting.value; return acc; }, {});
            setWelcomeMessage(settingsMap.welcomePopupMessage || '');
            setRefusalTemplate(settingsMap.refusalEmailTemplate || '');
            setMenuDecouverte(settingsMap.menu_decouverte || '');
            setMenuStandard(settingsMap.menu_standard || '');
            setMenuConfort(settingsMap.menu_confort || '');
            setMenuDuo(settingsMap.menu_duo || '');
            setMenuOverrideMessage(settingsMap.menu_override_message || '');
            setMenuOverrideEnabled(settingsMap.menu_override_enabled === 'true');
        }
        setIsOtherSettingsLoading(false);
        setIsMenuLoading(false);
    }, []);
    
    useEffect(() => {
        fetchAllSettings();
    }, [fetchAllSettings]);

    const handleCompanyInputChange = (e) => {
        const { name, value } = e.target;
        setCompanySettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveCompanySettings = async (e) => {
        e.preventDefault();
        setStatus({ message: 'Enregistrement...', type: 'info' });
        
        // Assurer que les valeurs sont bien des nombres
        const payload = {
            ...companySettings,
            order_cutoff_days: parseInt(companySettings.order_cutoff_days, 10) || 2,
            order_cutoff_hour: parseInt(companySettings.order_cutoff_hour, 10) || 11,
        };

        const { error } = await supabase.from('company_settings').upsert(payload);

        if (error) {
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        } else {
            setStatus({ message: 'Informations de l\'entreprise enregistrées !', type: 'success' });
            fetchAllSettings();
        }
    };

    const handleSaveMenus = async () => { /* ... */ };
    
    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            {status.message && <div style={statusStyle(status.type)}>{status.message}</div>}

            <div style={gridStyle}>
                {/* ... Liens ... */}
            </div>

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
                            
                            {/* NOUVEAUX CHAMPS AJOUTÉS ICI */}
                            <InputField label="Délai de commande (jours)" name="order_cutoff_days" type="number" value={companySettings.order_cutoff_days} onChange={handleCompanyInputChange} />
                            <InputField label="Heure limite de commande (0-23)" name="order_cutoff_hour" type="number" value={companySettings.order_cutoff_hour} onChange={handleCompanyInputChange} />

                        </div>
                        <button type="submit" style={saveButtonStyle}>Enregistrer les informations</button>
                    </form>
                )}
            </div>

            {/* ... Reste des sections ... */}
            <div style={sectionStyle}>
                <h2>Message d\'accueil (Popup)</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={{...inputStyle, height: '100px'}} placeholder="Saisissez le message ici..."/>
                        <button onClick={() => saveSetting('welcomePopupMessage', welcomeMessage)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le message</button>
                    </>
                )}
            </div>

            <div style={sectionStyle}>
                <h2>Modèle e-mail de refus</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <textarea value={refusalTemplate} onChange={(e) => setRefusalTemplate(e.target.value)} style={{...inputStyle, height: '150px'}} placeholder="Saisissez le modèle d\'e-mail de refus ici..."/>
                        <button onClick={() => saveSetting('refusalEmailTemplate', refusalTemplate)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le modèle</button>
                    </>
                )}
            </div>

            <div style={sectionStyle}>
                <h2>Gestion des Menus de la Semaine</h2>
                {/* ... (Contenu de la gestion des menus) ... */}
            </div>
        </div>
    );
};

const InputField = ({ label, name, value, onChange, type = 'text' }) => (
    <div style={inputGroupStyle}>
        <label htmlFor={name} style={labelStyle}>{label}</label>
        <input type={type} id={name} name={name} value={value || ''} onChange={onChange} style={inputStyle} />
    </div>
);

// Styles
const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '30px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' };
const sectionStyle = { background: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '30px' };
const formGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', marginBottom: '15px' };
const labelStyle = { marginBottom: '5px', fontWeight: 'bold', color: '#333' };
const inputStyle = { padding: '10px', borderRadius: '4px', border: '1px solid #ddd', boxSizing: 'border-box', width: '100%' };
const saveButtonStyle = { marginTop: '20px', padding: '12px 25px', backgroundColor: '#d4af37', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' };
const statusStyle = (type) => ({ padding: '15px', marginBottom: '20px', borderRadius: '5px', color: 'white', backgroundColor: type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8') });

export default Parametres;
