import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const scannerContainerStyle = {
    width: '100%',
    maxWidth: '500px',
    margin: '2rem auto',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1rem',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};

const resultContainerStyle = {
    marginTop: '1rem',
    padding: '1rem',
    borderRadius: '8px',
    textAlign: 'center'
};

const successStyle = { ...resultContainerStyle, backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' };
const errorStyle = { ...resultContainerStyle, backgroundColor: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb' };

const scanAgainButtonStyle = {
    display: 'block',
    margin: '20px auto',
    padding: '12px 20px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#d4af37',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
};

const Scanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [showScanner, setShowScanner] = useState(true);

    useEffect(() => {
        if (!showScanner) return;

        const scanner = new Html5QrcodeScanner(
            'qr-reader', 
            { qrbox: { width: 250, height: 250 }, fps: 10 },
            false // verbose
        );

        const onScanSuccess = async (decodedText, decodedResult) => {
            setShowScanner(false);
            scanner.clear();

            try {
                const url = new URL(decodedText);
                const params = url.searchParams;
                const demandeId = params.get('id');
                const qrDate = params.get('date');

                if (!demandeId || !qrDate) {
                    throw new Error("QR code invalide (informations manquantes).");
                }

                const today = new Date().toISOString().split('T')[0];
                if (qrDate !== today) {
                    throw new Error(`Date du QR code (${qrDate}) ne correspond pas à la date du jour (${today}). Commande non validée.`);
                }

                // La logique Supabase a été retirée pour le moment pour se concentrer sur l'UI
                setScanResult(`Scan réussi ! ID: ${demandeId}, Date: ${qrDate}. La mise à jour du statut serait effectuée ici.`);

            } catch (err) {
                setScanError(err.message);
            }
        };

        const onScanFailure = (error) => { /* Ne rien faire */ };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            // S'assure que le scanner est bien nettoyé
            if (scanner && scanner.getState() === 2) { // 2 = SCANNING
                 scanner.clear().catch(err => console.error("Erreur lors du nettoyage du scanner:", err));
            }
        };
    }, [showScanner]);

    const handleScanAgain = () => {
        setScanResult(null);
        setScanError(null);
        setShowScanner(true);
    };

    return (
        <div>
            <h1>Scanner le QR Code de livraison</h1>
            
            {showScanner && <div id="qr-reader" style={scannerContainerStyle}></div>}

            {scanError && (
                <div style={errorStyle}>
                    <strong>Erreur :</strong> {scanError}
                    <button onClick={handleScanAgain} style={scanAgainButtonStyle}>Scanner un autre QR code</button>
                </div>
            )}
            {scanResult && (
                <div style={successStyle}>
                    {scanResult}
                    <button onClick={handleScanAgain} style={scanAgainButtonStyle}>Scanner un autre QR code</button>
                </div>
            )}
        </div>
    );
};

export default Scanner;