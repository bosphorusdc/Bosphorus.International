'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase, Course } from '@/lib/supabase';
import confetti from 'canvas-confetti';
import { FiCheck, FiShield, FiUser, FiAward } from 'react-icons/fi';

interface StudentWithCourses {
  id: string;
  student_id: string;
  name: string;
  profile_photo_url: string | null;
  entry_session: string;
  graduation_date: string | null;
  courses: Course[];
}

export default function CertificatePage() {
  const params = useParams();
  const [student, setStudent] = useState<StudentWithCourses | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentData();
  }, [params.id]);

  useEffect(() => {
    if (student) {
      // Trigger subtle celebration confetti on successful verification
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval: NodeJS.Timeout = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 30 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.15, 0.35), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.65, 0.85), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [student]);

  const fetchStudentData = async () => {
    try {
      if (!params.id) return;
      const paramIdentifier = decodeURIComponent(params.id as string).trim();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paramIdentifier);

      let foundStudent = null;

      // 1. Try UUID lookup
      if (isUuid) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('id', paramIdentifier)
          .maybeSingle();
        if (data) foundStudent = data;
      }

      // 2. Try student_id lookup
      if (!foundStudent) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .eq('student_id', paramIdentifier)
          .maybeSingle();
        if (data) foundStudent = data;
      }

      // 3. Try matching by slugified name or exact name (case-insensitive)
      if (!foundStudent) {
        const { data: allStudents } = await supabase
          .from('students')
          .select('*');

        if (allStudents) {
          const targetSlug = paramIdentifier.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          foundStudent = allStudents.find((s) => {
            const nameSlug = s.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            return (
              nameSlug === targetSlug ||
              s.name.toLowerCase().trim() === paramIdentifier.toLowerCase().trim() ||
              s.student_id.toLowerCase().trim() === paramIdentifier.toLowerCase().trim()
            );
          }) || null;
        }
      }

      if (!foundStudent) {
        setStudent(null);
        return;
      }

      // Fetch student courses using resolved student UUID
      const { data: studentCoursesData, error: coursesError } = await supabase
        .from('student_courses')
        .select('course_id')
        .eq('student_id', foundStudent.id);

      if (coursesError) throw coursesError;

      const courseIds = (studentCoursesData || []).map(sc => sc.course_id);

      let coursesData: Course[] = [];
      if (courseIds.length > 0) {
        const { data: cData, error: courseDetailsError } = await supabase
          .from('courses')
          .select('*')
          .in('id', courseIds)
          .order('course_number');

        if (courseDetailsError) throw courseDetailsError;
        coursesData = cData || [];
      }

      setStudent({
        ...foundStudent,
        courses: coursesData
      });
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-amber-200 font-cinzel p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <div className="text-xs sm:text-sm tracking-widest uppercase font-semibold text-center">
            Verifying Official Certificate...
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center border border-amber-400/40">
          <FiShield className="text-4xl text-amber-500 mx-auto mb-3" />
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">Invalid Verification Record</h1>
          <p className="text-slate-500 mt-1 text-xs leading-relaxed">
            This certificate record could not be verified in the Bosphorus International registry database.
          </p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formattedGraduationDate = formatDate(student.graduation_date);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-800 flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-8 selection:bg-amber-100 font-sans">
      
      {/* ONLINE VERIFICATION DIPLOMA CARD */}
      <div className="max-w-5xl w-full relative z-10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-xl overflow-hidden">
        
        {/* Parchment Base Surface */}
        <div className="bg-[#FAF8F5] p-4 sm:p-6 md:p-8 lg:p-10 relative border-[6px] sm:border-[10px] border-slate-900 min-h-[500px] flex flex-col justify-between">
          
          {/* Dual Precision Gold Hairline Frame */}
          <div className="absolute inset-2 sm:inset-2.5 border border-amber-600/50 pointer-events-none" />
          <div className="absolute inset-3 sm:inset-3.5 border border-amber-500/25 pointer-events-none" />

          {/* Corner Motifs */}
          <div className="absolute top-3.5 left-3.5 sm:top-5 sm:left-5 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-l-2 border-amber-600/80 pointer-events-none" />
          <div className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 w-3 h-3 sm:w-4 sm:h-4 border-t-2 border-r-2 border-amber-600/80 pointer-events-none" />
          <div className="absolute bottom-3.5 left-3.5 sm:bottom-5 sm:left-5 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-l-2 border-amber-600/80 pointer-events-none" />
          <div className="absolute bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 w-3 h-3 sm:w-4 sm:h-4 border-b-2 border-r-2 border-amber-600/80 pointer-events-none" />

          {/* Ultra-Faint Background Watermark Seal */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none select-none">
            <img src="/bosphorus logo.jpg" alt="" className="w-80 h-80 sm:w-96 sm:h-96 object-contain rounded-full filter grayscale" />
          </div>

          {/* MAIN DIPLOMA STRUCTURE */}
          <div className="relative z-10 flex flex-col justify-between h-full gap-4 sm:gap-5">
            
            {/* HEADER ROW: INSTITUTION BRANDING & VERIFICATION STATUS */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3 border-b border-amber-800/15 pb-3 sm:pb-4 text-center sm:text-left">
              
              {/* Brand Header */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5 sm:gap-3.5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-amber-600/60 p-0.5 bg-white shadow-2xs flex-shrink-0 flex items-center justify-center">
                  <img
                    src="/bosphorus logo.jpg"
                    alt="Bosphorus International"
                    className="w-full h-full object-contain rounded-full"
                  />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold font-cinzel text-slate-900 tracking-[0.12em] uppercase leading-tight">
                    Bosphorus International
                  </h2>
                  <p className="text-[9px] sm:text-[10px] font-sans font-semibold text-amber-800 tracking-[0.18em] uppercase mt-0.5">
                    Cosmetology & Skin Care School
                  </p>
                </div>
              </div>

              {/* Right Document Metadata */}
              <div className="flex flex-col items-center sm:items-end text-[10px] sm:text-[11px] font-sans">
                <div className="text-slate-500 font-medium">
                  Document Ref: <span className="font-mono font-bold text-slate-800">BI-{student.student_id}</span>
                </div>
                <div className="inline-flex items-center gap-1 text-emerald-800 font-semibold mt-0.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 text-[10px]">
                  <FiCheck className="text-emerald-600 text-xs" />
                  <span>Official Verified Record</span>
                </div>
              </div>

            </div>

            {/* TOP ROW: SIDE-BY-SIDE EQUAL HEIGHT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
              
              {/* LEFT: STUDENT PHOTO & CREDENTIALS CARD */}
              <div className="w-full md:col-span-4 bg-amber-50/40 rounded-xl border border-amber-900/10 p-3 sm:p-3.5 flex flex-col items-center justify-between text-center shadow-2xs h-full">
                
                {/* Photo Frame */}
                <div className="w-20 h-26 sm:w-24 sm:h-30 md:w-26 md:h-32 p-1 bg-white rounded-lg border-2 border-amber-600/70 shadow-2xs relative">
                  <div className="w-full h-full bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {student.profile_photo_url ? (
                      <img
                        src={student.profile_photo_url}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-200 text-slate-400 flex flex-col items-center justify-center p-1.5">
                        <FiUser className="text-xl text-slate-400 mb-0.5" />
                        <span className="text-[7.5px] font-bold uppercase font-sans tracking-wider text-slate-500">No Photo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Label */}
                <div className="text-[9px] font-bold text-amber-900 font-sans tracking-widest uppercase my-1">
                  Graduate ID Photograph
                </div>

                {/* Student Credentials List */}
                <div className="w-full bg-white/90 rounded-lg p-2 border border-amber-200/60 text-left text-[10px] font-sans space-y-0.5 shadow-2xs">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                    <span className="text-slate-400 uppercase tracking-wider text-[8.5px]">Student ID</span>
                    <span className="font-bold text-slate-900 font-mono">{student.student_id}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-0.5">
                    <span className="text-slate-400 uppercase tracking-wider text-[8.5px]">Session</span>
                    <span className="font-semibold text-slate-800">{student.entry_session}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 uppercase tracking-wider text-[8.5px]">Graduated</span>
                    <span className="font-semibold text-slate-800">{formattedGraduationDate || 'Active Record'}</span>
                  </div>
                </div>

              </div>

              {/* RIGHT: CERTIFICATE TITLE, STUDENT NAME & STATEMENT (MATCHES HEIGHT OF LEFT CARD) */}
              <div className="w-full md:col-span-8 bg-white/50 rounded-xl border border-amber-900/10 p-3 sm:p-4 flex flex-col items-center justify-center text-center shadow-2xs h-full">
                
                {/* Certificate Sub-Badge */}
                <div className="mb-1.5">
                  <span className="text-[9.5px] sm:text-[10px] font-bold tracking-[0.22em] uppercase text-amber-900 font-sans px-2.5 py-0.5 bg-amber-100/60 rounded-full border border-amber-200">
                    Certificate of Completion
                  </span>
                </div>

                {/* Student Full Name */}
                <div className="my-1 text-center w-full">
                  <h1 className="text-xl sm:text-3xl md:text-4xl font-black font-cinzel tracking-wider text-slate-900 uppercase break-words leading-tight">
                    {student.name}
                  </h1>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-r from-transparent to-amber-600" />
                    <div className="w-1.5 h-1.5 bg-amber-600 rotate-45" />
                    <div className="w-8 sm:w-14 h-[1px] bg-gradient-to-l from-transparent to-amber-600" />
                  </div>
                </div>

                {/* Body Statement Text */}
                <p className="text-xs sm:text-sm font-cormorant text-slate-700 max-w-md leading-relaxed my-1 font-medium">
                  has successfully fulfilled all required academic coursework, laboratory training, and clinical practice benchmarks at Bosphorus International Cosmetology & Skin Care School.
                </p>

              </div>

            </div>

            {/* BOTTOM SECTION: COMPLETED CURRICULUM MODULES (SPANS FULL WIDTH) */}
            <div className="w-full bg-white/80 rounded-xl border border-amber-900/10 p-2.5 sm:p-3 shadow-2xs text-left">
              <div className="text-[8.5px] sm:text-[9.5px] font-bold tracking-widest text-amber-900 uppercase font-sans mb-1.5 border-b border-amber-100 pb-1">
                Completed Curriculum Modules ({student.courses.length})
              </div>

              {student.courses.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-1 font-serif">
                  General Cosmetology & Skin Care Curriculum.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {student.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center gap-1.5 px-2 py-1 bg-amber-50/40 border border-slate-200/80 rounded-lg text-left transition-colors"
                    >
                      <FiCheck className="text-emerald-700 text-[11px] flex-shrink-0" />
                      <span className="text-[9.5px] sm:text-[10.5px] font-bold text-slate-900 font-sans truncate">
                        {course.course_name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* FOOTER: CENTERED COMPACT OFFICIAL GOLD SEAL */}
            <div className="border-t border-amber-800/15 pt-2 flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 sm:w-12 h-[1px] bg-gradient-to-r from-transparent via-amber-600/50 to-amber-600" />
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-amber-500 bg-slate-900 text-amber-300 flex flex-col items-center justify-center shadow-xs p-0.5">
                    <FiAward className="text-amber-400 text-xs" />
                    <span className="text-[5.5px] sm:text-[6px] font-bold font-cinzel tracking-wider uppercase text-amber-200">
                      OFFICIAL
                    </span>
                  </div>
                  <span className="text-[7.5px] sm:text-[8px] font-bold text-amber-900 tracking-widest uppercase font-sans mt-0.5">
                    Verified Seal of Excellence
                  </span>
                </div>
                <div className="w-8 sm:w-12 h-[1px] bg-gradient-to-l from-transparent via-amber-600/50 to-amber-600" />
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}


