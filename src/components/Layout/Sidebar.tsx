import { Calendar, Users, DollarSign, Settings, LogOut, Sparkles, X, CreditCard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string, referenceId?: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, isOpen, onClose }: SidebarProps) {
  const { signOut, profile, subscription } = useAuth();

  const menuItems = [
    { id: 'appointments', label: 'Citas', icon: Calendar },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'cashier', label: 'Caja', icon: DollarSign },
    { id: 'services', label: 'Servicios', icon: Sparkles },
    { id: 'billing', label: 'Suscripción', icon: CreditCard },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-screen w-64 flex flex-col
        bg-gradient-to-b from-rose-600 to-pink-700 text-white
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-rose-500">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Estética</h1>
                <p className="text-xs text-rose-100">Sistema de Gestión</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <NotificationBell onNavigate={onViewChange} />
              </div>
              <button 
                onClick={onClose}
                className="md:hidden p-1 hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {profile && (
            <div className="mt-4 pt-4 border-t border-rose-500">
              <p className="text-sm font-medium">{profile.full_name}</p>
              <p className="text-xs text-rose-200">{profile.role === 'admin' ? 'Administrador' : 'Personal'}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      currentView === item.id
                        ? 'bg-white text-rose-600 shadow-lg font-semibold'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-rose-500">
          <button
            type="button"
            onClick={async () => {
              try {
                await signOut();
              } catch (error) {
                console.error('Error al cerrar sesión:', error);
              }
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition"
          >
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}
