import React from 'react';
import { Link } from 'react-router-dom';

const Parametres = () => {
    return (
        <div style={containerStyle}>
            <h1>Paramètres</h1>
            <p>Sélectionnez une section pour la configurer.</p>

            <div style={gridStyle}>
                <Link to="/calendrier" style={cardStyle}>
                    <h2>Gestion du Calendrier</h2>
                    <p>Bloquer des dates et des jours de la semaine récurrents.</p>
                </Link>
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
};

export default Parametres;