import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const sidebarStyle = {
    width: '250px',
    backgroundColor: '#343a40',
    padding: '20px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
};

const mobileSidebarStyle = {
    width: '100%',
    height: 'auto',
    backgroundColor: '#343a40',
    padding: '10px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
};

const hamburgerStyle = {
    display: 'none',
    position: 'absolute',
    top: '15px',
    right: '20px',
    cursor: 'pointer',
    fontSize: '24px',
    color: 'white',
};

const navStyle = {
    display: 'flex',
    flexDirection: 'column',
};

const mobileNavStyle = {
    display: 'none',
    flexDirection: 'column',
    width: '100%',
};

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const isMobile = window.innerWidth <= 768;

    const linkStyle = {
        display: 'block',
        padding: '15px 20px',
        color: '#ccc',
        textDecoration: 'none',
        borderLeft: '4px solid transparent',
        transition: 'all 0.3s ease'
    };

    const activeLinkStyle = {
        ...linkStyle,
        backgroundColor: '#495057',
        borderLeft: '4px solid #d4af37',
        fontWeight: 'bold',
        color: 'white',
    };

    if (isMobile) {
        hamburgerStyle.display = 'block';
        if (isOpen) {
            mobileNavStyle.display = 'flex';
        }
    }

    return (
        <div style={isMobile ? mobileSidebarStyle : sidebarStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Asiacuisine.re</h2>
                <div style={hamburgerStyle} onClick={() => setIsOpen(!isOpen)}>
                    &#9776;
                </div>
            </div>
            <nav style={isMobile ? mobileNavStyle : navStyle}>
                <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Nouvelles Demandes</NavLink>
                <NavLink to="/demandes-en-cours" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Demandes en Cours</NavLink>
                <NavLink to="/particuliers" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Particuliers</NavLink>
                <NavLink to="/entreprises" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Entreprises</NavLink>
                <NavLink to="/devis" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Devis</NavLink>
                <NavLink to="/factures" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Factures</NavLink>
                <NavLink to="/scanner" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Scanner</NavLink>
                <NavLink to="/parametres" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>Paramètres</NavLink>
            </nav>
        </div>
    );
};

export default Sidebar;
