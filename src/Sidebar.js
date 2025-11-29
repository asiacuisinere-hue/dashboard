import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { supabase } from './supabaseClient';

const Sidebar = ({ newCount, inProgressCount, pendingQuotesCount, toPrepareCount, pendingInvoicesCount, depositPaidInvoicesCount, isMobile }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('Erreur lors de la déconnexion: ' + error.message);
    }
  };

  const badgeStyle = {
    marginLeft: '10px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
  };

  const newBadgeStyle = { ...badgeStyle, backgroundColor: '#28a745' }; // Vert
  const inProgressBadgeStyle = { ...badgeStyle, backgroundColor: '#ffc107', color: '#333' }; // Jaune
  const pendingQuotesBadgeStyle = { ...badgeStyle, backgroundColor: '#17a2b8' }; // Bleu clair
  const toPrepareBadgeStyle = { ...badgeStyle, backgroundColor: '#6f42c1' }; // Violet
  const pendingInvoiceBadgeStyle = { ...badgeStyle, backgroundColor: '#fd7e14' }; // Orange
  const depositPaidInvoiceBadgeStyle = { ...badgeStyle, backgroundColor: '#20c997' }; // Teal

  const hamburgerBadgeStyle = {
    position: 'absolute',
    top: '5px',
    right: '0px',
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: 'red',
    border: '2px solid #343a40',
  };

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
    boxSizing: 'border-box',
  };

  const hamburgerStyle = {
    cursor: 'pointer',
    fontSize: '28px',
    color: 'white',
    position: 'relative',
    padding: '5px',
  };

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#343a40',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align content to the top
    paddingTop: '60px', // Add some padding at the top
    zIndex: 1000,
    overflowY: 'auto',
  };

  const closeButtonStyle = {
    position: 'absolute',
    top: '15px',
    right: '20px',
    fontSize: '40px',
    color: 'white',
    cursor: 'pointer',
  };

  const titleStyle = {
    color: 'white',
    marginBottom: '40px',
    fontSize: '24px',
  };

  const desktopLinkContentStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  };

  const mobileLinkContentStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
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
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  };

  const mobileActiveLinkStyle = {
    ...mobileLinkStyle,
    color: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  };

  const NavLinks = ({ mobile = false }) => {
    const handleClick = () => {
      if (mobile) setIsOpen(false);
    };

    const links = [
      { to: '/', label: 'Nouvelles Demandes', count: newCount, style: newBadgeStyle },
      { to: '/demandes-en-cours', label: 'Demandes en Cours', count: inProgressCount, style: inProgressBadgeStyle },
      { to: '/a-preparer', label: 'À Préparer', count: toPrepareCount, style: toPrepareBadgeStyle },
      { to: '/historique', label: 'Historique' },
      { to: '/particuliers', label: 'Particuliers' },
      { to: '/entreprises', label: 'Entreprises' },
      { to: '/devis', label: 'Devis', count: pendingQuotesCount, style: pendingQuotesBadgeStyle },
      { to: '/factures', label: 'Factures', subLinks: [
        { to: '/factures?status=pending', label: 'En attente', count: pendingInvoicesCount, style: pendingInvoiceBadgeStyle },
        { to: '/factures?status=deposit_paid', label: 'Acompte versé', count: depositPaidInvoicesCount, style: depositPaidInvoiceBadgeStyle }
      ]},
      { to: '/scanner', label: 'Scanner' },
      { to: '/services', label: 'Services' },
      { to: '/abonnements', label: 'Abonnements' },
      { to: '/parametres', label: 'Paramètres' },
      { to: '/admin-account', label: 'Compte Administrateur' },
    ];

    const contentStyle = mobile ? mobileLinkContentStyle : desktopLinkContentStyle;

    return (
      <nav style={{ width: '100%' }}>
        {links.map(link => (
          <React.Fragment key={link.to || link.label}>
            <NavLink
              to={link.to}
              style={({ isActive }) => 
                mobile 
                  ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle)
                  : (isActive ? desktopActiveLinkStyle : desktopLinkStyle)
              }
              onClick={handleClick}
            >
              <div style={contentStyle}>
                <span>{link.label}</span>
                {link.count > 0 && <span style={link.style}>{link.count}</span>}
              </div>
            </NavLink>
            {link.subLinks && link.subLinks.map(subLink => (
              <NavLink
                key={subLink.to}
                to={subLink.to}
                style={({ isActive }) => 
                  mobile 
                    ? ({ ...mobileLinkStyle, paddingLeft: '40px', fontSize: '16px', color: isActive ? '#d4af37' : 'white' })
                    : ({ ...desktopLinkStyle, paddingLeft: '40px', fontSize: '14px', color: isActive ? '#d4af37' : '#ccc' })
                }
                onClick={handleClick}
              >
                <div style={contentStyle}>
                  <span>{subLink.label}</span>
                  {subLink.count > 0 && <span style={subLink.style}>{subLink.count}</span>}
                </div>
              </NavLink>
            ))}
          </React.Fragment>
        ))}
      </nav>
    );
  };

  const logoutButtonStyle = {
    width: '100%',
    padding: '10px 15px',
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
    color: 'white',
    border: '1px solid #dc3545',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease',
  };

  const mobileLogoutButtonStyle = {
      ...logoutButtonStyle,
      maxWidth: '200px',
      margin: '0 auto',
  };

  if (isMobile) {
    return (
      <>
        <header style={mobileHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Asiacuisine.re</h2>
          <div style={hamburgerStyle} onClick={() => setIsOpen(true)}>
            ☰
            {(newCount > 0 || inProgressCount > 0 || pendingQuotesCount > 0 || toPrepareCount > 0 || pendingInvoicesCount > 0 || depositPaidInvoicesCount > 0) && <span style={hamburgerBadgeStyle}></span>}
          </div>
        </header>
        {isOpen && (
          <div style={overlayStyle}>
            <div style={closeButtonStyle} onClick={() => setIsOpen(false)}>
              ×
            </div>
            <h2 style={titleStyle}>Menu</h2>
            <NavLinks mobile />
            <div style={{ marginTop: 'auto', padding: '20px', width: '100%', textAlign: 'center' }}>
                <button onClick={handleLogout} style={mobileLogoutButtonStyle}>
                    <span>👋</span> Déconnexion
                </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside style={desktopSidebarStyle}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
                Asiacuisine.re
            </h2>
            <NavLinks />
        </div>
        <div style={{ marginTop: 'auto', padding: '20px 0' }}>
            <button onClick={handleLogout} style={logoutButtonStyle}>
                <span>👋</span> Déconnexion
            </button>
        </div>
    </aside>
  );
};

export default Sidebar;