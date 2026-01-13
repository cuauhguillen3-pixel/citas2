import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Clock, User, CheckCircle, XCircle, MessageCircle, Bell, BellRing } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../hooks/useNotifications';

interface Appointment {
  id: string;
  appointment_date: string;
  status: string;
  notes: string;
  whatsapp_sent: boolean;
  clients: { full_name: string; phone: string };
  services: { name: string; price: number; duration_minutes: number };
}

interface AppointmentsProps {
  highlightId?: string;
}

export default function Appointments({ highlightId }: AppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const { user } = useAuth();
  const { sendNotification, permission } = useNotifications();

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: '',
  });

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      checkUpcomingAppointments();
    }, 60000);

    return () => clearInterval(interval);
  }, [appointments]);

  const checkUpcomingAppointments = () => {
    const now = new Date();
    const upcoming = appointments.filter(apt => {
      if (apt.status !== 'scheduled') return false;

      const aptDate = new Date(apt.appointment_date);
      const diffMinutes = (aptDate.getTime() - now.getTime()) / (1000 * 60);

      return diffMinutes > 0 && diffMinutes <= 60;
    });

    upcoming.forEach(apt => {
      const aptDate = new Date(apt.appointment_date);
      const diffMinutes = Math.round((aptDate.getTime() - now.getTime()) / (1000 * 60));

      if (permission === 'granted') {
        sendNotification(`Cita en ${diffMinutes} minutos`, {
          body: `${apt.clients.full_name} - ${apt.services.name}`,
          icon: '/icon.png',
          tag: apt.id,
        });
      }
    });
  };

  const loadData = async () => {
    try {
      const [appointmentsRes, clientsRes, servicesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*, clients(full_name, phone), services(name, price, duration_minutes)')
          .order('appointment_date', { ascending: true }),
        supabase.from('clients').select('*').order('full_name'),
        supabase.from('services').select('*').eq('active', true).order('name'),
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setAppointments(appointmentsRes.data || []);
      setClients(clientsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;

      const { error } = await supabase.from('appointments').insert({
        client_id: formData.client_id,
        service_id: formData.service_id,
        appointment_date: appointmentDateTime,
        notes: formData.notes,
        status: 'scheduled',
        created_by: user!.id,
      });

      if (error) throw error;

      setFormData({
        client_id: '',
        service_id: '',
        appointment_date: '',
        appointment_time: '',
        notes: '',
      });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert('Error al crear cita: ' + error.message);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error: any) {
      alert('Error al actualizar estado: ' + error.message);
    }
  };

  const sendWhatsApp = (appointment: Appointment) => {
    const client = appointment.clients;
    const service = appointment.services;
    const date = new Date(appointment.appointment_date);
    const dateStr = date.toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `Hola ${client.full_name}!

Confirmación de cita:
📅 Servicio: ${service.name}
🕒 Fecha: ${dateStr}
⏰ Hora: ${timeStr}
💰 Precio: $${service.price}

¡Te esperamos! Si necesitas reagendar, avísanos con tiempo.`;

    const phone = client.phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    supabase
      .from('appointments')
      .update({ whatsapp_sent: true })
      .eq('id', appointment.id)
      .then(() => loadData());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Programada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      case 'no_show': return 'No Asistió';
      default: return status;
    }
  };

  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    const today = new Date();
    return aptDate.toDateString() === today.toDateString();
  });

  const upcomingAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date);
    const today = new Date();
    return aptDate > today && aptDate.toDateString() !== today.toDateString();
  });

  const scheduledTodayCount = todayAppointments.filter(apt => apt.status === 'scheduled').length;

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Agenda de Citas</h1>
          <p className="text-gray-600">Gestiona las citas de tus clientes</p>
        </div>
        {scheduledTodayCount > 0 && (
          <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-pulse">
            <BellRing className="w-6 h-6" />
            <div>
              <p className="text-sm font-medium">Citas Hoy</p>
              <p className="text-2xl font-bold">{scheduledTodayCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition flex items-center gap-2 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          Nueva Cita
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Hoy</h2>
              {todayAppointments.length > 0 && (
                <div className="flex items-center gap-2 text-rose-600">
                  <Bell className="w-5 h-5" />
                  <span className="font-semibold">{todayAppointments.length} citas</span>
                </div>
              )}
            </div>
            {todayAppointments.length === 0 ? (
              <p className="text-gray-500">No hay citas para hoy</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onStatusChange={updateStatus}
                    onSendWhatsApp={sendWhatsApp}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    isToday={true}
                    isHighlighted={highlightId === appointment.id}
                  />
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Próximas Citas</h2>
            {upcomingAppointments.length === 0 ? (
              <p className="text-gray-500">No hay citas próximas</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingAppointments.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onStatusChange={updateStatus}
                    onSendWhatsApp={sendWhatsApp}
                    getStatusColor={getStatusColor}
                    getStatusLabel={getStatusLabel}
                    isToday={false}
                    isHighlighted={highlightId === appointment.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Cita</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  required
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Servicio *
                </label>
                <select
                  required
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ${service.price} ({service.duration_minutes} min)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  required
                  value={formData.appointment_date}
                  onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora *
                </label>
                <input
                  type="time"
                  required
                  value={formData.appointment_time}
                  onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 text-white px-4 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition shadow-lg"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AppointmentCard({ appointment, onStatusChange, onSendWhatsApp, getStatusColor, getStatusLabel, isToday, isHighlighted }: any) {
  const date = new Date(appointment.appointment_date);
  const dateStr = date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  const now = new Date();
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / (1000 * 60));
  const isUpcoming = diffMinutes > 0 && diffMinutes <= 60 && appointment.status === 'scheduled';

  return (
    <div className={`bg-white rounded-xl shadow-md hover:shadow-lg transition p-6 ${isUpcoming || isHighlighted ? 'ring-2 ring-rose-500 ring-offset-2' : ''} ${isHighlighted ? 'animate-pulse' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-2">
          {isUpcoming && (
            <BellRing className="w-5 h-5 text-rose-500 animate-pulse mt-1" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{appointment.clients.full_name}</h3>
            <p className="text-sm text-gray-600">{appointment.services.name}</p>
            {isUpcoming && (
              <p className="text-xs font-semibold text-rose-600 mt-1">
                En {diffMinutes} minutos
              </p>
            )}
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(appointment.status)}`}>
          {getStatusLabel(appointment.status)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 mb-4">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          <span>{dateStr}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{timeStr} ({appointment.services.duration_minutes} min)</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>${appointment.services.price}</span>
        </div>
      </div>

      {appointment.status === 'scheduled' && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange(appointment.id, 'completed')}
            className="flex-1 bg-green-100 text-green-700 py-2 rounded-lg hover:bg-green-200 transition text-sm font-semibold flex items-center justify-center gap-1"
          >
            <CheckCircle className="w-4 h-4" />
            Completar
          </button>
          <button
            onClick={() => onSendWhatsApp(appointment)}
            className="flex-1 bg-blue-100 text-blue-700 py-2 rounded-lg hover:bg-blue-200 transition text-sm font-semibold flex items-center justify-center gap-1"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            onClick={() => onStatusChange(appointment.id, 'cancelled')}
            className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {appointment.whatsapp_sent && (
        <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          WhatsApp enviado
        </div>
      )}
    </div>
  );
}
