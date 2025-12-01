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
        order_cutoff_days: 2,
        order_cutoff_hour: 11,
        payment_conditions: '',
        payment_methods: ''
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

    // --- États pour les prix des menus ---
    const [menuDecouvertePrice, setMenuDecouvertePrice] = useState('');
    const [menuStandardPrice, setMenuStandardPrice] = useState('');
    const [menuConfortPrice, setMenuConfortPrice] = useState('');
    const [menuDuoPrice, setMenuDuoPrice] = useState('');

    // --- États pour les annonces ---
    const [announcementMessage, setAnnouncementMessage] = useState('');
    const [announcementStyle, setAnnouncementStyle] = useState('info');
        const [announcementEnabled, setAnnouncementEnabled] = useState(false);
    
        // --- États pour l'offre spéciale ---
        const [specialOfferEnabled, setSpecialOfferEnabled] = useState(false);
        const [specialOffer, setSpecialOffer] = useState({ title: '', description: '', dishes: [] });
        const [specialOfferDisablesFormulas, setSpecialOfferDisablesFormulas] = useState(true);
    
    // Styles disponibles pour les annonces
    const announcementStyles = [
        { value: 'info', label: '📘 Info (bleu)', color: '#e3f2fd', border: '#2196f3' },
        { value: 'attention', label: '⚠️ Attention (jaune)', color: '#fff9e6', border: '#ff9800' },
        { value: 'fete', label: '🎉 Fête (festif)', color: '#ffebee', border: '#e91e63' },
        { value: 'promotion', label: '⭐ Promotion (doré)', color: '#fffaf0', border: '#d4af37' },
        { value: 'annonce', label: '📢 Annonce (violet)', color: '#f3e5f5', border: '#9c27b0' }
    ];

    // Fonction générique pour sauvegarder un paramètre unique
    const saveSetting = async (key, value, suppressStatus = false) => {
        if (!suppressStatus) {
            setStatus({ message: 'Enregistrement...', type: 'info' });
        }
        const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
        if (error) {
            if (!suppressStatus) {
                setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
            }
            return { error: true, message: error.message };
        } else {
            if (!suppressStatus) {
                setStatus({ message: `Paramètre '${key}' enregistré !`, type: 'success' });
                setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
            }
            return { error: false };
        }
    };

    // Fonction pour charger tous les paramètres au montage
    const fetchAllSettings = useCallback(async () => {
        // 1. Charger les paramètres de l'entreprise
        setIsCompanyLoading(true);
        const { data: companyDataArray, error: companyError } = await supabase.from('company_settings').select('*').limit(1);

        if (companyError) {
            console.error("Erreur chargement infos entreprise:", companyError);
        } else if (companyDataArray && companyDataArray.length > 0) {
            setCompanySettings(prev => ({
                ...prev,
                ...companyDataArray[0],
                order_cutoff_days: companyDataArray[0].order_cutoff_days ?? 2,
                order_cutoff_hour: companyDataArray[0].order_cutoff_hour ?? 11,
                payment_conditions: companyDataArray[0].payment_conditions ?? '',
                payment_methods: companyDataArray[0].payment_methods ?? ''
            }));
        }
        setIsCompanyLoading(false);

        // 2. Charger les autres paramètres (welcome, menus, annonces, etc.)
        setIsOtherSettingsLoading(true);
        setIsMenuLoading(true);
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
            
            // Charger les prix
            setMenuDecouvertePrice(settingsMap.menu_decouverte_price || '39');
            setMenuStandardPrice(settingsMap.menu_standard_price || '49');
            setMenuConfortPrice(settingsMap.menu_confort_price || '59');
            setMenuDuoPrice(settingsMap.menu_duo_price || '94');

            // Charger les annonces
            setAnnouncementMessage(settingsMap.announcement_message || '');
            setAnnouncementStyle(settingsMap.announcement_style || 'info');
            setAnnouncementEnabled(settingsMap.announcement_enabled === 'true');
            
            // Charger l'offre spéciale
            setSpecialOfferEnabled(settingsMap.special_offer_enabled === 'true');
            setSpecialOfferDisablesFormulas(settingsMap.special_offer_disables_formulas === 'true');
            if (settingsMap.special_offer_details) {
                try {
                    const parsedOffer = JSON.parse(settingsMap.special_offer_details);
                    // Ensure dishes is always an array
                    if (!Array.isArray(parsedOffer.dishes)) {
                        parsedOffer.dishes = [];
                    }
                    setSpecialOffer(parsedOffer);
                } catch (e) {
                    console.error("Erreur au parsing des détails de l'offre spéciale:", e);
                    setSpecialOffer({ title: '', description: '', dishes: [] });
                }
            } else {
                 setSpecialOffer({ title: '', description: '', dishes: [] });
            }
        }
        setIsOtherSettingsLoading(false);
        setIsMenuLoading(false);
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
        
        const payload = {
            ...companySettings,
            order_cutoff_days: parseInt(companySettings.order_cutoff_days, 10) || 2,
            order_cutoff_hour: parseInt(companySettings.order_cutoff_hour, 10) || 11,
        };

        const { error } = await supabase
            .from('company_settings')
            .upsert(payload, { onConflict: 'id' });

        if (error) {
            console.error('Erreur sauvegarde infos entreprise:', error);
            setStatus({ message: `Erreur: ${error.message}`, type: 'error' });
        } else {
            setStatus({ message: "Informations de l'entreprise enregistrées avec succès !", type: 'success' });
            fetchAllSettings();
        }
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
                // Sauvegarder les prix
                saveSetting('menu_decouverte_price', menuDecouvertePrice),
                saveSetting('menu_standard_price', menuStandardPrice),
                saveSetting('menu_confort_price', menuConfortPrice),
                saveSetting('menu_duo_price', menuDuoPrice),
            ]);
        } finally {
            setIsMenuLoading(false);
            setStatus({ message: 'Menus et prix enregistrés !', type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
        }
    };

    const handleSaveAnnouncement = async () => {
        setStatus({ message: 'Enregistrement...', type: 'info' });
        try {
            const results = await Promise.all([
                saveSetting('announcement_message', announcementMessage, true),
                saveSetting('announcement_style', announcementStyle, true),
                saveSetting('announcement_enabled', String(announcementEnabled), true),
            ]);

            const hasError = results.some(result => result.error);

            if (hasError) {
                const errorMessage = results.map(result => result.error ? result.message : '').filter(Boolean).join('; ');
                setStatus({ message: `Erreur lors de l'enregistrement de l'annonce : ${errorMessage}`, type: 'error' });
            } else {
                setStatus({ message: 'Annonce enregistrée avec succès !', type: 'success' });
                setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
            }
        } catch (error) {
            setStatus({ message: "Erreur lors de l'enregistrement de l'annonce.", type: 'error' });
        }
    };

    const handleSpecialOfferChange = (e) => {
        const { name, value } = e.target;
        setSpecialOffer(prev => ({ ...prev, [name]: value }));
    };

    const handleDishChange = (index, e) => {
        const { name, value } = e.target;
        const newDishes = [...specialOffer.dishes];
        newDishes[index] = { ...newDishes[index], [name]: value };
        setSpecialOffer(prev => ({ ...prev, dishes: newDishes }));
    };

    const addDish = () => {
        setSpecialOffer(prev => ({
            ...prev,
            dishes: [...(prev.dishes || []), { name: '', price250: '', price500: '' }]
        }));
    };

    const removeDish = (index) => {
        const newDishes = [...specialOffer.dishes];
        newDishes.splice(index, 1);
        setSpecialOffer(prev => ({ ...prev, dishes: newDishes }));
    };
    
    const handleSaveSpecialOffer = async () => {
        setStatus({ message: "Enregistrement de l'offre spéciale...", type: 'info' });
        try {
            await Promise.all([
                saveSetting('special_offer_enabled', String(specialOfferEnabled), true),
                saveSetting('special_offer_details', JSON.stringify(specialOffer), true),
                saveSetting('special_offer_disables_formulas', String(specialOfferDisablesFormulas), true),
            ]);
            setStatus({ message: 'Offre spéciale enregistrée avec succès !', type: 'success' });
            setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
        } catch (error) {
             setStatus({ message: "Erreur lors de l'enregistrement de l'offre spéciale.", type: 'error' });
        }
    };

    // Aperçu de l'annonce
    const getAnnouncementPreviewStyle = () => {
        const style = announcementStyles.find(s => s.value === announcementStyle);
        return {
            padding: '1.5rem',
            backgroundColor: style?.color || '#f9f9f9',
            borderLeft: `4px solid ${style?.border || '#999'}`, 
            borderRadius: '4px',
            marginTop: '1rem'
        };
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
                            <InputField label="Nom de l'entreprise" name="name" value={companySettings.name} onChange={handleCompanyInputChange} />
                            <InputField label="Nom du propriétaire" name="owner" value={companySettings.owner} onChange={handleCompanyInputChange} />
                            <InputField label="Adresse" name="address" value={companySettings.address} onChange={handleCompanyInputChange} />
                            <InputField label="Ville" name="city" value={companySettings.city} onChange={handleCompanyInputChange} />
                            <InputField label="Téléphone" name="phone" value={companySettings.phone} onChange={handleCompanyInputChange} />
                            <InputField label="Email" name="email" type="email" value={companySettings.email} onChange={handleCompanyInputChange} />
                            <InputField label="SIRET" name="siret" value={companySettings.siret} onChange={handleCompanyInputChange} />
                            <InputField label="Site Web" name="website" value={companySettings.website} onChange={handleCompanyInputChange} />
                            <div style={{gridColumn: '1 / -1'}}><InputField label="URL du Logo" name="logo_url" value={companySettings.logo_url} onChange={handleCompanyInputChange} /></div>
                            <div style={{gridColumn: '1 / -1'}}><InputField label="Mention TVA" name="tva_message" value={companySettings.tva_message} onChange={handleCompanyInputChange} /></div>
                            
                            <InputField label="Délai de commande (jours)" name="order_cutoff_days" type="number" value={companySettings.order_cutoff_days} onChange={handleCompanyInputChange} />
                            <InputField label="Heure limite de commande (0-23)" name="order_cutoff_hour" type="number" value={companySettings.order_cutoff_hour} onChange={handleCompanyInputChange} />
                            <InputField label="Conditions de paiement" name="payment_conditions" value={companySettings.payment_conditions} onChange={handleCompanyInputChange} />
                            <InputField label="Moyens de paiement" name="payment_methods" value={companySettings.payment_methods} onChange={handleCompanyInputChange} />
                        </div>
                        <button type="submit" style={saveButtonStyle}>Enregistrer les informations</button>
                    </form>
                )}
            </div>

                        {/* Offre Spéciale Section */}
                        <div style={sectionStyle}>
                            <h2>Gestion de l'Offre Spéciale</h2>
                            {isOtherSettingsLoading ? <p>Chargement...</p> : (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                                    <input
                                        type="checkbox"
                                        id="special-offer-enabled"
                                        checked={specialOfferEnabled}
                                        onChange={(e) => setSpecialOfferEnabled(e.target.checked)}
                                        style={{ marginRight: '10px', height: '18px', width: '18px' }}
                                    />
                                    <label htmlFor="special-offer-enabled" style={{ fontWeight: 'bold' }}>Activer l'offre spéciale</label>
                                </div>
            
                                <div style={{ opacity: specialOfferEnabled ? 1 : 0.5, pointerEvents: specialOfferEnabled ? 'auto' : 'none' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
                                        <input
                                            type="checkbox"
                                            id="special-offer-disables-formulas"
                                            checked={specialOfferDisablesFormulas}
                                            onChange={(e) => setSpecialOfferDisablesFormulas(e.target.checked)}
                                            style={{ marginRight: '10px', height: '18px', width: '18px' }}
                                        />
                                        <label htmlFor="special-offer-disables-formulas">
                                            Désactiver les formules habituelles lorsque l'offre spéciale est active
                                        </label>
                                    </div>
                                    
                                    <InputField label="Titre de l'offre" name="title" value={specialOffer.title} onChange={handleSpecialOfferChange} />
                                    <div>
                                        <label style={labelStyle}>Description de l'offre</label>
                                        <textarea
                                            name="description"
                                            value={specialOffer.description}
                                            onChange={handleSpecialOfferChange}
                                            style={{ ...inputStyle, height: '80px' }}
                                            placeholder="ex: Composez votre menu de fête avec nos plats d'exception..."
                                        />
                                    </div>
            
                                    <h3 style={{ marginTop: '20px', fontSize: '1.1rem' }}>Plats de l'offre</h3>
                                    {(specialOffer.dishes || []).map((dish, index) => (
                                        <div key={index} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginTop: '15px', position: 'relative' }}>
                                            <button onClick={() => removeDish(index)} style={removeButtonStyle}>&times;</button>
                                            <div style={formGridStyle}>
                                                <InputField label={`Nom du plat #${index + 1}`} name="name" value={dish.name} onChange={(e) => handleDishChange(index, e)} />
                                                <InputField label="Prix 250g (€)" name="price250" type="number" value={dish.price250} onChange={(e) => handleDishChange(index, e)} />
                                                <InputField label="Prix 500g (€)" name="price500" type="number" value={dish.price500} onChange={(e) => handleDishChange(index, e)} />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" onClick={addDish} style={{...saveButtonStyle, marginTop: '15px', backgroundColor: '#555'}}>Ajouter un plat</button>
                                </div>
            
                                <button onClick={handleSaveSpecialOffer} style={saveButtonStyle}>Enregistrer l'Offre Spéciale</button>
                            </>
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
                <h2>Modèle e-mail de refus</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <textarea value={refusalTemplate} onChange={(e) => setRefusalTemplate(e.target.value)} style={{...inputStyle, height: '150px'}} placeholder="Saisissez le modèle d'e-mail de refus ici..."/>
                        <button onClick={() => saveSetting('refusalEmailTemplate', refusalTemplate)} style={{...saveButtonStyle, alignSelf: 'flex-start', fontSize: '14px'}}>Enregistrer le modèle</button>
                    </>
                )}
            </div>

            {/* NOUVELLE SECTION : Annonces */}
            <div style={sectionStyle}>
                <h2>Message d'annonce (affiché sur la page Menu)</h2>
                {isOtherSettingsLoading ? <p>Chargement...</p> : (
                    <>
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                                <input 
                                    type="checkbox" 
                                    id="announcement-enabled" 
                                    checked={announcementEnabled} 
                                    onChange={(e) => setAnnouncementEnabled(e.target.checked)} 
                                    style={{ marginRight: '10px', height: '18px', width: '18px' }} 
                                />
                                <label htmlFor="announcement-enabled" style={{ fontWeight: 'bold' }}>Activer le message d'annonce</label>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Style du message</label>
                                <select 
                                    value={announcementStyle} 
                                    onChange={(e) => setAnnouncementStyle(e.target.value)}
                                    style={inputStyle}
                                    disabled={!announcementEnabled}
                                >
                                    {announcementStyles.map(style => (
                                        <option key={style.value} value={style.value}>{style.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>Message (Markdown supporté)</label>
                                <textarea 
                                    value={announcementMessage} 
                                    onChange={(e) => setAnnouncementMessage(e.target.value)} 
                                    style={{...inputStyle, height: '120px', backgroundColor: announcementEnabled ? '#fff' : '#f9f9f9', fontFamily: 'monospace'}} 
                                    placeholder="**Exemple**: Profitez de nos offres spéciales pour Noël ! 🎄&#10;&#10;- 10% de réduction sur tous les menus&#10;- Livraison gratuite jusqu'au 31/12"
                                    disabled={!announcementEnabled}
                                />
                                <small style={{ color: '#666', display: 'block', marginTop: '5px' }}>
                                    Syntaxe Markdown : **gras**, *italique*, # Titre, - liste, [lien](url)
                                </small>
                            </div>

                            {announcementEnabled && announcementMessage && (
                                <div>
                                    <label style={{ ...labelStyle, marginTop: '15px', display: 'block' }}>Aperçu :</label>
                                    <div style={getAnnouncementPreviewStyle()}>
                                        <div dangerouslySetInnerHTML={{ __html: announcementMessage.replace(/\n/g, '<br>') }} />
                                    </div>
                                    <small style={{ color: '#999', display: 'block', marginTop: '5px' }}>
                                        Note : L'aperçu réel avec Markdown sera visible sur la page Menu
                                    </small>
                                </div>
                            )}
                        </div>
                        <button onClick={handleSaveAnnouncement} style={saveButtonStyle}>Enregistrer l'annonce</button>
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
                            <h3 style={{ marginTop: 0, fontSize: '1.1rem' }}>Prix des formules (€)</h3>
                            <div style={formGridStyle}>
                                <InputField label="Prix Découverte" name="menu_decouverte_price" type="number" value={menuDecouvertePrice} onChange={(e) => setMenuDecouvertePrice(e.target.value)} />
                                <InputField label="Prix Standard" name="menu_standard_price" type="number" value={menuStandardPrice} onChange={(e) => setMenuStandardPrice(e.target.value)} />
                                <InputField label="Prix Confort" name="menu_confort_price" type="number" value={menuConfortPrice} onChange={(e) => setMenuConfortPrice(e.target.value)} />
                                <InputField label="Prix Duo" name="menu_duo_price" type="number" value={menuDuoPrice} onChange={(e) => setMenuDuoPrice(e.target.value)} />
                            </div>
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
                        <button onClick={handleSaveMenus} style={saveButtonStyle}>Enregistrer les Menus et Prix</button>
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
const removeButtonStyle = { position: 'absolute', top: '10px', right: '10px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '16px', lineHeight: '24px', textAlign: 'center' };
const statusStyle = (type) => ({ padding: '15px', marginBottom: '20px', borderRadius: '5px', color: 'white', backgroundColor: type === 'success' ? '#28a745' : (type === 'error' ? '#dc3545' : '#17a2b8') });

export default Parametres;