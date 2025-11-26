import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarSettings = () => {
    const [unavailableDates, setUnavailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('RESERVATION_SERVICE'); // 'RESERVATION_SERVICE' or 'COMMANDE_MENU'

    const serviceTypeMap = {
        'RESERVATION_SERVICE': 'Réservation de Service',
        'COMMANDE_MENU': 'Commande de Menu'
    };

    const fetchUnavailableDates = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('indisponibilites')
            .select('id, date, reason')
            .eq('service_type', activeTab);
        
        if (error) {
            console.error('Error fetching unavailable dates:', error);
            alert('Erreur de chargement des dates.');
        } else {
            setUnavailableDates(data.map(d => ({ ...d, date: new Date(d.date) })));
        }
        setLoading(false);
    }, [activeTab]);

    useEffect(() => {
        fetchUnavailableDates();
    }, [fetchUnavailableDates]);

    const handleAddDate = async (e) => {
        e.preventDefault();
        const dateString = selectedDate.toISOString().split('T')[0];

        const { error } = await supabase
            .from('indisponibilites')
            .insert([{ 
                date: dateString, 
                reason: reason,
                service_type: activeTab // Add the service type
            }]);

        if (error) {
            console.error('Error adding date:', error);
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Date ajoutée avec succès !');
            setReason('');
            fetchUnavailableDates();
        }
    };

    const handleDeleteDate = async (id) => {
        if (!window.confirm("Confirmer la suppression de cette date ?")) return;

        const { error } = await supabase
            .from('indisponibilites')
            .delete()
            .eq('id', id);

        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Date supprimée avec succès.');
            fetchUnavailableDates();
        }
    };
    
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const isUnavailable = unavailableDates.some(
                d => d.date.toDateString() === date.toDateString()
            );
            return isUnavailable ? 'unavailable-tile' : null;
        }
        return null;
    };

    return (
        <div style={containerStyle}>
            <h1>Gestion des Calendriers</h1>
            <p>Sélectionnez les jours où un service n'est pas disponible.</p>

            <div style={tabsContainerStyle}>
                <button 
                    style={activeTab === 'RESERVATION_SERVICE' ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab('RESERVATION_SERVICE')}
                >
                    Réservation de Service
                </button>
                <button 
                    style={activeTab === 'COMMANDE_MENU' ? activeTabStyle : tabStyle}
                    onClick={() => setActiveTab('COMMANDE_MENU')}
                >
                    Commande de Menu
                </button>
            </div>

            <div style={contentContainerStyle}>
                <div style={calendarSectionStyle}>
                    <h2>Calendrier pour: {serviceTypeMap[activeTab]}</h2>
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        tileClassName={tileClassName}
                    />
                    <form onSubmit={handleAddDate} style={formStyle}>
                        <h3>Ajouter une indisponibilité</h3>
                        <p>Date sélectionnée: {selectedDate.toLocaleDateString('fr-FR')}</p>
                        <input
                            type="text"
                            placeholder="Raison (ex: Férié, Vacances)"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            style={inputStyle}
                        />
                        <button type="submit" style={buttonStyle}>Ajouter la date</button>
                    </form>
                </div>

                <div style={listSectionStyle}>
                    <h2>Dates non disponibles</h2>
                    {loading ? <p>Chargement...</p> : (
                        <ul>
                            {unavailableDates.map(d => (
                                <li key={d.id} style={listItemStyle}>
                                    <span>{d.date.toLocaleDateString('fr-FR')} - {d.reason || 'Aucune raison'}</span>
                                    <button onClick={() => handleDeleteDate(d.id)} style={deleteButtonStyle}>X</button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// Styles
// ...
const containerStyle = { padding: '20px' };
const tabsContainerStyle = { display: 'flex', marginBottom: '20px', borderBottom: '1px solid #ccc' };
const tabStyle = { padding: '10px 20px', cursor: 'pointer', border: 'none', background: 'transparent', fontSize: '16px', color: '#666' };
const activeTabStyle = { ...tabStyle, fontWeight: 'bold', color: '#d4af37', borderBottom: '2px solid #d4af37' };
const contentContainerStyle = { display: 'flex', gap: '2rem', flexWrap: 'wrap' };
const calendarSectionStyle = { flex: 1, minWidth: '300px' };
const listSectionStyle = { flex: 1, minWidth: '300px' };
const formStyle = { marginTop: '20px' };
const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' };
const buttonStyle = { width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px' };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' };
const deleteButtonStyle = { background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' };

export default CalendarSettings;