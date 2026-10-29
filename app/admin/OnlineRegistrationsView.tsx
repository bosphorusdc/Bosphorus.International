'use client';

import { useState, useEffect } from 'react';
import { supabase, OnlineRegistration } from '@/lib/supabase';
import { 
    FiPhone, 
    FiCopy, 
    FiCheck, 
    FiUserCheck, 
    FiTrash2, 
    FiRefreshCw, 
    FiSearch, 
    FiClock, 
    FiCalendar, 
    FiAlertCircle,
    FiUser,
    FiMapPin,
    FiAward
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

interface OnlineRegistrationsViewProps {
    onEnrollStudent: (fullName: string, registrationId: string) => void;
    onCountChange?: (pendingCount: number) => void;
}

export default function OnlineRegistrationsView({ onEnrollStudent, onCountChange }: OnlineRegistrationsViewProps) {
    const [registrations, setRegistrations] = useState<OnlineRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'contacted' | 'enrolled' | 'archived'>('all');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchRegistrations();
    }, []);

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('online_registrations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const list = data || [];
            setRegistrations(list);
            
            const pendingCount = list.filter(r => r.status === 'pending').length;
            if (onCountChange) onCountChange(pendingCount);
        } catch (error: any) {
            console.error('Error fetching online registrations:', error);
            toast.error('Failed to load online registrations');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyPhone = (phone: string, id: string) => {
        navigator.clipboard.writeText(phone);
        setCopiedId(id);
        toast.success('Phone number copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleUpdateStatus = async (id: string, newStatus: OnlineRegistration['status']) => {
        try {
            const { error } = await supabase
                .from('online_registrations')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            setRegistrations(prev =>
                prev.map(item => item.id === id ? { ...item, status: newStatus } : item)
            );

            const updatedList = registrations.map(item => item.id === id ? { ...item, status: newStatus } : item);
            const pendingCount = updatedList.filter(r => r.status === 'pending').length;
            if (onCountChange) onCountChange(pendingCount);

            toast.success(`Status updated to ${newStatus}`);
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const openDeleteModal = (id: string, name: string) => {
        setItemToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from('online_registrations')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            toast.success('Registration deleted successfully');
            setRegistrations(prev => prev.filter(item => item.id !== itemToDelete.id));
            setIsDeleteModalOpen(false);
            setItemToDelete(null);

            const updatedList = registrations.filter(item => item.id !== itemToDelete.id);
            const pendingCount = updatedList.filter(r => r.status === 'pending').length;
            if (onCountChange) onCountChange(pendingCount);
        } catch (error: any) {
            console.error('Error deleting registration:', error);
            toast.error('Failed to delete registration');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEnrollClick = (reg: OnlineRegistration) => {
        handleUpdateStatus(reg.id, 'enrolled');
        onEnrollStudent(reg.full_name, reg.id);
    };

    // Filter registrations
    const filteredRegistrations = registrations.filter(item => {
        const matchesSearch = 
            item.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.phone_number.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = registrations.filter(r => r.status === 'pending').length;
    const contactedCount = registrations.filter(r => r.status === 'contacted').length;
    const enrolledCount = registrations.filter(r => r.status === 'enrolled').length;

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Online Registrations
                        {pendingCount > 0 && (
                            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                {pendingCount} New
                            </span>
                        )}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Prospective students registered directly from the Bosphorus Cosmetology School website
                    </p>
                </div>

                <button
                    onClick={fetchRegistrations}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 self-start sm:self-center"
                >
                    <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        statusFilter === 'all' 
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                >
                    <span className="text-xs uppercase tracking-wider block opacity-70">Total</span>
                    <span className="text-2xl font-bold">{registrations.length}</span>
                </button>

                <button
                    onClick={() => setStatusFilter('pending')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        statusFilter === 'pending' 
                            ? 'bg-amber-500 text-white border-amber-500 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-200'
                    }`}
                >
                    <span className="text-xs uppercase tracking-wider block opacity-70">Pending / New</span>
                    <span className="text-2xl font-bold text-amber-600 group-hover:text-amber-700">
                        {statusFilter === 'pending' ? pendingCount : pendingCount}
                    </span>
                </button>

                <button
                    onClick={() => setStatusFilter('contacted')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        statusFilter === 'contacted' 
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-sky-200'
                    }`}
                >
                    <span className="text-xs uppercase tracking-wider block opacity-70">Contacted</span>
                    <span className="text-2xl font-bold text-sky-600">
                        {contactedCount}
                    </span>
                </button>

                <button
                    onClick={() => setStatusFilter('enrolled')}
                    className={`p-4 rounded-xl border text-left transition-all ${
                        statusFilter === 'enrolled' 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-200'
                    }`}
                >
                    <span className="text-xs uppercase tracking-wider block opacity-70">Enrolled</span>
                    <span className="text-2xl font-bold text-emerald-600">
                        {enrolledCount}
                    </span>
                </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <FiSearch className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search applicants by full name or phone number..."
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 shadow-sm transition-colors"
                />
            </div>

            {/* Registrations List */}
            {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading online registrations...</p>
                </div>
            ) : filteredRegistrations.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <FiAlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No registrations found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {searchQuery 
                            ? 'No online registrations matched your search query.' 
                            : 'When students fill out the registration form on the school website, they will appear here.'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                    {filteredRegistrations.map((reg) => {
                        const dateFormatted = new Date(reg.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });

                        return (
                            <div 
                                key={reg.id} 
                                className="p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                            >
                                {/* Left Info */}
                                <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h3 className="text-base font-bold text-slate-900 tracking-tight truncate">
                                            {reg.full_name}
                                        </h3>

                                        {/* VIP vs Regular Badge */}
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            reg.package_tier === 'vip'
                                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                        }`}>
                                            {reg.package_tier === 'vip' ? (
                                                <>
                                                    <FiAward className="w-3 h-3 text-purple-600" />
                                                    <span>VIP Session</span>
                                                </>
                                            ) : (
                                                <span>Regular Session</span>
                                            )}
                                        </span>

                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                                            reg.status === 'pending'
                                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                                : reg.status === 'contacted'
                                                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                                                : reg.status === 'enrolled'
                                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}>
                                            {reg.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                                        {/* Phone Click-to-call */}
                                        <div className="flex items-center gap-1.5">
                                            <a 
                                                href={`tel:${reg.phone_number.replace(/\s+/g, '')}`}
                                                className="font-semibold text-slate-800 hover:text-sky-600 flex items-center gap-1 transition-colors"
                                            >
                                                <FiPhone className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{reg.phone_number}</span>
                                            </a>
                                            <button
                                                type="button"
                                                onClick={() => handleCopyPhone(reg.phone_number, reg.id)}
                                                className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                                                title="Copy phone number"
                                            >
                                                {copiedId === reg.id ? (
                                                    <FiCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                ) : (
                                                    <FiCopy className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>

                                        {/* Location */}
                                        {reg.location && (
                                            <div className="flex items-center gap-1 text-slate-600 font-medium">
                                                <FiMapPin className="w-3.5 h-3.5 text-slate-400" />
                                                <span>{reg.location}</span>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <FiClock className="w-3.5 h-3.5" />
                                            <span>{dateFormatted}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Actions */}
                                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                    {/* Status Selector */}
                                    <select
                                        value={reg.status}
                                        onChange={(e) => handleUpdateStatus(reg.id, e.target.value as OnlineRegistration['status'])}
                                        className="h-9 px-3 text-xs font-semibold rounded-lg bg-slate-100 border border-slate-200 text-slate-700 focus:outline-none focus:border-slate-400 transition-colors"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="enrolled">Enrolled</option>
                                        <option value="archived">Archived</option>
                                    </select>

                                    {/* Enroll as Student Button */}
                                    <button
                                        type="button"
                                        onClick={() => handleEnrollClick(reg)}
                                        className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition-colors shadow-sm"
                                        title="Pre-fill Add Student form and mark as enrolled"
                                    >
                                        <FiUserCheck className="w-3.5 h-3.5" />
                                        <span>Enroll Student</span>
                                    </button>

                                    {/* Delete Button */}
                                    <button
                                        type="button"
                                        onClick={() => openDeleteModal(reg.id, reg.full_name)}
                                        className="h-9 w-9 flex items-center justify-center text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete registration"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Registration"
                message={`Are you sure you want to remove the registration for "${itemToDelete?.name}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setItemToDelete(null);
                }}
            />
        </div>
    );
}
