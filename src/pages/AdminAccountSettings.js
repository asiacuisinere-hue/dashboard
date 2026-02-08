import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBusinessUnit } from '../BusinessUnitContext';
import { 
    ShieldCheck, Lock, Eye, EyeOff, 
    Save, User, AlertCircle, CheckCircle2, ShieldAlert, Info, RefreshCw
} from 'lucide-react';

const AdminAccountSettings = () => {
    const { businessUnit } = useBusinessUnit();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState({ message: '', type: 'info' });
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const themeColor = businessUnit === 'courtage' ? 'blue' : 'amber';

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        fetchUser();
    }, []);

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setStatus({ message: '', type: '' });

        if (password !== confirmPassword) {
            setStatus({ message: 'Les mots de passe ne correspondent pas.', type: 'error' });
            return;
        }

        if (password.length < 6) {
            setStatus({ message: 'Le mot de passe doit contenir au moins 6 caractères.', type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) {
                setStatus({ message: error.message, type: 'error' });
            } else {
                setStatus({ message: 'Sécurité mise à jour avec succès !', type: 'success' });
                setPassword('');
                setConfirmPassword('');
                setTimeout(() => setStatus({ message: '', type: '' }), 3000);
            }
        } catch (error) {
            setStatus({ message: 'Une erreur inattendue est survenue.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-3xl mx-auto">
                <div className="mb-10 text-center md:text-left">
                    <h1 className="text-3xl font-black text-gray-800 mb-2 flex items-center justify-center md:justify-start gap-3">
                        <div className={`p-3 rounded-2xl bg-${themeColor}-500 text-white shadow-lg shadow-${themeColor}-200`}>
                            <ShieldCheck size={28} />
                        </div>
                        Sécurité du Compte
                    </h1>
                    <p className="text-gray-500 font-medium italic">Gérez vos accès et protégez vos données administrateur.</p>
                </div>

                {status.message && (
                    <div className={`mb-8 p-5 rounded-[1.5rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 shadow-sm border ${
                        status.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-700 border-red-100'
                    }`}>
                        {status.type === 'success' ? <CheckCircle2 /> : <AlertCircle />}
                        <span className="font-bold">{status.message}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-8">
                    {/* SECTION IDENTITÉ */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${themeColor}-50 rounded-bl-full -mr-10 -mt-10 opacity-50`}></div>
                        
                        <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                            <User className={`text-${themeColor}-500`} /> Profil Administrateur
                        </h2>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                            <div className={`w-20 h-20 rounded-3xl bg-${themeColor}-500 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-${themeColor}-200 uppercase`}>
                                {user?.email?.charAt(0)}
                            </div>
                            <div className="text-center md:text-left">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Email de connexion</p>
                                <p className="text-xl font-black text-gray-800">{user ? user.email : 'Chargement...'}</p>
                                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-100">
                                    <ShieldCheck size={12}/> Compte Vérifié
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start">
                            <Info className="text-amber-500 shrink-0" size={24}/>
                            <p className="text-sm text-amber-800 leading-relaxed font-medium">
                                Pour modifier votre adresse e-mail de connexion, veuillez contacter le support technique. Cette action nécessite une validation de sécurité manuelle.
                            </p>
                        </div>
                    </div>

                    {/* SECTION MOT DE PASSE */}
                    <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h2 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
                            <Lock className="text-red-500" /> Authentification
                        </h2>
                        
                        <form onSubmit={handlePasswordUpdate} className="space-y-6">
                            <div className="relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Nouveau Mot de Passe</label>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500 outline-none pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-10 text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="relative">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 block mb-2">Confirmer le Mot de Passe</label>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-0 rounded-2xl font-bold focus:ring-2 focus:ring-amber-500 outline-none pr-12"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-4 top-10 text-gray-300 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            <div className="pt-6">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-gray-800 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3 disabled:bg-gray-200 disabled:text-gray-400 uppercase tracking-widest"
                                >
                                    {loading ? <RefreshCw className="animate-spin" /> : <Save size={22} />}
                                    {loading ? 'Mise à jour...' : 'Sécuriser le compte'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* FOOTER RÉASSURANCE */}
                    <div className="text-center py-8 opacity-30 flex flex-col items-center gap-2 grayscale">
                        <ShieldAlert size={40} className="text-gray-400"/>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Advanced Data Encryption Active</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAccountSettings;