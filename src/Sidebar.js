import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

// --- Styles ---

const desktopSidebarStyle = {
    width: '250px',
    backgroundColor: '#343a40',
    padding: '20px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
};

const mobileHeaderStyle = {
    width: '100%',
    backgroundColor: '#343a40',
    padding: '10px 20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const hamburgerStyle = {
    cursor: 'pointer',
    fontSize: '24px',
    color: 'white',
};

const mobileNavOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#343a40',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
};

const closeButtonStyle = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    fontSize: '30px',
    color: 'white',
    cursor: 'pointer',
};

const linkStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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

const badgeStyle = {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    color: 'white',
    fontWeight: 'bold',
};

// --- Composants ---

const Badge = ({ count, color }) => {
    if (!count || count === 0) return null;
    return (
        <span style={{ ...badgeStyle, backgroundColor: color }}>
            {count}
        </span>
    );
};

const NavLinks = ({ newCount, inProgressCount, mobile = false, onLinkClick = () => {} }) => {
    const mobileLinkStyle = { ...linkStyle, fontSize: '20px', textAlign: 'center', border: 'none', padding: '20px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)' };
    const mobileActiveLinkStyle = { ...mobileLinkStyle, color: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)' };

    const getStyle = (isActive) => mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle);

    return (
        <nav style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <NavLink to="/" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>
                <span>Nouvelles Demandes</span>
                <Badge count={newCount} color="#dc3545" />
            </NavLink>
            <NavLink to="/demandes-en-cours" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>
                <span>Demandes en Cours</span>
                <Badge count={inProgressCount} color="#ffc107" />
            </NavLink>
            <NavLink to="/particuliers" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Particuliers</NavLink>
            <NavLink to="/entreprises" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Entreprises</NavLink>
            <NavLink to="/devis" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Devis</NavLink>
            <NavLink to="/factures" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Factures</NavLink>
            <NavLink to="/scanner" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Scanner</NavLink>
            <NavLink to="/parametres" style={({ isActive }) => getStyle(isActive)} onClick={onLinkClick}>Paramètres</NavLink>
        </nav>
    );
};


const Sidebar = ({ newCount, inProgressCount, isMobile }) => {
    const [isOpen, setIsOpen] = useState(false);

    if (isMobile) {
        return (
            <>
                <header style={mobileHeaderStyle}>
                    <h2>Asiacuisine.re</h2>
                    <div style={hamburgerStyle} onClick={() => setIsOpen(true)}>&#9776;</div>
                </header>
                {isOpen && (
                    <div style={mobileNavOverlayStyle}>
                        <div style={closeButtonStyle} onClick={() => setIsOpen(false)}>&times;</div>
                        <h2 style={{ color: 'white', marginBottom: '40px' }}>Menu</h2>
                        <NavLinks newCount={newCount} inProgressCount={inProgressCount} mobile onLinkClick={() => setIsOpen(false)} />
                    </div>
                )}
            </>
        );
    }

    return (
        <div style={desktopSidebarStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Asiacuisine.re</h2>
            <NavLinks newCount={newCount} inProgressCount={inProgressCount} />
        </div>
    );
};

export default Sidebar;
