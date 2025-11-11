import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';

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

const successStyle = {
    ...resultContainerStyle,
    backgroundColor: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb'
};

const errorStyle = {
    ...resultContainerStyle,
    backgroundColor: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb'
};

const Scanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [scanError, setScanError] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            'qr-reader', 
            { 
                qrbox: {
                    width: 250,
                    height: 250,
                },
                fps: 10,
            },
            false // verbose
        );

        const onScanSuccess = async (decodedText, decodedResult) => {
            scanner.clear();
            setProcessing(true);
            setScanError(null);
            setScanResult(null);

            try {
                const url = new URL(decodedText);
                const params = url.searchParams;
                const demandeId = params.get('id');
                const qrDate = params.get('date');

                if (!demandeId || !qrDate) {
                    throw new Error("QR code invalide (informations manquantes).");
                }

                // Validation de la date
                const today = new Date().toISOString().split('T')[0];
                if (qrDate !== today) {
                    throw new Error(`Date du QR code (${qrDate}) ne correspond pas à la date du jour (${today}). Commande non validée.`);
                }

                // Mise à jour du statut dans Supabase
                const { data, error } = await supabase
                    .from('demandes')
                    .update({ status: 'Confirmée' })
                    .eq('id', demandeId)
                    .select()
                    .single();

                if (error) {
                    throw new Error(error.message);
                }

                setScanResult(`Commande #${data.id} marquée comme "Confirmée" avec succès !`);

            } catch (err) {
                setScanError(err.message);
            } finally {
                setProcessing(false);
            }
        };

        const onScanFailure = (error) => {
            // Ne rien faire, pour éviter de spammer la console
        };

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear scanner on unmount.", error);
            });
        };
    }, []);

    return (
        <div>
            <h1>Scanner le QR Code de livraison</h1>
            <div id="qr-reader" style={scannerContainerStyle}></div>
            {processing && <p style={{textAlign: 'center'}}>Traitement en cours...</p>}
            {scanError && <div style={errorStyle}><strong>Erreur :</strong> {scanError}</div>}
            {scanResult && <div style={successStyle}>{scanResult}</div>}
        </div>
    );
};

export default Scanner;
