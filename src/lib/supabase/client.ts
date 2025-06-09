
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://amntnscgdmxemsjotqdn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtbnRuc2NnZG14ZW1zam90cWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE0NjYzNTcsImV4cCI6MjA1NzA0MjM1N30.XZmGGcDWWQiGFYSsusaxeQlnYxTkRn5BvdD0o5R5C_M';

export const supabase = createClient(supabaseUrl, supabaseKey);
