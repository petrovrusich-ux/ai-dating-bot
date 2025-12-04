
import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PhotoManager from "./components/PhotoManager";
import LoginPage from "./components/LoginPage";
import AgeVerificationModal from "./components/AgeVerificationModal";

const queryClient = new QueryClient();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    try {
      const response = await fetch('https://functions.poehali.dev/71202cd5-d4ad-46f9-9593-8829421586e1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': token,
        },
        body: JSON.stringify({ action: 'validate' }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setIsAuthenticated(true);
        setUserData(data.user);
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    setIsAuthenticated(true);
    setUserData(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    setIsAuthenticated(false);
    setUserData(null);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AgeVerificationModal />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index userData={userData} onLogout={handleLogout} />} />
            <Route path="/admin/photos" element={<PhotoManager />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;