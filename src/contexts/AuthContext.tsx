
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/components/ui/use-toast";

// Define types
type UserRole = 'jobseeker' | 'employer';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  company?: string; 
  title?: string; 
  skills?: string[]; 
  about?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<void>;
  logout: () => void;
  updateProfile: (updatedData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('hiresphere_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const users = JSON.parse(localStorage.getItem('hiresphere_users') || '[]');
      const foundUser = users.find((u: any) => u.email === email);
      
      if (!foundUser || foundUser.password !== password) {
        throw new Error('Invalid credentials');
      }
      
      const { password: _, ...userWithoutPassword } = foundUser;
      
      setUser(userWithoutPassword);
      localStorage.setItem('hiresphere_user', JSON.stringify(userWithoutPassword));
      
      toast({
        title: "Welcome back!",
        description: `You're logged in as ${userWithoutPassword.name}`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: Omit<User, 'id'> & { password: string }) => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call
      const users = JSON.parse(localStorage.getItem('hiresphere_users') || '[]');
      
      // Check if email already exists
      if (users.some((u: any) => u.email === userData.email)) {
        throw new Error('Email already registered');
      }
      
      // Create new user with ID
      const newUser = {
        ...userData,
        id: `user_${Date.now()}`,
      };
      
      // Save updated users list
      users.push(newUser);
      localStorage.setItem('hiresphere_users', JSON.stringify(users));
      
      // Save user to state without password
      const { password: _, ...userWithoutPassword } = newUser;
      setUser(userWithoutPassword);
      localStorage.setItem('hiresphere_user', JSON.stringify(userWithoutPassword));
      
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('hiresphere_user');
    toast({
      title: "Logged out",
      description: "You've been successfully logged out",
    });
  };

  // Update profile
  const updateProfile = async (updatedData: Partial<User>) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Update user in state
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      
      // Update in localStorage
      localStorage.setItem('hiresphere_user', JSON.stringify(updatedUser));
      
      // Update in users list
      const users = JSON.parse(localStorage.getItem('hiresphere_users') || '[]');
      const updatedUsers = users.map((u: any) => 
        u.id === user.id ? { ...u, ...updatedData } : u
      );
      localStorage.setItem('hiresphere_users', JSON.stringify(updatedUsers));
      
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook for using auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
