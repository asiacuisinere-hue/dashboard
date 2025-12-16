import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, Trash2, Calendar, AlertCircle, Loader2 } from 'lucide-react';

const Events = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state for new event
    const [newEventName, setNewEventName] = useState('');
    const [newEventType, setNewEventType] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newDescription, setNewDescription] = useState('');

    const eventTypes = [
        'Foire', 'Exposition', 'Promotion', 'Fête', 'Autre'
    ];

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[Events] Fetching events...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-events`, {
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[Events] Response status:', response.status);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = `Erreur du serveur (status ${response.status})`;
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.details || errorData.error || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            const data = await response.json();
            console.log('[Events] Events received:', data);
            setEvents(data);
        } catch (err) {
            console.error('[Events] Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvents();
    }, []);

    const handleAddEvent = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        setError(null);
        
        try {
            console.log('[Events] Adding new event...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const payload = {
                event_name: newEventName,
                event_type: newEventType,
                start_date: newStartDate,
                end_date: newEndDate,
                description: newDescription,
            };

            console.log('[Events] Payload:', payload);

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-event`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log('[Events] Create response status:', response.status);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = `Erreur du serveur (status ${response.status})`;
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.details || errorData.error || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }

            // Clear form
            setNewEventName('');
            setNewEventType('');
            setNewStartDate('');
            setNewEndDate('');
            setNewDescription('');
            
            alert('Événement ajouté avec succès !');
            fetchEvents(); // Refresh list
        } catch (err) {
            console.error('[Events] Error adding event:', err);
            setError(err.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteEvent = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            console.log('[Events] Deleting event:', id);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-event?id=${id}`, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('[Events] Delete response status:', response.status);

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                let errorMessage = `Erreur du serveur (status ${response.status})`;
                
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    errorMessage = errorData.details || errorData.error || errorMessage;
                } else {
                    const errorText = await response.text();
                    errorMessage = errorText || errorMessage;
                }
                throw new Error(errorMessage);
            }
            
            alert('Événement supprimé avec succès !');
            fetchEvents(); // Refresh list
        } catch (err) {
            console.error('[Events] Error deleting event:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 flex items-center">
                    <Calendar className="w-8 h-8 mr-3 text-amber-500" /> Journal d'Événements
                </h1>
                <p className="text-gray-600 mb-6">Ajoutez et gérez les événements spéciaux pour les corréler avec vos statistiques.</p>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold">Erreur:</h3>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Add Event Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajouter un nouvel événement</h2>
                    <form onSubmit={handleAddEvent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-1">
                                Nom de l'événement *
                            </label>
                            <input
                                type="text"
                                id="eventName"
                                value={newEventName}
                                onChange={(e) => setNewEventName(e.target.value)}
                                required
                                placeholder="Ex: Foire de Saint-Denis"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                        <div>
                            <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">
                                Type
                            </label>
                            <select
                                id="eventType"
                                value={newEventType}
                                onChange={(e) => setNewEventType(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-3 py-2 border"
                            >
                                <option value="">Sélectionner un type</option>
                                {eventTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Date de début *
                            </label>
                            <input
                                type="date"
                                id="startDate"
                                value={newStartDate}
                                onChange={(e) => setNewStartDate(e.target.value)}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Date de fin *
                            </label>
                            <input
                                type="date"
                                id="endDate"
                                value={newEndDate}
                                onChange={(e) => setNewEndDate(e.target.value)}
                                required
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-3 py-2 border"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="eventDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="eventDescription"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                rows="3"
                                placeholder="Détails de l'événement..."
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm px-3 py-2 border"
                            ></textarea>
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAdding ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Ajout en cours...
                                    </>
                                ) : (
                                    <>
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Ajouter l'événement
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Events List */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Liste des événements</h2>
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <p className="ml-3 text-gray-600">Chargement des événements...</p>
                        </div>
                    ) : events.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">Aucun événement trouvé. Ajoutez-en un ci-dessus !</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Événement</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Période</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {events.map((event) => (
                                        <tr key={event.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.event_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                                                    {event.event_type || 'Non défini'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(event.start_date).toLocaleDateString('fr-FR')} 
                                                {' → '}
                                                {new Date(event.end_date).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                {event.description || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <button 
                                                    onClick={() => handleDeleteEvent(event.id)} 
                                                    className="text-red-600 hover:text-red-900 inline-flex items-center"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Events;