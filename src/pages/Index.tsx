
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserRole } from '@/types';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('guard');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  
  // Set default admin credentials for development
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      setLoginEmail('admin@example.com');
      setLoginPassword('password123');
    }
  }, []);
  
  // Redirect if already logged in
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('User already authenticated, redirecting to dashboard...');
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);
  
  // If still loading authentication status, show a loading indicator
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    
    try {
      console.log(`Attempting to log in with: ${loginEmail}`);
      
      if (loginEmail === 'admin@example.com' && loginPassword === 'password123') {
        console.log('Using default admin login credentials');
      }
      
      await login(loginEmail, loginPassword);
      toast({
        title: 'Login successful',
        description: 'Welcome to SecureGuard!',
      });
      console.log('Login successful, redirecting to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setLoginError((error as Error).message || 'Failed to login. Please check your credentials.');
      toast({
        title: 'Login Failed',
        description: (error as Error).message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setLoginLoading(false);
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError('');
    
    try {
      await signup(signupEmail, signupPassword, signupName, signupRole);
      toast({
        title: 'Account Created',
        description: 'Your account has been created. You can now log in.',
        variant: 'default',
      });
      setActiveTab('login');
      setLoginEmail(signupEmail);
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupRole('guard');
    } catch (error) {
      console.error('Signup error:', error);
      setSignupError((error as Error).message || 'Failed to create account.');
      toast({
        title: 'Signup Failed',
        description: (error as Error).message || 'Please try again with a different email.',
        variant: 'destructive',
      });
    } finally {
      setSignupLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-secondary/30 p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="inline-flex items-center justify-center rounded-lg bg-primary p-2 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SecureGuard</h1>
          <p className="text-muted-foreground mt-2">Attendance Management System</p>
        </div>
        
        <Card className="glass-card shadow-lg">
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
            <CardHeader>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="mt-4">
                <CardTitle>Sign in</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-4">
                <CardTitle>Sign up</CardTitle>
                <CardDescription>
                  Create a new account to access the system
                </CardDescription>
              </TabsContent>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <a href="#" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  {loginError && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {loginError}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginLoading}
                  >
                    {loginLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 6 characters long
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select
                      value={signupRole}
                      onValueChange={(value) => setSignupRole(value as UserRole)}
                      required
                    >
                      <SelectTrigger id="signup-role">
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guard">Guard</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Admin accounts can only be created by existing administrators
                    </p>
                  </div>
                  
                  {signupError && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {signupError}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={signupLoading}
                  >
                    {signupLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                {activeTab === 'login' ? (
                  <span>Don't have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab('signup')}>Sign up</Button></span>
                ) : (
                  <span>Already have an account? <Button variant="link" className="p-0" onClick={() => setActiveTab('login')}>Sign in</Button></span>
                )}
              </div>
            </CardFooter>
          </Tabs>
        </Card>
        
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 p-3 bg-muted rounded-md text-xs">
            <p>Default admin: admin@example.com / password123</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
