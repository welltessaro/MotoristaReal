
import React, { useEffect, useState, useMemo } from 'react';
import { User, Vehicle, Transaction, ViewState, OwnershipStatus, RentalPeriod, AppVersionInfo, TransactionType } from './types';
import { MockBackend } from './services/mockBackend';
import { loginWithGoogle, logoutFirebase } from './services/firebase';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { TransactionModal } from './components/TransactionModal';
import { Button } from './components/ui/Button';
import { 
  Car, Bike, ChevronRight, ChevronDown, LogOut, PlusCircle, TrendingUp, 
  ShieldCheck, DollarSign, Calendar, AlertCircle, Gauge, Check, X, 
  Lock, Download, Shield, ArrowLeftRight, Trophy, Sparkles, Rocket, 
  Info, RefreshCw, PieChart as PieChartIcon, TrendingDown, Package, Settings, Search,
  Wallet, CreditCard, Key, Hash, Filter, ArrowLeft, Edit3, History as LucideHistory,
  Wrench, Save, Receipt, Zap, TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';

const BR_BRANDS = [
  'Chevrolet', 'Fiat', 'Volkswagen', 'Hyundai', 'Toyota', 'Jeep', 'Renault', 'Honda', 'Nissan', 'BYD', 'Caoa Chery', 'Ford', 'Citroën', 'Peugeot', 'Mitsubishi', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'GWM', 'Ram', 'Kia', 'Land Rover', 'Suzuki', 'Yamaha', 'Mottu', 'Shineray', 'Outros'
].sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b));

export const formatCurrency = (value: number | string): string => {
  const val = typeof value === 'number' ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val);
};

export const formatDecimal = (value: number | string, decimals = 2): string => {
  const val = typeof value === 'number' ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
};

export const parseBRL = (value: string): number => {
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
  return parseInt(cleanValue, 10) / 100;
};

export const formatPlate = (value: string): string => {
  const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (clean.length <= 3) return clean;
  return clean.slice(0, 7);
};

const ReportsView = ({ transactions }: { transactions: Transaction[] }) => {
  const data = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const dayTxs = transactions.filter(t => t.date === date);
      return {
        date: date.split('-').slice(1).reverse().join('/'),
        earnings: dayTxs.filter(t => t.type === 'earning').reduce((acc, t) => acc + t.amount, 0),
        expenses: dayTxs.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0),
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tighter">Relatórios</h2>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'transparent' }} />
            <Bar dataKey="earnings" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CompareView = ({ vehicles, transactions, onBack }: any) => {
  const comparisonData = useMemo(() => {
    return vehicles.map((v: Vehicle) => {
      const vTxs = transactions.filter((t: Transaction) => t.vehicleId === v.vehicleId);
      
      const earnings = vTxs.filter((t: Transaction) => t.type === 'earning').reduce((acc: number, t: Transaction) => acc + t.amount, 0);
      const directExpenses = vTxs.filter((t: Transaction) => t.type === 'expense').reduce((acc: number, t: Transaction) => acc + t.amount, 0);
      
      // Cálculo de manutenção e custos fixos amortizados (estimado pelo histórico de dias com transação)
      const uniqueDays = new Set(vTxs.map(t => t.date)).size;
      const daysCount = Math.max(1, uniqueDays);

      let dailyFixed = 0;
      if (v.ownershipStatus === 'financiado' && v.installmentValue) dailyFixed += v.installmentValue / 30;
      else if (v.ownershipStatus === 'alugado' && v.rentalValue) dailyFixed += v.rentalValue / (v.rentalPeriod === 'semanal' ? 7 : 30);
      if (v.hasInsurance && v.insuranceValue) dailyFixed += v.insuranceValue / 365;

      const totalAmortized = dailyFixed * daysCount;
      const profit = earnings - directExpenses - totalAmortized;

      return {
        ...v,
        earnings,
        directExpenses,
        totalAmortized,
        profit
      };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }, [vehicles, transactions]);

  const bestVehicle = comparisonData[0];

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm active:scale-90 transition-all">
          <ArrowLeft size={20} className="text-brand-navy dark:text-white" />
        </button>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Comparativo Real</h2>
      </div>

      {comparisonData.length > 0 && (
        <div className="bg-gradient-to-br from-brand-primary to-brand-navy p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10"><Trophy size={120} /></div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80 text-brand-surface">Líder de Eficiência</p>
          <h3 className="text-2xl font-black mb-4">{bestVehicle.model}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black uppercase opacity-60">Lucro Acumulado</p>
              <p className="text-2xl font-black">{formatCurrency(bestVehicle.profit)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase opacity-60">ROI Estimado</p>
              <p className="text-2xl font-black">+{((bestVehicle.profit / (bestVehicle.directExpenses + bestVehicle.totalAmortized || 1)) * 100).toFixed(0)}%</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comparisonData.map((v: any) => (
          <div key={v.vehicleId} className="bg-white dark:bg-[#2b2930] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm relative group overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="font-black text-brand-navy dark:text-white text-lg">{v.model}</h4>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{v.plate}</p>
              </div>
              <div className={`p-3 rounded-2xl ${v.profit >= 0 ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-red-500/10 text-red-500'}`}>
                {v.type === 'carro' ? <Car size={20} /> : <Bike size={20} />}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Ganhos</p>
                <p className="text-xs font-black text-brand-emerald">{formatCurrency(v.earnings)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Custos</p>
                <p className="text-xs font-black text-red-500">{formatCurrency(v.directExpenses + v.totalAmortized)}</p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Saldo</p>
                <p className={`text-xs font-black ${v.profit >= 0 ? 'text-brand-primary' : 'text-red-500'}`}>{formatCurrency(v.profit)}</p>
              </div>
            </div>

            <div className="space-y-1">
               <div className="flex justify-between text-[9px] font-black text-gray-400 uppercase">
                  <span>Eficiência vs Líder</span>
                  <span>{((v.profit / (bestVehicle.profit || 1)) * 100).toFixed(0)}%</span>
               </div>
               <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-brand-primary rounded-full transition-all duration-700" 
                    style={{ width: `${Math.max(5, (v.profit / (bestVehicle.profit || 1)) * 100)}%` }} 
                  />
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const VehicleEditModal = ({ vehicle, isOpen, onClose, onSave }: any) => {
  const [goal, setGoal] = useState('');
  useEffect(() => { if (vehicle) setGoal(vehicle.customDailyGoal?.toString() || '200'); }, [vehicle, isOpen]);
  if (!isOpen || !vehicle) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-lg font-black mb-6 uppercase tracking-widest">Ajustes: {vehicle.model}</h3>
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Meta Diária (R$)</label>
            <input type="number" value={goal} onChange={e => setGoal(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold outline-none border-2 border-transparent focus:border-brand-primary" />
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose}>Cancelar</Button>
          <Button fullWidth onClick={() => { onSave(vehicle.vehicleId, { customDailyGoal: parseFloat(goal) }); onClose(); }}>Salvar</Button>
        </div>
      </div>
    </div>
  );
};

const QuickPayModal = ({ vehicle, isOpen, onClose, onConfirm }: any) => {
  const [amount, setAmount] = useState('0,00');
  if (!isOpen || !vehicle) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl">
        <h3 className="text-lg font-black mb-2 uppercase tracking-widest">Lançar Quitação</h3>
        <p className="text-xs text-gray-500 mb-6">Registre o pagamento da parcela ou aluguel de <strong>{vehicle.model}</strong>.</p>
        <div className="mb-8">
           <input 
             type="text" 
             value={amount} 
             onChange={e => {
               const val = e.target.value.replace(/\D/g, '');
               setAmount(formatDecimal(parseInt(val || '0', 10) / 100));
             }} 
             className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-black text-2xl text-center outline-none border-2 border-brand-emerald/20" 
           />
        </div>
        <Button fullWidth variant="secondary" onClick={() => { onConfirm(vehicle, parseBRL(amount)); onClose(); }}>Confirmar Pagamento</Button>
        <button onClick={onClose} className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase">Voltar</button>
      </div>
    </div>
  );
};

const AuthView = ({ onLogin, onGoogleLogin }: any) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-surface dark:bg-brand-navy">
    <div className="text-center mb-8">
      <div className="bg-brand-primary w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-brand-primary/20">
        <Rocket size={40} />
      </div>
      <h1 className="text-4xl font-black text-brand-navy dark:text-white tracking-tighter">MotoristaReal</h1>
      <p className="text-gray-500 font-medium text-sm">Controle real para quem vive no volante</p>
    </div>
    <div className="w-full max-w-sm space-y-4">
      <Button fullWidth onClick={() => onLogin('demo@motorista.com')}>Entrar como Convidado</Button>
      <Button fullWidth variant="ghost" onClick={onGoogleLogin}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-primary" /> Entrar com Google
        </div>
      </Button>
    </div>
  </div>
);

const OnboardingView = ({ onFinish }: { onFinish: (data: any) => void }) => {
  const [step, setStep] = useState<'basics' | 'financial'>('basics');
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  const [vehicleType, setVehicleType] = useState<'carro' | 'moto'>('carro');
  const [brand, setBrand] = useState('Chevrolet');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');

  const [ownership, setOwnership] = useState<OwnershipStatus>('proprio');
  const [vehicleValue, setVehicleValue] = useState('');
  const [installmentValue, setInstallmentValue] = useState('');
  const [installmentsPaid, setInstallmentsPaid] = useState('0');
  const [totalInstallments, setTotalInstallments] = useState('48');
  
  const [rentalValue, setRentalValue] = useState('');
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>('semanal');
  const [dueDate, setDueDate] = useState('1');

  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceValue, setInsuranceValue] = useState('');
  const [insuranceInstallments, setInsuranceInstallments] = useState('1');

  const isBasicsValid = plate.length === 7 && model.length >= 2 && brand.length > 0;

  const isFinancialValid = useMemo(() => {
    if (ownership === 'proprio') return parseBRL(vehicleValue) > 0;
    if (ownership === 'financiado') return parseBRL(installmentValue) > 0 && parseInt(totalInstallments) > 0;
    if (ownership === 'alugado') return parseBRL(rentalValue) > 0;
    return false;
  }, [ownership, vehicleValue, installmentValue, totalInstallments, rentalValue]);

  const handlePriceChange = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) { setter(''); return; }
    setter(formatDecimal(parseInt(clean, 10) / 100));
  };

  const handleNextStep = () => {
    setAttemptedNext(true);
    if (isBasicsValid) {
      setStep('financial');
      setAttemptedNext(false);
    }
  };

  const handleFinish = () => {
    setAttemptedNext(true);
    if (isFinancialValid) {
      onFinish({
        userId: '', 
        type: vehicleType,
        brand,
        model,
        plate,
        ownershipStatus: ownership,
        vehicleValue: ownership === 'proprio' ? parseBRL(vehicleValue) : undefined,
        purchaseValue: ownership === 'proprio' ? parseBRL(vehicleValue) : undefined,
        purchaseDate: ownership === 'proprio' ? new Date().toISOString().split('T')[0] : undefined,
        installmentValue: ownership === 'financiado' ? parseBRL(installmentValue) : undefined,
        installmentsPaid: parseInt(installmentsPaid) || 0,
        totalInstallments: parseInt(totalInstallments) || 0,
        rentalValue: ownership === 'alugado' ? parseBRL(rentalValue) : undefined,
        rentalPeriod: rentalPeriod,
        rentalDueDate: parseInt(dueDate),
        hasInsurance,
        insuranceValue: hasInsurance ? parseBRL(insuranceValue) : undefined,
        insuranceInstallments: hasInsurance ? parseInt(insuranceInstallments) : undefined,
        isActive: true
      });
    }
  };

  if (step === 'basics') {
    return (
      <div className="space-y-8 animate-fade-in py-4">
        <div className="text-center space-y-1">
          <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tight">Novo Veículo</h2>
          <p className="text-gray-500 font-medium text-sm">Qual ferramenta você usa para rodar?</p>
        </div>
        <div className="space-y-6">
          <div className="flex gap-4">
            <button onClick={() => setVehicleType('carro')} className={`flex-1 p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${vehicleType === 'carro' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
              <Car size={36} />
              <span className="text-[10px] font-black uppercase tracking-widest">Carro</span>
            </button>
            <button onClick={() => setVehicleType('moto')} className={`flex-1 p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${vehicleType === 'moto' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
              <Bike size={36} />
              <span className="text-[10px] font-black uppercase tracking-widest">Moto</span>
            </button>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Placa do Veículo</label>
              <input 
                placeholder="Ex: ABC1D23" 
                maxLength={7} 
                value={plate} 
                onChange={e => setPlate(formatPlate(e.target.value))} 
                className={`w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-black text-2xl text-center tracking-widest border focus:border-brand-primary outline-none transition-all uppercase ${attemptedNext && plate.length < 7 ? 'border-brand-error ring-2 ring-brand-error/10' : 'border-transparent'}`} 
              />
              {attemptedNext && plate.length < 7 && <p className="text-[10px] font-black text-brand-error ml-4 uppercase">Placa obrigatória (7 dígitos)</p>}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Marca</label>
                <select 
                  value={brand} 
                  onChange={e => setBrand(e.target.value)} 
                  className={`w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-bold border focus:border-brand-primary outline-none transition-all appearance-none ${attemptedNext && brand === '' ? 'border-brand-error' : 'border-transparent'}`}
                >
                  <option value="">Selecione</option>
                  {BR_BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Modelo</label>
                <input 
                  placeholder="Ex: Onix, HB20..." 
                  value={model} 
                  onChange={e => setModel(e.target.value)} 
                  className={`w-full p-5 bg-gray-50 dark:bg-gray-800 rounded-3xl font-bold border focus:border-brand-primary outline-none transition-all ${attemptedNext && model.length < 2 ? 'border-brand-error ring-2 ring-brand-error/10' : 'border-transparent'}`} 
                />
              </div>
            </div>
          </div>
          <Button fullWidth onClick={handleNextStep} className="py-5 shadow-lg">Próximo Passo <ChevronRight size={20} /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in py-4 max-h-[85vh] overflow-y-auto no-scrollbar pb-10">
      <div className="text-center space-y-1">
        <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tight">Financeiro</h2>
        <p className="text-gray-500 font-medium text-sm">Precisamos saber seus custos reais.</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => { setOwnership('proprio'); setAttemptedNext(false); }} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${ownership === 'proprio' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
            <Wallet size={20} /><span className="text-[9px] font-black uppercase">Próprio</span>
          </button>
          <button onClick={() => { setOwnership('financiado'); setAttemptedNext(false); }} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${ownership === 'financiado' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
            <CreditCard size={20} /><span className="text-[9px] font-black uppercase">Parcela</span>
          </button>
          <button onClick={() => { setOwnership('alugado'); setAttemptedNext(false); }} className={`p-4 rounded-3xl border-2 flex flex-col items-center gap-2 transition-all ${ownership === 'alugado' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-gray-100 dark:border-gray-800 text-gray-400'}`}>
            <Key size={20} /><span className="text-[9px] font-black uppercase">Aluguel</span>
          </button>
        </div>

        {ownership === 'proprio' && (
          <div className="space-y-2 animate-slide-up">
            <div className={`bg-brand-primary/5 p-4 rounded-2xl border transition-all ${attemptedNext && parseBRL(vehicleValue) <= 0 ? 'border-brand-error ring-2 ring-brand-error/10' : 'border-brand-primary/10'}`}>
               <label className="text-[10px] font-black text-brand-primary uppercase mb-2 block">Valor do Veículo (Tabela FIPE)</label>
               <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-brand-primary">R$</span>
                 <input value={vehicleValue} onChange={e => handlePriceChange(e.target.value, setVehicleValue)} className="w-full pl-10 pr-4 py-4 bg-white dark:bg-gray-800 rounded-2xl font-black text-xl outline-none" placeholder="0,00" />
               </div>
            </div>
          </div>
        )}

        {ownership === 'financiado' && (
          <div className="space-y-4 animate-slide-up">
            <div className="space-y-2">
              <div className={`bg-white dark:bg-gray-800 border p-4 rounded-2xl transition-all ${attemptedNext && parseBRL(installmentValue) <= 0 ? 'border-brand-error ring-2 ring-brand-error/10' : 'border-transparent'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-widest">Valor da Parcela</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                  <input value={installmentValue} onChange={e => handlePriceChange(e.target.value, setInstallmentValue)} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-black text-lg outline-none" placeholder="0,00" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 border p-4 rounded-2xl text-center">
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Pagas</label>
                <input type="number" value={installmentsPaid} onChange={e => setInstallmentsPaid(e.target.value)} className="w-full text-center font-black text-xl bg-transparent outline-none" />
              </div>
              <div className={`bg-white dark:bg-slate-800 border p-4 rounded-2xl text-center transition-all ${attemptedNext && (parseInt(totalInstallments) || 0) <= 0 ? 'border-brand-error' : 'border-transparent'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Totais</label>
                <input type="number" value={totalInstallments} onChange={e => setTotalInstallments(e.target.value)} className="w-full text-center font-black text-xl bg-transparent outline-none" />
              </div>
            </div>
          </div>
        )}

        {ownership === 'alugado' && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
              <button onClick={() => { setRentalPeriod('semanal'); setDueDate('1'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${rentalPeriod === 'semanal' ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm' : 'text-gray-400'}`}>SEMANAL</button>
              <button onClick={() => { setRentalPeriod('mensal'); setDueDate('1'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${rentalPeriod === 'mensal' ? 'bg-white dark:bg-gray-700 text-brand-primary shadow-sm' : 'text-gray-400'}`}>MENSAL</button>
            </div>
            
            <div className="space-y-2">
              <div className={`bg-white dark:bg-gray-800 border p-4 rounded-2xl transition-all ${attemptedNext && parseBRL(rentalValue) <= 0 ? 'border-brand-error ring-2 ring-brand-error/10' : 'border-transparent'}`}>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor do Aluguel</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                  <input value={rentalValue} onChange={e => handlePriceChange(e.target.value, setRentalValue)} className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-black text-lg outline-none" placeholder="0,00" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 border p-4 rounded-2xl">
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">
                {rentalPeriod === 'mensal' ? 'Dia do Vencimento (1-31)' : 'Dia de Pagamento (Semana)'}
              </label>
              <select value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl font-bold">
                {rentalPeriod === 'mensal' ? (
                  Array.from({length: 31}, (_, i) => <option key={i+1} value={i+1}>Dia {i+1}</option>)
                ) : (
                  ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => <option key={i} value={i}>{d}</option>)
                )}
              </select>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30">
          <button onClick={() => setHasInsurance(!hasInsurance)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
               <div className={`p-2 rounded-xl transition-all ${hasInsurance ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-400'}`}><Shield size={20} /></div>
               <div className="text-left">
                  <p className="text-sm font-black text-brand-navy">Possui Seguro?</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Amortização de custos fixa</p>
               </div>
            </div>
            <div className={`w-12 h-6 rounded-full transition-all flex items-center p-1 ${hasInsurance ? 'bg-brand-primary' : 'bg-gray-300'}`}>
               <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${hasInsurance ? 'translate-x-6' : 'translate-x-0'}`} />
            </div>
          </button>

          {hasInsurance && (
            <div className="mt-6 space-y-4 animate-slide-up">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">R$</span>
                <input value={insuranceValue} onChange={e => handlePriceChange(e.target.value, setInsuranceValue)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 rounded-xl font-bold border border-blue-200" placeholder="Valor Anual" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
           <Button variant="ghost" fullWidth onClick={() => { setStep('basics'); setAttemptedNext(false); }}>Voltar</Button>
           <Button fullWidth onClick={handleFinish} className={`py-5 shadow-lg transition-all ${!isFinancialValid && attemptedNext ? 'bg-brand-error animate-shake' : ''}`}>
             Finalizar Cadastro <Check size={20} />
           </Button>
        </div>
      </div>
    </div>
  );
};

const ManageTransactionsView = ({ transactions, filter, onBack, onEdit }: any) => (
  <div className="space-y-4">
    <div className="flex items-center gap-4 mb-6">
      <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full transition-transform active:scale-90"><ArrowLeft size={20} /></button>
      <h2 className="text-2xl font-black uppercase tracking-tighter">Histórico</h2>
    </div>
    <div className="space-y-3">
      {transactions.filter((t: any) => t.type === filter).length > 0 ? (
        transactions.filter((t: any) => t.type === filter).map((t: any) => (
          <div key={t.transactionId} className="bg-white dark:bg-slate-800 p-5 rounded-3xl flex justify-between items-center shadow-sm border border-gray-50 dark:border-gray-800">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.category}</p>
              <p className="text-lg font-black text-brand-navy dark:text-white">{formatCurrency(t.amount)}</p>
              <p className="text-[9px] text-gray-400 font-bold">{new Date(t.date).toLocaleDateString('pt-BR')}</p>
            </div>
            <button onClick={() => onEdit(t)} className="p-3 bg-brand-primary/5 text-brand-primary rounded-2xl active:scale-90 transition-all"><Edit3 size={18} /></button>
          </div>
        ))
      ) : (
        <div className="py-20 text-center opacity-30">
          <LucideHistory size={48} className="mx-auto mb-2" />
          <p className="font-bold">Nenhum registro</p>
        </div>
      )}
    </div>
  </div>
);

const VehiclesView = ({ vehicles, onAdd, onCompare, onEditVehicle, onQuickPay }: any) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tighter">Minha Frota</h2>
      <button onClick={onAdd} className="bg-brand-primary/10 text-brand-primary p-2 rounded-xl active:scale-90 transition-all"><PlusCircle size={24} /></button>
    </div>
    <div className="space-y-4">
      {vehicles.map((v: any) => (
        <div key={v.vehicleId} className={`bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border transition-all ${v.isActive ? 'border-brand-primary shadow-lg shadow-brand-primary/5' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-brand-navy dark:text-white">{v.model}</h3>
                {v.isActive && <div className="px-2 py-0.5 bg-brand-emerald/10 text-brand-emerald text-[9px] font-black rounded-full">ATIVO</div>}
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{v.brand} • {v.plate}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-brand-primary">{v.type === 'carro' ? <Car size={24} /> : <Bike size={24} />}</div>
          </div>
          <div className="flex gap-2">
             <button onClick={() => onEditVehicle(v)} className="flex-1 py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center justify-center gap-2 active:scale-95 transition-all">
                <Settings size={14} /> Ajustes
             </button>
          </div>
        </div>
      ))}
    </div>
    <Button fullWidth variant="secondary" onClick={onCompare} className="py-5 shadow-lg shadow-brand-emerald/10 mt-4"><ArrowLeftRight size={20} /> Comparativo Real</Button>
  </div>
);

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('auth');
  const [viewParams, setViewParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [quickPayVehicle, setQuickPayVehicle] = useState<Vehicle | null>(null);
  
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);

  useEffect(() => {
    const u = MockBackend.getUser();
    if (u) { setUser(u); loadUserData(u); }
    MockBackend.getAppVersion().then(info => setVersionInfo(info));
  }, []);

  const loadUserData = async (currentUser: User) => {
    const v = await MockBackend.getVehicles(currentUser.uid);
    const t = await MockBackend.getTransactions(currentUser.uid);
    setVehicles(v); setTransactions(t);
    if (v.length === 0) setView('onboarding'); else if (view === 'auth') setView('dashboard');
  };

  const navigate = (v: ViewState, params?: any) => {
    setView(v);
    setViewParams(params);
  };

  const handleTransactionSubmit = async (data: any) => {
    const activeId = vehicles.find(v => v.isActive)?.vehicleId; 
    if(!user || !activeId) return;
    if (editingTransaction) await MockBackend.updateTransaction(editingTransaction.transactionId, data);
    else await MockBackend.addTransaction({...data, userId: user.uid, vehicleId: activeId});
    setEditingTransaction(undefined); setIsTransactionModalOpen(false); loadUserData(user);
  };

  const handleVehicleUpdate = (vId: string, updates: any) => {
    const stored = localStorage.getItem('motoristareal_vehicles');
    let all: Vehicle[] = stored ? JSON.parse(stored) : [];
    all = all.map(veh => veh.vehicleId === vId ? { ...veh, ...updates } : veh);
    localStorage.setItem('motoristareal_vehicles', JSON.stringify(all));
    if (user) loadUserData(user);
  };

  const handleQuickPay = async (v: Vehicle, amount: number) => {
    if (!user) return;
    await MockBackend.addTransaction({
      userId: user.uid,
      vehicleId: v.vehicleId,
      type: 'expense',
      category: v.ownershipStatus === 'financiado' ? 'FinanciamentoVeiculo' : 'AluguelVeiculo',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      kmInput: undefined
    });
    loadUserData(user);
  };

  const handleOnboardingFinish = async (vehicleData: Omit<Vehicle, 'vehicleId' | 'isActive'>) => {
    if (!user) return;
    try {
      await MockBackend.addVehicle({ ...vehicleData, userId: user.uid });
      await loadUserData(user);
      setView('dashboard');
    } catch (error) {
      console.error("Failed to add vehicle during onboarding", error);
    }
  };

  if (view === 'auth') return <AuthView onLogin={async (email: string) => { const u = await MockBackend.login(email); setUser(u); loadUserData(u); }} onGoogleLogin={async () => { const firebaseUser = await loginWithGoogle(); const appUser: User = { uid: firebaseUser.uid, email: firebaseUser.email || '', name: firebaseUser.displayName || 'Motorista', dailyGoal: 200, isPro: true, goalType: 'global' }; localStorage.setItem('motoristareal_user', JSON.stringify(appUser)); setUser(appUser); loadUserData(appUser); }} />;
  if (view === 'onboarding') return <AppLayout user={user!} vehicles={vehicles} activeVehicleId={undefined} onSwitchVehicle={() => {}} currentView="onboarding" onNavigate={() => {}} onAddTransaction={() => {}}><OnboardingView onFinish={handleOnboardingFinish} /></AppLayout>;
  if (!user) return null;

  return (
    <AppLayout user={user} vehicles={vehicles} activeVehicleId={vehicles.find(v => v.isActive)?.vehicleId} onSwitchVehicle={async (id) => { const v = await MockBackend.setActiveVehicle(id); setVehicles(v); }} currentView={view} onNavigate={navigate} onAddTransaction={() => { setEditingTransaction(undefined); setIsTransactionModalOpen(true); }} onHeaderClick={() => setEditingVehicle(vehicles.find(v => v.isActive) || null)}>
      {view === 'dashboard' && <Dashboard user={user} transactions={transactions} activeVehicle={vehicles.find(v => v.isActive)} onTransactionAdded={() => loadUserData(user)} onUserUpdate={(up) => { const updated = MockBackend.updateUser(up); if (updated) setUser(updated); }} onVehicleUpdate={handleVehicleUpdate} onNavigate={navigate} onEditVehicle={setEditingVehicle} />}
      {view === 'manage_transactions' && <ManageTransactionsView transactions={transactions.filter(t => t.vehicleId === (vehicles.find(v => v.isActive)?.vehicleId))} filter={viewParams?.filter || 'earning'} onBack={() => setView('dashboard')} onEdit={(t) => { setEditingTransaction(t); setIsTransactionModalOpen(true); }} />}
      {view === 'vehicles' && <VehiclesView vehicles={vehicles} onAdd={() => setView('onboarding')} onCompare={() => setView('compare')} onEditVehicle={setEditingVehicle} onQuickPay={setQuickPayVehicle} />}
      {view === 'reports' && <ReportsView transactions={transactions} />}
      {view === 'compare' && <CompareView vehicles={vehicles} transactions={transactions} onBack={() => setView('vehicles')} />}
      {view === 'profile' && (
        <div className="space-y-6 animate-fade-in pb-24">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tighter">Perfil</h2>
            <Settings size={24} className="text-gray-400" />
          </div>
          <div className="bg-white dark:bg-[#2b2930] p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-slate-800 rounded-full flex items-center justify-center text-white font-black text-3xl mb-4 shadow-xl shadow-brand-primary/20">{user.name.charAt(0).toUpperCase()}</div>
            <h3 className="font-black text-xl text-brand-navy dark:text-white">{user.name}</h3>
            <p className="text-gray-500 font-medium mb-4">{user.email}</p>
            {user.isPro && <div className="px-4 py-1.5 bg-orange-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-md">Assinante PRO</div>}
          </div>
          <button onClick={() => { MockBackend.logout(); setView('auth'); setUser(null); }} className="w-full bg-red-50 dark:bg-red-950/20 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 flex items-center gap-3 font-bold text-sm text-red-500 active:scale-95 transition-all"><LogOut size={20} /> Sair da Conta</button>
        </div>
      )}
      <TransactionModal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(undefined); }} onSubmit={handleTransactionSubmit} activeVehicleId={vehicles.find(v => v.isActive)?.vehicleId || ''} initialData={editingTransaction} />
      <VehicleEditModal vehicle={editingVehicle} isOpen={!!editingVehicle} onClose={() => setEditingVehicle(null)} onSave={handleVehicleUpdate} isPro={user.isPro} />
      <QuickPayModal vehicle={quickPayVehicle} isOpen={!!quickPayVehicle} onClose={() => setQuickPayVehicle(null)} onConfirm={handleQuickPay} />
    </AppLayout>
  );
};

export default App;
