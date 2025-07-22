
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { users } from '@/lib/data';
import { authService } from '@/lib/supabase/authService';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setSupabaseUser(currentUser);
        
        if (currentUser) {
          // Map Supabase user to local User type
          const localUser: User = {
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.email || '',
            email: currentUser.email || '',
            role: (currentUser.user_metadata?.role as UserRole) || 'admin',
            avatar: currentUser.user_metadata?.avatar_url
          };
          setUser(localUser);
        } else {
          // Fallback to local storage for development
          const savedUser = localStorage.getItem('secureGuardUser');
          if (savedUser) {
            setUser(JSON.parse(savedUser));
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Fallback to local storage
        const savedUser = localStorage.getItem('secureGuardUser');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange((supabaseUser) => {
      setSupabaseUser(supabaseUser);
      
      if (supabaseUser) {
        const localUser: User = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email || '',
          email: supabaseUser.email || '',
          role: (supabaseUser.user_metadata?.role as UserRole) || 'admin',
          avatar: supabaseUser.user_metadata?.avatar_url
        };
        setUser(localUser);
        localStorage.setItem('secureGuardUser', JSON.stringify(localUser));
      } else {
        setUser(null);
        localStorage.removeItem('secureGuardUser');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      // Try Supabase authentication first
      try {
        const { user: supabaseUser } = await authService.signIn(email, password);
        if (supabaseUser) {
          toast({
            title: 'Login successful',
            description: `Welcome back, ${supabaseUser.user_metadata?.name || supabaseUser.email}!`,
          });
          return;
        }
      } catch (supabaseError) {
        console.log('Supabase auth failed, trying local auth:', supabaseError);
      }

      // Fallback to local authentication for development
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!foundUser) {
        throw new Error('Invalid email or password');
      }
      
      setUser(foundUser);
      localStorage.setItem('secureGuardUser', JSON.stringify(foundUser));
      
      toast({
        title: 'Login successful (Local)',
        description: `Welcome back, ${foundUser.name}!`,
      });
    } catch (error) {
      toast({
        title: 'Login failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    setLoading(true);
    
    try {
      await authService.signUp(email, password, { name, role: 'admin' });
      
      toast({
        title: 'Sign up successful',
        description: 'Please check your email to verify your account.',
      });
    } catch (error) {
      toast({
        title: 'Sign up failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await authService.resetPassword(email);
      
      toast({
        title: 'Password reset sent',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (error) {
      toast({
        title: 'Password reset failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (supabaseUser) {
        await authService.signOut();
      }
      
      setUser(null);
      setSupabaseUser(null);
      localStorage.removeItem('secureGuardUser');
      
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout locally even if Supabase logout fails
      setUser(null);
      setSupabaseUser(null);
      localStorage.removeItem('secureGuardUser');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      supabaseUser,
      loading, 
      login, 
      logout,
      signUp,
      resetPassword,
      isAuthenticated: !!user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
