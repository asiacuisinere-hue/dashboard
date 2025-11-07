import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';

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
    backgroundColor: '#343a40',  // Fond solide
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
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

const Sidebar = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

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

    const mobileLinkStyle = {
        ...linkStyle,
        color: 'white',
        fontSize: '20px',
        textAlign: 'center',
        border: 'none',
        padding: '20px',
        width: '100%',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
    };

    const mobileActiveLinkStyle = {
        ...mobileLinkStyle,
        color: '#d4af37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        fontWeight: 'bold',
    };

    const NavLinks = ({ mobile = false }) => (
        <nav style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
            <NavLink to="/" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Nouvelles Demandes</NavLink>
            <NavLink to="/demandes-en-cours" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Demandes en Cours</NavLink>
            <NavLink to="/particuliers" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Particuliers</NavLink>
            <NavLink to="/entreprises" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Entreprises</NavLink>
            <NavLink to="/devis" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Devis</NavLink>
            <NavLink to="/factures" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Factures</NavLink>
            <NavLink to="/scanner" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Scanner</NavLink>
            <NavLink to="/parametres" style={({ isActive }) => (mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? activeLinkStyle : linkStyle))} onClick={() => setIsOpen(false)}>Paramètres</NavLink>
        </nav>
    );

    if (isMobile) {
        return (
            <>
                <header style={mobileHeaderStyle}>
                    <h2>Asiacuisine.re</h2>
                    <div style={hamburgerStyle} onClick={() => setIsOpen(true)}>
                        &#9776;
                    </div>
                </header>
                {isOpen && (
                    <div style={mobileNavOverlayStyle}>
                        <div style={closeButtonStyle} onClick={() => setIsOpen(false)}>&times;</div>
                        <h2 style={{ color: 'white', marginBottom: '40px' }}>Menu</h2>
                        <NavLinks mobile />
                    </div>
                )}
            </>
        );
    }

    return (
        <div style={desktopSidebarStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Asiacuisine.re</h2>
            <NavLinks />
        </div>
    );
};

export default Sidebar;
