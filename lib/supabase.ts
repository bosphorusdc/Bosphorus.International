import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Get the site URL for QR codes (use production URL when deployed)
export const getSiteUrl = () => {
  return process.env.NEXT_PUBLIC_SITE_URL || 
         (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
};

export interface Course {
  id: number;
  course_number: number;
  course_name: string;
  session_type: string;
}

export interface Student {
  id: string;
  student_id: string;
  name: string;
  profile_photo_url: string | null;
  entry_session: string;
  graduation_date: string | null;
  qr_code_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentCourse {
  id: number;
  student_id: string;
  course_id: number;
  enrolled_at: string;
}

export interface StudentWithCourses extends Student {
  courses: Course[];
}

export interface OnlineRegistration {
  id: string;
  full_name: string;
  phone_number: string;
  status: 'pending' | 'contacted' | 'enrolled' | 'archived';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClinicService {
  id: string;
  title: string;
  category: string;
  price: string | null;
  duration: string | null;
  image_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BeforeAfterCase {
  id: string;
  title: string;
  category: string;
  before_image_url: string;
  after_image_url: string;
  treatment_used: string | null;
  sessions_count: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GalleryItemRecord {
  id: string;
  title: string;
  category: string;
  media_type: 'image' | 'video';
  media_url: string;
  thumbnail_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

