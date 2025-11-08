import React from 'react';
import { NavLink } from 'react-router-dom';

const sidebarStyle = {
    width: '250px',
    backgroundColor: '#343a40',
    padding: '20px',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
};

const linkStyle = {
    display: 'flex', // Changed to flex to align text and badge
    justifyContent: 'space-between', // Puts space between text and badge
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

const Badge = ({ count, color }) => {
    if (count === 0) return null;
    return (
        <span style={{ ...badgeStyle, backgroundColor: color }}>
            {count}
        </span>
    );
};

const Sidebar = ({ newCount, inProgressCount }) => {
    return (
        <div style={sidebarStyle}>
            <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Asiacuisine.re</h2>
            <nav>
                <NavLink to="/" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
                    <span>Nouvelles Demandes</span>
                    <Badge count={newCount} color="#dc3545" />
                </NavLink>
                <NavLink to="/demandes-en-cours" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
                    <span>Demandes en Cours</span>
                    <Badge count={inProgressCount} color="#ffc107" />
                </NavLink>
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
