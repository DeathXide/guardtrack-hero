
import { supabase } from './supabaseService';

/**
 * Use this script to create an admin user
 * Call this function from the browser console to create an admin user
 * 
 * Usage:
 * 1. Import the function in your app during development
 * 2. Call the function from the browser console:
 *    await window.createAdminUser('admin@example.com', 'password123', 'Admin User')
 */
export const createAdminUser = async (
  email: string,
  password: string,
  name: string
) => {
  console.log(`Creating admin user: ${email}`);
  
  try {
    // Sign up the user
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'admin',
        },
      },
    });
    
    if (signUpError) throw signUpError;
    
    console.log('User created in auth system:', authData);
    
    // Check if user was added to our users table by the trigger
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (userError) {
      console.log('User not found in users table, manually creating entry...');
      
      // If not added automatically, manually add to users table
      const { data: insertData, error: insertError } = await supabase
        .from('users')
        .insert({
          id: authData.user?.id,
          name,
          email,
          role: 'admin',
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      console.log('Admin user manually added to users table:', insertData);
    } else {
      console.log('Admin user already exists in users table:', userData);
    }
    
    console.log('Admin user creation process completed successfully!');
    return { success: true, user: authData.user };
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    return { success: false, error };
  }
};

// Define a type for our admin check results to resolve type issues
type AdminCheckResult = 
  | { success: true; exists: true; user?: undefined; error?: undefined }
  | { success: true; exists: false; user: any; error?: undefined }
  | { success: false; exists?: undefined; user?: undefined; error: any };

/**
 * Check if there's an admin user and create a default one if there isn't
 */
export const checkAndCreateDefaultAdmin = async (): Promise<AdminCheckResult> => {
  console.log('Checking for existing admin users...');
  
  try {
    // Check if any admin user exists
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .limit(1);
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log('No admin users found. Creating default admin...');
      // Using a valid email domain for testing
      const defaultEmail = 'admin@gmail.com';
      const defaultPassword = 'password123';
      const defaultName = 'Admin User';
      
      const result = await createAdminUser(defaultEmail, defaultPassword, defaultName);
      if (result.success) {
        return { success: true, exists: false, user: result.user };
      } else {
        throw result.error;
      }
    } else {
      console.log('Admin user already exists:', data[0]);
      return { success: true, exists: true };
    }
  } catch (error) {
    console.error('Error checking for admin users:', error);
    return { success: false, error };
  }
};

// Make it available in the window object for easy access during development
declare global {
  interface Window {
    createAdminUser: typeof createAdminUser;
    checkAndCreateDefaultAdmin: typeof checkAndCreateDefaultAdmin;
  }
}

// Only do this in development
if (process.env.NODE_ENV !== 'production') {
  window.createAdminUser = createAdminUser;
  window.checkAndCreateDefaultAdmin = checkAndCreateDefaultAdmin;
}

// Run the check when the app starts
if (typeof window !== 'undefined') {
  // Wait for DOM to be fully loaded to ensure Supabase is initialized
  window.addEventListener('DOMContentLoaded', () => {
    checkAndCreateDefaultAdmin().then(result => {
      if (result.success && result.exists) {
        console.log('Default admin user already exists');
      } else if (result.success && !result.exists) {
        console.log('Default admin user created successfully');
      } else {
        console.error('Failed to create default admin user:', result.error);
      }
    });
  });
}
