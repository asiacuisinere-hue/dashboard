import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
    const linkStyle = {
        display: 'block',
        padding: '15px 20px',
        color: '#333',
        textDecoration: 'none',
        borderLeft: '4px solid transparent',
        transition: 'all 0.3s ease'
    };

    const activeLinkStyle = {
        ...linkStyle,
        backgroundColor: '#f0f0f0',
        borderLeft: '4px solid #d4af37',
        fontWeight: 'bold'
    };

    return (
        <div className="sidebar" style={sidebarStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Asiacuisine.re</h2>
            <nav>
                <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Nouvelles Demandes</NavLink>
                <NavLink to="/demandes-en-cours" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Demandes en Cours</NavLink>
                <NavLink to="/particuliers" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Particuliers</NavLink>
                <NavLink to="/entreprises" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Entreprises</NavLink>
                <NavLink to="/devis" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Devis</NavLink>
                <NavLink to="/factures" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Factures</NavLink>
                <NavLink to="/parametres" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Paramètres</NavLink>
            </nav>
        </div>
    );
};

export default Sidebar;
