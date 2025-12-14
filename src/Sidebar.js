import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { QrCode } from 'lucide-react';

const Sidebar = ({ newCount, inProgressCount, pendingQuotesCount, toPrepareCount, pendingInvoicesCount, depositPaidInvoicesCount, waitingForPrepCount, activeSubscriptionsCount, subscriptionsNeedAttentionCount, isMobile }) => {
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
  const waitingForPrepStyle = { ...badgeStyle, backgroundColor: '#007bff' }; // Strong Blue for new badge 
  const activeSubscriptionsBadgeStyle = { ...badgeStyle, backgroundColor: '#6610f2' }; // Indigo
  const needsAttentionBadgeStyle = { ...badgeStyle, backgroundColor: '#ffc107', color: '#333' }; // Jaune 
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
  
  const scannerIconStyle = {
    color: 'white',
    padding: '5px',
    marginRight: '15px'
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
    justifyContent: 'center',
    zIndex: 1000,
    padding: '10px',
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

    const groups = [
        {
            title: 'PILOTAGE',
                        links: [
                            { to: '/statistiques', label: 'Statistiques' },
                            { to: '/depenses', label: 'Dépenses' }, // Moved Expenses link
                            { 
                                to: '/abonnements', 
                                label: 'Abonnements', 
                                count: activeSubscriptionsCount, 
                                style: activeSubscriptionsBadgeStyle,
                                secondCount: subscriptionsNeedAttentionCount,
                                secondStyle: needsAttentionBadgeStyle
                            },
                        ]
                    },
                    {
                        title: 'GESTION',
                        links: [
                            { to: '/', label: 'Nouvelles Demandes', count: newCount, style: newBadgeStyle },
                            { to: '/demandes-en-cours', label: 'Demandes en Cours', count: inProgressCount, style: inProgressBadgeStyle },
                            { to: '/a-preparer', label: 'À Préparer', count: toPrepareCount, style: toPrepareBadgeStyle },
                            { to: '/devis', label: 'Devis', count: pendingQuotesCount, style: pendingQuotesBadgeStyle },
                            { 
                                to: '/factures', 
                                label: 'Factures', 
                                subLinks: [                        { to: '/factures?status=pending', label: 'En attente', count: pendingInvoicesCount, style: pendingInvoiceBadgeStyle },
                        { to: '/factures?status=deposit_paid', label: 'Acompte versé', count: depositPaidInvoicesCount, style: depositPaidInvoiceBadgeStyle },
                        { to: '/factures?status=paid&prep=true', label: 'Payées (Prêtes)', count: waitingForPrepCount, style: waitingForPrepStyle }
                    ]
                },
            ]
        },
        {
            title: 'DONNÉES',
            links: [
                { to: '/particuliers', label: 'Particuliers' },
                { to: '/entreprises', label: 'Entreprises' },
                { to: '/historique', label: 'Historique' },
            ]
        },
        {
            title: 'CONFIGURATION',
            links: [
                { to: '/services', label: 'Services' },
                { to: '/scanner', label: 'Scanner', mobileOnly: false }, // Hide on mobile list
                { to: '/parametres', label: 'Paramètres' },
                { to: '/admin-account', label: 'Compte' },
            ]
        }
    ];

    const groupTitleStyle = {
        fontSize: '0.75rem',
        color: '#868e96',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '10px 20px',
        marginTop: '15px',
    };

    const contentStyle = mobile ? mobileLinkContentStyle : desktopLinkContentStyle;

    return (
      <nav style={{ width: '100%' }}>
        {groups.map(group => (
            <div key={group.title}>
                {!mobile && <h3 style={groupTitleStyle}>{group.title}</h3>}
                {group.links.filter(link => mobile ? link.mobileOnly !== false : true).map(link => (
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
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {link.count > 0 && <span style={link.style}>{link.count}</span>}
                                    {link.secondCount > 0 && <span style={link.secondStyle}>⚠️ {link.secondCount}</span>}
                                </div>
                            </div>
                        </NavLink>
                        {!mobile && link.subLinks && link.subLinks.map(subLink => (
                            <NavLink
                            key={subLink.to}
                            to={subLink.to}
                            style={({ isActive }) =>
                                ({ ...desktopLinkStyle, paddingLeft: '40px', fontSize: '14px', color: isActive ? '#d4af37' : '#ccc' })
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
            </div>
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Link to="/scanner" style={scannerIconStyle}>
                <QrCode size={24} />
            </Link>
            <div style={hamburgerStyle} onClick={() => setIsOpen(true)}>
                ☰
                {(newCount > 0 || inProgressCount > 0 || pendingQuotesCount > 0 || toPrepareCount > 0 || pendingInvoicesCount > 0 || depositPaidInvoicesCount > 0 || subscriptionsNeedAttentionCount > 0) && <span style={hamburgerBadgeStyle}></span>}
            </div>
          </div>
        </header>
        {isOpen && (
          <div style={overlayStyle}>
            <div style={closeButtonStyle} onClick={() => setIsOpen(false)}>
              ×
            </div>
            <div style={mobileMenuCardStyle}>
              <h2 style={titleStyle}>Menu</h2>
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <NavLinks mobile />
              </div>
              <div style={{ padding: '20px', width: '100%', textAlign: 'center' }}>
                  <button onClick={handleLogout} style={mobileLogoutButtonStyle}>
                      <span>👋</span> Déconnexion
                  </button>
              </div>
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

// --- Styles pour le menu mobile ---
const mobileMenuCardStyle = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  height: '100%',
  maxHeight: '95vh', // Limite la hauteur pour voir le centrage
  paddingTop: '40px', // Espace pour le bouton fermer
};

export default Sidebar;