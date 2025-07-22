
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lwkaoukallxwbpxlledz.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3a2FvdWthbGx4d2JweGxsZWR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxNTg5MTEsImV4cCI6MjA2ODczNDkxMX0.uboYKnAnGlgT8DlTnkJk5evSLt2Yr0rdALF6M6looTE';

export const supabase = createClient(supabaseUrl, supabaseKey);
