import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { Users, Building2, Search, PlusCircle, User, Edit3, Trash2, Mail, Phone, Briefcase } from 'lucide-react';

const statusBadgeStyle = (type) => {
    return {
        backgroundColor: type === 'Particulier' || type === 'client' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(59, 130, 246, 0.1)',
        color: type === 'Particulier' || type === 'client' ? '#d4af37' : '#3b82f6',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase'
    };
};

const ClientCard = ({ client, type, onEdit, onDelete, themeColor }) => (
    <div className={`bg-white rounded-2xl shadow-sm border-t-4 p-6 mb-4 hover:shadow-md transition-all ${themeColor === 'blue' ? 'border-blue-500' : 'border-amber-500'}`}>
        <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mr-4 ${type === 'client' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {type === 'client' ? <User size={24} /> : <Building2 size={24} />}
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-lg">
                        {type === 'client' ? `${client.last_name || ''} ${client.first_name || ''}`.trim() : (client.nom_entreprise || 'Entreprise')}
                    </h3>
                    <span style={statusBadgeStyle(type === 'client' ? 'Particulier' : 'Entreprise')}>
                        {type === 'client' ? 'Particulier' : 'Entreprise'}
                    </span>
                </div>
            </div>
        </div>

        <div className="space-y-3 mb-6 text-sm text-gray-600">
            <div className="flex items-center">
                <Mail size={14} className="mr-2 opacity-50" />
                <span className="truncate">{type === 'client' ? client.email : client.contact_email}</span>
            </div>
            <div className="flex items-center">
                <Phone size={14} className="mr-2 opacity-50" />
                <span>{type === 'client' ? (client.phone || '—') : (client.contact_phone || '—')}</span>
            </div>
            {type === 'entreprise' && (
                <div className="flex items-center">
                    <Briefcase size={14} className="mr-2 opacity-50" />
                    <span>Contact: {client.contact_name || '—'}</span>
                </div>
            )}
        </div>

        <div className="flex gap-2 border-t pt-4">
            <button onClick={() => onEdit(client)} className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-50 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm">
                <Edit3 size={14} /> Modifier
            </button>
            <button onClick={() => onDelete(client.id)} className="flex items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                <Trash2 size={16} />
            </button>
        </div>
    </div>
);

const Clients = () => {
    const { businessUnit } = useBusinessUnit();
    const [activeTab, setActiveTab] = useState('particuliers');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [data, setData] = useState([]);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({});

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    const fetchData = useCallback(async () => {
        setLoading(true);
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        console.log(`[CLIENTS_FETCH] Fetching from table: ${table}`);
        
        let query = supabase.from(table).select('*');

        if (searchTerm) {
            if (activeTab === 'particuliers') {
                query = query.or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
            } else {
                query = query.or(`nom_entreprise.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`);
            }
        }

        const orderBy = activeTab === 'particuliers' ? 'last_name' : 'nom_entreprise';
        const { data: results, error } = await query.order(orderBy, { ascending: true });

        if (error) {
            console.error('[CLIENTS_FETCH] Error:', error);
        } else {
            console.log(`[CLIENTS_FETCH] Success: ${results?.length || 0} records found`);
            setData(results || []);
        }
        setLoading(false);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenEdit = (item) => {
        let initialData = { ...item };
        if (activeTab === 'particuliers') {
            initialData.fullName = `${item.last_name || ''} ${item.first_name || ''}`.trim();
        }
        console.log('[CLIENTS_UI] Opening Edit for:', item.id, initialData);
        setFormData(initialData);
        setEditId(item.id);
        setIsEditing(true);
    };

    const handleCloseEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({});
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        
        console.log('--- START SAVE PROCESS ---');
        console.log('[DEBUG] Active Tab:', activeTab);
        console.log('[DEBUG] Table:', table);
        console.log('[DEBUG] Edit ID:', editId);
        console.log('[DEBUG] Form Data (Raw):', formData);

        let payload = {};
        if (activeTab === 'particuliers') {
            const fullName = formData.fullName || '';
            const spaceIndex = fullName.indexOf(' ');
            
            let lastName = fullName;
            let firstName = '';

            if (spaceIndex !== -1) {
                lastName = fullName.substring(0, spaceIndex).trim(); 
                firstName = fullName.substring(spaceIndex + 1).trim();
            }

            payload = {
                last_name: lastName, 
                first_name: firstName,
                email: formData.email,
                phone: formData.phone || '',
                address: formData.address || '',
                type: 'client'
            };
        } else {
            payload = {
                nom_entreprise: formData.nom_entreprise,
                siret: formData.siret || '',
                contact_email: formData.contact_email,
                contact_name: formData.contact_name || '',
                contact_phone: formData.contact_phone || ''
            };
        }

        console.log('[DEBUG] Final Payload for Supabase:', payload);

        if (editId) {
            // --- NEW: USE SUPABASE EDGE FUNCTION INSTEAD OF LOCAL API ---
            console.log(`[DEBUG] Executing Supabase Edge Function: update-client`);
            
            try {
                // Call Supabase Edge Function directly
                const { data: edgeResult, error: edgeError } = await supabase.functions.invoke('update-client', {
                    body: {
                        id: editId,
                        table: table,
                        ...payload
                    }
                });

                if (edgeError) {
                    console.error('[CRITICAL] Edge Function Error:', edgeError);
                    alert(`Erreur de sauvegarde (Edge): ${edgeError.message}`);
                    throw edgeError;
                }

                console.log('[DEBUG] Edge Function Success:', edgeResult);
                alert('Mise à jour réussie (via Edge Function) !');
                handleCloseEdit();
                fetchData();

            } catch (err) {
                console.error('[CRITICAL] Save operation failed:', err);
                // Fallback direct if function not deployed (warning)
                console.warn('[DEBUG] Falling back to direct update (might fail due to RLS)...');
                const { error: directError } = await supabase.from(table).update(payload).eq('id', editId);
                if (directError) alert(`Erreur persistante: ${directError.message}`);
                else {
                    alert('Sauvegarde directe réussie (Fallback).');
                    handleCloseEdit();
                    fetchData();
                }
            }

        } else {
            console.log(`[DEBUG] Executing INSERT on ${table}`);
            const { data: insertedData, error, status } = await supabase
                .from(table)
                .insert([payload])
                .select();
            
            console.log('[DEBUG] Supabase response - Status:', status);

            if (error) {
                console.error('[CRITICAL] Supabase Insert Error:', error);
                alert(`Erreur lors de l'ajout: ${error.message}`);
            } else {
                console.log('[DEBUG] Inserted Data returned:', insertedData);
                alert('Ajout réussi !');
                handleCloseEdit();
                fetchData();
            }
        }
        console.log('--- END SAVE PROCESS ---');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Supprimer définitivement ?")) return;
        const table = activeTab === 'particuliers' ? 'clients' : 'entreprises';
        console.log(`[DEBUG] Deleting from ${table} ID: ${id}`);
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (!error) {
            console.log('[DEBUG] Delete success');
            fetchData();
        } else {
            console.error('[DEBUG] Delete error:', error);
            alert(error.message);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">Annuaire Clients</h1>
                        <p className="text-gray-600">Gérez vos contacts particuliers et professionnels.</p>
                    </div>
                    {!isEditing && (
                        <button 
                            onClick={() => setIsEditing(true)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold shadow-lg transition-all active:scale-95 ${themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            <PlusCircle size={20} /> Ajouter
                        </button>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex space-x-1 bg-gray-200 p-1 rounded-xl mb-8 max-w-md">
                        <button
                            onClick={() => setActiveTab('particuliers')}
                            className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'particuliers' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Users size={16} className="mr-2" /> Particuliers
                        </button>
                        <button
                            onClick={() => setActiveTab('entreprises')}
                            className={`flex-1 flex items-center justify-center py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'entreprises' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Building2 size={16} className="mr-2" /> Entreprises
                        </button>
                    </div>
                )}

                {isEditing ? (
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            {editId ? <Edit3 className="mr-2 text-blue-500"/> : <PlusCircle className="mr-2 text-green-500"/>}
                            {editId ? 'Modifier' : 'Nouveau'} {activeTab === 'particuliers' ? 'Particulier' : 'Entreprise'}
                        </h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            {activeTab === 'particuliers' ? (
                                <>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom Complet</label><input required type="text" value={formData.fullName || ''} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full p-3 border rounded-xl" placeholder="Ex: Jean Dupont" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email</label><input required type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Téléphone</label><input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Adresse</label><textarea value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 border rounded-xl h-24" /></div>
                                </>
                            ) : (
                                <>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom Entreprise</label><input required type="text" value={formData.nom_entreprise || ''} onChange={e => setFormData({...formData, nom_entreprise: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">SIRET</label><input type="text" value={formData.siret || ''} onChange={e => setFormData({...formData, siret: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email de contact</label><input required type="email" value={formData.contact_email || ''} onChange={e => setFormData({...formData, contact_email: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom du contact</label><input type="text" value={formData.contact_name || ''} onChange={e => setFormData({...formData, contact_name: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                    <div><label className="block text-xs font-bold text-gray-400 uppercase mb-1">Téléphone contact</label><input type="tel" value={formData.contact_phone || ''} onChange={e => setFormData({...formData, contact_phone: e.target.value})} className="w-full p-3 border rounded-xl" /></div>
                                </>
                            )}
                            <div className="flex gap-3 pt-6">
                                <button type="submit" className="flex-1 bg-gray-800 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-black transition-all">Enregistrer</button>
                                <button type="button" onClick={handleCloseEdit} className="px-8 py-3 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">Annuler</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex items-center">
                            <Search size={18} className="text-gray-400 mr-3 ml-2" />
                            <input 
                                type="text" 
                                placeholder={`Rechercher un ${activeTab === 'particuliers' ? 'client' : 'établissement'}...`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="flex-1 py-2 outline-none text-gray-700"
                            />
                        </div>

                        {loading && data.length === 0 ? (
                            <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div></div>
                        ) : data.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                                <Users size={48} className="mx-auto text-gray-200 mb-4"/>
                                <p className="text-gray-400">Aucun résultat pour cette recherche.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {data.map(item => (
                                    <ClientCard 
                                        key={item.id} 
                                        client={item} 
                                        type={activeTab === 'particuliers' ? 'client' : 'entreprise'} 
                                        onEdit={handleOpenEdit}
                                        onDelete={handleDelete}
                                        themeColor={themeColor}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Clients;
