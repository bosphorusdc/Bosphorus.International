'use client';

import { useState, useEffect } from 'react';
import { supabase, GalleryItemRecord } from '@/lib/supabase';
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
    FiFilm,
    FiImage,
    FiCamera
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

const CATEGORIES = [
    { value: 'results', label: 'Clinical Results' },
    { value: 'videos', label: 'Live Procedures (Videos)' },
    { value: 'procedures', label: 'Clinical Practice' },
    { value: 'clinic', label: 'Clinic & Facility' },
    { value: 'ambassador', label: 'Brand Ambassador' }
];

export default function ManageGalleryView() {
    const [items, setItems] = useState<GalleryItemRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Modal / Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<GalleryItemRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form fields (Strictly clean and fast: NO unnecessary descriptions)
    const [formData, setFormData] = useState({
        title: '',
        category: 'results',
        mediaType: 'image' as 'image' | 'video',
        mediaUrl: '',
        thumbnailUrl: '',
        isActive: true,
    });

    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string>('');

    // Delete state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchGallery();
    }, []);

    const fetchGallery = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gallery_items')
                .select('*')
                .order('order_index', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setItems(data || []);
        } catch (error: any) {
            console.error('Error fetching gallery items:', error);
            toast.error('Failed to load gallery items');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenAdd = () => {
        setEditingItem(null);
        setFormData({
            title: '',
            category: 'results',
            mediaType: 'image',
            mediaUrl: '',
            thumbnailUrl: '',
            isActive: true,
        });
        setMediaFile(null);
        setMediaPreview('');
        setIsFormOpen(true);
    };

    const handleOpenEdit = (item: GalleryItemRecord) => {
        setEditingItem(item);
        setFormData({
            title: item.title,
            category: item.category,
            mediaType: item.media_type,
            mediaUrl: item.media_url,
            thumbnailUrl: item.thumbnail_url || '',
            isActive: item.is_active,
        });
        setMediaFile(null);
        setMediaPreview(item.media_url);
        setIsFormOpen(true);
    };

    const uploadMedia = async (file: File): Promise<string> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('clinic-media')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading gallery media:', uploadError);
            throw uploadError;
        }

        const { data } = supabase.storage
            .from('clinic-media')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleSaveItem = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title.trim()) {
            toast.error('Media title is required');
            return;
        }

        if (!mediaPreview && !formData.mediaUrl) {
            toast.error('Please upload a file or provide a URL');
            return;
        }

        setIsSaving(true);
        const toastId = toast.loading(editingItem ? 'Updating media...' : 'Uploading media...');

        try {
            let finalMediaUrl = formData.mediaUrl;
            if (mediaFile) {
                finalMediaUrl = await uploadMedia(mediaFile);
            }

            if (editingItem) {
                const { error } = await supabase
                    .from('gallery_items')
                    .update({
                        title: formData.title.trim(),
                        category: formData.category,
                        media_type: formData.mediaType,
                        media_url: finalMediaUrl,
                        thumbnail_url: formData.thumbnailUrl.trim() || null,
                        is_active: formData.isActive,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editingItem.id);

                if (error) throw error;
                toast.success('Gallery item updated', { id: toastId });
            } else {
                const { error } = await supabase
                    .from('gallery_items')
                    .insert([{
                        title: formData.title.trim(),
                        category: formData.category,
                        media_type: formData.mediaType,
                        media_url: finalMediaUrl,
                        thumbnail_url: formData.thumbnailUrl.trim() || null,
                        is_active: formData.isActive,
                    }]);

                if (error) throw error;
                toast.success('Gallery item added successfully', { id: toastId });
            }

            setIsFormOpen(false);
            fetchGallery();
        } catch (error: any) {
            console.error('Error saving gallery item:', error);
            toast.error(error.message || 'Failed to save media', { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = async (item: GalleryItemRecord) => {
        try {
            const newStatus = !item.is_active;
            const { error } = await supabase
                .from('gallery_items')
                .update({ is_active: newStatus, updated_at: new Date().toISOString() })
                .eq('id', item.id);

            if (error) throw error;

            setItems(prev =>
                prev.map(i => i.id === item.id ? { ...i, is_active: newStatus } : i)
            );
            toast.success(`Media marked as ${newStatus ? 'active' : 'hidden'}`);
        } catch (error: any) {
            console.error('Error toggling media status:', error);
            toast.error('Failed to update status');
        }
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase
                .from('gallery_items')
                .delete()
                .eq('id', itemToDelete.id);

            if (error) throw error;

            toast.success('Gallery item deleted');
            setItems(prev => prev.filter(i => i.id !== itemToDelete.id));
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        } catch (error: any) {
            console.error('Error deleting item:', error);
            toast.error('Failed to delete item');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredItems = items.filter(i => {
        const matchesSearch = i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || i.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        Gallery Media CMS
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {items.length} Items
                        </span>
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Upload and manage clinic gallery photos and procedure video showcase
                    </p>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-center">
                    <button
                        onClick={fetchGallery}
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
                        <span>Add Media Item</span>
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
                        placeholder="Search media by title or tag..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                    />
                </div>

                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-semibold focus:outline-none focus:border-slate-800 transition-colors shadow-sm"
                >
                    <option value="all">All Media Sections</option>
                    {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                </select>
            </div>

            {/* Media Grid */}
            {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <FiRefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
                    <p className="text-sm text-slate-500 font-medium">Loading gallery media...</p>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
                        <FiCamera className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 mb-1">No media items found</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                        {searchQuery ? 'Try adjusting your search filters.' : 'Click "Add Media Item" to upload your first photo or video.'}
                    </p>
                    <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
                    >
                        Add Media
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredItems.map(item => (
                        <div 
                            key={item.id}
                            className={`bg-white rounded-2xl border overflow-hidden flex flex-col justify-between transition-all ${
                                item.is_active ? 'border-slate-200 shadow-sm' : 'border-slate-200 opacity-60 bg-slate-50'
                            }`}
                        >
                            <div>
                                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                                    {item.media_type === 'video' ? (
                                        <div className="relative w-full h-full flex items-center justify-center bg-slate-900">
                                            <video 
                                                src={item.media_url} 
                                                className="w-full h-full object-cover opacity-80"
                                                muted
                                                playsInline
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white">
                                                    <FiFilm className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <img 
                                            src={item.media_url} 
                                            alt={item.title}
                                            className="w-full h-full object-cover"
                                        />
                                    )}

                                    <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider">
                                        {item.category}
                                    </div>

                                    <div className="absolute top-2.5 right-2.5 bg-white/90 text-slate-900 px-2 py-0.5 text-[9px] font-bold rounded uppercase tracking-wider flex items-center gap-1">
                                        {item.media_type === 'video' ? <FiFilm className="w-3 h-3 text-sky-600" /> : <FiImage className="w-3 h-3 text-slate-600" />}
                                        <span>{item.media_type}</span>
                                    </div>
                                </div>

                                <div className="p-4">
                                    <h3 className="font-bold text-slate-900 text-sm leading-snug line-clamp-2">
                                        {item.title}
                                    </h3>
                                </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <button
                                    onClick={() => toggleStatus(item)}
                                    className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                        item.is_active ? 'text-emerald-700' : 'text-slate-400'
                                    }`}
                                >
                                    {item.is_active ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
                                    <span>{item.is_active ? 'Active' : 'Hidden'}</span>
                                </button>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors"
                                        title="Edit"
                                    >
                                        <FiEdit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setItemToDelete({ id: item.id, title: item.title });
                                            setIsDeleteModalOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete"
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
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 my-8">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">
                                    {editingItem ? 'Edit Gallery Media' : 'Add Gallery Media'}
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Upload photo or video for the clinic gallery
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl"
                            >
                                <FiX className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveItem} className="p-6 space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    Title / Caption <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.g. Clinical Laser Resurfacing Procedure"
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-800 transition-colors"
                                />
                            </div>

                            {/* Category & Media Type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Section / Category
                                    </label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 transition-colors"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                        Media Type
                                    </label>
                                    <select
                                        value={formData.mediaType}
                                        onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as 'image' | 'video' })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-800 transition-colors"
                                    >
                                        <option value="image">Photo / Image</option>
                                        <option value="video">Live Video</option>
                                    </select>
                                </div>
                            </div>

                            {/* Media File Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                    File Upload
                                </label>
                                <div className="space-y-2">
                                    {mediaPreview && (
                                        <div className="relative h-32 w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                                            {formData.mediaType === 'video' ? (
                                                <video src={mediaPreview} controls className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                                            )}
                                        </div>
                                    )}

                                    <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors">
                                        <FiUpload className="w-4 h-4 text-slate-500" />
                                        <span>Upload {formData.mediaType === 'video' ? 'Video File' : 'Image File'}</span>
                                        <input
                                            type="file"
                                            accept={formData.mediaType === 'video' ? 'video/*' : 'image/*'}
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setMediaFile(file);
                                                    setMediaPreview(URL.createObjectURL(file));
                                                }
                                            }}
                                            className="hidden"
                                        />
                                    </label>

                                    <input
                                        type="url"
                                        value={formData.mediaUrl}
                                        onChange={(e) => {
                                            setFormData({ ...formData, mediaUrl: e.target.value });
                                            setMediaPreview(e.target.value);
                                        }}
                                        placeholder="Or paste media URL..."
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 focus:outline-none focus:border-slate-800 transition-colors"
                                    />
                                </div>
                            </div>

                            {/* Active switch */}
                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="gallery-active"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-slate-900 rounded border-slate-300 focus:ring-0"
                                />
                                <label htmlFor="gallery-active" className="text-xs font-bold text-slate-700">
                                    Display active in gallery immediately
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
                                    {isSaving ? 'Saving...' : editingItem ? 'Update Media' : 'Publish Media'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                title="Delete Media"
                message={`Are you sure you want to remove "${itemToDelete?.title}" from the clinic gallery?`}
                confirmText="Delete Media"
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
