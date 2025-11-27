import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import DemandeDetail from '../DemandeDetail'; 
import ReactPaginate from 'react-paginate';

const APreparer = () => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const fetchDemandes = useCallback(async () => {
        setLoading(true);
        
        const toPrepareStatuses = ['En attente de préparation', 'Préparation en cours'];
        
        let query = supabase
            .from('demandes')
            .select(`*, clients (*), entreprises (*)`)
            .in('status', toPrepareStatuses);

        if (searchTerm) {
            query = query.or(`details_json->>formulaName.ilike.%${searchTerm}%,clients.first_name.ilike.%${searchTerm}%,clients.last_name.ilike.%${searchTerm}%,entreprises.nom_entreprise.ilike.%${searchTerm}%`);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching demandes to prepare:', error);
        } else {
            setDemandes(data);
        }
        setLoading(false);
    }, [searchTerm]);

    useEffect(() => {
        fetchDemandes();
        const channel = supabase.channel('demandes-a-preparer-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'demandes' }, fetchDemandes)
            .subscribe();
        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchDemandes]);

    const handlePageClick = (event) => {
        setCurrentPage(event.selected);
    };

    const offset = currentPage * itemsPerPage;
    const currentDemandes = demandes.slice(offset, offset + itemsPerPage);
    const pageCount = Math.ceil(demandes.length / itemsPerPage);

    const handleUpdateStatus = async (id, newStatus) => {
        const { error } = await supabase.from('demandes').update({ status: newStatus }).eq('id', id);
        if (error) console.error('Error updating status:', error);
        else fetchDemandes();
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Commandes à Préparer</h1>
            <p>Liste des commandes à préparer ou en cours de préparation.</p>

            <input 
                type="text"
                placeholder="Rechercher par nom, formule..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '10px', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            {/* ... Table display ... */}
            
            {selectedDemande && (
                <DemandeDetail
                    demande={selectedDemande}
                    onClose={() => setSelectedDemande(null)}
                    onUpdateStatus={handleUpdateStatus}
                    onRefresh={fetchDemandes}
                />
            )}
        </div>
    );
};

export default APreparer;
