import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Parametres = () => {
    // --- États Généraux ---
    const [status, setStatus] = useState({ message: '', type: 'info' });

    // --- États pour les informations de l'entreprise ---
    const [companySettings, setCompanySettings] = useState({
        id: null, name: '', owner: '', address: '', city: '', phone: '', email: '',
        website: '', siret: '', tva_message: '', logo_url: ''
    });
    const [isCompanyLoading, setIsCompanyLoading] = useState(true);

    // --- États pour le Message de Bienvenue et Refusal Template ---
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [refusalTemplate, setRefusalTemplate] = useState('');
    const [isOtherSettingsLoading, setIsOtherSettingsLoading] = useState(true);

    // --- États pour la Gestion des Menus ---
    const [menuDecouverte, setMenuDecouverte] = useState('');
    const [menuStandard, setMenuStandard] = useState('');
    const [menuConfort, setMenuConfort] = useState('');
    const [menuDuo, setMenuDuo] = useState('');
    const [menuOverrideMessage, setMenuOverrideMessage] = useState('');
    const [menuOverrideEnabled, setMenuOverrideEnabled] = useState(false);
    const [isMenuLoading, setIsMenuLoading] = useState(true);


    // Fonction générique pour sauvegarder un paramètre unique
    const saveSetting = async (key, value) => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        // Utilise upsert pour créer la ligne si elle n'existe pas, ou la mettre à jour sinon.
        // onConflict: 'key' indique à Supabase que la colonne 'key' est l'identifiant unique pour le conflit.
        const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        if (error) {
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        } else {
            setStatus({ message: `Paramètre '${key}' enregistré !`, type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
        }
    };

    // Fonction pour charger tous les paramètres au montage
    const fetchAllSettings = useCallback(async () => {
        // 1. Charger les paramètres de l'entreprise
        setIsCompanyLoading(true);
        const { data: companyDataArray, error: companyError } = await supabase
            .from('company_settings').select('*').limit(1);

        if (companyError) console.error("Erreur chargement infos entreprise:", companyError); 
        else if (companyDataArray && companyDataArray.length > 0) setCompanySettings(companyDataArray[0]);
        setIsCompanyLoading(false);

        // 2. Charger les autres paramètres (welcome, menus, etc.)
        setIsOtherSettingsLoading(true);
        const { data: settingsData, error: settingsError } = await supabase.from('settings').select('key, value');
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
            setMenuDecouverte(settingsMap.menu_decouverte || '');
            setMenuStandard(settingsMap.menu_standard || '');
            setMenuConfort(settingsMap.menu_confort || '');
            setMenuDuo(settingsMap.menu_duo || '');
            setMenuOverrideMessage(settingsMap.menu_override_message || '');
            setMenuOverrideEnabled(settingsMap.menu_override_enabled === 'true');
        }
        setIsOtherSettingsLoading(false);
    }, []);

    useEffect(() => {
        fetchAllSettings();
    }, [fetchAllSettings]);

    // --- Handlers ---
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

    const handleSaveMenus = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        setIsMenuLoading(true);
        try {
            await Promise.all([
                saveSetting('menu_decouverte', menuDecouverte),
                saveSetting('menu_standard', menuStandard),
                saveSetting('menu_confort', menuConfort),
                saveSetting('menu_duo', menuDuo),
                saveSetting('menu_override_message', menuOverrideMessage),
                saveSetting('menu_override_enabled', String(menuOverrideEnabled)),
            ]);
        } finally {
            setIsMenuLoading(false);
            setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
        }
    };
    
    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            <p>Gérez ici les différentes configurations de votre application.</p>
            {status.message && <div style={statusStyle(status.type)}>{status.message}</div>}

            <div style={gridStyle}>
                <Link to="/calendrier" style={cardStyle}><h2>Gestion du Calendrier</h2><p>Bloquer des dates et des jours.</p></Link>
                <Link to="/abonnements" style={cardStyle}><h2>Gestion des Abonnements</h2><p>Gérer les demandes d'abonnements.</p></Link>
                <Link to="/admin-account" style={cardStyle}><h2>Compte Administrateur</h2><p>Gérer les informations de connexion.</p></Link>
            </div>

            <div style={sectionStyle}>
                <h2>Informations de l'entreprise</h2>
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

            <div style={sectionStyle}>
                <h2>Message d'accueil (Popup)</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={{...inputStyle, height: '100px'}} placeholder="Saisissez le message ici..."/>
                        <button onClick={() => saveSetting('welcomePopupMessage', welcomeMessage)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le message</button>
                    </>
                )}
            </div>

            <div style={sectionStyle}>
                <h2>Gestion des Menus de la Semaine</h2>
                {isMenuLoading ? <p>Chargement...</p> : (
                    <>
                        <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '15px', marginTop: '15px' }}>
                            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Message personnalisé (prioritaire)</h3>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                                <input type="checkbox" id="override-enabled" checked={menuOverrideEnabled} onChange={(e) => setMenuOverrideEnabled(e.target.checked)} style={{ marginRight: '10px', height: '18px', width: '18px' }} />
                                <label htmlFor="override-enabled">Activer le message personnalisé (remplace les menus)</label>
                            </div>
                            <textarea value={menuOverrideMessage} onChange={(e) => setMenuOverrideMessage(e.target.value)} style={{...inputStyle, height: '80px', backgroundColor: menuOverrideEnabled ? '#fff' : '#f9f9f9' }} placeholder="Ex: Les livraisons reprendront le 2 janvier." disabled={!menuOverrideEnabled}/>
                        </div>

                        <div style={{ marginTop: '20px' }}>
                            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Contenu des formules</h3>
                            <div style={formGridStyle}>
                                <div><label style={labelStyle}>Formule Découverte</label><textarea value={menuDecouverte} onChange={(e) => setMenuDecouverte(e.target.value)} style={{...inputStyle, height: '120px'}} /></div>
                                <div><label style={labelStyle}>Formule Standard</label><textarea value={menuStandard} onChange={(e) => setMenuStandard(e.target.value)} style={{...inputStyle, height: '120px'}} /></div>
                                <div><label style={labelStyle}>Formule Confort</label><textarea value={menuConfort} onChange={(e) => setMenuConfort(e.target.value)} style={{...inputStyle, height: '120px'}} /></div>
                                <div><label style={labelStyle}>Option Duo</label><textarea value={menuDuo} onChange={(e) => setMenuDuo(e.target.value)} style={{...inputStyle, height: '120px'}} /></div>
                            </div>
                        </div>
                        <button onClick={handleSaveMenus} style={saveButtonStyle}>Enregistrer les Menus</button>
                    </>
                )}
            </div>
        </div>
    );
};

// Composant utilitaire
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
