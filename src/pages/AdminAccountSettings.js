import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AdminAccountSettings = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false); // État pour le nouveau mot de passe
    const [showConfirmPassword, setShowConfirmPassword] = useState(false); // État pour la confirmation

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        setIsError(false);

        if (password !== confirmPassword) {
            setMessage('Les mots de passe ne correspondent pas.');
            setIsError(true);
            return;
        }

        if (password.length < 6) { // Minimum length for Supabase Auth
            setMessage('Le mot de passe doit contenir au moins 6 caractères.');
            setIsError(true);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });

            if (error) {
                setMessage('Erreur lors de la mise à jour du mot de passe: ' + error.message);
                setIsError(true);
            } else {
                setMessage('Mot de passe mis à jour avec succès !');
                setPassword('');
                setConfirmPassword('');
                setIsError(false);
            }
        } catch (error) {
            setMessage('Une erreur inattendue est survenue.');
            setIsError(true);
            console.error('Unexpected error updating password:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={containerStyle}>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion du Compte Administrateur</h1>
                <p className="text-gray-600">Gérez vos identifiants de connexion et vos paramètres de sécurité.</p>
            </div>

            {/* Section de changement de mot de passe */}
            <div style={sectionStyle}>
                <h2>Changer le mot de passe</h2>
                <form onSubmit={handlePasswordUpdate}>
                    <div style={{...formGroupStyle, position: 'relative'}}>
                        <label style={labelStyle}>Nouveau mot de passe:</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                            required
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={togglePasswordButtonStyle}
                        >
                            {showPassword ? '👁️' : '🔒'}
                        </button>
                    </div>
                    <div style={{...formGroupStyle, position: 'relative'}}>
                        <label style={labelStyle}>Confirmer le nouveau mot de passe:</label>
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={inputStyle}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            style={togglePasswordButtonStyle}
                        >
                            {showConfirmPassword ? '👁️' : '🔒'}
                        </button>
                    </div>
                    <button type="submit" disabled={loading} style={buttonStyle}>
                        {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
                    </button>
                    {message && (
                        <p style={{ ...messageStyle, color: isError ? '#dc3545' : '#28a745' }}>{message}</p>
                    )}
                </form>
            </div>

            {/* Section de gestion de l'email (lecture seule ou information) */}
            <div style={sectionStyle}>
                <h2>Email du compte</h2>
                <p>L'email du compte est actuellement : <strong>{user ? user.email : 'Chargement...'}</strong></p>
                <p style={{ fontSize: '0.9em', color: '#666' }}>
                    La modification de l'adresse e-mail n'est pas gérée directement ici pour des raisons de sécurité.
                    Veuillez contacter le support si vous avez besoin de la modifier.
                </p>
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '700px',
    margin: '0 auto',
};

const sectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const formGroupStyle = {
    marginBottom: '15px',
};

const labelStyle = {
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#333',
};

const inputStyle = {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    marginTop: '5px',
    fontSize: '16px',
    paddingRight: '40px', // Pour faire de la place au bouton
};

const togglePasswordButtonStyle = {
    position: 'absolute',
    right: '10px',
    top: '50%', // Ajuster la position verticale
    transform: 'translateY(15%)', // Centrer par rapport au champ
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '18px',
    color: '#666',
};

const buttonStyle = {
    padding: '10px 15px',
    backgroundColor: '#d4af37',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px',
};

const messageStyle = {
    marginTop: '15px',
    padding: '10px',
    borderRadius: '5px',
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    color: '#721c24',
    textAlign: 'center',
};

export default AdminAccountSettings;
