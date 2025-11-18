import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const Parametres = () => {
    // State for Welcome Message
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [welcomeStatus, setWelcomeStatus] = useState({ message: '', isError: false });
    const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);

    // State for Menu Contents
    const [menuDecouverte, setMenuDecouverte] = useState('');
    const [menuStandard, setMenuStandard] = useState('');
    const [menuConfort, setMenuConfort] = useState('');
    const [menuDuo, setMenuDuo] = useState('');
    const [menuStatus, setMenuStatus] = useState({ message: '', isError: false });
    const [isMenuLoading, setIsMenuLoading] = useState(false);

    const API_URL = process.env.REACT_APP_API_URL || '';

    // Fetch all settings on component mount
    const fetchSettings = useCallback(async () => {
        // Fetch welcome message
        try {
            const response = await fetch(`${API_URL}/get-setting?key=welcomePopupMessage`);
            if (response.ok) {
                const data = await response.json();
                if (data.value) setWelcomeMessage(data.value);
            } else if (response.status !== 404) {
                throw new Error('Failed to fetch welcome message');
            }
        } catch (error) {
            console.error('Error fetching welcome message:', error);
            setWelcomeStatus({ message: 'Erreur chargement message accueil.', isError: true });
        }

        // Fetch menu settings
        try {
            const response = await fetch(`${API_URL}/get-menus`);
            if (response.ok) {
                const data = await response.json();
                setMenuDecouverte(data.menu_decouverte || '');
                setMenuStandard(data.menu_standard || '');
                setMenuConfort(data.menu_confort || '');
                setMenuDuo(data.menu_duo || '');
            } else {
                 throw new Error('Failed to fetch menu settings');
            }
        } catch (error) {
            console.error('Error fetching menus:', error);
            setMenuStatus({ message: 'Erreur chargement menus.', isError: true });
        }
    }, [API_URL]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Generic save function
    const saveSetting = async (key, value) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Authentication error.');

        const response = await fetch(`${API_URL}/api/update-setting`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ key, value }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || `Failed to save setting: ${key}`);
        }
    };

    // Handler for welcome message save
    const handleSaveWelcome = async () => {
        setIsWelcomeLoading(true);
        setWelcomeStatus({ message: '', isError: false });
        try {
            await saveSetting('welcomePopupMessage', welcomeMessage);
            setWelcomeStatus({ message: 'Message enregistré !', isError: false });
        } catch (error) {
            setWelcomeStatus({ message: error.message, isError: true });
        } finally {
            setIsWelcomeLoading(false);
            setTimeout(() => setWelcomeStatus({ message: '', isError: false }), 3000);
        }
    };

    // Handler for menus save
    const handleSaveMenus = async () => {
        setIsMenuLoading(true);
        setMenuStatus({ message: 'Enregistrement...', isError: false });
        try {
            await Promise.all([
                saveSetting('menu_decouverte', menuDecouverte),
                saveSetting('menu_standard', menuStandard),
                saveSetting('menu_confort', menuConfort),
                saveSetting('menu_duo', menuDuo),
            ]);
            setMenuStatus({ message: 'Menus enregistrés !', isError: false });
        } catch (error) {
            setMenuStatus({ message: error.message, isError: true });
        } finally {
            setIsMenuLoading(false);
            setTimeout(() => setMenuStatus({ message: '', isError: false }), 3000);
        }
    };

    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            <p>Gérez ici les différentes configurations de votre application.</p>

            <div style={gridStyle}>
                {/* Card for Calendar Management */}
                <Link to="/calendrier" style={cardStyle}>
                    <h2>Gestion du Calendrier</h2>
                    <p>Bloquer des dates et des jours de la semaine récurrents.</p>
                </Link>

                {/* Card for Welcome Popup Message */}
                <div style={cardStyle}>
                    <h2>Message d'accueil (Popup)</h2>
                    <p>Modifiez le message qui s'affiche sur la page d'accueil.</p>
                    <textarea value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} style={textareaStyle} placeholder="Saisissez le message ici..."/>
                    <button onClick={handleSaveWelcome} disabled={isWelcomeLoading} style={buttonStyle}>
                        {isWelcomeLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    {welcomeStatus.message && <p style={{ color: welcomeStatus.isError ? '#d9534f' : '#5cb85c', marginTop: '10px', fontSize: '14px' }}>{welcomeStatus.message}</p>}
                </div>

                {/* Card for Weekly Menus */}
                <div style={{...cardStyle, gridColumn: 'span 2'}}>
                    <h2>Gestion des Menus de la Semaine</h2>
                    <p>Indiquez ici le contenu de chaque formule pour la semaine.</p>
                    <div style={menuGridStyle}>
                        <div>
                            <label style={labelStyle}>Formule Découverte</label>
                            <textarea value={menuDecouverte} onChange={(e) => setMenuDecouverte(e.target.value)} style={textareaStyle} placeholder="Ex: Plat 1, Plat 2..."/>
                        </div>
                        <div>
                            <label style={labelStyle}>Formule Standard</label>
                            <textarea value={menuStandard} onChange={(e) => setMenuStandard(e.target.value)} style={textareaStyle} placeholder="Ex: Plat 1, Plat 2..."/>
                        </div>
                        <div>
                            <label style={labelStyle}>Formule Confort</label>
                            <textarea value={menuConfort} onChange={(e) => setMenuConfort(e.target.value)} style={textareaStyle} placeholder="Ex: Plat 1, Plat 2..."/>
                        </div>
                        <div>
                            <label style={labelStyle}>Option Duo</label>
                            <textarea value={menuDuo} onChange={(e) => setMenuDuo(e.target.value)} style={textareaStyle} placeholder="Ex: 2x Plat 1, 2x Plat 2..."/>
                        </div>
                    </div>
                    <button onClick={handleSaveMenus} disabled={isMenuLoading} style={{...buttonStyle, marginTop: '20px'}}>
                        {isMenuLoading ? 'Enregistrement...' : 'Enregistrer les Menus'}
                    </button>
                    {menuStatus.message && <p style={{ color: menuStatus.isError ? '#d9534f' : '#5cb85c', marginTop: '10px', fontSize: '14px' }}>{menuStatus.message}</p>}
                </div>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '20px', maxWidth: '1200px', margin: '0 auto' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '20px', marginTop: '30px' };
const cardStyle = { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' };
const textareaStyle = { width: '100%', minHeight: '80px', marginTop: '10px', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', resize: 'vertical' };
const buttonStyle = { marginTop: '15px', padding: '10px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#d4af37', color: 'white', cursor: 'pointer', fontSize: '14px', alignSelf: 'flex-start' };
const menuGridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '15px' };
const labelStyle = { fontWeight: 'bold', color: '#333' };

export default Parametres;