import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = ({ isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const desktopSidebarStyle = {
    width: '250px',
    minWidth: '250px',
    backgroundColor: '#343a40',
    padding: '20px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflowY: 'auto',
    flexShrink: 0,
  };

  const mobileHeaderStyle = {
    width: '100%',
    backgroundColor: '#343a40',
    padding: '15px 20px',
    color: 'white',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const hamburgerStyle = {
    cursor: 'pointer',
    fontSize: '28px',
    color: 'white',
    padding: '5px',
    userSelect: 'none',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#343a40',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1000,
    overflowY: 'auto',
    padding: '80px 20px 20px',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '15px',
    right: '20px',
    fontSize: '40px',
    color: 'white',
    cursor: 'pointer',
    lineHeight: '1',
    padding: '5px',
    userSelect: 'none',
  };

  const titleStyle = {
    color: 'white',
    marginBottom: '40px',
    fontSize: '24px',
    textAlign: 'center',
  };

  const desktopLinkStyle = {
    display: 'block',
    padding: '15px 20px',
    color: '#ccc',
    textDecoration: 'none',
    borderLeft: '4px solid transparent',
    transition: 'all 0.3s ease',
    borderRadius: '4px',
    marginBottom: '5px',
  };

  const desktopActiveLinkStyle = {
    ...desktopLinkStyle,
    backgroundColor: '#495057',
    borderLeft: '4px solid #d4af37',
    fontWeight: 'bold',
    color: 'white',
  };

  const mobileLinkStyle = {
    display: 'block',
    padding: '20px',
    color: 'white',
    fontSize: '18px',
    textAlign: 'center',
    textDecoration: 'none',
    width: '100%',
    maxWidth: '400px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    transition: 'all 0.3s ease',
  };

  const mobileActiveLinkStyle = {
    ...mobileLinkStyle,
    color: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    fontWeight: 'bold',
  };

  const NavLinks = ({ mobile = false }) => {
    const handleClick = () => {
      if (mobile) {
        setIsOpen(false);
      }
    };

    const links = [
      { to: '/', label: 'Nouvelles Demandes' },
      { to: '/demandes-en-cours', label: 'Demandes en Cours' },
      { to: '/particuliers', label: 'Particuliers' },
      { to: '/entreprises', label: 'Entreprises' },
      { to: '/devis', label: 'Devis' },
      { to: '/factures', label: 'Factures' },
      { to: '/scanner', label: 'Scanner' },
      { to: '/parametres', label: 'Paramètres' },
    ];

    return (
      <nav style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        width: '100%',
        alignItems: mobile ? 'center' : 'stretch',
      }}>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            style={({ isActive }) => 
              mobile 
                ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle)
                : (isActive ? desktopActiveLinkStyle : desktopLinkStyle)
            }
            onClick={handleClick}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    );
  };

  if (isMobile) {
    return (
      <>
        <header style={mobileHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Asiacuisine.re</h2>
          <div 
            style={hamburgerStyle} 
            onClick={() => setIsOpen(true)}
            role="button"
            aria-label="Ouvrir le menu"
          >
            ☰
          </div>
        </header>
        {isOpen && (
          <div style={overlayStyle}>
            <div 
              style={closeButtonStyle} 
              onClick={() => setIsOpen(false)}
              role="button"
              aria-label="Fermer le menu"
            >
              ×
            </div>
            <h2 style={titleStyle}>Menu</h2>
            <NavLinks mobile />
          </div>
        )}
      </>
    );
  }

  return (
    <aside style={desktopSidebarStyle}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        fontSize: '22px',
        color: 'white',
      }}>
        Asiacuisine.re
      </h2>
      <NavLinks />
    </aside>
  );
};

export default Sidebar;