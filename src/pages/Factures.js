const InvoiceDetailModal = ({ invoice, onClose, onUpdate }) => {
    const [isEnteringDeposit, setIsEnteringDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');

    const handleSaveDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Veuillez entrer un montant d'acompte valide.");
            return;
        }

        const { error } = await supabase
            .from('invoices')
            .update({
                deposit_amount: amount,
                deposit_date: new Date().toISOString(),
                status: 'deposit_paid'
            })
            .eq('id', invoice.id);

        if (error) {
            alert(`Erreur: ${error.message}`);
        } else {
            alert('Acompte enregistré avec succès !');
            onUpdate();
        }
    };
    
    const handleMarkAsPaid = async () => {
        if (!window.confirm("Confirmer le paiement total de la facture ?")) return;
        const { error } = await supabase
            .from('invoices')
            .update({ status: 'paid' })
            .eq('id', invoice.id);

        if (error) alert(`Erreur: ${error.message}`);
        else {
            alert('Facture marquée comme payée.');
            onUpdate();
        }
    };

    const renderCustomerInfo = () => {
        if (invoice.clients) return <p><strong>Nom:</strong> {invoice.clients.last_name} {invoice.clients.first_name}</p>;
        if (invoice.entreprises) return <p><strong>Entreprise:</strong> {invoice.entreprises.nom_entreprise}</p>;
        return <p>Informations client non disponibles.</p>;
    };

    const handleSendInvoice = async () => {
        if (!window.confirm('Confirmer l\'envoi de la facture par email ?')) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Utilisateur non authentifié.");

            const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/send-invoice-by-email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ invoiceId: invoice.id }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erreur lors de l\'envoi de la facture.');
            }

            alert('Facture envoyée avec succès !');
        } catch (error) {
            console.error('Error sending invoice:', error);
            alert(`Erreur: ${error.message}`);
        }
    };

    const remainingBalance = (invoice.total_amount || 0) - (invoice.deposit_amount || 0);

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <button onClick={onClose} style={closeButtonStyle}>&times;</button>
                <h2>Détails Facture #{invoice.document_number || invoice.id.substring(0, 8)}</h2>
                
                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Client / Entreprise</h3>
                    {renderCustomerInfo()}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Informations</h3>
                    <p><strong>Date:</strong> {new Date(invoice.created_at).toLocaleDateString('fr-FR')}</p>
                    <p><strong>Statut:</strong> <span style={statusBadgeStyle(invoice.status)}>{invoice.status}</span></p>
                    <p><strong>Total:</strong> {(invoice.total_amount || 0).toFixed(2)} €</p>
                    {invoice.deposit_amount && <p><strong>Acompte Versé:</strong> {invoice.deposit_amount.toFixed(2)} €</p>}
                    {invoice.status === 'deposit_paid' && <p><strong>Reste à Payer:</strong> {remainingBalance.toFixed(2)} €</p>}
                </div>

                <div style={detailSectionStyle}>
                    <h3 style={detailTitleStyle}>Articles</h3>
                    {(invoice.items && invoice.items.length > 0) ? (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                    <tr>
                                        <th style={thStyle}>Description</th>
                                        <th style={thStyle}>Qté</th>
                                        <th style={thStyle}>Prix U. (€)</th>
                                        <th style={thStyle}>Total (€)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(invoice.items || []).map((item, index) => (
                                        <tr key={index}>
                                            <td style={tdStyle}>{item.name || item.description}</td>
                                            <td style={tdStyle}>{item.quantity || 0}</td>
                                            <td style={tdStyle}>{(item.unit_price || 0).toFixed(2)}</td>
                                            <td style={tdStyle}>{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p>Aucun article détaillé.</p>}
                </div>

                <div style={modalActionsStyle}>
                    <button onClick={handleSendInvoice} style={{ ...actionButtonStyle, backgroundColor: '#17a2b8', marginRight: 'auto' }}>Envoyer par mail</button>
                    {!isEnteringDeposit && (
                        <>
                            {invoice.status === 'pending' && (
                                <button onClick={() => setIsEnteringDeposit(true)} style={{...actionButtonStyle, backgroundColor: '#007bff'}}>Enregistrer un acompte</button>
                            )}
                            {(invoice.status === 'pending' || invoice.status === 'deposit_paid') && (
                                <button onClick={handleMarkAsPaid} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>Marquer comme Payée</button>
                            )}
                        </>
                    )}

                    {isEnteringDeposit && (
                        <div style={{width: '100%', display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <input
                                type="number"
                                placeholder="Montant de l'acompte"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                style={inputStyle}
                                autoFocus
                            />
                            <button onClick={handleSaveDeposit} style={{...actionButtonStyle, backgroundColor: '#28a745'}}>Confirmer</button>
                            <button onClick={() => setIsEnteringDeposit(false)} style={{...actionButtonStyle, backgroundColor: '#6c757d'}}>Annuler</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};