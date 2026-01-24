import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';

const qrcodeRegionId = 'html5qrcode-scanner-view';

const Scanner = () => {
    const [scanError, setScanError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
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
    };

    const processScan = useCallback(async (qrCodeData) => {
        clearMessages();
        let demandeId = null;
        let deliveryDateStr = null;

        try {
            // 1. Parse QR Code data (URL or pipe format)
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

            if (!demandeId || !deliveryDateStr) {
                throw new Error("Format du QR Code non reconnu.");
            }

            // 2. Validate Date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const scanDate = new Date(deliveryDateStr);
            scanDate.setHours(0, 0, 0, 0);

            if (scanDate.getTime() !== today.getTime()) {
                throw new Error(`Code QR non valide pour aujourd'hui (${today.toLocaleDateString('fr-FR')}).`);
            }
            
            // 3. Fetch demand to check current status BEFORE updating
            const { data: currentDemande, error: fetchError } = await supabase
                .from('demandes')
                .select('status, clients(last_name), entreprises(nom_entreprise)')
                .eq('id', demandeId)
                .single();

            if (fetchError || !currentDemande) {
                throw new Error(fetchError?.message || `Demande non trouvée.`);
            }

            // 4. Check status and provide feedback or update
            if (currentDemande.status === 'completed') {
                const clientName = currentDemande.clients?.last_name || currentDemande.entreprises?.nom_entreprise || 'Inconnu';
                setSuccessMessage(`Commande pour ${clientName} déjà validée.`);
            } else {
                const { error: updateError } = await supabase
                    .from('demandes')
                    .update({ status: 'completed' })
                    .eq('id', demandeId);

                if (updateError) {
                    throw new Error(updateError.message);
                }
                
                const clientName = currentDemande.clients?.last_name || currentDemande.entreprises?.nom_entreprise || 'Inconnu';
                setSuccessMessage(`Commande pour ${clientName} validée avec succès !`);
            }

        } catch (e) {
            setScanError(e.message);
        } finally {
            if(timeoutRef.current) clearTimeout(timeoutRef.current);
            timeoutRef.current = setTimeout(clearMessages, 4000);
        }
    }, []);

    const onScanSuccess = useCallback((decodedText) => {
        if (decodedText === lastScannedCode.current) {
            return; // Already processed this code within the cooldown period
        }
        lastScannedCode.current = decodedText;
        setTimeout(() => { lastScannedCode.current = null; }, 3000); // 3-second cooldown

        console.log(`Scan result: ${decodedText}`);
        processScan(decodedText);
    }, [processScan]);

    const onScanFailure = useCallback((error) => {
        // This can be noisy, so we don't display continuous errors
    }, []);

    useEffect(() => {
        if (!scannerRef.current) {
            const scanner = new Html5QrcodeScanner(
                qrcodeRegionId, 
                { 
                    fps: 10, 
                    qrbox: isMobile ? { width: 300, height: 300 } : { width: 250, height: 250 }, 
                    supportedScanTypes: [] 
                }, 
                false
            );
            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;
        }

        return () => {
            if (scannerRef.current && scannerRef.current.getState() !== 1) { // 1 is NOT_STARTED state
                scannerRef.current.clear().catch(error => {
                    console.error('Failed to clear html5QrcodeScanner on unmount', error);
                });
                scannerRef.current = null;
            }
            if(timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [onScanSuccess, onScanFailure, isMobile]);

    return (
        <div style={isMobile ? mobileContainerStyle : containerStyle}>
            {!isMobile && (
                <>
                    <h1>Validation des Commandes</h1>
                    <p>Scannez le QR code pour valider la livraison ou le retrait d'une commande.</p>
                </>
            )}

            <div style={isMobile ? mobileScannerSectionStyle : scannerSectionStyle}>
                <div id={qrcodeRegionId} style={isMobile ? mobileScannerAreaStyle : scannerAreaStyle} />
                
                {successMessage && <p style={successMessageStyle}>{successMessage}</p>}
                {scanError && <p style={errorMessageStyle}>{scanError}</p>}

                {!successMessage && !scanError && <p style={infoMessageStyle}>En attente de scan...</p>}
            </div>
        </div>
    );
};

// --- Styles ---
const containerStyle = { padding: '20px', maxWidth: '900px', margin: '0 auto' };
const mobileContainerStyle = { padding: '0', maxWidth: '100%', height: '100vh', display: 'flex', flexDirection: 'column' };

const scannerSectionStyle = { background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'center' };
const mobileScannerSectionStyle = { background: '#000', padding: '0', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' };

const scannerAreaStyle = { width: '100%', maxWidth: '400px', margin: '0 auto', marginBottom: '20px' };
const mobileScannerAreaStyle = { width: '100%', height: '100%', margin: '0' };

const messageStyle = { marginTop: '20px', fontWeight: 'bold', fontSize: '1.1em', padding: '10px', borderRadius: '5px' };
const errorMessageStyle = { ...messageStyle, color: '#721c24', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', margin: '10px' };
const successMessageStyle = { ...messageStyle, color: '#155724', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', margin: '10px' };
const infoMessageStyle = { ...messageStyle, color: '#fff', backgroundColor: 'transparent', border: 'none', margin: '10px' };

export default Scanner;