import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { MapPin, Navigation, Square, AlertTriangle } from 'lucide-react';

const DeliveryTracker = () => {
    const [isActive, setIsActive] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [error, setError] = useState(null);
    const watchIdRef = useRef(null);

    const startTracking = () => {
        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée par votre appareil.");
            return;
        }

        setIsActive(true);
        setError(null);

        watchIdRef.current = navigator.geolocation.watchPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                try {
                    const { error: upsertError } = await supabase
                        .from('delivery_tracks')
                        .upsert({
                            id: 'chef-main-track', 
                            latitude,
                            longitude,
                            updated_at: new Date().toISOString(),
                            is_active: true
                        });

                    if (upsertError) throw upsertError;
                    setLastUpdate(new Date().toLocaleTimeString());
                } catch (err) {
                    console.error("Error updating location:", err);
                }
            },
            (err) => {
                setError(`Erreur GPS: ${err.message}`);
                setIsActive(false);
            },
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    };

    const stopTracking = async () => {
        if (watchIdRef.current) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }

        setIsActive(false);
        try {
            await supabase
                .from('delivery_tracks')
                .update({ is_active: false })
                .eq('id', 'chef-main-track');
        } catch (err) {
            console.error("Error stopping track:", err);
        }
    };

    useEffect(() => {
        return () => {
            if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    return (
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 animate-in slide-in-from-bottom-10 duration-500">
            <div className={`p-2 md:p-4 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl border-2 flex items-center gap-2 md:gap-4 transition-all ${isActive ? 'bg-green-600 border-green-400 text-white min-w-[200px] md:min-w-[300px]' : 'bg-white border-gray-100 text-gray-800'}`}>
                
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-100'}`}>
                    {isActive ? <Navigation size={20} /> : <MapPin size={20} className="text-gray-400" />}
                </div>

                {/* Desktop and Tablet: Always show text. Mobile: Show only if active */}
                <div className={`flex-1 ${!isActive ? 'hidden md:block' : 'block'}`}>
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-70">Suivi Livraison</p>
                    <h4 className="text-xs md:text-sm font-black leading-none uppercase">
                        {isActive ? 'TOURNÉE EN COURS' : 'PRÊT À LIVRER ?'}
                    </h4>
                    {isActive && lastUpdate && <p className="text-[8px] md:text-[9px] font-bold mt-1 opacity-80">Mis à jour à {lastUpdate}</p>}
                    {error && <p className="text-[8px] md:text-[9px] font-bold mt-1 text-red-200 flex items-center gap-1"><AlertTriangle size={10}/> {error}</p>}
                </div>

                <button
                    onClick={isActive ? stopTracking : startTracking}
                    className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all active:scale-95 ${isActive ? 'bg-white text-green-600 hover:bg-green-50' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                >
                    {isActive ? <Square size={18}  fill="currentColor" /> : <Navigation size={18}  />}
                </button>
            </div>
        </div>
    );
};

export default DeliveryTracker;
