import React from 'react';
import ProductionCalendar from '../components/ProductionCalendar';
import { useBusinessUnit } from '../BusinessUnitContext';
import { Calendar } from 'lucide-react';

const Planning = () => {
    const { businessUnit } = useBusinessUnit();

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                        <Calendar size={32} className="text-amber-500" />
                        Planning de Production
                    </h1>
                    <p className="text-gray-500 font-medium italic mt-1">Gérez vos prestations et organisez vos tournées de livraison.</p>
                </header>

                <div className="animate-in fade-in duration-700">
                    <ProductionCalendar businessUnit={businessUnit} />
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <h3 className="text-blue-800 font-black text-xs uppercase tracking-widest mb-2">Chef à Domicile</h3>
                        <p className="text-blue-600/80 text-sm leading-relaxed">Vérifiez les heures pour préparer votre matériel et vos ingrédients frais.</p>
                    </div>
                    <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                        <h3 className="text-green-800 font-black text-xs uppercase tracking-widest mb-2">Livraisons</h3>
                        <p className="text-green-600/80 text-sm leading-relaxed">Groupez vos commandes par zone pour optimiser vos trajets.</p>
                    </div>
                    <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                        <h3 className="text-amber-800 font-black text-xs uppercase tracking-widest mb-2">Atelier</h3>
                        <p className="text-amber-600/80 text-sm leading-relaxed">Anticipez les grosses journées de préparation pour rester serein.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Planning;
