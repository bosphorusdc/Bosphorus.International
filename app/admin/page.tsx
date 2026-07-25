'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Course, Student, getSiteUrl } from '@/lib/supabase';
import { checkAuth, signOut } from '@/lib/auth';
import QRCode from 'qrcode';
import { FiUpload, FiSave, FiTrash2, FiEdit, FiDownload, FiLogOut, FiFileText, FiPlus, FiUsers, FiBookOpen, FiSearch, FiX, FiInfo } from 'react-icons/fi';
import jsPDF from 'jspdf';
import ManageCoursesView from './ManageCoursesView';
import toast from 'react-hot-toast';
import ConfirmationModal from '../components/ConfirmationModal';
import PWAInstallBanner from '../components/PWAInstallBanner';


export default function AdminPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(false);
    const [authChecking, setAuthChecking] = useState(true);
    const [activeView, setActiveView] = useState<'all-students' | 'add-student' | 'manage-courses'>('all-students');
    const [searchQuery, setSearchQuery] = useState('');

    // Detail View State
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentCourses, setStudentCourses] = useState<Course[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    // Confirmation Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        studentId: '',
        entrySession: '',
        graduationDate: '',
        profilePhoto: null as File | null,
        selectedCourses: [] as number[],
    });

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        const session = await checkAuth();
        if (!session) {
            router.push('/');
            return;
        }
        setAuthChecking(false);
        fetchCourses();
        fetchStudents();
    };

    const handleLogout = async () => {
        await signOut();
        toast.success('Logged out successfully');
        router.push('/');
    };

    const fetchCourses = async () => {
        const { data, error } = await supabase
            .from('courses')
            .select('*')
            .order('course_number');

        if (error) {
            console.error('Error fetching courses:', error);
            return;
        }
        setCourses(data || []);
    };

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching students:', error);
            return;
        }
        setStudents(data || []);
    };

    const fetchStudentCourses = async (studentId: string) => {
        setLoadingDetails(true);
        const { data, error } = await supabase
            .from('student_courses')
            .select('course_id')
            .eq('student_id', studentId);

        if (error) {
            console.error('Error fetching student courses:', error);
            setLoadingDetails(false);
            return;
        }

        const courseIds = data.map(item => item.course_id);
        const { data: coursesData, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .in('id', courseIds);

        if (coursesError) {
            console.error('Error fetching courses data:', coursesError);
        } else {
            setStudentCourses(coursesData || []);
        }
        setLoadingDetails(false);
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, profilePhoto: e.target.files[0] });
        }
    };

    const handleCourseToggle = (courseId: number) => {
        const selected = formData.selectedCourses;
        if (selected.includes(courseId)) {
            setFormData({
                ...formData,
                selectedCourses: selected.filter(id => id !== courseId)
            });
        } else {
            setFormData({
                ...formData,
                selectedCourses: [...selected, courseId]
            });
        }
    };

    const uploadPhoto = async (file: File, studentId: string): Promise<string | null> => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${studentId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('student-photos')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading photo:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('student-photos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const generateQRCode = async (studentId: string, studentName?: string): Promise<string> => {
        const siteUrl = getSiteUrl();
        const slug = studentName 
            ? studentName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') 
            : studentId;
        const url = `${siteUrl}/certificate/${slug}`;
        const qrCodeDataUrl = await QRCode.toDataURL(url, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });
        return qrCodeDataUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const loadingToast = toast.loading('Registering student...');

        try {
            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .insert([
                    {
                        student_id: formData.studentId,
                        name: formData.name,
                        entry_session: formData.entrySession,
                        graduation_date: formData.graduationDate || null,
                    }
                ])
                .select()
                .single();

            if (studentError) throw studentError;

            let photoUrl = null;
            if (formData.profilePhoto) {
                photoUrl = await uploadPhoto(formData.profilePhoto, studentData.id);
            }

            const qrCodeUrl = await generateQRCode(studentData.id, studentData.name);

            await supabase
                .from('students')
                .update({
                    profile_photo_url: photoUrl,
                    qr_code_url: qrCodeUrl,
                })
                .eq('id', studentData.id);

            if (formData.selectedCourses.length > 0) {
                const studentCoursesData = formData.selectedCourses.map(courseId => ({
                    student_id: studentData.id,
                    course_id: courseId,
                }));

                await supabase
                    .from('student_courses')
                    .insert(studentCoursesData);
            }

            toast.success('Student registered successfully', { id: loadingToast });
            setFormData({
                name: '',
                studentId: '',
                entrySession: '',
                graduationDate: '',
                profilePhoto: null,
                selectedCourses: [],
            });
            fetchStudents();
            setActiveView('all-students');
        } catch (error: any) {
            console.error('Error adding student:', error);
            let errorMessage = 'Error registering student';
            if (error?.code === '23505') {
                errorMessage = `Duplicate Student ID Detected`;
            }
            toast.error(errorMessage, { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    const openDeleteModal = (id: string, name: string) => {
        setStudentToDelete({ id, name });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!studentToDelete) return;

        setIsDeleting(true);
        const { error } = await supabase.from('students').delete().eq('id', studentToDelete.id);

        if (error) {
            toast.error('Error deleting student');
        } else {
            toast.success(`Student removed`);
            fetchStudents();
            if (selectedStudent?.id === studentToDelete.id) {
                setSelectedStudent(null);
            }
        }

        setIsDeleting(false);
        setIsDeleteModalOpen(false);
        setStudentToDelete(null);
    };

    const downloadQRCodePNG = (qrCodeUrl: string, studentName: string) => {
        const link = document.createElement('a');
        link.href = qrCodeUrl;
        link.download = `qr-${studentName.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        toast.success('QR Code Image downloaded');
    };

    const downloadQRCodePDF = async (qrCodeUrl: string, studentName: string, studentId: string) => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        pdf.setFontSize(20);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Bosphorus International', 105, 20, { align: 'center' });
        pdf.setFontSize(14);
        pdf.text('Student Certificate QR Code', 105, 30, { align: 'center' });
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Student: ${studentName}`, 20, 50);
        pdf.text(`ID: ${studentId}`, 20, 60);
        pdf.addImage(qrCodeUrl, 'PNG', 65, 80, 80, 80);
        pdf.setFontSize(10);
        pdf.text('Scan this QR code to view the certificate', 105, 175, { align: 'center' });
        pdf.save(`qr-${studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
        toast.success('Certificate PDF generated');
    };

    const openDetailView = async (student: Student) => {
        setSelectedStudent(student);
        await fetchStudentCourses(student.id);
    };

    if (authChecking) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-3 border-sky-500/20 border-t-sky-600 rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-slate-400 mt-3">Loading dashboard...</p>
            </div>
        );
    }

    return (
        <>
            <PWAInstallBanner />
            <div className="h-screen w-screen overflow-hidden bg-slate-50/70 flex flex-col md:flex-row relative font-sans selection:bg-sky-200 text-slate-800">
                {/* Background Ambient Lighting & Subtle Grid (matching Login Page) */}
                <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(56,189,248,0.12),rgba(255,255,255,0))] pointer-events-none" />
                <div className="fixed inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Student?"
                    message={`Are you sure you want to delete ${studentToDelete?.name}? This action cannot be undone.`}
                    confirmText="Delete Student"
                    cancelText="Cancel"
                    isLoading={isDeleting}
                />

                {/* Student Detail Modal */}
                {selectedStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedStudent(null)} />
                        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col z-10">
                            {/* Modal Header */}
                            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">Student Profile</h2>
                                    <p className="text-xs text-slate-500">Certificate details and course enrollments</p>
                                </div>
                                <button
                                    onClick={() => setSelectedStudent(null)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 overflow-y-auto space-y-6">
                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    {selectedStudent.profile_photo_url ? (
                                        <img src={selectedStudent.profile_photo_url} alt={selectedStudent.name} className="w-24 h-24 rounded-2xl object-cover border border-slate-200 shadow-sm" />
                                    ) : (
                                        <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                                            <FiUsers size={40} />
                                        </div>
                                    )}

                                    <div className="flex-1 text-center sm:text-left space-y-1">
                                        <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                                            <span className="px-3 py-1 bg-sky-50 text-sky-700 font-semibold text-xs rounded-xl border border-sky-100">
                                                ID: {selectedStudent.student_id}
                                            </span>
                                            <span className="px-3 py-1 bg-slate-200/70 text-slate-700 font-medium text-xs rounded-xl">
                                                {selectedStudent.entry_session}
                                            </span>
                                            {selectedStudent.graduation_date && (
                                                <span className="px-3 py-1 bg-slate-200/70 text-slate-700 font-medium text-xs rounded-xl">
                                                    Graduated: {new Date(selectedStudent.graduation_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Enrolled Courses */}
                                <div>
                                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Enrolled Courses</h4>
                                    {loadingDetails ? (
                                        <div className="flex justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-sky-500/20 border-t-sky-600 rounded-full animate-spin" />
                                        </div>
                                    ) : studentCourses.length > 0 ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {studentCourses.map((course) => (
                                                <div key={course.id} className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-2xl flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {course.course_number.toString().padStart(2, '0')}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-semibold text-slate-900 truncate">{course.course_name}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium">{course.session_type}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic py-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">No courses assigned to this student</p>
                                    )}
                                </div>

                                {/* Certificate Actions */}
                                <div className="pt-2 border-t border-slate-100">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Certificate Downloads</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => downloadQRCodePNG(selectedStudent.qr_code_url!, selectedStudent.name)}
                                            className="flex items-center justify-center py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-semibold text-xs shadow-sm transition-all active:scale-[0.98]"
                                        >
                                            <FiDownload size={16} className="mr-2" /> PNG QR Code
                                        </button>
                                        <button
                                            onClick={() => downloadQRCodePDF(selectedStudent.qr_code_url!, selectedStudent.name, selectedStudent.student_id)}
                                            className="flex items-center justify-center py-3 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-2xl font-semibold text-xs shadow-sm transition-all active:scale-[0.98]"
                                        >
                                            <FiFileText size={16} className="mr-2" /> PDF Certificate
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Minimal Sleek Desktop Sidebar (Fixed) */}
                <aside className="hidden md:flex flex-col w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/80 h-full z-40 shadow-[4px_0_24px_rgba(15,23,42,0.02)] flex-shrink-0">
                    {/* Brand Header */}
                    <div className="p-5 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white p-1 shadow-[0_4px_16px_-2px_rgba(14,116,144,0.12)] border border-slate-100 flex items-center justify-center flex-shrink-0">
                            <img src="/bosphorus logo.jpg" alt="Bosphorus International" className="w-full h-full object-contain rounded-xl" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold text-slate-900 truncate leading-snug">Bosphorus</h2>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Admin System</p>
                        </div>
                    </div>

                    {/* Navigation Menu */}
                    <nav className="flex-1 p-3.5 space-y-1.5 mt-2">
                        <button
                            onClick={() => setActiveView('all-students')}
                            className={`w-full flex items-center px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                                activeView === 'all-students'
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                            }`}
                        >
                            <FiUsers className={`mr-3 text-base ${activeView === 'all-students' ? 'text-white' : 'text-slate-400'}`} />
                            All Students
                        </button>

                        <button
                            onClick={() => setActiveView('add-student')}
                            className={`w-full flex items-center px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                                activeView === 'add-student'
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                            }`}
                        >
                            <FiPlus className={`mr-3 text-base ${activeView === 'add-student' ? 'text-white' : 'text-slate-400'}`} />
                            Register Student
                        </button>

                        <button
                            onClick={() => setActiveView('manage-courses')}
                            className={`w-full flex items-center px-3.5 py-3 rounded-2xl text-xs font-semibold tracking-wide transition-all ${
                                activeView === 'manage-courses'
                                    ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
                                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                            }`}
                        >
                            <FiBookOpen className={`mr-3 text-base ${activeView === 'manage-courses' ? 'text-white' : 'text-slate-400'}`} />
                            Manage Courses
                        </button>
                    </nav>

                    {/* Footer / Logout */}
                    <div className="p-3.5 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3.5 py-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all font-semibold text-xs group"
                        >
                            <FiLogOut className="mr-3 text-base text-slate-400 group-hover:text-red-600 transition-colors" />
                            Logout
                        </button>
                    </div>
                </aside>

                {/* Main Content Dashboard Area (Scrollable Only) */}
                <main className="flex-1 min-w-0 h-full overflow-y-auto relative z-10">
                    <div className="p-4 sm:p-6 lg:p-8 w-full mx-auto pb-28 md:pb-12">
                        {/* Mobile Header Bar */}
                        <div className="md:hidden flex items-center justify-between mb-6 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                            <div className="flex items-center gap-3">
                                <img src="/bosphorus logo.jpg" alt="Bosphorus International" className="h-9 w-auto rounded-lg" />
                                <span className="font-bold text-slate-900 text-sm">Bosphorus Admin</span>
                            </div>
                            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 transition-colors">
                                <FiLogOut size={20} />
                            </button>
                        </div>

                        {/* View Title */}
                        <header className="mb-6">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                {activeView === 'all-students' && 'Students Directory'}
                                {activeView === 'add-student' && 'Register New Student'}
                                {activeView === 'manage-courses' && 'Manage Courses'}
                            </h1>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                {activeView === 'all-students' && 'Search and manage student profiles and certificates'}
                                {activeView === 'add-student' && 'Enter student information, photo, and enrolled courses'}
                                {activeView === 'manage-courses' && 'Add, edit, or remove curriculum courses'}
                            </p>
                        </header>

                        {/* View Contents */}
                        <div className="min-h-[500px]">
                            {/* REGISTER STUDENT VIEW */}
                            {activeView === 'add-student' && (
                                <div className="animate-in fade-in duration-300 w-full">
                                    <form onSubmit={handleSubmit} className="space-y-6 w-full">
                                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                                            {/* Left Column: Student Details & Photo (5 cols) */}
                                            <div className="lg:col-span-5 xl:col-span-5 space-y-6">
                                                {/* Information Card */}
                                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] p-6 space-y-4">
                                                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                                                        <span>Personal Information</span>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 1</span>
                                                    </h3>
                                                    
                                                    <div className="grid sm:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={formData.name}
                                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                                placeholder="e.g. Alexander Wright"
                                                                className="w-full px-4 py-3 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-slate-700">Student ID *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={formData.studentId}
                                                                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                                                placeholder="e.g. ST-2024-001"
                                                                className="w-full px-4 py-3 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400 transition-all"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid sm:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-slate-700">Session *</label>
                                                            <input
                                                                type="text"
                                                                required
                                                                value={formData.entrySession}
                                                                onChange={(e) => setFormData({ ...formData, entrySession: e.target.value })}
                                                                placeholder="e.g. Autumn 2024"
                                                                className="w-full px-4 py-3 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium placeholder:text-slate-400 transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-xs font-semibold text-slate-700">Graduation Date (Optional)</label>
                                                            <input
                                                                type="date"
                                                                value={formData.graduationDate}
                                                                onChange={(e) => setFormData({ ...formData, graduationDate: e.target.value })}
                                                                className="w-full px-4 py-3 bg-[#f1f5f9] border border-transparent focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 rounded-2xl outline-none text-slate-800 text-sm font-medium transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Profile Photo Card */}
                                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] p-6 space-y-4">
                                                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
                                                        <span>Profile Photo</span>
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Step 2</span>
                                                    </h3>

                                                    {formData.profilePhoto ? (
                                                        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                                                            <img
                                                                src={URL.createObjectURL(formData.profilePhoto)}
                                                                alt="Preview"
                                                                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-sm"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-slate-900 truncate">{formData.profilePhoto.name}</p>
                                                                <p className="text-[10px] text-slate-400">{(formData.profilePhoto.size / 1024).toFixed(1)} KB</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, profilePhoto: null })}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                            >
                                                                <FiX size={18} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <label className="flex flex-col items-center justify-center w-full p-6 bg-[#f1f5f9] hover:bg-slate-100 border border-dashed border-slate-300 rounded-2xl cursor-pointer transition-all group">
                                                            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-slate-600 group-hover:scale-105 transition-all shadow-sm mb-2">
                                                                <FiUpload size={20} />
                                                            </div>
                                                            <span className="text-xs font-semibold text-slate-700">Click to upload student photo</span>
                                                            <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPG or WEBP image</span>
                                                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                                        </label>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Right Column: Course Assignment & Submit Button (7 cols) */}
                                            <div className="lg:col-span-7 xl:col-span-7 flex flex-col">
                                                <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.04)] p-6 flex-1 flex flex-col justify-between space-y-4">
                                                    <div>
                                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-900">Assign Courses</h3>
                                                                <p className="text-[11px] text-slate-500">Select curriculum courses for this student</p>
                                                            </div>
                                                            <span className="px-3 py-1 bg-sky-50 text-sky-700 font-semibold text-xs rounded-xl border border-sky-100">
                                                                {formData.selectedCourses.length} Selected
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto p-1 pr-2">
                                                            {courses.map((course) => {
                                                                const isSelected = formData.selectedCourses.includes(course.id);
                                                                return (
                                                                    <label
                                                                        key={course.id}
                                                                        className={`flex items-start space-x-3 p-3.5 rounded-2xl cursor-pointer transition-all border ${
                                                                            isSelected
                                                                                ? 'bg-sky-50/50 border-sky-500/50 shadow-sm'
                                                                                : 'bg-slate-50/70 border-slate-200/60 hover:bg-white hover:border-slate-300'
                                                                        }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => handleCourseToggle(course.id)}
                                                                            className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500/20"
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs font-semibold text-slate-900 leading-snug">{course.course_name}</div>
                                                                            <div className="text-[10px] text-slate-500 font-medium mt-1 inline-block px-2 py-0.5 rounded-md bg-white/80 border border-slate-200/60">
                                                                                {course.session_type}
                                                                            </div>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 border-t border-slate-100">
                                                        <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="w-full py-3.5 bg-[#18181b] hover:bg-black text-white font-semibold rounded-2xl shadow-md shadow-slate-900/10 active:scale-[0.99] transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                                                        >
                                                            {loading ? (
                                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <FiPlus size={18} />
                                                                    <span>Register Student & Generate Certificate</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* ALL STUDENTS VIEW */}
                            {activeView === 'all-students' && (
                                <div className="animate-in fade-in duration-300">
                                    {/* Search & Filter Bar */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                        <div className="relative flex-1 max-w-md">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                                                <FiSearch size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Search by name or ID..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-2xl focus:bg-white focus:border-slate-300 focus:ring-4 focus:ring-sky-500/10 text-slate-800 text-sm font-medium placeholder:text-slate-400 shadow-sm transition-all outline-none"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                            <span className="text-xs font-semibold text-slate-500">{students.length} Students Total</span>
                                        </div>
                                    </div>

                                    {/* Students Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {(() => {
                                            const filtered = students.filter(s =>
                                                s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                s.student_id.toLowerCase().includes(searchQuery.toLowerCase())
                                            );

                                            if (filtered.length === 0) return (
                                                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 font-medium text-sm">No students found matching "{searchQuery}"</p>
                                                </div>
                                            );

                                            return filtered.map((student) => (
                                                <div
                                                    key={student.id}
                                                    className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)] hover:shadow-md hover:border-slate-300/90 transition-all p-5 flex flex-col justify-between group cursor-pointer"
                                                    onClick={() => openDetailView(student)}
                                                >
                                                    <div>
                                                        <div className="flex items-start gap-4">
                                                            <div className="relative flex-shrink-0">
                                                                {student.profile_photo_url ? (
                                                                    <img src={student.profile_photo_url} alt={student.name} className="w-16 h-16 rounded-2xl object-cover border border-slate-100 shadow-sm" />
                                                                ) : (
                                                                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200/60">
                                                                        <FiUsers size={26} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="text-base font-bold text-slate-900 truncate leading-snug">{student.name}</h3>
                                                                <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                                                                        ID: {student.student_id}
                                                                    </span>
                                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-slate-100 text-slate-600">
                                                                        {student.entry_session}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Card Actions Footer */}
                                                    <div className="grid grid-cols-4 gap-1.5 mt-5 pt-3.5 border-t border-slate-100">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openDetailView(student); }}
                                                            className="flex flex-col items-center justify-center py-2 px-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                                                            title="View Details"
                                                        >
                                                            <FiInfo size={16} className="mb-0.5" />
                                                            <span className="text-[10px] font-medium">Details</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); downloadQRCodePNG(student.qr_code_url!, student.name); }}
                                                            className="flex flex-col items-center justify-center py-2 px-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                                                            title="Download PNG QR"
                                                        >
                                                            <FiDownload size={16} className="mb-0.5" />
                                                            <span className="text-[10px] font-medium">PNG</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); downloadQRCodePDF(student.qr_code_url!, student.name, student.student_id); }}
                                                            className="flex flex-col items-center justify-center py-2 px-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                                                            title="Download PDF Certificate"
                                                        >
                                                            <FiFileText size={16} className="mb-0.5" />
                                                            <span className="text-[10px] font-medium">PDF</span>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openDeleteModal(student.id, student.name); }}
                                                            className="flex flex-col items-center justify-center py-2 px-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                            title="Delete Student"
                                                        >
                                                            <FiTrash2 size={16} className="mb-0.5" />
                                                            <span className="text-[10px] font-medium">Delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ));
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* MANAGE COURSES VIEW */}
                            {activeView === 'manage-courses' && (
                                <div className="animate-in fade-in duration-300">
                                    <ManageCoursesView onCoursesChange={fetchCourses} />
                                </div>
                            )}
                        </div>

                        {/* Mobile Navigation Dock */}
                        <div className="fixed bottom-4 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200/90 md:hidden flex justify-around p-2.5 z-50 rounded-2xl shadow-lg">
                            <button
                                onClick={() => setActiveView('all-students')}
                                className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${
                                    activeView === 'all-students' ? 'text-white bg-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <FiUsers size={20} />
                            </button>
                            <button
                                onClick={() => setActiveView('add-student')}
                                className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${
                                    activeView === 'add-student' ? 'text-white bg-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <FiPlus size={20} />
                            </button>
                            <button
                                onClick={() => setActiveView('manage-courses')}
                                className={`flex flex-col items-center p-2.5 rounded-xl transition-all ${
                                    activeView === 'manage-courses' ? 'text-white bg-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <FiBookOpen size={20} />
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
