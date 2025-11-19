import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default calendar styles

// Custom CSS for blocked dates
const customCalendarStyle = `
  .blocked-date {
    background-color: #ffcdd2 !important; /* !important pour override le style par défaut */
    color: #c62828 !important;
    border-radius: 50%;
    text-decoration: line-through;
  }
`;

const CalendarSettings = () => {
    const [indisponibilites, setIndisponibilites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date()); // Date sélectionnée dans le calendrier
    const [reason, setReason] = useState('');
    const [recurringDays, setRecurringDays] = useState([]); // Jours de la semaine récurrents bloqués
    const daysOfWeek = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

    const fetchIndisponibilites = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('indisponibilites')
            .select('*');

        if (error) {
            console.error('Erreur de chargement des indisponibilités:', error);
        } else {
            setIndisponibilites(data);
            // Initialize recurringDays from fetched data
            const recurring = data.filter(item => item.day_of_week !== null).map(item => item.day_of_week);
            setRecurringDays([...new Set(recurring)]); // Unique days
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchIndisponibilites();
    }, [fetchIndisponibilites]);

    // Fonction pour vérifier si une date est bloquée
    const isDateBlocked = (date) => {
        // Manually format the date to YYYY-MM-DD to avoid timezone issues
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;
        return indisponibilites.some(item => item.date === dateString);
    };

    // Fonction pour vérifier si un jour de la semaine est bloqué de manière récurrente
    const isDayOfWeekBlocked = (dayIndex) => {
        return recurringDays.includes(dayIndex);
    };

    // Gérer le clic sur une date du calendrier
    const handleDateClick = async (date) => {
        // Manually format the date to YYYY-MM-DD to avoid timezone issues
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        setSelectedDate(date);

        const existing = indisponibilites.find(item => item.date === dateString);

        if (existing) {
            // Date déjà bloquée, proposer de la débloquer
            if (window.confirm(`La date ${dateString} est déjà bloquée pour la raison "${existing.reason || 'N/A'}". Voulez-vous la débloquer ?`)) {
                const { error } = await supabase
                    .from('indisponibilites')
                    .delete()
                    .eq('id', existing.id);
                if (error) {
                    alert(`Erreur lors du déblocage de la date : ${error.message}`);
                } else {
                    fetchIndisponibilites();
                }
            }
        } else {
            // Date non bloquée, proposer de la bloquer
            const newReason = prompt(`Voulez-vous bloquer la date ${dateString} ? Entrez une raison (optionnel) :`, reason);
            if (newReason !== null) { // Si l'utilisateur n'a pas annulé
                const { error } = await supabase
                    .from('indisponibilites')
                    .insert([{ date: dateString, reason: newReason || null }]);
                if (error) {
                    alert(`Erreur lors du blocage de la date : ${error.message}`);
                } else {
                    setReason(newReason || ''); // Mettre à jour la raison pour la prochaine fois
                    fetchIndisponibilites();
                }
            }
        }
    };

    // Gérer le clic sur un jour de la semaine récurrent
    const handleRecurringDayClick = async (dayIndex) => {
        const existing = indisponibilites.find(item => item.day_of_week === dayIndex);

        if (existing) {
            // Jour déjà bloqué, proposer de le débloquer
            if (window.confirm(`Le ${daysOfWeek[dayIndex]} est déjà bloqué de manière récurrente. Voulez-vous le débloquer ?`)) {
                const { error } = await supabase
                    .from('indisponibilites')
                    .delete()
                    .eq('day_of_week', dayIndex); // Supprimer toutes les entrées pour ce jour de la semaine
                if (error) {
                    alert(`Erreur lors du déblocage du jour récurrent : ${error.message}`);
                } else {
                    fetchIndisponibilites();
                }
            }
        } else {
            // Jour non bloqué, proposer de le bloquer
            const newReason = prompt(`Voulez-vous bloquer tous les ${daysOfWeek[dayIndex]} de manière récurrente ? Entrez une raison (optionnel) :`, reason);
            if (newReason !== null) { // Si l'utilisateur n'a pas annulé
                const { error } = await supabase
                    .from('indisponibilites')
                    .insert([{ day_of_week: dayIndex, reason: newReason || null }]);
                if (error) {
                    alert(`Erreur lors du blocage du jour récurrent : ${error.message}`);
                } else {
                    setReason(newReason || '');
                    fetchIndisponibilites();
                }
            }
        }
    };

    const handleDeleteIndisponibilite = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cette indisponibilité ?')) {
            const { error } = await supabase
                .from('indisponibilites')
                .delete()
                .eq('id', id);

            if (error) {
                alert(`Erreur lors de la suppression de l'indisponibilité : ${error.message}`);
            } else {
                fetchIndisponibilites();
            }
        }
    };

    if (loading) {
        return <div>Chargement des paramètres du calendrier...</div>;
    }

    return (
        <div style={containerStyle}>
            <style>{customCalendarStyle}</style>
            <h1>Paramètres du Calendrier</h1>

            <div style={sectionStyle}>
                <h2>Bloquer des jours de la semaine récurrents</h2>
                <div style={recurringDaysContainerStyle}>
                    {daysOfWeek.map((day, index) => (
                        <button
                            key={index}
                            onClick={() => handleRecurringDayClick(index)}
                            style={isDayOfWeekBlocked(index) ? blockedDayButtonStyle : dayButtonStyle}
                        >
                            {day}
                        </button>
                    ))}
                </div>
            </div>

            <div style={sectionStyle}>
                <h2>Bloquer des dates spécifiques</h2>
                <div style={calendarWrapperStyle}> {/* Ajout d'un wrapper pour le calendrier */}
                    <Calendar
                        onChange={handleDateClick}
                        value={selectedDate}
                        tileClassName={({ date, view }) => {
                            if (view === 'month' && isDateBlocked(date)) {
                                return 'blocked-date';
                            }
                            return null;
                        }}
                    />
                </div>
                <p style={{ marginTop: '20px', textAlign: 'center' }}>Cliquez sur une date pour la bloquer ou la débloquer.</p>
                <p style={{ textAlign: 'center' }}>Les dates bloquées sont affichées en rouge.</p>
            </div>

            <div style={sectionStyle}>
                <h2>Indisponibilités actuelles</h2>
                {indisponibilites.length === 0 ? (
                    <p>Aucune indisponibilité configurée.</p>
                ) : (
                    <ul style={indisponibilitesListStyle}>
                        {indisponibilites.map(item => (
                            <li key={item.id} style={indisponibiliteItemStyle}>
                                {item.date ? (
                                    <span>Date: <strong>{new Date(item.date).toLocaleDateString('fr-FR')}</strong></span>
                                ) : (
                                    <span>Jour récurrent: <strong>{daysOfWeek[item.day_of_week]}</strong></span>
                                )}
                                {item.reason && <span> (Raison: {item.reason})</span>}
                                <button onClick={() => handleDeleteIndisponibilite(item.id)} style={deleteButtonStyle}>Supprimer</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
};

const sectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
};

const recurringDaysContainerStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '10px',
    marginTop: '10px',
    justifyContent: 'center', // Centre les boutons
};

const dayButtonStyle = {
    padding: '10px 15px',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    flex: '1 1 auto', // Permet aux boutons de s'adapter
    minWidth: '90px', // Largeur minimale pour les boutons de jour
};

const blockedDayButtonStyle = {
    ...dayButtonStyle,
    backgroundColor: '#dc3545',
    color: 'white',
    borderColor: '#dc3545',
};

const calendarWrapperStyle = { // Nouveau style pour envelopper le calendrier
    display: 'flex',
    justifyContent: 'center',
    marginTop: '20px',
    // Le composant Calendar de 'react-calendar' a des largeurs fixes,
    // on peut le laisser centré et il sera responsif jusqu'à un certain point.
    // Pour une meilleure responsivité, il faudrait ajuster ses styles internes via CSS.
};

const indisponibilitesListStyle = {
    listStyleType: 'none',
    padding: 0,
    marginTop: '20px',
};

const indisponibiliteItemStyle = {
    background: '#f8f9fa',
    border: '1px solid #eee',
    borderRadius: '5px',
    padding: '10px',
    marginBottom: '10px',
    display: 'flex',
    flexWrap: 'wrap', // Permet aux éléments de passer à la ligne
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '10px', // Espacement entre les éléments
};

const deleteButtonStyle = {
    padding: '5px 10px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
};

export default CalendarSettings;
