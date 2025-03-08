
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabaseService';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  session: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up listener for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setLoading(true);
        setSession(currentSession);

        if (currentSession) {
          try {
            // Fetch user data from our users table
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('id', currentSession.user.id)
              .single();

            if (error) throw error;

            if (data) {
              setUser({
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role as UserRole,
                avatar: data.avatar,
              });
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initial session check
    const initializeAuth = async () => {
      setLoading(true);
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      setSession(initialSession);

      if (initialSession) {
        try {
          // Fetch user data from our users table
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();

          if (error) throw error;

          if (data) {
            setUser({
              id: data.id,
              name: data.name,
              email: data.email,
              role: data.role as UserRole,
              avatar: data.avatar,
            });
          }
        } catch (error) {
          console.error('Error fetching initial user data:', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      toast({
        title: 'Login successful',
        description: `Welcome back, ${data.user?.email}!`,
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

  const signup = async (email: string, password: string, name: string, role: UserRole = 'guard') => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
          },
        },
      });
      
      if (error) throw error;
      
      toast({
        title: 'Signup successful',
        description: 'Your account has been created. You may need to verify your email before logging in.',
      });
    } catch (error) {
      toast({
        title: 'Signup failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Logout failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setUser(null);
      setSession(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signup,
      logout,
      isAuthenticated: !!user,
      session
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
