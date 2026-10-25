'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FiLock, FiMail, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import PWAInstallBanner from './components/PWAInstallBanner';

export default function HomePage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [serverError, setServerError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setServerError('');
        const loadingToast = toast.loading('Verifying credentials...');

        // Server outdated error simulation as requested
        setTimeout(() => {
            setLoading(false);
            setServerError('Server outdated error');
            toast.error('Server outdated error', { id: loadingToast });
        }, 700);
    };

    return (
        <>
            <PWAInstallBanner />
            <div className="min-h-screen w-full bg-slate-50 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-sky-200">
                {/* Minimal Professional Background Grid & Ambient Lighting */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(56,189,248,0.15),rgba(255,255,255,0))]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

                {/* Main Card Container */}
                <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
                    <div className="w-full max-w-[420px] bg-white rounded-[32px] sm:rounded-[36px] border border-slate-200/80 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)] p-8 sm:p-10 transition-all duration-300">
                        {/* Centered Brand Header */}
                        <div className="flex flex-col items-center justify-center text-center mb-7 sm:mb-8">
                            <div className="relative mb-4 group">
                                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[24px] bg-white p-2 shadow-[0_10px_30px_-5px_rgba(14,116,144,0.12)] border border-slate-100/90 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_15px_35px_-5px_rgba(14,116,144,0.2)]">
                                    <img
                                        src="/bosphorus logo.jpg"
                                        alt="Bosphorus International"
                                        className="w-full h-full object-contain rounded-xl"
                                    />
                                </div>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
                                Bosphorus International
                            </h1>
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-[0.18em] mt-1.5">
                                Student Management System
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-4">
                            {/* Email Field */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-600 transition-colors">
                                    <FiMail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email"
                                    className="w-full pl-11 pr-4 py-3.5 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400 transition-all"
                                />
                            </div>

                            {/* Password Field */}
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-slate-600 transition-colors">
                                    <FiLock size={18} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="w-full pl-11 pr-11 py-3.5 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                                </button>
                            </div>

                            {serverError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center animate-shake">
                                    <p className="text-xs font-semibold text-red-600">
                                        {serverError}
                                    </p>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 bg-[#18181b] hover:bg-black text-white font-semibold rounded-2xl shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center text-sm mt-3"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    'Login'
                                )}
                            </button>
                        </form>
                    </div>
                </main>

                {/* Footer padding spacer */}
                <footer className="relative z-10 p-4 text-center text-[11px] text-slate-400 font-normal">
                    © Bosphorus International. All rights reserved.
                </footer>
            </div>
        </>
    );
}


