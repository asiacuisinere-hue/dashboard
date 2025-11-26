import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const CalendarSettings = () => {
    const [unavailableEntries, setUnavailableEntries] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [reason, setReason] = useState('');
    const [recurringDay, setRecurringDay] = useState('');
    const [loading, setLoading] = useState(true);
    
    const SERVICE_TYPE = 'RESERVATION_SERVICE'; // This page now only manages this service type

    const dayOfWeekMap = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

    const fetchUnavailableEntries = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('indisponibilites')
            .select('id, date, day_of_week, reason')
            .eq('service_type', SERVICE_TYPE);
        
        if (error) {
            console.error('Error fetching unavailable entries:', error);
            alert('Erreur de chargement des indisponibilités.');
        } else {
            setUnavailableEntries(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUnavailableEntries();
    }, [fetchUnavailableEntries]);

    const handleAddDate = async (e) => {
        e.preventDefault();
        const dateString = selectedDate.toISOString().split('T')[0];
        const { error } = await supabase.from('indisponibilites').insert([{ 
            date: dateString, 
            reason: reason,
            service_type: SERVICE_TYPE
        }]);
        if (error) alert(`Erreur: ${error.message}`);
        else {
            alert('Date ajoutée !');
            setReason('');
            fetchUnavailableEntries();
        }
    };

    const handleAddRecurringDay = async (e) => {
        e.preventDefault();
        if (recurringDay === '') {
            alert('Veuillez sélectionner un jour.');
            return;
        }
        const { error } = await supabase.from('indisponibilites').insert([{
            day_of_week: parseInt(recurringDay),
            reason: `Jour récurrent bloqué`,
            service_type: SERVICE_TYPE
        }]);
        if (error) alert(`Erreur: ${error.message}`);
        else {
            alert('Jour récurrent ajouté !');
            fetchUnavailableEntries();
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Confirmer la suppression ?")) return;
        const { error } = await supabase.from('indisponibilites').delete().eq('id', id);
        if (error) alert(`Erreur: ${error.message}`);
        else {
            alert('Supprimé avec succès.');
            fetchUnavailableEntries();
        }
    };
    
    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            const dateString = date.toISOString().split('T')[0];
            const isSpecificDate = unavailableEntries.some(d => d.date === dateString);
            const isRecurringDay = unavailableEntries.some(d => d.day_of_week === date.getDay());
            return (isSpecificDate || isRecurringDay) ? 'unavailable-tile' : null;
        }
        return null;
    };
    
    const specificDates = unavailableEntries.filter(e => e.date);
    const recurringDays = unavailableEntries.filter(e => e.day_of_week !== null);

    return (
        <div style={containerStyle}>
            <h1>Gestion du Calendrier (Réservation de Service)</h1>
            <p>Sélectionnez les jours où le service de **réservation à domicile** n'est pas disponible.</p>

            <div style={contentContainerStyle}>
                <div style={calendarSectionStyle}>
                    <h2>Calendrier des Réservations</h2>
                    <Calendar onChange={setSelectedDate} value={selectedDate} tileClassName={tileClassName} />
                    <form onSubmit={handleAddDate} style={formStyle}>
                        <h3>Ajouter une date spécifique</h3>
                        <p>Date sélectionnée: {selectedDate.toLocaleDateString('fr-FR')}</p>
                        <input type="text" placeholder="Raison (ex: Férié, Vacances)" value={reason} onChange={(e) => setReason(e.target.value)} style={inputStyle} />
                        <button type="submit" style={buttonStyle}>Ajouter la date</button>
                    </form>
                </div>

                <div style={listSectionStyle}>
                    <h2>Gérer les indisponibilités</h2>
                    <div style={{ ...formStyle, marginBottom: '2rem' }}>
                        <h3>Ajouter un jour récurrent</h3>
                        <select value={recurringDay} onChange={(e) => setRecurringDay(e.target.value)} style={inputStyle}>
                            <option value="">-- Choisir un jour --</option>
                            {dayOfWeekMap.map((day, index) => <option key={index} value={index}>{day}</option>)}
                        </select>
                        <button onClick={handleAddRecurringDay} style={buttonStyle}>Ajouter le jour</button>
                    </div>

                    <h3>Jours récurrents bloqués</h3>
                    {loading ? <p>Chargement...</p> : (
                        <ul>{recurringDays.map(d => (
                            <li key={d.id} style={listItemStyle}>
                                <span>{dayOfWeekMap[d.day_of_week]}</span>
                                <button onClick={() => handleDelete(d.id)} style={deleteButtonStyle}>X</button>
                            </li>
                        ))}</ul>
                    )}

                    <h3 style={{marginTop: '2rem'}}>Dates spécifiques bloquées</h3>
                    {loading ? <p>Chargement...</p> : (
                        <ul>{specificDates.map(d => (
                            <li key={d.id} style={listItemStyle}>
                                <span>{new Date(d.date).toLocaleDateString('fr-FR')} - {d.reason || 'N/A'}</span>
                                <button onClick={() => handleDelete(d.id)} style={deleteButtonStyle}>X</button>
                            </li>
                        ))}</ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// Styles
const containerStyle = { padding: '20px' };
const contentContainerStyle = { display: 'flex', gap: '2rem', flexWrap: 'wrap' };
const calendarSectionStyle = { flex: 1, minWidth: '300px' };
const listSectionStyle = { flex: 1, minWidth: '300px' };
const formStyle = { marginTop: '20px' };
const inputStyle = { width: '100%', padding: '8px', boxSizing: 'border-box', marginBottom: '10px' };
const buttonStyle = { width: '100%', padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px' };
const listItemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid #eee' };
const deleteButtonStyle = { background: '#dc3545', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer' };

export default CalendarSettings;