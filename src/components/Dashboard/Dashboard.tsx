import { useState, useEffect } from 'react';
import { Menu, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../Layout/Sidebar';
import NotificationBell from '../Layout/NotificationBell';
import Appointments from '../Appointments/Appointments';
import Clients from '../Clients/Clients';
import Cashier from '../Cashier/Cashier';
import Services from '../Services/Services';
import Billing from '../Billing/Billing';

export default function Dashboard() {
  const [currentView, setCurrentView] = useState('appointments');
  const [referenceId, setReferenceId] = useState<string | undefined>(undefined);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { subscription } = useAuth();

  useEffect(() => {
    // Check for Stripe session_id in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('session_id')) {
      setCurrentView('billing');
    } else if (subscription.isLocked) {
      setCurrentView('billing');
    }
  }, [subscription.isLocked]);

  const handleViewChange = (view: string, refId?: string) => {
    setCurrentView(view);
    setReferenceId(refId);
    setIsMobileMenuOpen(false);
  };

  const renderView = () => {
    if (subscription.isLocked && currentView !== 'billing') {
      return <Billing />;
    }

    switch (currentView) {
      case 'appointments':
        return <Appointments highlightId={referenceId} />;
      case 'clients':
        return <Clients highlightId={referenceId} />;
      case 'cashier':
        return <Cashier />;
      case 'services':
        return <Services />;
      case 'billing':
        return <Billing />;
      default:
        return <Appointments />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 overflow-auto w-full flex flex-col">
        {subscription.status === 'trial' && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium animate-in slide-in-from-top duration-300">
            <AlertTriangle className="w-4 h-4" />
            <span>Modo de Prueba: Te quedan {subscription.daysLeft} días gratis.</span>
            <button 
              onClick={() => handleViewChange('billing')} 
              className="underline hover:text-amber-900 font-bold ml-1"
            >
              Suscribirse
            </button>
          </div>
        )}
        
        <div className="md:hidden bg-white border-b p-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 rounded-lg hover:bg-gray-100 text-gray-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="ml-3 font-semibold text-gray-800">Estética</span>
          </div>
          <NotificationBell onNavigate={handleViewChange} variant="dark" />
        </div>
        {renderView()}
      </main>
    </div>
  );
}
