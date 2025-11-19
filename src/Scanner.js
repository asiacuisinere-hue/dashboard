import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';
import DemandeDetail from './DemandeDetail'; // Réutilisation de la modale de détail

const qrcodeRegionId = 'html5qrcode-scanner';

const Scanner = () => {
    const [decodedResult, setDecodedResult] = useState('');
    const [scanError, setScanError] = useState('');
    const [scannedDemande, setScannedDemande] = useState(null);
    const [scanAttempted, setScanAttempted] = useState(false);
    const html5QrcodeScannerRef = useRef(null);

    const onScanSuccess = useCallback((decodedText, decodedResult) => {
        // Stop scanning to prevent multiple scans
        if (html5QrcodeScannerRef.current) {
            html5QrcodeScannerRef.current.clear().catch(error => {
                console.error('Failed to clear html5QrcodeScanner', error);
            });
            html5QrcodeScannerRef.current = null; // Mark as cleared
        }
        
        setDecodedResult(decodedText);
        setScanError('');
        setScanAttempted(true);
        console.log(`Scan result: ${decodedText}`, decodedResult);
        fetchDemandeDetails(decodedText);
    }, []);

    const onScanFailure = (error) => {
        if (!scanAttempted) { // Only log if no successful scan has been attempted
            console.warn(`QR Code scan error = ${error}`);
            setScanError('Impossible de lire le code QR. Assurez-vous qu\'il est bien éclairé et visible.');
        }
    };

    const fetchDemandeDetails = useCallback(async (qrCodeData) => {
        setScanError('');
        setScannedDemande(null);

        // Expected format: demandeId|deliveryDate (YYYY-MM-DD)
        const parts = qrCodeData.split('|');
        if (parts.length !== 2) {
            setScanError('Format du code QR invalide. Attendu: "ID_DEMANDE|DATE_LIVRAISON".');
            return;
        }

        const demandeId = parts[0];
        const deliveryDateStr = parts[1];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const scanDate = new Date(deliveryDateStr);
        scanDate.setHours(0, 0, 0, 0);

        if (scanDate.getTime() !== today.getTime()) {
            setScanError(`Ce code QR n'est pas valide pour aujourd'hui (${today.toLocaleDateString()}). Date attendue: ${scanDate.toLocaleDateString()}.`);
            return;
        }

        const { data, error } = await supabase
            .from('demandes')
            .select(
                `*,
                clients (*),
                entreprises (*)`
            )
            .eq('id', demandeId)
            .single();

        if (error) {
            console.error('Error fetching demande:', error);
            setScanError(`Erreur lors de la récupération de la demande: ${error.message}. ID: ${demandeId}`);
        } else if (!data) {
            setScanError(`Aucune demande trouvée pour l'ID: ${demandeId}.`);
        } else {
            setScannedDemande(data);
            setScanError('');
        }
    }, []);

    const updateDemandeStatus = async (newStatus) => {
        if (!scannedDemande) return;

        if (!window.confirm(`Confirmer le changement de statut de la demande ${scannedDemande.id.substring(0, 8)} à "${newStatus}" ?`)) {
            return;
        }

        const { error } = await supabase
            .from('demandes')
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', scannedDemande.id);

        if (error) {
            alert(`Erreur lors de la mise à jour du statut : ${error.message}`);
        } else {
            alert(`Statut de la demande ${scannedDemande.id.substring(0, 8)} mis à jour à "${newStatus}".`);
            setScannedDemande(prev => ({ ...prev, status: newStatus })); // Update local state
            // No need to restart scanner, user will click rescan if needed
        }
    };

    const startScanner = useCallback(() => {
        setDecodedResult('');
        setScanError('');
        setScannedDemande(null);
        setScanAttempted(false); // Reset scan attempted flag

        if (!html5QrcodeScannerRef.current) {
            const html5QrcodeScanner = new Html5QrcodeScanner(
                qrcodeRegionId, { fps: 10, qrbox: { width: 250, height: 250 } }, false
            );
            html5QrcodeScannerRef.current = html5QrcodeScanner; // Store ref
            html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        } else {
             // If scanner already initialized and cleared, just re-render
             html5QrcodeScannerRef.current.render(onScanSuccess, onScanFailure);
        }
    }, [onScanSuccess, onScanFailure]);


    useEffect(() => {
        startScanner();

        return () => {
            if (html5QrcodeScannerRef.current) {
                html5QrcodeScannerRef.current.clear().catch(error => {
                    console.error('Failed to clear html5QrcodeScanner on unmount', error);
                });
            }
        };
    }, [startScanner]);


    return (
        <div style={containerStyle}>
            <h1>Scanner de QR Code</h1>

            <div style={scannerSectionStyle}>
                <div id={qrcodeRegionId} style={scannerAreaStyle} />
                {scanError && <p style={errorMessageStyle}>{scanError}</p>}
                {(scannedDemande || scanError) && (
                    <button onClick={startScanner} style={rescanButtonStyle}>
                        Re-scanner un nouveau QR Code
                    </button>
                )}
            </div>

            {scannedDemande && (
                <div style={detailsSectionStyle}>
                    <h2>Détails de la Demande</h2>
                    <DemandeDetail
                        demande={scannedDemande}
                        onClose={() => setScannedDemande(null)} // Not used directly, but passed
                        onUpdate={() => { /* No direct update here, status handled below */ }}
                    />
                    
                    <div style={actionButtonsStyle}>
                        {scannedDemande.status === 'En attente de préparation' && (
                            <button onClick={() => updateDemandeStatus('Préparation en cours')} style={{...actionButtonStyle, backgroundColor: '#20c997'}}>Mettre en préparation</button>
                        )}
                        {scannedDemande.status === 'Préparation en cours' && (
                            <button onClick={() => updateDemandeStatus('Confirmée')} style={actionButtonStyle}>Marquer comme Livrée/Retirée</button>
                        )}
                        {['Confirmée', 'Refusée', 'Annulée'].includes(scannedDemande.status) && (
                            <button onClick={() => updateDemandeStatus('Archivée')} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Archiver la demande</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Styles ---
const containerStyle = {
    padding: '20px',
    maxWidth: '900px',
    margin: '0 auto',
};

const scannerSectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginBottom: '30px',
    textAlign: 'center',
};

const scannerAreaStyle = {
    width: '100%',
    maxWidth: '500px',
    margin: '0 auto',
    marginBottom: '20px',
};

const errorMessageStyle = {
    color: '#dc3545',
    marginTop: '10px',
    fontWeight: 'bold',
};

const rescanButtonStyle = {
    padding: '10px 15px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    marginTop: '20px',
};

const detailsSectionStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
    marginTop: '30px',
};

const actionButtonsStyle = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
};

const actionButtonStyle = {
    padding: '10px 15px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold',
};

export default Scanner;
