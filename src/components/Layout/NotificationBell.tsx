import { Bell, X, Check, Calendar, Clock, DollarSign, Info } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  module: string;
  reference_id: string | null;
  read: boolean;
  created_at: string;
}

interface NotificationBellProps {
  onNavigate: (module: string, referenceId?: string) => void;
  variant?: 'light' | 'dark';
}

export default function NotificationBell({ onNavigate, variant = 'light' }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadNotifications();

      const subscription = supabase
        .channel('notifications_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            loadNotifications();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const loadNotifications = async () => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
      
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    setShowDropdown(false);
    onNavigate(notification.module, notification.reference_id || undefined);
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds);

      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'reminder':
        return <Clock className="w-5 h-5 text-orange-500" />;
      case 'transaction':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          variant === 'light' 
            ? 'text-white hover:bg-white/10 active:scale-95' 
            : 'text-gray-600 hover:bg-gray-100 active:scale-95'
        }`}
      >
        <Bell className={`w-6 h-6 ${variant === 'light' ? 'text-white' : 'text-gray-600'}`} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-transparent shadow-sm animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className={`
          absolute z-50 mt-3 w-[calc(100vw-2rem)] sm:w-96
          bg-white rounded-2xl shadow-2xl ring-1 ring-black/5
          transform transition-all duration-200 origin-top-right
          ${variant === 'light' 
            ? 'left-0 sm:left-auto sm:right-0 md:left-full md:top-0 md:ml-4' 
            : 'right-0 top-full'
          }
          max-w-md
        `}>
          <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-rose-500 to-pink-600 rounded-t-2xl">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notificaciones
              {unreadCount > 0 && (
                <span className="text-xs bg-white text-rose-600 px-2 py-0.5 rounded-full font-extrabold">
                  {unreadCount}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs text-rose-100 hover:text-white font-medium underline decoration-rose-300 underline-offset-2 transition"
                >
                  Marcar leídas
                </button>
              )}
              <button 
                onClick={() => setShowDropdown(false)}
                className="text-white/80 hover:text-white sm:hidden"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="max-h-[70vh] sm:max-h-[32rem] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500 mx-auto mb-2"></div>
                Cargando...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">¡Estás al día!</p>
                <p className="text-xs text-gray-400 mt-1">No tienes nuevas notificaciones</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-4 text-left transition-all duration-200 hover:bg-gray-50 group ${
                      !notification.read ? 'bg-rose-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`
                        flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                        ${!notification.read ? 'bg-white shadow-sm ring-1 ring-rose-100' : 'bg-gray-100'}
                      `}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className={`text-sm font-semibold truncate pr-2 ${!notification.read ? 'text-gray-900' : 'text-gray-600'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                            {formatTime(notification.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 self-center">
                          <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
