
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
import Offer from "./pages/Offer";
import Privacy from "./pages/Privacy";

const queryClient = new QueryClient();

const AUTH_CACHE_TIME = 60 * 60 * 1000;

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [ageVerified, setAgeVerified] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    const lastCheck = localStorage.getItem('last_auth_check');
    const cachedUser = localStorage.getItem('user_data');
    const now = Date.now();
    
    if (lastCheck && cachedUser && now - parseInt(lastCheck) < AUTH_CACHE_TIME) {
      setIsAuthenticated(true);
      setUserData(JSON.parse(cachedUser));
      setIsCheckingAuth(false);
    } else {
      checkAuth();
    }
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
        localStorage.setItem('user_data', JSON.stringify(data.user));
        localStorage.setItem('last_auth_check', Date.now().toString());
      } else {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        localStorage.removeItem('last_auth_check');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('last_auth_check');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (token: string, user: any) => {
    setIsAuthenticated(true);
    setUserData(user);
    localStorage.setItem('user_data', JSON.stringify(user));
    localStorage.setItem('last_auth_check', Date.now().toString());
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('last_auth_check');
    setIsAuthenticated(false);
    setUserData(null);
  };

  const handleAgeVerification = () => {
    setAgeVerified(true);
    checkAuth();
  };

  if (!ageVerified) {
    return <AgeVerificationModal onConfirm={handleAgeVerification} />;
  }

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
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index userData={userData} onLogout={handleLogout} />} />
            <Route path="/admin/photos" element={<PhotoManager />} />
            <Route path="/offer" element={<Offer />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;