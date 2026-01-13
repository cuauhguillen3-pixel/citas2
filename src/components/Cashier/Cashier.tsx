import { useEffect, useState } from 'react';
import { Plus, DollarSign, CreditCard, Smartphone, Calendar, TrendingUp, LockKeyhole, UnlockKeyhole, History, Banknote } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Transaction {
  id: string;
  total_amount: number;
  payment_method: string;
  status: string;
  notes: string;
  created_at: string;
  clients: { full_name: string } | null;
}

interface CashRegisterShift {
  id: string;
  opening_amount: number;
  closing_amount: number | null;
  expected_amount: number | null;
  difference_amount: number | null;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string;
  opened_by: string;
}

export default function Cashier() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<CashRegisterShift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<CashRegisterShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    client_id: '',
    service_id: '',
    payment_method: 'cash',
    notes: '',
  });

  const [openingAmount, setOpeningAmount] = useState('0');
  const [closingAmount, setClosingAmount] = useState('0');
  const [closeNotes, setCloseNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transactionsRes, clientsRes, servicesRes, currentShiftRes, historyRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, clients(full_name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('clients').select('*').order('full_name'),
        supabase.from('services').select('*').eq('active', true).order('name'),
        supabase
          .from('cash_register_shifts')
          .select('*')
          .eq('status', 'open')
          .maybeSingle(),
        supabase
          .from('cash_register_shifts')
          .select('*')
          .eq('status', 'closed')
          .order('closed_at', { ascending: false })
          .limit(10),
      ]);

      if (transactionsRes.error) {
        console.error('Error loading transactions:', transactionsRes.error);
        setTransactions([]);
      } else {
        setTransactions(transactionsRes.data || []);
      }

      if (clientsRes.error) {
        console.error('Error loading clients:', clientsRes.error);
        setClients([]);
      } else {
        setClients(clientsRes.data || []);
      }

      if (servicesRes.error) {
        console.error('Error loading services:', servicesRes.error);
        setServices([]);
      } else {
        setServices(servicesRes.data || []);
      }

      if (currentShiftRes.error) {
        console.error('Error loading current shift:', currentShiftRes.error);
        setCurrentShift(null);
      } else {
        setCurrentShift(currentShiftRes.data);
      }

      if (historyRes.error) {
        console.error('Error loading shift history:', historyRes.error);
        setShiftHistory([]);
      } else {
        setShiftHistory(historyRes.data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.rpc('open_new_shift', {
        p_opened_by: user!.id,
        p_opening_amount: parseFloat(openingAmount),
      });

      if (error) throw error;

      setOpeningAmount('0');
      setShowOpenShiftModal(false);
      await loadData();
    } catch (error: any) {
      alert('Error al abrir caja: ' + error.message);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentShift) return;

    try {
      const shiftTransactions = transactions.filter(t => {
        const transDate = new Date(t.created_at);
        const shiftDate = new Date(currentShift.opened_at);
        return transDate >= shiftDate;
      });

      const expectedCash = shiftTransactions
        .filter(t => t.payment_method === 'cash')
        .reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);

      const expectedTotal = parseFloat(currentShift.opening_amount.toString()) + expectedCash;
      const actualClosing = parseFloat(closingAmount);
      const difference = actualClosing - expectedTotal;

      const { error } = await supabase
        .from('cash_register_shifts')
        .update({
          closing_amount: actualClosing,
          expected_amount: expectedTotal,
          difference_amount: difference,
          closed_by: user!.id,
          closed_at: new Date().toISOString(),
          status: 'closed',
          notes: closeNotes,
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      setClosingAmount('0');
      setCloseNotes('');
      setShowCloseShiftModal(false);
      loadData();
    } catch (error: any) {
      alert('Error al cerrar caja: ' + error.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentShift) {
      alert('Debes abrir la caja primero');
      return;
    }

    try {
      const selectedService = services.find(s => s.id === formData.service_id);
      if (!selectedService) {
        alert('Selecciona un servicio válido');
        return;
      }

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          client_id: formData.client_id || null,
          total_amount: selectedService.price,
          payment_method: formData.payment_method,
          notes: formData.notes,
          status: 'completed',
          created_by: user!.id,
          cash_register_shift_id: currentShift.id,
        })
        .select()
        .single();

      if (transactionError) throw transactionError;

      const { error: itemError } = await supabase.from('transaction_items').insert({
        transaction_id: transaction.id,
        service_id: formData.service_id,
        quantity: 1,
        unit_price: selectedService.price,
        subtotal: selectedService.price,
      });

      if (itemError) throw itemError;

      setFormData({
        client_id: '',
        service_id: '',
        payment_method: 'cash',
        notes: '',
      });
      setShowModal(false);
      loadData();
    } catch (error: any) {
      alert('Error al registrar venta: ' + error.message);
    }
  };

  const shiftTransactions = currentShift
    ? transactions.filter(t => {
        const transDate = new Date(t.created_at);
        const shiftDate = new Date(currentShift.opened_at);
        return transDate >= shiftDate;
      })
    : [];

  const shiftTotal = shiftTransactions.reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);
  const shiftCash = shiftTransactions
    .filter(t => t.payment_method === 'cash')
    .reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);
  const shiftCard = shiftTransactions
    .filter(t => t.payment_method === 'card' || t.payment_method === 'credit' || t.payment_method === 'debit')
    .reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);
  const shiftTransfer = shiftTransactions
    .filter(t => t.payment_method === 'transfer')
    .reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);
  const shiftOther = shiftTransactions
    .filter(t => t.payment_method === 'paypal' || t.payment_method === 'other')
    .reduce((sum, t) => sum + parseFloat(t.total_amount.toString()), 0);

  const expectedCashInRegister = currentShift
    ? parseFloat(currentShift.opening_amount.toString()) + shiftCash
    : 0;

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <DollarSign className="w-4 h-4" />;
      case 'card':
      case 'credit':
      case 'debit': return <CreditCard className="w-4 h-4" />;
      case 'transfer': return <Smartphone className="w-4 h-4" />;
      case 'paypal': return <Banknote className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'credit': return 'Crédito';
      case 'debit': return 'Débito';
      case 'transfer': return 'Transferencia';
      case 'paypal': return 'PayPal';
      case 'other': return 'Otro';
      default: return method;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Caja</h1>
          <p className="text-gray-600">Registra ventas y consulta ingresos</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-200 transition flex items-center gap-2"
          >
            <History className="w-5 h-5" />
            Historial
          </button>
          {currentShift ? (
            <button
              onClick={() => setShowCloseShiftModal(true)}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600 transition flex items-center gap-2"
            >
              <LockKeyhole className="w-5 h-5" />
              Cerrar Caja
            </button>
          ) : (
            <button
              onClick={() => setShowOpenShiftModal(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-600 transition flex items-center gap-2"
            >
              <UnlockKeyhole className="w-5 h-5" />
              Abrir Caja
            </button>
          )}
        </div>
      </div>

      {!currentShift ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <LockKeyhole className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Caja Cerrada</h2>
          <p className="text-gray-600 mb-4">Debes abrir la caja para comenzar a registrar ventas</p>
          <button
            onClick={() => setShowOpenShiftModal(true)}
            className="bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 transition"
          >
            Abrir Caja Ahora
          </button>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Turno Actual</p>
                <p className="text-xs text-blue-500">
                  Abierto: {new Date(currentShift.opened_at).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-blue-600 font-medium">Monto Inicial</p>
                <p className="text-lg font-bold text-blue-700">${parseFloat(currentShift.opening_amount.toString()).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Total Turno</span>
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-3xl font-bold">${shiftTotal.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">{shiftTransactions.length} ventas</p>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Efectivo</span>
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">${shiftCash.toFixed(2)}</p>
              <p className="text-xs opacity-75 mt-1">Esperado: ${expectedCashInRegister.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Tarjetas</span>
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">${shiftCard.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Transferencia</span>
                <Smartphone className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">${shiftTransfer.toFixed(2)}</p>
            </div>

            <div className="bg-gradient-to-br from-pink-500 to-rose-600 text-white rounded-xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium opacity-90">Otros</span>
                <Banknote className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">${shiftOther.toFixed(2)}</p>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={() => setShowModal(true)}
              className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-rose-600 hover:to-pink-700 transition flex items-center gap-2 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Nueva Venta
            </button>
          </div>
        </>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-500 mx-auto"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">
              {currentShift ? 'Ventas del Turno Actual' : 'Últimas Ventas'}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Método de Pago
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Monto
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(currentShift ? shiftTransactions : transactions).map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(transaction.created_at).toLocaleString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {transaction.clients?.full_name || 'Sin cliente'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        {getPaymentMethodIcon(transaction.payment_method)}
                        {getPaymentMethodLabel(transaction.payment_method)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                      ${parseFloat(transaction.total_amount.toString()).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showOpenShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Abrir Caja</h2>
            {currentShift && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Nota:</strong> Ya hay una caja abierta. Al abrir una nueva, la caja actual se cerrará automáticamente.
                </p>
              </div>
            )}
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monto Inicial en Efectivo *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el dinero inicial con el que abres la caja
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowOpenShiftModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-600 transition shadow-lg"
                >
                  Abrir Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseShiftModal && currentShift && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Cerrar Caja</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto Inicial:</span>
                  <span className="font-semibold">${parseFloat(currentShift.opening_amount.toString()).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ventas en Efectivo:</span>
                  <span className="font-semibold">${shiftCash.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-300 pt-2">
                  <span className="text-gray-800 font-medium">Efectivo Esperado:</span>
                  <span className="font-bold text-blue-700">${expectedCashInRegister.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Efectivo Real en Caja *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={closingAmount}
                  onChange={(e) => setClosingAmount(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Cuenta el efectivo real que hay en la caja
                </p>
              </div>
              {closingAmount && parseFloat(closingAmount) !== expectedCashInRegister && (
                <div className={`p-3 rounded-lg ${
                  parseFloat(closingAmount) > expectedCashInRegister
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-sm font-medium">
                    Diferencia: ${Math.abs(parseFloat(closingAmount) - expectedCashInRegister).toFixed(2)}
                    {parseFloat(closingAmount) > expectedCashInRegister ? ' de más' : ' de menos'}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del Cierre
                </label>
                <textarea
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Agrega observaciones sobre el turno..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCloseShiftModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-500 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-600 transition shadow-lg"
                >
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[80vh] overflow-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Historial de Cierres</h2>
            <div className="space-y-4">
              {shiftHistory.map((shift) => (
                <div key={shift.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Abierto</p>
                      <p className="text-sm font-medium">
                        {new Date(shift.opened_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Cerrado</p>
                      <p className="text-sm font-medium">
                        {shift.closed_at && new Date(shift.closed_at).toLocaleDateString('es-MX', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Esperado</p>
                      <p className="text-sm font-semibold text-blue-600">
                        ${shift.expected_amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Real</p>
                      <p className="text-sm font-semibold text-green-600">
                        ${shift.closing_amount?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                  {shift.difference_amount !== 0 && shift.difference_amount !== null && (
                    <div className={`mt-2 p-2 rounded ${
                      shift.difference_amount > 0
                        ? 'bg-yellow-50 text-yellow-700'
                        : 'bg-red-50 text-red-700'
                    }`}>
                      <p className="text-xs font-medium">
                        Diferencia: ${Math.abs(shift.difference_amount).toFixed(2)}
                        {shift.difference_amount > 0 ? ' de más' : ' de menos'}
                      </p>
                    </div>
                  )}
                  {shift.notes && (
                    <div className="mt-2 text-xs text-gray-600">
                      <p className="font-medium">Notas:</p>
                      <p>{shift.notes}</p>
                    </div>
                  )}
                </div>
              ))}
              {shiftHistory.length === 0 && (
                <p className="text-center text-gray-500 py-8">No hay historial de cierres</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-6 py-2 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Nueva Venta</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente (Opcional)
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="">Sin cliente</option>
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
                      {service.name} - ${service.price}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Método de Pago *
                </label>
                <select
                  required
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="cash">Efectivo</option>
                  <option value="debit">Tarjeta de Débito</option>
                  <option value="credit">Tarjeta de Crédito</option>
                  <option value="card">Tarjeta (Genérico)</option>
                  <option value="transfer">Transferencia</option>
                  <option value="paypal">PayPal</option>
                  <option value="other">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
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
                  Registrar Venta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
