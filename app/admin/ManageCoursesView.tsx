'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Course } from '@/lib/supabase';
import { FiX, FiEdit2, FiTrash2, FiPlus, FiSave, FiBookOpen } from 'react-icons/fi';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';

interface ManageCoursesViewProps {
    onCoursesChange: () => void;
}

export default function ManageCoursesView({ onCoursesChange }: ManageCoursesViewProps) {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        course_name: '',
        session_type: ''
    });
    const [saving, setSaving] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [newCourseForm, setNewCourseForm] = useState({
        course_name: '',
        session_type: 'Theory'
    });

    // Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [courseToDelete, setCourseToDelete] = useState<{ id: number, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_number');

        if (error) {
            console.error('Error fetching courses:', error);
            toast.error('Failed to load courses');
        } else {
            setCourses(data || []);
        }
        setLoading(false);
    };

    const startEdit = (course: Course) => {
        setEditingId(course.id);
        setEditForm({
            course_name: course.course_name,
            session_type: course.session_type
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({ course_name: '', session_type: '' });
    };

    const handleUpdate = async (id: number) => {
        setSaving(true);
        const loadingToast = toast.loading('Updating course...');
        try {
            const { error: updateError } = await supabase
                .from('courses')
                .update({
                    course_name: editForm.course_name.trim(),
                    session_type: editForm.session_type
                })
                .eq('id', id);

            if (updateError) throw updateError;

            toast.success('Course updated successfully', { id: loadingToast });
            setEditingId(null);
            fetchCourses();
            onCoursesChange();
        } catch (err: any) {
            console.error('Error updating course:', err);
            toast.error(err.message || 'Error updating course', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const openDeleteModal = (id: number, name: string) => {
        setCourseToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!courseToDelete) return;
        setIsDeleting(true);

        try {
            const { error: deleteError } = await supabase
                .from('courses')
                .delete()
                .eq('id', courseToDelete.id);

            if (deleteError) throw deleteError;

            toast.success(`Course removed`);
            fetchCourses();
            onCoursesChange();
        } catch (err: any) {
            console.error('Error deleting course:', err);
            toast.error('Error deleting course');
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setCourseToDelete(null);
        }
    };

    const handleAddCourse = async () => {
        if (!newCourseForm.course_name.trim()) return;
        setSaving(true);
        const loadingToast = toast.loading('Saving course...');
        try {
            const { data: existingCourses } = await supabase
                .from('courses')
                .select('course_number')
                .order('course_number', { ascending: false })
                .limit(1);

            const nextNum = existingCourses && existingCourses.length > 0
                ? existingCourses[0].course_number + 1
                : 1;

            const { error: insertError } = await supabase
                .from('courses')
                .insert([{
                    course_number: nextNum,
                    course_name: newCourseForm.course_name.trim(),
                    session_type: newCourseForm.session_type
                }]);

            if (insertError) throw insertError;

            toast.success('Course added successfully', { id: loadingToast });
            setNewCourseForm({ course_name: '', session_type: 'Theory' });
            setIsAdding(false);
            fetchCourses();
            onCoursesChange();
        } catch (err: any) {
            console.error('Error adding course:', err);
            toast.error('Error adding course', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] p-6 sm:p-8">
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Remove course?"
                message={`Are you sure you want to remove "${courseToDelete?.name}"?`}
                confirmText="Remove Course"
                cancelText="Cancel"
                isLoading={isDeleting}
            />

            <div>
                {/* Section Header */}
                <div className="pb-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Curriculum Courses</h2>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Manage existing courses and practical session requirements</p>
                    </div>
                    {!isAdding && (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center justify-center px-4 py-2.5 bg-[#18181b] hover:bg-black text-white rounded-2xl font-semibold text-xs shadow-sm transition-all active:scale-[0.98] whitespace-nowrap"
                        >
                            <FiPlus className="mr-1.5 text-sm" />
                            Add New Course
                        </button>
                    )}
                </div>

                <div className="pt-6">
                    {/* Add Course Form */}
                    {isAdding && (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 mb-6 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-900">New Course Details</h3>
                                <button onClick={() => setIsAdding(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors">
                                    <FiX size={18} />
                                </button>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Course Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={newCourseForm.course_name}
                                        onChange={(e) => setNewCourseForm({ ...newCourseForm, course_name: e.target.value })}
                                        placeholder="e.g. Advanced Maritime Safety"
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 text-slate-800 font-medium text-sm placeholder:text-slate-400 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-slate-700">Course Type</label>
                                    <div className="relative">
                                        <select
                                            value={newCourseForm.session_type}
                                            onChange={(e) => setNewCourseForm({ ...newCourseForm, session_type: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 text-slate-800 font-medium text-sm appearance-none outline-none cursor-pointer pr-10"
                                        >
                                            <option value="Theory">Theory Only</option>
                                            <option value="Theory and Practical">Theory & Practical</option>
                                        </select>
                                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                            <FiBookOpen size={16} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end items-center space-x-3 mt-5">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddCourse}
                                    disabled={saving || !newCourseForm.course_name.trim()}
                                    className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Save Course'}
                                </button>
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-3">
                            <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-600 rounded-full animate-spin"></div>
                            <p className="text-xs font-medium text-slate-400">Loading courses...</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                        <th className="px-4 py-3">No</th>
                                        <th className="px-4 py-3">Course Name</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {courses.map((course) => (
                                        <tr key={course.id} className="hover:bg-slate-50/70 transition-colors group">
                                            <td className="px-4 py-3.5 text-xs font-bold text-slate-400">
                                                {course.course_number.toString().padStart(2, '0')}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {editingId === course.id ? (
                                                    <input
                                                        type="text"
                                                        value={editForm.course_name}
                                                        onChange={(e) => setEditForm({ ...editForm, course_name: e.target.value })}
                                                        className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-sm outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    />
                                                ) : (
                                                    <span className="text-sm font-semibold text-slate-900">{course.course_name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {editingId === course.id ? (
                                                    <select
                                                        value={editForm.session_type}
                                                        onChange={(e) => setEditForm({ ...editForm, session_type: e.target.value })}
                                                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium text-xs outline-none focus:ring-2 focus:ring-sky-500/20"
                                                    >
                                                        <option value="Theory">Theory Only</option>
                                                        <option value="Theory and Practical">Theory & Practical</option>
                                                    </select>
                                                ) : (
                                                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                                                        course.session_type === 'Theory'
                                                            ? 'bg-slate-100 text-slate-700'
                                                            : 'bg-sky-50 text-sky-700 border border-sky-100'
                                                    }`}>
                                                        {course.session_type === 'Theory' ? 'Theory Only' : 'Theory & Practical'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 text-right">
                                                {editingId === course.id ? (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleUpdate(course.id)}
                                                            disabled={saving}
                                                            className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition shadow-sm"
                                                            title="Save"
                                                        >
                                                            <FiSave size={16} />
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition"
                                                            title="Cancel"
                                                        >
                                                            <FiX size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end space-x-1.5">
                                                        <button
                                                            onClick={() => startEdit(course)}
                                                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                                                            title="Edit"
                                                        >
                                                            <FiEdit2 size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => openDeleteModal(course.id, course.course_name)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {courses.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-16 text-center text-slate-400 font-medium text-sm">
                                                No courses configured yet. Click "Add New Course" to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
