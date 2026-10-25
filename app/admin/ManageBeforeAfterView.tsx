'use client';

import { useState, useEffect } from 'react';
import { supabase, BeforeAfterCase } from '@/lib/supabase';
import { 
    FiPlus, 
    FiEdit2, 
    FiTrash2, 
    FiRefreshCw, 
    FiSearch, 
    FiUpload, 
    FiCheck, 
    FiX, 
    FiEye, 
    FiEyeOff,
    FiColumns,
    FiActivity
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const CATEGORIES = [
    'Melasma & Pigmentation',
    'Dandruff & Scalp Treatment',
    'Acne & Acne Scars',
    'Vitiligo & Repigmentation',
    'Bacterial & Fungal Skin Infections',
    'Skin Rejuvenation & Anti-Aging',
    'Hair Loss & PRP Therapy'
];

export default function ManageBeforeAfterView() {
    const [cases, setCases] = useState<BeforeAfterCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Modal / Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCase, setEditingCase] = useState<BeforeAfterCase | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields (Strictly clean and fast: NO unnecessary descriptions)
    const [formData, setFormData] = useState({
        title: '',
        category: CATEGORIES[0],
        beforeImageUrl: '',
        afterImageUrl: '',
        treatmentUsed: '',
        sessionsCount: '',
        isActive: true,
    });

    const [beforeFile, setBeforeFile] = useState<File | null>(null);
    const [beforePreview, setBeforePreview] = useState<string>('');
    const [afterFile, setAfterFile] = useState<File | null>(null);
    const [afterPreview, setAfterPreview] = useState<string>('');

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [caseToDelete, setCaseToDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchCases();
    }, []);

    const fetchCases = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('before_after_cases')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCases(data || []);
        } catch (error: any) {
            console.error('Error fetching before/after cases:', error);
            toast.error('Failed to load clinical cases');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingCase(null);
        setFormData({
            title: '',
            category: CATEGORIES[0],
            beforeImageUrl: '',
            afterImageUrl: '',
            treatmentUsed: '',
            sessionsCount: '',
            isActive: true,
        });
        setBeforeFile(null);
        setBeforePreview('');
        setAfterFile(null);
        setAfterPreview('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (c: BeforeAfterCase) => {
        setEditingCase(c);
        setFormData({
            title: c.title,
            category: c.category,
            beforeImageUrl: c.before_image_url,
            afterImageUrl: c.after_image_url,
            treatmentUsed: c.treatment_used || '',
            sessionsCount: c.sessions_count || '',
            isActive: c.is_active,
        });
        setBeforeFile(null);
        setBeforePreview(c.before_image_url);
        setAfterFile(null);
        setAfterPreview(c.after_image_url);
        setIsFormOpen(true);
    };

    const uploadImage = async (file: File, prefix: string): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('clinic-media')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('clinic-media')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSaveCase = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Title is required');
            return;
        }

        if (!beforePreview && !formData.beforeImageUrl) {
            toast.error('Before image is required');
            return;
        }

        if (!afterPreview && !formData.afterImageUrl) {
            toast.error('After image is required');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(editingCase ? 'Updating case...' : 'Publishing case...');

        try {
            let finalBeforeUrl = formData.beforeImageUrl;
            if (beforeFile) {
                finalBeforeUrl = await uploadImage(beforeFile, 'before');
            }

            let finalAfterUrl = formData.afterImageUrl;
            if (afterFile) {
                finalAfterUrl = await uploadImage(afterFile, 'after');
            }

            if (editingCase) {
                const { error } = await supabase
                    .from('before_after_cases')
                    .update({
                        title: formData.title.trim(),
                        category: formData.category,
                        before_image_url: finalBeforeUrl,
                        after_image_url: finalAfterUrl,
                        treatment_used: formData.treatmentUsed.trim() || null,
                        sessions_count: formData.sessionsCount.trim() || null,
                        is_active: formData.isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingCase.id);

                if (error) throw error;
                toast.success('Case updated successfully', { id: toastId });
            } else {
                const { error } = await supabase
                    .from('before_after_cases')
                    .insert([{
                        title: formData.title.trim(),
                        category: formData.category,
                        before_image_url: finalBeforeUrl,
                        after_image_url: finalAfterUrl,
                        treatment_used: formData.treatmentUsed.trim() || null,
                        sessions_count: formData.sessionsCount.trim() || null,
                        is_active: formData.isActive,
                    }]);

                if (error) throw error;
                toast.success('Case published successfully', { id: toastId });
            }

            setIsFormOpen(false);
            fetchCases();
        } catch (error: any) {
            console.error('Error saving before/after case:', error);
            toast.error(error.message || 'Failed to save case', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (c: BeforeAfterCase) => {
        try {
            const newStatus = !c.is_active;
            const { error } = await supabase
                .from('before_after_cases')
                .update({ is_active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', c.id);

            if (error) throw error;

            setCases(prev =>
                prev.map(item => item.id === c.id ? { ...item, is_active: newStatus } : item)
            );
            toast.success(`Case marked as ${newStatus ? 'active' : 'hidden'}`);
        } catch (error: any) {
            console.error('Error updating status:', error);
            toast.error('Failed to update status');
        }
    };

    const confirmDelete = async () => {
        if (!caseToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from('before_after_cases')
                .delete()
                .eq('id', caseToDelete.id);

            if (error) throw error;

            toast.success('Case deleted successfully');
            setCases(prev => prev.filter(item => item.id !== caseToDelete.id));
            setIsDeleteModalOpen(false);
            setCaseToDelete(null);
        } catch (error: any) {
            console.error('Error deleting case:', error);
            toast.error('Failed to delete case');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredCases = cases.filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Before & After Results CMS
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {cases.length} Cases
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage clinical before & after patient transformations displayed on the clinic website
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <button
                        onClick={fetchCases}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <FiRefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>

                    <button
                        onClick={handleOpenAdd}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-all"
                    >
                        <FiPlus className="w-4 h-4" />
                        <span>Add Before/After Case</span>
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <FiSearch className="w-4 h-4" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search cases by condition or treatment..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                >
                    <option value="all">All Conditions</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Cases Grid */}
            {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading cases...</p>
                </div>
            ) : filteredCases.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <FiColumns className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No cases found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Add your first clinical Before & After transformation result.'}
                    </p>
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                        Add Case
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCases.map(c => (
                        <div 
                            key={c.id}
                            className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                                c.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-200 opacity-60 bg-slate-50'
                            }`}
                        >
                            <div>
                                {/* Before / After comparison visual */}
                                <div className="grid grid-cols-2 gap-0.5 bg-slate-200 relative h-48">
                                    <div className="relative h-full overflow-hidden bg-slate-100">
                                        <img src={c.before_image_url} alt="Before" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 text-[9px] font-bold uppercase rounded">
                                            Before
                                        </div>
                                    </div>
                                    <div className="relative h-full overflow-hidden bg-slate-100">
                                        <img src={c.after_image_url} alt="After" className="w-full h-full object-cover" />
                                        <div className="absolute bottom-2 right-2 bg-emerald-600/90 backdrop-blur-sm text-white px-2 py-0.5 text-[9px] font-bold uppercase rounded">
                                            After
                                        </div>
                                    </div>
                                    <div className="absolute top-2.5 left-2.5 bg-slate-900/90 text-white px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                        {c.category}
                                    </div>
                                </div>

                                <div className="p-5 space-y-2.5">
                                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                                        {c.title}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        {c.treatment_used && (
                                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                                                <FiActivity className="w-3 h-3 text-slate-500" />
                                                {c.treatment_used}
                                            </span>
                                        )}
                                        {c.sessions_count && (
                                            <span className="inline-flex items-center font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                {c.sessions_count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <button
                                    onClick={() => toggleStatus(c)}
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                        c.is_active ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                >
                                    {c.is_active ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                    <span>{c.is_active ? 'Active' : 'Hidden'}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleOpenEdit(c)}
                                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                                        title="Edit case"
                                    >
                                        <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCaseToDelete({ id: c.id, title: c.title });
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete case"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add / Edit Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in overflow-y-auto">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full overflow-hidden animate-in zoom-in-95 my-8">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    {editingCase ? 'Edit Before & After Case' : 'Add Before & After Case'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Upload comparison images and procedure info
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveCase} className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Case Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Melasma & Hyperpigmentation Protocol"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Condition / Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 transition-colors"
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Before & After Images */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {/* Before Image */}
                                <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        Before Image <span className="text-red-500">*</span>
                                    </label>
                                    {beforePreview && (
                                        <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                            <img src={beforePreview} alt="Before Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors">
                                        <FiUpload className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Upload Before Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setBeforeFile(file);
                                                    setBeforePreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.beforeImageUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, beforeImageUrl: e.target.value });
                                            setBeforePreview(e.target.value);
                                        }}
                                        placeholder="Or image URL..."
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-slate-800"
                                    />
                                </div>

                                {/* After Image */}
                                <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-50/50">
                                    <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        After Image <span className="text-red-500">*</span>
                                    </label>
                                    {afterPreview && (
                                        <div className="relative h-28 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                            <img src={afterPreview} alt="After Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors">
                                        <FiUpload className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Upload After Photo</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setAfterFile(file);
                                                    setAfterPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.afterImageUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, afterImageUrl: e.target.value });
                                            setAfterPreview(e.target.value);
                                        }}
                                        placeholder="Or image URL..."
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 focus:outline-none focus:border-slate-800"
                                    />
                                </div>
                            </div>

                            {/* Treatment & Sessions */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Treatment Protocol (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.treatmentUsed}
                                        onChange={(e) => setFormData({ ...formData, treatmentUsed: e.target.value })}
                                        placeholder="e.g. Q-Switched Nd:YAG Laser"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Sessions Count (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.sessionsCount}
                                        onChange={(e) => setFormData({ ...formData, sessionsCount: e.target.value })}
                                        placeholder="e.g. 4 Sessions"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Active switch */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="case-active"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-0"
                                />
                                <label htmlFor="case-active" className="text-xs font-bold text-slate-700">
                                    Display active on clinic website
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : editingCase ? 'Update Case' : 'Publish Case'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Case"
                message={`Are you sure you want to remove "${caseToDelete?.title}"?`}
                confirmText="Delete Case"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setCaseToDelete(null);
                }}
            />
        </div>
    );
}
