import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { PlusCircle, Trash2, AlertCircle, Loader2 } from 'lucide-react';
import { useBusinessUnit } from '../BusinessUnitContext';

const Depenses = () => {
    const { businessUnit } = useBusinessUnit();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdding, setIsAdding] = useState(false);

    // Form state for new expense
    const [newExpenseDate, setNewExpenseDate] = useState('');
    const [newExpenseDescription, setNewExpenseDescription] = useState('');
    const [newExpenseAmount, setNewExpenseAmount] = useState('');
    const [newExpenseCategory, setNewExpenseCategory] = useState('');
    const [newExpenseDemandId, setNewExpenseDemandId] = useState('');
    const [newExpenseUnit, setNewExpenseUnit] = useState(businessUnit);

    // Filter state
    const [filterCategory, setFilterCategory] = useState('');
    const [filterStartDate, setFilterStartDate] = useState('');
    const [filterEndDate, setFilterEndDate] = useState('');

    const expenseCategories = [
        'Matières Premières', 'Déplacement', 'Fournitures', 'Salaires', 'Marketing', 'Autre', 'Abonnement'
    ];

    const fetchExpenses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            let url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-expenses`;
            const params = new URLSearchParams();
            params.append('business_unit', businessUnit); // Ajout du filtre business_unit
            if (filterCategory) params.append('category', filterCategory);
            if (filterStartDate) params.append('start_date', filterStartDate);
            if (filterEndDate) params.append('end_date', filterEndDate);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Erreur lors du chargement des dépenses.');
            }
            const data = await response.json();
            setExpenses(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [businessUnit, filterCategory, filterStartDate, filterEndDate]); // Added businessUnit to dependencies

    useEffect(() => {
        fetchExpenses();
        setNewExpenseUnit(businessUnit); // Sync form unit with global unit on change
    }, [fetchExpenses, businessUnit]); 

    const handleAddExpense = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const payload = {
                expense_date: newExpenseDate,
                description: newExpenseDescription,
                amount: parseFloat(newExpenseAmount),
                category: newExpenseCategory,
                demand_id: newExpenseDemandId || null,
                business_unit: newExpenseUnit, // Ajout de l'unité choisie
            };

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/create-expense`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Erreur lors de l\'ajout de la dépense.');
            }

            // Clear form
            setNewExpenseDate('');
            setNewExpenseDescription('');
            setNewExpenseAmount('');
            setNewExpenseCategory('');
            setNewExpenseDemandId('');
            fetchExpenses(); // Refresh list
        } catch (err) {
            setError(err.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) {
            return;
        }
        setLoading(true); // Show loading state during deletion
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/delete-expense?id=${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details || errorData.error || 'Erreur lors de la suppression de la dépense.');
            }
            fetchExpenses(); // Refresh list
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">Gestion des Dépenses</h1>
                    <p className="text-gray-600">Ajoutez, visualisez et gérez vos dépenses.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg flex items-start">
                        <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                        <div>
                            <h3 className="font-semibold">Erreur:</h3>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    </div>
                )}

                {/* Add Expense Form */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Ajouter une nouvelle dépense</h2>
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                id="expenseDate"
                                value={newExpenseDate}
                                onChange={(e) => setNewExpenseDate(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="expenseDescription" className="block text-sm font-medium text-gray-700">Description</label>
                            <input
                                type="text"
                                id="expenseDescription"
                                value={newExpenseDescription}
                                onChange={(e) => setNewExpenseDescription(e.target.value)}
                                placeholder="Description de la dépense"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="expenseAmount" className="block text-sm font-medium text-gray-700">Montant (€)</label>
                            <input
                                type="number"
                                id="expenseAmount"
                                value={newExpenseAmount}
                                onChange={(e) => setNewExpenseAmount(e.target.value)}
                                step="0.01"
                                min="0"
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="expenseCategory" className="block text-sm font-medium text-gray-700">Catégorie</label>
                            <select
                                id="expenseCategory"
                                value={newExpenseCategory}
                                onChange={(e) => setNewExpenseCategory(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            >
                                <option value="">Sélectionner une catégorie</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expenseUnit" className="block text-sm font-medium text-gray-700">Unité Commerciale</label>
                            <select
                                id="expenseUnit"
                                value={newExpenseUnit}
                                onChange={(e) => setNewExpenseUnit(e.target.value)}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            >
                                <option value="cuisine">Cuisine</option>
                                <option value="courtage">Courtage</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expenseDemandId" className="block text-sm font-medium text-gray-700">ID Demande (optionnel)</label>
                            <input
                                type="text"
                                id="expenseDemandId"
                                value={newExpenseDemandId}
                                onChange={(e) => setNewExpenseDemandId(e.target.value)}
                                placeholder="UUID de la demande"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 w-full"
                            >
                                {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                Ajouter la dépense
                            </button>
                        </div>
                    </form>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Filtrer les dépenses</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="filterCategory" className="block text-sm font-medium text-gray-700">Catégorie</label>
                            <select
                                id="filterCategory"
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            >
                                <option value="">Toutes les catégories</option>
                                {expenseCategories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filterStartDate" className="block text-sm font-medium text-gray-700">Date de début</label>
                            <input
                                type="date"
                                id="filterStartDate"
                                value={filterStartDate}
                                onChange={(e) => setFilterStartDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="filterEndDate" className="block text-sm font-medium text-gray-700">Date de fin</label>
                            <input
                                type="date"
                                id="filterEndDate"
                                value={filterEndDate}
                                onChange={(e) => setFilterEndDate(e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                            />
                        </div>
                    </div>
                </div>

                {/* Expenses List */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Liste des dépenses</h2>
                    {loading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                            <p className="ml-3 text-gray-600">Chargement des dépenses...</p>
                        </div>
                    ) : expenses.length === 0 ? (
                        <p className="text-gray-600 text-center py-8">Aucune dépense trouvée pour les filtres appliqués.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catégorie</th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.expense_date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.description}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{expense.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{parseFloat(expense.amount).toFixed(2)}€</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                {/* <button className="text-amber-600 hover:text-amber-900 mr-3">
                                                    <Edit className="h-5 w-5" />
                                                </button> */}
                                                <button onClick={() => handleDeleteExpense(expense.id)} className="text-red-600 hover:text-red-900">
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

export default Depenses;