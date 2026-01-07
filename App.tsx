
import React, { useEffect, useState, useMemo } from 'react';
import { User, Vehicle, Transaction, ViewState, OwnershipStatus, RentalPeriod } from './types';
import { MockBackend } from './services/mockBackend';
import { loginWithGoogle } from './services/firebase';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { TransactionModal } from './components/TransactionModal';
import { Button } from './components/ui/Button';
import { 
  Car, Bike, ChevronRight, LogOut, Sparkles, Rocket, 
  Search, ArrowLeft, Edit3, History as LucideHistory,
  Target, ShieldCheck, CreditCard, Key, Settings, ArrowLeftRight, Trophy, AlertCircle, Trash2, CheckCircle2,
  PlusCircle, X, ArrowUpRight, ArrowDownLeft, Info, PieChart, LayoutDashboard, ScrollText, Wallet
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer
} from 'recharts';

const BR_CAR_BRANDS = [
  'Chevrolet', 'Fiat', 'Volkswagen', 'Hyundai', 'Toyota', 'Jeep', 'Renault', 'Honda', 'Nissan', 'BYD', 'Caoa Chery', 'Ford', 'Citroën', 'Peugeot', 'Mitsubishi', 'BMW', 'Mercedes-Benz', 'Audi', 'Volvo', 'GWM', 'Ram', 'Kia', 'Land Rover', 'Suzuki', 'Porsche', 'Mini', 'Outros'
].sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b));

const BR_MOTO_BRANDS = [
  'Honda', 'Yamaha', 'Mottu', 'Shineray', 'BMW', 'Haojue', 'Royal Enfield', 'Kawasaki', 'Triumph', 'Suzuki', 'Dafra', 'Ducati', 'Harley-Davidson', 'Voltz', 'Avelloz', 'Sousa', 'Zontes', 'Outros'
].sort((a, b) => a === 'Outros' ? 1 : b === 'Outros' ? -1 : a.localeCompare(b));

const WEEKDAYS = [
  { val: 0, label: 'Domingo' }, { val: 1, label: 'Segunda' }, { val: 2, label: 'Terça' }, 
  { val: 3, label: 'Quarta' }, { val: 4, label: 'Quinta' }, { val: 5, label: 'Sexta' }, { val: 6, label: 'Sábado' },
];

export const formatCurrency = (value: number | string): string => {
  const val = typeof value === 'number' ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const formatDecimal = (value: number | string, decimals = 2): string => {
  const val = typeof value === 'number' ? value : parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(val);
};

export const parseBRL = (value: string): number => {
  const cleanValue = value.replace(/\D/g, '');
  if (!cleanValue) return 0;
  return parseInt(cleanValue, 10) / 100;
};

export const formatPlate = (value: string): string => {
  const clean = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return clean.slice(0, 7);
};

export const handlePriceChange = (val: string, setter: (v: string) => void) => {
  const clean = val.replace(/\D/g, '');
  setter(formatDecimal(parseInt(clean || '0') / 100));
};

const AuthView = ({ onLogin, onGoogleLogin }: { onLogin: (email: string) => void, onGoogleLogin: () => void }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-brand-surface dark:bg-brand-navy">
    <div className="w-full max-w-md space-y-8 text-center">
      <div className="bg-brand-primary w-20 h-20 rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl"><Rocket size={40} /></div>
      <div className="space-y-2">
        <h1 className="text-4xl font-black text-brand-navy dark:text-white tracking-tighter">MotoristaReal</h1>
        <p className="text-gray-500 font-medium">Gestão financeira real para quem vive no volante.</p>
      </div>
      <div className="space-y-4 pt-4">
        <Button fullWidth onClick={onGoogleLogin} variant="primary" className="py-5">
          <Sparkles size={18} /> Entrar com Google
        </Button>
        <Button fullWidth onClick={() => onLogin('demo@motoristareal.com')} variant="ghost">
          Entrar como convidado
        </Button>
      </div>
    </div>
  </div>
);

const OnboardingView = ({ onFinish, existingPlates = [] }: { onFinish: (data: any) => void, existingPlates?: string[] }) => {
  const [step, setStep] = useState<'basics' | 'financial'>('basics');
  const [attemptedNext, setAttemptedNext] = useState(false);
  
  // Basics
  const [type, setType] = useState<'carro' | 'moto'>('carro');
  const [brand, setBrand] = useState('Chevrolet');
  const [model, setModel] = useState('');
  const [plate, setPlate] = useState('');

  // Financial
  const [ownership, setOwnership] = useState<OwnershipStatus>('proprio');
  const [vehicleValue, setVehicleValue] = useState('0,00');
  const [installmentValue, setInstallmentValue] = useState('0,00');
  const [totalInstallments, setTotalInstallments] = useState('48');
  const [installmentsPaid, setInstallmentsPaid] = useState('0');
  const [vencimentoDia, setVencimentoDia] = useState('10');
  const [rentalValue, setRentalValue] = useState('0,00');
  const [rentalPeriod, setRentalPeriod] = useState<RentalPeriod>('semanal');
  const [rentalDueDate, setRentalDueDate] = useState('1'); 
  
  // Insurance
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceMonthlyValue, setInsuranceMonthlyValue] = useState('0,00');
  const [insuranceInstallments, setInsuranceInstallments] = useState('12');
  const [insuranceDueDay, setInsuranceDueDay] = useState('10');
  const [insuranceExpiry, setInsuranceExpiry] = useState('');

  const currentBrands = type === 'moto' ? BR_MOTO_BRANDS : BR_CAR_BRANDS;

  const isPlateDuplicate = useMemo(() => {
    return existingPlates.includes(plate);
  }, [plate, existingPlates]);

  const isBasicsValid = plate.length === 7 && model.trim().length >= 2 && !isPlateDuplicate;
  
  const isFinancialValid = useMemo(() => {
    if (ownership === 'proprio') return parseBRL(vehicleValue) > 0;
    if (ownership === 'financiado') return parseBRL(installmentValue) > 0 && parseInt(totalInstallments) > 0;
    if (ownership === 'alugado') return parseBRL(rentalValue) > 0;
    if (hasInsurance) {
      if (parseBRL(insuranceMonthlyValue) <= 0) return false;
      if (parseInt(insuranceInstallments) <= 0) return false;
      if (!insuranceExpiry) return false;
    }
    return false;
  }, [ownership, vehicleValue, installmentValue, totalInstallments, rentalValue, hasInsurance, insuranceMonthlyValue, insuranceInstallments, insuranceExpiry]);

  const handleFinish = () => {
    setAttemptedNext(true);
    if (!isFinancialValid) return;

    const monthlyIns = parseBRL(insuranceMonthlyValue);
    const countIns = parseInt(insuranceInstallments);

    onFinish({
      type,
      brand,
      model,
      plate,
      ownershipStatus: ownership,
      vehicleValue: parseBRL(vehicleValue),
      installmentValue: parseBRL(installmentValue),
      totalInstallments: parseInt(totalInstallments),
      installmentsPaid: parseInt(installmentsPaid),
      rentalValue: parseBRL(rentalValue),
      rentalPeriod,
      rentalDueDate: parseInt(ownership === 'financiado' ? vencimentoDia : rentalDueDate),
      hasInsurance,
      // Backend espera valor TOTAL para dividir pelo numero de parcelas. 
      // Calculamos o total aqui para manter compatibilidade com a logica existente.
      insuranceValue: monthlyIns * countIns, 
      insuranceInstallments: countIns,
      insuranceDueDay: parseInt(insuranceDueDay),
      insuranceExpiryDate: insuranceExpiry
    });
  };

  const getInputClass = (isValid: boolean) => 
    `w-full p-4 rounded-2xl font-black outline-none border-2 transition-all ${
      attemptedNext && !isValid 
        ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-300' 
        : 'border-gray-50 bg-gray-50 focus:border-brand-primary focus:bg-white'
    }`;

  if (step === 'basics') {
    return (
      <div className="space-y-6 animate-fade-in pb-10">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tighter">Seu Veículo</h2>
          <p className="text-sm text-gray-400 font-bold uppercase mt-1">Passo 1 de 2</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setType('carro'); setBrand(BR_CAR_BRANDS[0]); }} className={`flex-1 p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${type === 'carro' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-lg' : 'border-gray-100 text-gray-400'}`}>
            <Car size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Carro</span>
          </button>
          <button onClick={() => { setType('moto'); setBrand(BR_MOTO_BRANDS[0]); }} className={`flex-1 p-6 rounded-3xl border-2 flex flex-col items-center gap-3 transition-all ${type === 'moto' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary shadow-lg' : 'border-gray-100 text-gray-400'}`}>
            <Bike size={40} />
            <span className="text-[10px] font-black uppercase tracking-widest">Moto</span>
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Placa</label>
            <input 
              maxLength={7} 
              value={plate} 
              onChange={e => setPlate(formatPlate(e.target.value))} 
              placeholder="ABC1234" 
              className={`w-full p-5 bg-white border-2 rounded-2xl font-black text-2xl text-center outline-none transition-all ${attemptedNext && (plate.length < 7 || isPlateDuplicate) ? 'border-red-500 text-red-500 bg-red-50 placeholder-red-300' : 'border-gray-100 focus:border-brand-primary'}`} 
            />
            {attemptedNext && isPlateDuplicate && (
              <p className="text-red-500 text-[10px] font-bold mt-2 text-center animate-shake">
                 Esta placa já está cadastrada na sua frota.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Marca</label>
              <select value={brand} onChange={e => setBrand(e.target.value)} className="w-full p-4 bg-white border-2 border-gray-100 rounded-2xl font-bold outline-none focus:border-brand-primary">
                {currentBrands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Modelo</label>
              <input 
                value={model} 
                onChange={e => setModel(e.target.value)} 
                placeholder="Ex: Onix" 
                className={`w-full p-4 bg-white border-2 rounded-2xl font-bold outline-none transition-all ${attemptedNext && model.trim().length < 2 ? 'border-red-500 text-red-500 bg-red-50 placeholder-red-300' : 'border-gray-100 focus:border-brand-primary'}`} 
              />
            </div>
          </div>
        </div>
        <Button fullWidth onClick={() => isBasicsValid ? setStep('financial') : setAttemptedNext(true)}>
          Continuar <ChevronRight size={18} />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="text-center">
        <h2 className="text-3xl font-black tracking-tighter">Financeiro</h2>
        <p className="text-sm text-gray-400 font-bold uppercase mt-1">Passo 2 de 2</p>
      </div>
      <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl">
        {(['proprio', 'financiado', 'alugado'] as OwnershipStatus[]).map(o => (
          <button key={o} onClick={() => setOwnership(o)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${ownership === o ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-400'}`}>{o}</button>
        ))}
      </div>
      <div className="bg-white p-6 rounded-3xl border-2 border-gray-50 space-y-5">
        {ownership === 'proprio' && (
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor de Mercado (FIPE)</label>
            <input 
              type="text" 
              value={vehicleValue} 
              onChange={e => handlePriceChange(e.target.value, setVehicleValue)} 
              className={`${getInputClass(parseBRL(vehicleValue) > 0)} text-xl`} 
            />
          </div>
        )}
        {ownership === 'financiado' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor da Parcela</label>
              <input 
                type="text" 
                value={installmentValue} 
                onChange={e => handlePriceChange(e.target.value, setInstallmentValue)} 
                className={`${getInputClass(parseBRL(installmentValue) > 0)} text-xl`} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Parcelas Pagas</label>
                <input 
                  type="number" 
                  value={installmentsPaid} 
                  onChange={e => setInstallmentsPaid(e.target.value)} 
                  className={getInputClass(true)} 
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Total Parcelas</label>
                <input 
                  type="number" 
                  value={totalInstallments} 
                  onChange={e => setTotalInstallments(e.target.value)} 
                  className={getInputClass(parseInt(totalInstallments) > 0)} 
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Dia do Vencimento</label>
              <input 
                type="number" 
                min="1" 
                max="31" 
                value={vencimentoDia} 
                onChange={e => setVencimentoDia(e.target.value)} 
                className={getInputClass(true)} 
              />
            </div>
          </div>
        )}
        {ownership === 'alugado' && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor do Aluguel</label>
              <input 
                type="text" 
                value={rentalValue} 
                onChange={e => handlePriceChange(e.target.value, setRentalValue)} 
                className={`${getInputClass(parseBRL(rentalValue) > 0)} text-xl`} 
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setRentalPeriod('semanal'); setRentalDueDate('1'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 ${rentalPeriod === 'semanal' ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-100 text-gray-400'}`}>Semanal</button>
              <button onClick={() => { setRentalPeriod('mensal'); setRentalDueDate('10'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase border-2 ${rentalPeriod === 'mensal' ? 'bg-brand-primary border-brand-primary text-white' : 'border-gray-100 text-gray-400'}`}>Mensal</button>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">{rentalPeriod === 'semanal' ? 'Dia da Semana' : 'Dia do Mês'}</label>
              {rentalPeriod === 'semanal' ? (
                <select value={rentalDueDate} onChange={e => setRentalDueDate(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl font-black outline-none border-2 border-gray-50 focus:border-brand-primary">
                  {WEEKDAYS.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                </select>
              ) : (
                <input 
                  type="number" 
                  min="1" 
                  max="31" 
                  value={rentalDueDate} 
                  onChange={e => setRentalDueDate(e.target.value)} 
                  className={getInputClass(true)} 
                />
              )}
            </div>
          </div>
        )}
        <div className="p-4 rounded-2xl border-2 border-blue-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className={hasInsurance ? 'text-blue-500' : 'text-gray-300'} />
            <span className="text-sm font-black">Possui Seguro?</span>
          </div>
          <input type="checkbox" checked={hasInsurance} onChange={e => setHasInsurance(e.target.checked)} className="w-6 h-6 accent-brand-primary" />
        </div>
        {hasInsurance && (
          <div className="animate-slide-up space-y-4 pt-2">
             <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Valor da Parcela (Mensal)</label>
                <input type="text" value={insuranceMonthlyValue} onChange={e => handlePriceChange(e.target.value, setInsuranceMonthlyValue)} className={`${getInputClass(parseBRL(insuranceMonthlyValue) > 0)} bg-blue-50/30 border-blue-100 focus:border-blue-300`} />
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Nº Parcelas</label>
                  <input type="number" value={insuranceInstallments} onChange={e => setInsuranceInstallments(e.target.value)} className={`${getInputClass(parseInt(insuranceInstallments) > 0)} bg-blue-50/30 border-blue-100 focus:border-blue-300`} />
               </div>
               <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Dia do Vencimento</label>
                  <input type="number" min="1" max="31" value={insuranceDueDay} onChange={e => setInsuranceDueDay(e.target.value)} className={`${getInputClass(parseInt(insuranceDueDay) > 0 && parseInt(insuranceDueDay) <= 31)} bg-blue-50/30 border-blue-100 focus:border-blue-300`} />
               </div>
             </div>
             <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Fim da Apólice (Renovação)</label>
                <input type="date" value={insuranceExpiry} onChange={e => setInsuranceExpiry(e.target.value)} className={`${getInputClass(!!insuranceExpiry)} bg-blue-50/30 border-blue-100 focus:border-blue-300`} />
             </div>
          </div>
        )}
      </div>
      <div className="flex gap-4">
        <Button variant="ghost" fullWidth onClick={() => setStep('basics')}><ArrowLeft size={18} /> Voltar</Button>
        <Button variant="secondary" fullWidth onClick={handleFinish}>Finalizar <Rocket size={18} /></Button>
      </div>
    </div>
  );
};

const ReportsView = ({ transactions }: { transactions: Transaction[] }) => {
  const data = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i);
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

const TransactionsListView = ({ transactions, type, date, onBack, onEdit }: any) => {
  const filtered = useMemo(() => {
    return transactions
      .filter((t: Transaction) => t.type === type && (!date || t.date === date))
      .sort((a: Transaction, b: Transaction) => b.timestamp - a.timestamp);
  }, [transactions, type, date]);

  const displayDate = date ? date.split('-').reverse().join('/') : 'Todas';

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 bg-white dark:bg-slate-800 rounded-full shadow-sm">
          <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <div>
           <h2 className="text-2xl font-black tracking-tighter capitalize">{type === 'earning' ? 'Entradas' : 'Saídas'}</h2>
           <p className="text-xs font-bold text-gray-400 uppercase">{displayDate}</p>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center p-10 text-gray-400 font-medium bg-white dark:bg-slate-800 rounded-[2rem]">
            Nenhum movimento encontrado para este dia.
          </div>
        ) : (
          filtered.map((t: Transaction) => (
            <div 
              key={t.transactionId} 
              onClick={() => onEdit(t)}
              className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between active:scale-98 transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${t.type === 'earning' ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-red-50 text-red-500'}`}>
                  {t.type === 'earning' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                </div>
                <div>
                  <p className="font-black text-sm text-brand-navy dark:text-white">{t.category}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                    {new Date(t.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`text-lg font-black ${t.type === 'earning' ? 'text-brand-emerald' : 'text-red-500'}`}>
                {t.type === 'expense' ? '- ' : '+ '}{formatCurrency(t.amount)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AppFeaturesModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const features = [
    {
      title: "Painel de Controle",
      icon: <LayoutDashboard size={20} className="text-brand-primary" />,
      items: [
        "Visualização do Lucro Real Líquido diário.",
        "Meta Diária Dinâmica: Ajuste automático para compensar dias ruins.",
        "Cálculo de Custo Fixo Diário (Aluguel/Parcela + Seguro amortizados).",
        "Reserva de Manutenção automática baseada na KM rodada.",
        "Troca rápida de veículo ativo no topo da tela."
      ]
    },
    {
      title: "Gestão de Frota",
      icon: <Car size={20} className="text-blue-500" />,
      items: [
        "Cadastro de múltiplos veículos (Carro e Moto).",
        "Controle de Financiamento: Parcelas pagas, restantes e quitação.",
        "Controle de Aluguel: Semanal ou Mensal com vencimentos.",
        "Gestão de Seguro com renovação e parcelamento.",
        "Definição de metas específicas por veículo."
      ]
    },
    {
      title: "Transações Financeiras",
      icon: <Wallet size={20} className="text-brand-emerald" />,
      items: [
        "Lançamento rápido de Ganhos (Uber, 99, Indriver, Particular).",
        "Controle detalhado de Despesas (Combustível, Limpeza, etc.).",
        "Cálculo de consumo e preço médio de combustível.",
        "Baixa manual de parcelas de financiamento.",
        "Histórico completo filtrável por dia e tipo."
      ]
    },
    {
      title: "Relatórios & Análises",
      icon: <PieChart size={20} className="text-orange-500" />,
      items: [
        "Gráfico semanal de Entradas vs Saídas.",
        "Indicadores de performance financeira.",
        "Comparativo visual de resultados."
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar relative animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-slate-900 z-10 py-2">
          <div className="flex items-center gap-3">
             <div className="bg-brand-primary/10 p-3 rounded-2xl text-brand-primary">
                <ScrollText size={24} />
             </div>
             <h3 className="text-lg font-black leading-tight text-brand-navy dark:text-white">Funcionalidades<br/>do App</h3>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full text-gray-500 hover:text-gray-700 transition-colors">
             <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {features.map((section, idx) => (
            <div key={idx} className="bg-gray-50 dark:bg-slate-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-3 border-b border-gray-200 dark:border-gray-700 pb-2">
                {section.icon}
                <h4 className="font-black text-sm uppercase tracking-wide text-brand-navy dark:text-gray-200">{section.title}</h4>
              </div>
              <ul className="space-y-2">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 leading-relaxed">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-brand-primary shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase">MotoristaReal v1.2.0</p>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('auth');
  const [viewParams, setViewParams] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  useEffect(() => {
    const u = MockBackend.getUser();
    if (u) { setUser(u); loadUserData(u); }
  }, []);

  const loadUserData = async (currentUser: User) => {
    const v = await MockBackend.getVehicles(currentUser.uid);
    const t = await MockBackend.getTransactions(currentUser.uid);
    setVehicles(v); setTransactions(t);
    if (v.length === 0) setView('onboarding'); else if (view === 'auth') setView('dashboard');
  };

  const handleNavigate = (v: ViewState, params?: any) => {
    setView(v);
    if (params) setViewParams(params);
  };

  const handleTransactionSubmit = async (data: any) => {
    const activeVehicle = vehicles.find(v => v.isActive);
    const activeId = activeVehicle?.vehicleId; 
    if(!user || !activeId) return;

    if (editingTransaction) {
      await MockBackend.updateTransaction(editingTransaction.transactionId, data);
    } else {
      await MockBackend.addTransaction({...data, userId: user.uid, vehicleId: activeId});
      
      // Lógica de Atualização de Veículo baseada na transação criada
      if (activeVehicle) {
        if (data.category === 'FinanciamentoVeiculo' && activeVehicle.ownershipStatus === 'financiado') {
           // Se o usuário pagou uma parcela, atualizamos o contador do veículo
           // Se o índice informado for maior que o atual, atualizamos.
           const currentPaid = activeVehicle.installmentsPaid || 0;
           const paidIndex = data.installmentIndex || (currentPaid + 1);
           
           if (paidIndex > currentPaid) {
              handleVehicleUpdate(activeId, { installmentsPaid: paidIndex });
           }
        }
      }
    }
    setEditingTransaction(undefined); setIsTransactionModalOpen(false); loadUserData(user);
  };

  const handleVehicleUpdate = (vId: string, updates: any) => {
    const stored = localStorage.getItem('motoristareal_vehicles');
    let all: Vehicle[] = stored ? JSON.parse(stored) : [];
    all = all.map(veh => veh.vehicleId === vId ? { ...veh, ...updates } : veh);
    localStorage.setItem('motoristareal_vehicles', JSON.stringify(all));
    if (user) loadUserData(user);
  };

  if (view === 'auth') return <AuthView onLogin={async (email: string) => { const u = await MockBackend.login(email); setUser(u); loadUserData(u); }} onGoogleLogin={async () => { const firebaseUser = await loginWithGoogle(); const appUser: User = { uid: firebaseUser.uid, email: firebaseUser.email || '', name: firebaseUser.displayName || 'Motorista', dailyGoal: 0, isPro: false }; localStorage.setItem('motoristareal_user', JSON.stringify(appUser)); setUser(appUser); loadUserData(appUser); }} />;
  if (view === 'onboarding') return <AppLayout user={user!} vehicles={vehicles} activeVehicleId={undefined} onSwitchVehicle={() => {}} currentView="onboarding" onNavigate={() => {}} onAddTransaction={() => {}}><OnboardingView existingPlates={vehicles.map(v => v.plate)} onFinish={async (data) => { if (!user) return; await MockBackend.addVehicle({...data, userId: user.uid}); await loadUserData(user); setView('dashboard'); }} /></AppLayout>;
  if (!user) return null;

  return (
    <AppLayout 
      user={user} 
      vehicles={vehicles} 
      activeVehicleId={vehicles.find(v => v.isActive)?.vehicleId} 
      onSwitchVehicle={async (id) => { const v = await MockBackend.setActiveVehicle(id); setVehicles(v); }} 
      currentView={view} 
      onNavigate={handleNavigate} 
      onAddTransaction={() => setIsTransactionModalOpen(true)} 
    >
      {view === 'dashboard' && (
        <Dashboard 
          user={user} 
          transactions={transactions} 
          vehicles={vehicles}
          activeVehicle={vehicles.find(v => v.isActive)} 
          onTransactionAdded={() => loadUserData(user)} 
          onUserUpdate={u => setUser(MockBackend.updateUser(u))} 
          onVehicleUpdate={handleVehicleUpdate} 
          onSwitchVehicle={async (id) => { const v = await MockBackend.setActiveVehicle(id); setVehicles(v); }}
          onNavigate={handleNavigate} 
          onEditVehicle={setEditingVehicle} 
        />
      )}
      {view === 'reports' && <ReportsView transactions={transactions} />}
      {view === 'vehicles' && <VehiclesView vehicles={vehicles} user={user} onAdd={() => setView('onboarding')} onEditVehicle={setEditingVehicle} />}
      {view === 'manage_transactions' && (
        <TransactionsListView 
          transactions={transactions} 
          type={viewParams?.filter} 
          date={viewParams?.date}
          onBack={() => setView('dashboard')}
          onEdit={(t: Transaction) => { setEditingTransaction(t); setIsTransactionModalOpen(true); }}
        />
      )}
      {view === 'profile' && (
        <div className="space-y-6 pb-24">
          <h2 className="text-3xl font-black tracking-tighter">Meu Perfil</h2>
          <div className="bg-white p-8 rounded-[2.5rem] text-center border border-gray-100">
            <div className="w-20 h-20 bg-brand-primary rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-black">{user.name.charAt(0)}</div>
            <h3 className="font-black text-xl">{user.name}</h3>
            <p className="text-gray-500 mb-6">{user.email}</p>
            <div className="bg-gray-50 p-4 rounded-3xl mb-6">
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Meta da Frota (R$)</label>
              <input type="number" value={user.dailyGoal} onChange={e => setUser(MockBackend.updateUser({dailyGoal: parseFloat(e.target.value) || 0}))} className="w-full bg-transparent text-center text-2xl font-black outline-none" />
            </div>
            <Button fullWidth variant="ghost" onClick={() => setIsFeaturesModalOpen(true)} className="mb-2 border-t border-gray-100 pt-4">
               <Info size={18} /> Funcionalidades do App
            </Button>
          </div>
          <button onClick={() => { MockBackend.logout(); setView('auth'); }} className="w-full p-5 text-red-500 font-bold flex gap-2 justify-center"><LogOut size={20} /> Sair</button>
        </div>
      )}
      <TransactionModal isOpen={isTransactionModalOpen} onClose={() => { setIsTransactionModalOpen(false); setEditingTransaction(undefined); }} onSubmit={handleTransactionSubmit} activeVehicle={vehicles.find(v => v.isActive)} initialData={editingTransaction} />
      <VehicleEditModal vehicle={editingVehicle} isOpen={!!editingVehicle} onClose={() => setEditingVehicle(null)} onSave={handleVehicleUpdate} />
      <AppFeaturesModal isOpen={isFeaturesModalOpen} onClose={() => setIsFeaturesModalOpen(false)} />
    </AppLayout>
  );
};

const VehiclesView = ({ vehicles, user, onAdd, onEditVehicle }: any) => (
  <div className="space-y-6">
    <h2 className="text-3xl font-black text-brand-navy dark:text-white tracking-tighter">Minha Frota</h2>
    <div className="space-y-4">
      {vehicles.map((v: any) => (
        <div key={v.vehicleId} className={`bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border ${v.isActive ? 'border-brand-primary' : 'border-gray-100 dark:border-gray-800 opacity-60'}`}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-black">{v.model}</h3>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{v.plate}</p>
              <div className="mt-1 flex items-center gap-1">
                <Target size={10} className="text-brand-primary" />
                <span className="text-[9px] font-black text-brand-primary uppercase">Meta: {formatCurrency(v.customDailyGoal || user.dailyGoal)}</span>
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl text-brand-primary">{v.type === 'carro' ? <Car size={24} /> : <Bike size={24} />}</div>
          </div>
          <button onClick={() => onEditVehicle(v)} className="w-full py-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-[10px] font-black uppercase text-gray-500 flex items-center justify-center gap-2">
            <Settings size={14} /> Ajustes e Débitos
          </button>
        </div>
      ))}
      <Button fullWidth variant="ghost" onClick={onAdd}><PlusCircle size={18} /> Adicionar Veículo</Button>
    </div>
  </div>
);

const VehicleEditModal = ({ vehicle, isOpen, onClose, onSave }: any) => {
  const [goal, setGoal] = useState('');
  const [activeTab, setActiveTab] = useState<'meta' | 'debitos'>('meta');
  const [amortizeMode, setAmortizeMode] = useState(false);
  const [amortizeValue, setAmortizeValue] = useState('');
  const [amortizeCount, setAmortizeCount] = useState('');
  const [newInstallmentValue, setNewInstallmentValue] = useState('');

  useEffect(() => { 
    if (vehicle) {
      setGoal(vehicle.customDailyGoal?.toString() || '');
      setNewInstallmentValue(vehicle.installmentValue?.toString() || '');
    }
  }, [vehicle, isOpen]);

  if (!isOpen || !vehicle) return null;

  const handleAmortize = () => {
    const paidCount = parseInt(amortizeCount);
    const totalRem = (vehicle.totalInstallments || 0) - (vehicle.installmentsPaid || 0);
    if (paidCount >= totalRem) {
      onSave(vehicle.vehicleId, { installmentsPaid: vehicle.totalInstallments, installmentValue: 0, ownershipStatus: 'proprio' });
    } else {
      onSave(vehicle.vehicleId, { installmentsPaid: (vehicle.installmentsPaid || 0) + paidCount, installmentValue: parseBRL(newInstallmentValue) || vehicle.installmentValue });
    }
    setAmortizeMode(false);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black uppercase tracking-widest">{vehicle.model}</h3>
          <button onClick={onClose} className="p-2"><X size={20} /></button>
        </div>
        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
          <button onClick={() => setActiveTab('meta')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'meta' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}>Meta</button>
          <button onClick={() => setActiveTab('debitos')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase ${activeTab === 'debitos' ? 'bg-white shadow-sm text-brand-primary' : 'text-gray-400'}`}>Débitos</button>
        </div>
        {activeTab === 'meta' ? (
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl">
              <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Meta Específica (R$)</label>
              <input type="number" value={goal} onChange={e => setGoal(e.target.value)} className="w-full bg-transparent font-black text-xl outline-none" />
            </div>
            <Button fullWidth onClick={() => { onSave(vehicle.vehicleId, { customDailyGoal: goal === '' ? undefined : parseFloat(goal) }); onClose(); }}>Salvar Meta</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicle.hasInsurance && (
              <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 flex justify-between items-center">
                <div><p className="text-[10px] font-black text-blue-400 uppercase">Seguro</p><p className="text-sm font-black">{formatCurrency(vehicle.insuranceValue || 0)}/mês</p></div>
                <ShieldCheck className="text-blue-400" size={20} />
              </div>
            )}
            <div className="p-5 rounded-2xl border bg-gray-50 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{vehicle.ownershipStatus}</p>
                  <p className="text-xl font-black">{formatCurrency(vehicle.installmentValue || vehicle.rentalValue || 0)}</p>
                  {vehicle.ownershipStatus === 'financiado' && <p className="text-[10px] font-bold text-gray-400">Restam {(vehicle.totalInstallments || 0) - (vehicle.installmentsPaid || 0)} parcelas</p>}
                  <p className="text-[10px] font-bold text-brand-primary mt-1">Vencimento: Dia {vehicle.rentalDueDate || 10}</p>
                </div>
                {vehicle.ownershipStatus === 'financiado' ? <CreditCard size={20} /> : <Key size={20} />}
              </div>
              {vehicle.ownershipStatus === 'financiado' && !amortizeMode && <button onClick={() => setAmortizeMode(true)} className="w-full py-2 bg-brand-primary text-white rounded-xl text-[10px] font-black uppercase">Quitar ou Amortizar</button>}
              {amortizeMode && (
                <div className="space-y-3 pt-2 animate-fade-in">
                   <div className="grid grid-cols-2 gap-2">
                     <input type="text" value={amortizeValue} onChange={e => handlePriceChange(e.target.value, setAmortizeValue)} className="p-2 bg-white rounded-lg text-xs font-black border" placeholder="Valor Pago" />
                     <input type="number" value={amortizeCount} onChange={e => setAmortizeCount(e.target.value)} className="p-2 bg-white rounded-lg text-xs font-black border" placeholder="Qtd. Parcelas" />
                   </div>
                   {parseInt(amortizeCount) < ((vehicle.totalInstallments || 0) - (vehicle.installmentsPaid || 0)) && <input type="text" value={newInstallmentValue} onChange={e => handlePriceChange(e.target.value, setNewInstallmentValue)} className="w-full p-2 bg-white rounded-lg text-xs font-black border" placeholder="Novo valor da parcela" />}
                   <div className="flex gap-2">
                     <button onClick={() => setAmortizeMode(false)} className="flex-1 text-[10px] font-black uppercase text-gray-400">Cancelar</button>
                     <button onClick={handleAmortize} className="flex-1 py-2 bg-brand-emerald text-white rounded-lg text-[10px] font-black uppercase">Confirmar</button>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
