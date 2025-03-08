
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

// Make it available in the window object for easy access during development
declare global {
  interface Window {
    createAdminUser: typeof createAdminUser;
  }
}

// Only do this in development
if (process.env.NODE_ENV !== 'production') {
  window.createAdminUser = createAdminUser;
}
