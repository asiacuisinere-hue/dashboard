import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';
import { 
    Camera, CheckCircle2, AlertCircle, RefreshCw, 
    ChevronLeft, PackageCheck, User, Building2, Calendar
} from 'lucide-react';

const qrcodeRegionId = 'html5qrcode-scanner-view';

const Scanner = () => {
    const [scanError, setScanError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [scanningData, setScanningData] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const scannerRef = useRef(null);
    const lastScannedCode = useRef(null);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const clearMessages = () => {
        setScanError('');
        setSuccessMessage('');
        setScanningData(null);
    };

    const processScan = useCallback(async (qrCodeData) => {
        clearMessages();
        let demandeId = null;
        let deliveryDateStr = null;

        try {
            if (qrCodeData.includes('asiacuisine.re/suivi')) {
                const url = new URL(qrCodeData);
                demandeId = url.searchParams.get('id');
                deliveryDateStr = url.searchParams.get('date');
            } else {
                const parts = qrCodeData.split('|');
                if (parts.length === 2) {
                    demandeId = parts[0];
                    deliveryDateStr = parts[1];
                }
            }

            if (!demandeId || !deliveryDateStr) throw new Error("Format QR non reconnu.");

            const today = new Date(); today.setHours(0,0,0,0);
            const scanDate = new Date(deliveryDateStr); scanDate.setHours(0,0,0,0);

            if (scanDate.getTime() !== today.getTime()) {
                throw new Error(`Code valide uniquement pour le ${scanDate.toLocaleDateString('fr-FR')}.`);
            }

            const { data: currentDemande, error: fetchError } = await supabase
                .from('demandes')
                .select('status, clients(last_name, first_name), entreprises(nom_entreprise)')
                .eq('id', demandeId)
                .single();

            if (fetchError || !currentDemande) throw new Error(`Commande introuvable.`);

            const clientName = currentDemande.clients ? `${currentDemande.clients.first_name} ${currentDemande.clients.last_name}` : currentDemande.entreprises?.nom_entreprise;
            setScanningData({ name: clientName, type: currentDemande.clients ? 'P' : 'E' });

            if (currentDemande.status === 'completed') {
                setSuccessMessage(`Livraison déjà validée pour ${clientName}.`);
            } else {
                const { error: updateError } = await supabase.from('demandes').update({ status: 'completed' }).eq('id', demandeId);
                if (updateError) throw new Error(updateError.message);
                setSuccessMessage(`Commande validée avec succès !`);
            }

        } catch (e) { setScanError(e.message); }
        finally {
            if(timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(clearMessages, 5000);
        }
    }, []);

    const onScanSuccess = useCallback((decodedText) => {
        if (decodedText === lastScannedCode.current) return;
        lastScannedCode.current = decodedText;
        setTimeout(() => { lastScannedCode.current = null; }, 3000);
        processScan(decodedText);
    }, [processScan]);

    useEffect(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                qrcodeRegionId,
                {
                    fps: 10,
                    qrbox: isMobile ? { width: 280, height: 280 } : { width: 300, height: 300 },
                    supportedScanTypes: [],
                    rememberLastUsedCamera: true,
                    aspectRatio: 1.0
                },
                false
            );
            scanner.render(onScanSuccess, () => {});
            scannerRef.current = scanner;
        }
        return () => {
            if (scannerRef.current && scannerRef.current.getState() !== 1) {
                scannerRef.current.clear().catch(() => {});
                scannerRef.current = null;
            }
            if(timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [onScanSuccess, isMobile]);

    return (
        <div className={`min-h-screen ${isMobile ? 'bg-black' : 'bg-gray-50 p-6 font-sans'}`}>
            <div className={`max-w-xl mx-auto ${isMobile ? 'h-screen flex flex-col' : ''}`}>
                
                {!isMobile && (
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                                    <Camera size={28} />
                                </div>
                                Scanner de Livraison
                            </h1>
                            <p className="text-gray-500 font-medium mt-2">Validez instantanément les commandes clients.</p>
                        </div>
                    </div>
                )}

                <div className={`relative overflow-hidden ${isMobile ? 'flex-1 flex flex-col' : 'bg-white rounded-[3rem] shadow-xl border border-gray-100 p-8'}`}>
                    
                    {/* ZONE CAMERA */}
                    <div className={`relative rounded-[2.5rem] overflow-hidden bg-black ${isMobile ? 'flex-1' : 'aspect-square border-4 border-gray-50 shadow-inner'}`}>
                        <div id={qrcodeRegionId} className="w-full h-full" />
                        
                        {/* Overlay mobile */}
                        {isMobile && (
                            <div className="absolute top-8 left-0 w-full px-6 flex justify-between items-center z-10">
                                <button onClick={() => window.history.back()} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white">
                                    <ChevronLeft size={24} />
                                </button>
                                <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-2xl text-white text-xs font-black uppercase tracking-widest border border-white/10">
                                    Prêt à scanner
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FEEDBACK AREA */}
                    <div className={`${isMobile ? 'p-8 bg-black' : 'mt-8 min-h-[120px] flex flex-col justify-center'}`}>
                        {successMessage ? (
                            <div className="bg-green-500 text-white p-6 rounded-3xl animate-in zoom-in duration-300 shadow-lg shadow-green-900/20">
                                <div className="flex items-center gap-4 mb-2">
                                    <CheckCircle2 size={32} />
                                    <span className="font-black text-lg uppercase tracking-tight">Validé</span>
                                </div>
                                {scanningData && (
                                    <p className="text-green-50 font-bold flex items-center gap-2">
                                        {scanningData.type === 'P' ? <User size={14}/> : <Building2 size={14}/>}
                                        {scanningData.name}
                                    </p>
                                )}
                                <p className="text-green-100 text-xs mt-2 font-medium">{successMessage}</p>
                            </div>
                        ) : scanError ? (
                            <div className="bg-red-500 text-white p-6 rounded-3xl animate-in zoom-in duration-300 shadow-lg shadow-red-900/20">
                                <div className="flex items-center gap-4 mb-2">
                                    <AlertCircle size={32} />
                                    <span className="font-black text-lg uppercase tracking-tight">Erreur</span>
                                </div>
                                <p className="text-red-50 font-bold leading-tight">{scanError}</p>
                            </div>
                        ) : (
                            <div className={`text-center space-y-2 animate-pulse ${isMobile ? 'text-white/40' : 'text-gray-300'}`}>
                                <div className="flex justify-center mb-4">
                                    <RefreshCw size={32} className="animate-spin duration-[3s]" />
                                </div>
                                <p className="font-black text-xs uppercase tracking-[0.2em]">En attente d'un code QR</p>
                                <p className="text-[10px] opacity-60">Placez le code au centre du viseur</p>
                            </div>
                        )}
                    </div>
                </div>

                {!isMobile && (
                    <div className="mt-10 grid grid-cols-3 gap-4 text-center">
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <Calendar className="mx-auto text-amber-500 mb-2" size={20}/>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Aujourd'hui</p>
                            <p className="text-xs font-black text-gray-700">{new Date().toLocaleDateString('fr-FR')}</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <PackageCheck className="mx-auto text-green-500 mb-2" size={20}/>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Actions</p>
                            <p className="text-xs font-black text-gray-700">Scan & Validation</p>
                        </div>
                        <div className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                            <CheckCircle2 className="mx-auto text-blue-500 mb-2" size={20}/>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Statut</p>
                            <p className="text-xs font-black text-gray-700">Temps Réel</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Scanner;
