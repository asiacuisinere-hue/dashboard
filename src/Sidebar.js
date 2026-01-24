import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { QrCode, Bell, X, Info, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react';

const Sidebar = ({ 
    newCount, inProgressCount, pendingQuotesCount, toPrepareCount, 
    pendingInvoicesCount, depositPaidInvoicesCount, waitingForPrepCount, 
    activeSubscriptionsCount, subscriptionsNeedAttentionCount, 
    isMobile, notifications, setNotifications 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState(['GESTION']); // GESTION ouvert par défaut
  const notificationsRef = useRef(null);
  const navigate = useNavigate();

  const toggleGroup = (groupTitle) => {
    setOpenGroups(prev => 
        prev.includes(groupTitle) 
            ? prev.filter(t => t !== groupTitle) 
            : [...prev, groupTitle]
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNotificationClick = (notification) => {
    markAsRead(notification.id);
    setIsNotificationsOpen(false);
    navigate(notification.link);
  };
  
  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Click outside handler for notification panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationsRef]);


  const badgeStyle = {
    marginLeft: '10px',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    color: 'white',
  };

  const newBadgeStyle = { ...badgeStyle, backgroundColor: '#28a745' };
  const inProgressBadgeStyle = { ...badgeStyle, backgroundColor: '#ffc107', color: '#333' };
  const pendingQuotesBadgeStyle = { ...badgeStyle, backgroundColor: '#17a2b8' };
  const toPrepareBadgeStyle = { ...badgeStyle, backgroundColor: '#6f42c1' };
  const pendingInvoiceBadgeStyle = { ...badgeStyle, backgroundColor: '#fd7e14' };
  const depositPaidInvoiceBadgeStyle = { ...badgeStyle, backgroundColor: '#20c997' };
  const waitingForPrepStyle = { ...badgeStyle, backgroundColor: '#007bff' };
  const activeSubscriptionsBadgeStyle = { ...badgeStyle, backgroundColor: '#6610f2' };
  const needsAttentionBadgeStyle = { ...badgeStyle, backgroundColor: '#ffc107', color: '#333' };
  
  const iconBaseStyle = {
    color: 'white',
    padding: '5px',
    cursor: 'pointer',
    position: 'relative',
  };

  const notificationIconStyle = { ...iconBaseStyle, marginRight: '10px' };
  const scannerIconStyle = { ...iconBaseStyle, marginRight: '15px' };
  const hamburgerStyle = { ...iconBaseStyle, fontSize: '28px' };

  const notificationBadgeStyle = {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    backgroundColor: 'red',
    color: 'white',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #343a40',
  };
  
    // --- Composants de l'UI ---

    const NotificationPanel = () => (
        <div ref={notificationsRef} style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '350px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            zIndex: 1100,
            color: '#333',
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontWeight: 'bold' }}>Notifications</h4>
                {unreadCount > 0 && <button onClick={markAllAsRead} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', fontSize: '12px' }}>Tout marquer comme lu</button>}
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '400px', overflowY: 'auto' }}>
                {notifications.length > 0 ? notifications.map(notif => (
                    <li key={notif.id} onClick={() => handleNotificationClick(notif)} style={{
                        padding: '15px',
                        borderBottom: '1px solid #eee',
                        cursor: 'pointer',
                        backgroundColor: notif.read ? 'white' : '#f0f8ff',
                        display: 'flex',
                        alignItems: 'center'
                    }}>
                        {notif.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-500 mr-3"/> : <Info className="w-5 h-5 text-blue-500 mr-3"/>}
                        <div>
                            <p style={{ margin: 0, fontSize: '14px' }}>{notif.message}</p>
                            <small style={{ color: '#888' }}>{new Date(notif.timestamp).toLocaleString('fr-FR')}</small>
                        </div>
                    </li>
                )) : <li style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Aucune notification</li>}
            </ul>
        </div>
    );

  // --- Reste de la Sidebar ---
  // (Le code de NavLinks, logout, styles, etc. reste ici)

  // Duplication de la logique pour éviter de modifier toute la structure
  const NavLinks = ({ mobile = false }) => {
    const handleClick = () => {
      if (mobile) setIsOpen(false);
    };

    const groups = [
        {
            title: 'PILOTAGE',
            links: [
                { to: '/statistiques', label: 'Statistiques' },
                { to: '/depenses', label: 'Dépenses' },
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
                { to: '/nouvelles-demandes', label: 'Nouvelles Demandes', count: newCount, style: newBadgeStyle },
                { to: '/demandes-en-cours', label: 'Demandes en Cours', count: inProgressCount, style: inProgressBadgeStyle },
                { to: '/a-preparer', label: 'À Préparer', count: toPrepareCount, style: toPrepareBadgeStyle },
                { to: '/devis', label: 'Devis', count: pendingQuotesCount, style: pendingQuotesBadgeStyle },
                { 
                    to: '/factures', 
                    label: 'Factures', 
                    subLinks: [
                        { to: '/factures?status=pending', label: 'En attente', count: pendingInvoicesCount, style: pendingInvoiceBadgeStyle },
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
                { to: '/events', label: 'Événements' },
                { to: '/services', label: 'Services' },
                { to: '/plats', label: 'Plats' },
                { to: '/scanner', label: 'Scanner', mobileOnly: false },
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
        padding: '15px 20px', 
        marginTop: '10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
        transition: 'color 0.2s',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
    };

    const contentStyle = mobile ? { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' } : { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' };
    const desktopLinkStyle = { display: 'block', padding: '12px 20px', color: '#ccc', textDecoration: 'none', borderLeft: '4px solid transparent', transition: 'all 0.3s ease', borderRadius: '4px', marginBottom: '2px', fontSize: '0.9rem' };
    const desktopActiveLinkStyle = { ...desktopLinkStyle, backgroundColor: 'rgba(212, 175, 55, 0.15)', borderLeft: '4px solid #d4af37', fontWeight: 'bold', color: 'white' };
    const mobileLinkStyle = { display: 'block', padding: '20px', color: 'white', fontSize: '18px', textAlign: 'center', textDecoration: 'none', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.1)' };
    const mobileActiveLinkStyle = { ...mobileLinkStyle, color: '#d4af37', backgroundColor: 'rgba(212, 175, 55, 0.1)' };
    
    return (
      <nav style={{ width: '100%' }}>
        {groups.map(group => {
            const isGroupOpen = openGroups.includes(group.title) || mobile;
            return (
                <div key={group.title} style={{ marginBottom: '5px' }}>
                    {!mobile && (
                        <div 
                            style={groupTitleStyle} 
                            onClick={() => toggleGroup(group.title)}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#868e96'}
                        >
                            <span>{group.title}</span>
                            {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    )}
                    
                    <div style={{ 
                        maxHeight: isGroupOpen ? '1000px' : '0', 
                        overflow: 'hidden', 
                        transition: 'maxHeight 0.3s ease-in-out' 
                    }}>
                        {group.links.filter(link => mobile ? link.mobileOnly !== false : true).map(link => (
                            <React.Fragment key={link.to || link.label}>
                                <NavLink to={link.to} style={({ isActive }) => mobile ? (isActive ? mobileActiveLinkStyle : mobileLinkStyle) : (isActive ? desktopActiveLinkStyle : desktopLinkStyle)} onClick={handleClick}>
                                    <div style={contentStyle}>
                                        <span>{link.label}</span>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            {link.count > 0 && <span style={link.style}>{link.count}</span>}
                                            {link.secondCount > 0 && <span style={link.secondStyle}>⚠️ {link.secondCount}</span>}
                                        </div>
                                    </div>
                                </NavLink>
                                {!mobile && isGroupOpen && link.subLinks && link.subLinks.map(subLink => (
                                    <NavLink key={subLink.to} to={subLink.to} style={({ isActive }) => ({ ...desktopLinkStyle, paddingLeft: '40px', fontSize: '13px', color: isActive ? '#d4af37' : '#aaa' })} onClick={handleClick}>
                                        <div style={contentStyle}>
                                            <span>{subLink.label}</span>
                                            {subLink.count > 0 && <span style={subLink.style}>{subLink.count}</span>}
                                        </div>
                                    </NavLink>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            );
        })}
      </nav>
    );
  };
    const logoutButtonStyle = { width: '100%', padding: '10px 15px', backgroundColor: 'rgba(220, 53, 69, 0.8)', color: 'white', border: '1px solid #dc3545', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.2s ease' };
    const mobileLogoutButtonStyle = { ...logoutButtonStyle, maxWidth: '200px', margin: '0 auto' };
    const mobileHeaderStyle = { width: '100%', backgroundColor: '#343a40', padding: '15px 20px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' };
    const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#343a40', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '10px' };
    const closeButtonStyle = { position: 'absolute', top: '15px', right: '20px', fontSize: '40px', color: 'white', cursor: 'pointer' };
    const titleStyle = { color: 'white', marginBottom: '40px', fontSize: '24px' };
    const mobileMenuCardStyle = { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', maxHeight: '95vh', paddingTop: '40px' };

  if (isMobile) {
    return (
      <>
        <header style={mobileHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: '20px' }}>Asiacuisine.re</h2>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={notificationIconStyle} onClick={() => setIsNotificationsOpen(o => !o)}>
                <Bell size={24} />
                {unreadCount > 0 && <span style={notificationBadgeStyle}>{unreadCount}</span>}
            </div>
            <Link to="/scanner" style={scannerIconStyle}>
                <QrCode size={24} />
            </Link>
            <div style={hamburgerStyle} onClick={() => setIsOpen(true)}>
                ☰
            </div>
          </div>
        </header>
        {isNotificationsOpen && <NotificationPanel />}
        {isOpen && (
          <div style={overlayStyle}>
            <div style={closeButtonStyle} onClick={() => setIsOpen(false)}><X /></div>
            <div style={mobileMenuCardStyle}>
              <h2 style={titleStyle}>Menu</h2>
              <div style={{ overflowY: 'auto', flex: 1 }}><NavLinks mobile /></div>
              <div style={{ padding: '20px', width: '100%', textAlign: 'center' }}>
                  <button onClick={handleLogout} style={mobileLogoutButtonStyle}><span>👋</span> Déconnexion</button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <aside style={{ width: '250px', minWidth: '250px', backgroundColor: '#343a40', padding: '20px', color: 'white', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto', flexShrink: 0 }}>
        <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2 style={{ textAlign: 'center', margin: 0 }}>Asiacuisine.re</h2>
                <div style={notificationIconStyle} onClick={() => setIsNotificationsOpen(o => !o)}>
                    <Bell size={20} />
                    {unreadCount > 0 && <span style={notificationBadgeStyle}>{unreadCount}</span>}
                </div>
            </div>
            {isNotificationsOpen && <NotificationPanel />}
            <NavLinks />
        </div>
        <div style={{ marginTop: 'auto', padding: '20px 0' }}>
            <button onClick={handleLogout} style={logoutButtonStyle}><span>👋</span> Déconnexion</button>
        </div>
    </aside>
  );
};

export default Sidebar;