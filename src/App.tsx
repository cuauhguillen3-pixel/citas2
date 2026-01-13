import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import LandingPage from './components/Landing/LandingPage';
import { useNotifications } from './hooks/useNotifications';
import { Bell, BellOff } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const { permission, requestPermission, sendNotification, isSupported } = useNotifications();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  useEffect(() => {
    if (user && isSupported && permission === 'default') {
      setShowNotificationPrompt(true);
    }
  }, [user, isSupported, permission]);

  // Reset to landing page when user logs out
  useEffect(() => {
    if (!user && !loading) {
      setShowLanding(true);
      setShowLogin(true);
    }
  }, [user, loading]);

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      sendNotification('Notificaciones Activadas', {
        body: 'Recibirás notificaciones sobre tus citas y ventas',
      });
    }
    setShowNotificationPrompt(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!user) {
    if (showLanding) {
      return (
        <LandingPage 
          onLogin={() => {
            setShowLanding(false);
            setShowLogin(true);
          }}
          onRegister={() => {
            setShowLanding(false);
            setShowLogin(false);
          }}
        />
      );
    }
    
    return showLogin ? (
      <Login 
        onToggle={() => setShowLogin(false)} 
        onBack={() => setShowLanding(true)}
      />
    ) : (
      <Register 
        onToggle={() => setShowLogin(true)} 
        onBack={() => setShowLanding(true)}
      />
    );
  }

  return (
    <>
      <Dashboard />
      {showNotificationPrompt && (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl p-6 max-w-sm z-50 border border-gray-200">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 mb-1">Activar Notificaciones</h3>
              <p className="text-sm text-gray-600 mb-4">
                Recibe alertas sobre tus citas y ventas directamente en tu dispositivo
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleEnableNotifications}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-rose-600 hover:to-pink-700 transition"
                >
                  Activar
                </button>
                <button
                  onClick={() => setShowNotificationPrompt(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Después
                </button>
              </div>
            </div>
            <button
              onClick={() => setShowNotificationPrompt(false)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <BellOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
