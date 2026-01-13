import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, AlertTriangle, Clock, History } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { SUBSCRIPTION_PRICE_ID } from '../../lib/stripe';

export default function Billing() {
  const { user, profile, subscription, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (user) loadHistory();
    checkPaymentSuccess();
  }, [user]);

  const checkPaymentSuccess = async () => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (sessionId && user) {
      try {
        setLoading(true);
        // En producción, esto debería hacerse vía Webhook de Stripe para mayor seguridad.
        // Aquí lo hacemos desde el cliente para verificar el flujo inmediatamente.
        
        // 1. Registrar pago en historial
        await supabase.from('billing_history').insert({
          user_id: user.id,
          amount: 8.00,
          currency: 'USD',
          status: 'succeeded',
          stripe_payment_intent_id: sessionId
        });

        // 2. Actualizar perfil
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await supabase.from('profiles').update({
          subscription_status: 'active',
          current_period_end: nextMonth.toISOString(),
        }).eq('id', user.id);

        // 3. Actualizar estado local
        await refreshProfile();

        // 4. Limpiar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // 5. Recargar historial
        loadHistory();
        alert('¡Suscripción activada con éxito! Gracias por tu pago.');
      } catch (error: any) {
        console.error('Error al procesar confirmación de pago:', error);
        alert('Hubo un error al registrar tu pago: ' + (error.message || error));
      } finally {
        setLoading(false);
      }
    }
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('billing_history')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setHistory(data);
  };

  const handleSubscribe = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // 0. Refrescar sesión para asegurar token válido
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('No se pudo validar la sesión. Por favor inicia sesión nuevamente.');
      }
      console.log('Sesión validada. Token:', session.access_token.substring(0, 10) + '...');

      console.log('Token de sesión:', session.access_token);
      
      // 1. Integración REAL con Stripe usando fetch directo
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          priceId: SUBSCRIPTION_PRICE_ID,
          userId: user.id,
          email: user.email,
          origin: window.location.origin
        })
      });

      console.log('Status respuesta:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error body:', errorText);
        
        if (response.status === 401) {
           throw new Error('Error 401: No autorizado. Verifica que tu usuario esté activo.');
        }
        
        try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || errorText);
        } catch {
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();
      const { url } = data;

      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No se recibió URL de redirección de Stripe');
      }
      
      /*
      // --- SIMULACIÓN (Para desarrollo) ---
      console.log("Simulando pago... Para producción, descomentar código de Stripe y configurar Edge Function.");
      
      // Simular retraso de red
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 1. Crear registro de facturación
      const { error: billingError } = await supabase
        .from('billing_history')
        .insert({
          user_id: user.id,
          amount: 8.00,
          currency: 'USD',
          status: 'succeeded',
          stripe_payment_intent_id: 'pi_simulated_' + Math.random().toString(36).substr(2, 9)
        });

      if (billingError) throw billingError;

      // 2. Actualizar perfil
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          subscription_status: 'active',
          current_period_end: nextMonth.toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      window.location.reload();
      // ------------------------------------
      */
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Error al procesar el pago. Por favor intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-rose-600" />
          Suscripción y Facturación
        </h1>
        <p className="text-gray-500">Administra tu plan y método de pago</p>
      </div>

      {/* Current Plan Card */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-wider">Plan Actual</p>
              <h2 className="text-3xl font-bold mt-1">
                {subscription.status === 'trial' ? 'Periodo de Prueba' : 
                 subscription.status === 'active' ? 'Plan Premium' : 'Suscripción Vencida'}
              </h2>
            </div>
            {subscription.status === 'active' && (
              <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium border border-green-500/30">
                Activo
              </span>
            )}
          </div>
        </div>
        
        <div className="p-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
               {subscription.status === 'trial' && (
                  <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-xl border border-amber-100">
                    <Clock className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Te quedan {subscription.daysLeft} días de prueba</p>
                      <p className="text-sm">Disfruta de todas las funciones premium gratis.</p>
                    </div>
                  </div>
               )}

               {subscription.status === 'active' && (
                  <div className="flex items-center gap-3 text-green-700 bg-green-50 p-4 rounded-xl border border-green-100">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Suscripción Activa</p>
                      <p className="text-sm">
                        Tu próximo pago será el {profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : 'próximo mes'}.
                      </p>
                    </div>
                  </div>
               )}

               {(subscription.status === 'expired_trial' || subscription.status === 'past_due') && (
                  <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                    <AlertTriangle className="w-6 h-6" />
                    <div>
                      <p className="font-semibold">Tu suscripción ha expirado</p>
                      <p className="text-sm">Suscríbete para continuar usando el sistema.</p>
                    </div>
                  </div>
               )}

               <div className="space-y-3">
                 <div className="flex items-center gap-2 text-gray-700">
                   <CheckCircle className="w-5 h-5 text-green-500" />
                   <span>Acceso ilimitado al sistema</span>
                 </div>
                 <div className="flex items-center gap-2 text-gray-700">
                   <CheckCircle className="w-5 h-5 text-green-500" />
                   <span>Soporte técnico prioritario</span>
                 </div>
                 <div className="flex items-center gap-2 text-gray-700">
                   <CheckCircle className="w-5 h-5 text-green-500" />
                   <span>Copias de seguridad automáticas</span>
                 </div>
               </div>
            </div>

            <div className="w-full md:w-auto bg-gray-50 p-6 rounded-xl border border-gray-200 text-center">
              <p className="text-sm text-gray-500 mb-2">Precio mensual</p>
              <div className="text-4xl font-bold text-gray-900 mb-1">$8.00<span className="text-lg text-gray-500 font-normal">/mes</span></div>
              <p className="text-xs text-gray-400 mb-6">Facturado mensualmente</p>
              
              {subscription.status !== 'active' ? (
                <button
                  onClick={handleSubscribe}
                  disabled={loading}
                  className="w-full bg-rose-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-rose-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Suscribirse Ahora
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-1">Próximo pago:</p>
                  <p className="font-semibold text-gray-800">
                    {profile?.current_period_end ? new Date(profile.current_period_end).toLocaleDateString() : '-'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <History className="w-5 h-5" />
          Historial de Pagos
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-sm">
                <th className="pb-3 font-medium">Fecha</th>
                <th className="pb-3 font-medium">Concepto</th>
                <th className="pb-3 font-medium">Monto</th>
                <th className="pb-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {history.length > 0 ? (
                history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 text-gray-600">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-gray-800 font-medium">
                      Suscripción Mensual
                    </td>
                    <td className="py-3 text-gray-600">
                      ${item.amount.toFixed(2)}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === 'succeeded' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.status === 'succeeded' ? 'Pagado' : 'Fallido'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    No hay pagos registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}