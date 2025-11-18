import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Assurez-vous que le chemin est correct

const Parametres = () => {
    const [welcomeMessage, setWelcomeMessage] = useState('');
    const [status, setStatus] = useState({ message: '', isError: false });
    const [isLoading, setIsLoading] = useState(false);

    // Define the base URL for the API from environment variables
    const API_URL = process.env.REACT_APP_API_URL || '';

    // Fetch the current welcome message on component mount
    useEffect(() => {
        const fetchWelcomeMessage = async () => {
            try {
                const response = await fetch(`${API_URL}/get-setting?key=welcomePopupMessage`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.value) {
                        setWelcomeMessage(data.value);
                    }
                } else if (response.status !== 404) {
                    throw new Error('Failed to fetch settings');
                }
            } catch (error) {
                console.error('Error fetching welcome message:', error);
                setStatus({ message: 'Erreur lors du chargement du message.', isError: true });
            }
        };

        fetchWelcomeMessage();
    }, [API_URL]);

    // Handle saving the new message
    const handleSave = async () => {
        setIsLoading(true);
        setStatus({ message: '', isError: false });

        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Authentication error. Please log in again.');
            }

            const response = await fetch(`${API_URL}/api/update-setting`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    key: 'welcomePopupMessage',
                    value: welcomeMessage,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to save the message.');
            }

            setStatus({ message: 'Message enregistré avec succès !', isError: false });
        } catch (error) {
            console.error('Error saving welcome message:', error);
            setStatus({ message: error.message, isError: true });
        } finally {
            setIsLoading(false);
            setTimeout(() => setStatus({ message: '', isError: false }), 3000);
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
                <div style={{...cardStyle, textDecoration: 'none', color: 'inherit'}}>
                    <h2>Message d'accueil (Popup)</h2>
                    <p>Modifiez le message qui s'affiche sur la page d'accueil.</p>
                    <textarea
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        style={textareaStyle}
                        placeholder="Saisissez le message ici..."
                    />
                    <button onClick={handleSave} disabled={isLoading} style={buttonStyle}>
                        {isLoading ? 'Enregistrement...' : 'Enregistrer'}
                    </button>
                    {status.message && (
                        <p style={{ color: status.isError ? '#d9534f' : '#5cb85c', marginTop: '10px', fontSize: '14px' }}>
                            {status.message}
                        </p>
                    )}
                </div>

                {/* D'autres cartes de paramètres pourront être ajoutées ici */}
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

const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '20px',
    marginTop: '30px',
};

const cardStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    display: 'flex',
    flexDirection: 'column',
};

const textareaStyle = {
    width: '100%',
    minHeight: '80px',
    marginTop: '15px',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box',
    resize: 'vertical',
};

const buttonStyle = {
    marginTop: '15px',
    padding: '10px 15px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#d4af37',
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    alignSelf: 'flex-start',
};

export default Parametres;