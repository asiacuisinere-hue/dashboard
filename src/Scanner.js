import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from './supabaseClient';

const Scanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const scanner = new Html5QrcodeScanner('reader', {
            qrbox: {
                width: 250,
                height: 250,
            },
            fps: 5,
        });

        const onScanSuccess = (decodedText, decodedResult) => {
            scanner.clear();
            setScanResult(decodedText);
        };

        const onScanError = (error) => {
            // console.warn(error);
        };

        scanner.render(onScanSuccess, onScanError);

        return () => {
            scanner.clear().catch(error => {
                console.error("Failed to clear html5-qrcode-scanner.", error);
            });
        };
    }, []);

    useEffect(() => {
        if (scanResult) {
            const url = new URL(scanResult);
            const demandId = url.searchParams.get('id');

            if (demandId) {
                updateOrderStatus(demandId);
            } else {
                setMessage('QR code invalide.');
            }
        }
    }, [scanResult]);

    const updateOrderStatus = async (demandId) => {
        try {
            const { data, error } = await supabase
                .from('demandes')
                .update({ status: 'Terminée' })
                .eq('id', demandId)
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                setMessage(`Statut de la commande ${demandId} mis à jour à "Terminée".`);
            } else {
                setMessage(`Commande ${demandId} non trouvée.`);
            }
        } catch (error) {
            setMessage(`Erreur lors de la mise à jour : ${error.message}`);
        }
    };

    return (
        <div>
            <h2>Scanner un QR Code</h2>
            <div id="reader" style={{ width: '500px' }}></div>
            {message && <p>{message}</p>}
        </div>
    );
};

export default Scanner;
