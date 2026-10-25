'use client';

import { useState, useEffect } from 'react';
import { supabase, ClinicService } from '@/lib/supabase';
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
    FiTag,
    FiClock,
    FiDollarSign
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const CATEGORIES = [
    'Aesthetic Dermatology',
    'Medical Dermatology',
    'Laser & Light Therapy',
    'Hair & Scalp Restoration',
    'Anti-Aging & Injectables',
    'Body Contouring',
    'Skin Care & Peels'
];

export default function ManageServicesView() {
    const [services, setServices] = useState<ClinicService[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Modal / Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingService, setEditingService] = useState<ClinicService | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields (Strictly clean and fast: NO unnecessary descriptions)
    const [formData, setFormData] = useState({
        title: '',
        category: CATEGORIES[0],
        price: '',
        duration: '',
        imageUrl: '',
        isActive: true,
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [serviceToDelete, setServiceToDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('clinic_services')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setServices(data || []);
        } catch (error: any) {
            console.error('Error fetching services:', error);
            toast.error('Failed to load clinic services');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingService(null);
        setFormData({
            title: '',
            category: CATEGORIES[0],
            price: '',
            duration: '',
            imageUrl: '',
            isActive: true,
        });
        setImageFile(null);
        setImagePreview('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (service: ClinicService) => {
        setEditingService(service);
        setFormData({
            title: service.title,
            category: service.category,
            price: service.price || '',
            duration: service.duration || '',
            imageUrl: service.image_url || '',
            isActive: service.is_active,
        });
        setImageFile(null);
        setImagePreview(service.image_url || '');
        setIsFormOpen(true);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `service-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('clinic-media')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading service image:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('clinic-media')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSaveService = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error('Service title is required');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(editingService ? 'Updating service...' : 'Adding service...');

        try {
            let finalImageUrl = formData.imageUrl;
            if (imageFile) {
                const uploadedUrl = await uploadImage(imageFile);
                if (uploadedUrl) finalImageUrl = uploadedUrl;
            }

            if (editingService) {
                // Update
                const { error } = await supabase
                    .from('clinic_services')
                    .update({
                        title: formData.title.trim(),
                        category: formData.category,
                        price: formData.price.trim() || null,
                        duration: formData.duration.trim() || null,
                        image_url: finalImageUrl || null,
                        is_active: formData.isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingService.id);

                if (error) throw error;
                toast.success('Service updated successfully', { id: toastId });
            } else {
                // Insert
                const { error } = await supabase
                    .from('clinic_services')
                    .insert([{
                        title: formData.title.trim(),
                        category: formData.category,
                        price: formData.price.trim() || null,
                        duration: formData.duration.trim() || null,
                        image_url: finalImageUrl || null,
                        is_active: formData.isActive,
                    }]);

                if (error) throw error;
                toast.success('Service created successfully', { id: toastId });
            }

            setIsFormOpen(false);
            fetchServices();
        } catch (error: any) {
            console.error('Error saving service:', error);
            toast.error(error.message || 'Failed to save service', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (service: ClinicService) => {
        try {
            const newStatus = !service.is_active;
            const { error } = await supabase
                .from('clinic_services')
                .update({ is_active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', service.id);

            if (error) throw error;

            setServices(prev =>
                prev.map(s => s.id === service.id ? { ...s, is_active: newStatus } : s)
            );
            toast.success(`Service marked as ${newStatus ? 'active' : 'inactive'}`);
        } catch (error: any) {
            console.error('Error toggling service status:', error);
            toast.error('Failed to update status');
        }
    };

    const confirmDelete = async () => {
        if (!serviceToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from('clinic_services')
                .delete()
                .eq('id', serviceToDelete.id);

            if (error) throw error;

            toast.success('Service deleted successfully');
            setServices(prev => prev.filter(s => s.id !== serviceToDelete.id));
            setIsDeleteModalOpen(false);
            setServiceToDelete(null);
        } catch (error: any) {
            console.error('Error deleting service:', error);
            toast.error('Failed to delete service');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredServices = services.filter(service => {
        const matchesSearch = service.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            service.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Clinic Services CMS
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {services.length} Total
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage dermatology procedures and clinical treatments displayed on the website
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <button
                        onClick={fetchServices}
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
                        <span>Add New Service</span>
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
                        placeholder="Search service by name or category..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                >
                    <option value="all">All Categories</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Services Grid */}
            {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading clinic services...</p>
                </div>
            ) : filteredServices.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <FiTag className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No services found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                        {searchQuery ? 'Try adjusting your search criteria.' : 'Click "Add New Service" above to publish your first clinic service.'}
                    </p>
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                        Add Service
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredServices.map(service => (
                        <div 
                            key={service.id}
                            className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                                service.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-200 opacity-60 bg-slate-50'
                            }`}
                        >
                            {/* Top Card Image & Tag */}
                            <div>
                                {service.image_url ? (
                                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                                        <img 
                                            src={service.image_url} 
                                            alt={service.title}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                                            {service.category}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-28 w-full bg-slate-100 flex items-center justify-center p-4 text-center">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {service.category}
                                        </span>
                                    </div>
                                )}

                                <div className="p-5 space-y-3">
                                    <h3 className="font-bold text-slate-900 text-base leading-snug">
                                        {service.title}
                                    </h3>

                                    {/* Meta pills */}
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                        {service.price && (
                                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                                                <FiDollarSign className="w-3 h-3" />
                                                {service.price}
                                            </span>
                                        )}
                                        {service.duration && (
                                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                                <FiClock className="w-3 h-3 text-slate-400" />
                                                {service.duration}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <button
                                    onClick={() => toggleStatus(service)}
                                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                                        service.is_active ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                >
                                    {service.is_active ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                    <span>{service.is_active ? 'Active' : 'Hidden'}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => handleOpenEdit(service)}
                                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                                        title="Edit service"
                                    >
                                        <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setServiceToDelete({ id: service.id, title: service.title });
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete service"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    {editingService ? 'Edit Clinic Service' : 'Add New Clinic Service'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Enter service details to publish to the clinic website
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveService} className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Service Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. HydraFacial Elite Protocol"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Category
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

                            {/* Price & Duration */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Price (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.price}
                                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        placeholder="e.g. From 4,500 ETB"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Duration (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                        placeholder="e.g. 45 mins"
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Service Image
                                </label>
                                <div className="space-y-2">
                                    {imagePreview && (
                                        <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setImageFile(null);
                                                    setImagePreview('');
                                                    setFormData({ ...formData, imageUrl: '' });
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg text-xs"
                                            >
                                                <FiX className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <label className="flex-1 cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors">
                                            <FiUpload className="w-4 h-4 text-slate-500" />
                                            <span>Upload Image File</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    <input
                                        type="url"
                                        value={formData.imageUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, imageUrl: e.target.value });
                                            setImagePreview(e.target.value);
                                        }}
                                        placeholder="Or paste external image URL..."
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Active switch */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="service-active"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-0"
                                />
                                <label htmlFor="service-active" className="text-xs font-bold text-slate-700">
                                    Display active on website immediately
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
                                    {isSaving ? 'Saving...' : editingService ? 'Update Service' : 'Publish Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Service"
                message={`Are you sure you want to remove "${serviceToDelete?.title}" from the clinic website?`}
                confirmText="Delete Service"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setServiceToDelete(null);
                }}
            />
        </div>
    );
}
