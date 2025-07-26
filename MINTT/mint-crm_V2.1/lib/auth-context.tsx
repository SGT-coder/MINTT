"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiService, User } from './api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated on app load
    const checkAuth = async () => {
      try {
        if (apiService.isAuthenticated()) {
          const userData = await apiService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Clear invalid tokens
        await apiService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await apiService.login({ email, password });
      // Get user details
      const userData = await apiService.getCurrentUser();
      if (!userData.is_active) {
        await apiService.logout();
        setUser(null);
        throw new Error("Your account is inactive. Please contact an administrator.");
      }
      setUser(userData);
    } catch (error: any) {
      console.error('Login failed:', error);
      // Provide more specific error messages
      let errorMessage = "Login failed. Please check your credentials and try again.";
      
      if (error.message === "Your account is inactive. Please contact an administrator.") {
        errorMessage = error.message;
      } else if (error.message.includes("401") || error.message.includes("Invalid credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.message.includes("Network error")) {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (error.message.includes("500") || error.message.includes("Internal server error")) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.logout();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 