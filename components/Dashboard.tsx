
import React, { useMemo, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Target,
  Gauge,
  CalendarClock,
  TrendingUp,
  X,
  ShieldCheck,
  CreditCard,
  Key,
  Car,
  Sparkles,
  History,
  Settings,
  Wallet,
  CalendarDays,
  Clock,
  Wrench,
  AlertTriangle,
  ChevronRight,
  Info,
  TrendingDown,
  ArrowDown
} from 'lucide-react';
import { Transaction, User, Vehicle, ViewState } from '../types';
import { formatCurrency, parseBRL, formatDecimal } from '../App';
import { Button } from './ui/Button';

interface DashboardProps {
  user: User;
  transactions: Transaction[];
  activeVehicle: Vehicle | undefined;
  onTransactionAdded: () => void;
  onUserUpdate: (updates: Partial<User>) => void;
  onVehicleUpdate: (vId: string, updates: Partial<Vehicle>) => void;
  onNavigate: (view: ViewState, state?: any) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  transactions, 
  activeVehicle, 
  onUserUpdate, 
  onVehicleUpdate, 
  onNavigate,
  onEditVehicle 
}) => {
  const [showMaintInfo, setShowMaintInfo] = useState(false);
  const [showDepreciationInfo, setShowDepreciationInfo] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const MAINT_RATE = activeVehicle?.customMaintRate ?? (activeVehicle?.type === 'moto' ? 0.08 : 0.15);

  // Lógica de Meta Dinâmica: Preserva o passado e projeta o futuro
  const goalStats = useMemo(() => {
    // Busca a meta base definida pelo usuário
    const baseGoal = (user.goalType === 'per_vehicle' && activeVehicle?.customDailyGoal) 
      ? activeVehicle.customDailyGoal 
      : user.dailyGoal;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = (daysInMonth - dayOfMonth) + 1;

    // Calcular o déficit real acumulado até ONTEM sem interferir nos dias já validados
    let accumulatedDeficit = 0;
    
    for (let d = 1; d < dayOfMonth; d++) {
      const dateString = new Date(year, month, d).toISOString().split('T')[0];
      const dayTxs = transactions.filter(t => t.vehicleId === activeVehicle?.vehicleId && t.date === dateString);
      
      const dayProfit = dayTxs.reduce((acc, t) => {
        return t.type === 'earning' ? acc + t.amount : acc - t.amount;
      }, 0);

      // Aqui a regra de negócio: usamos a meta base para verificar o que "faltou" no passado,
      // mas a mudança de hoje só altera a projeção futura.
      if (dayProfit < baseGoal) {
        accumulatedDeficit += (baseGoal - dayProfit);
      }
    }

    // A meta dinâmica para HOJE e dias futuros absorve o déficit passado diluído
    const dynamicGoal = baseGoal + (accumulatedDeficit / remainingDays);

    return {
      baseGoal,
      dynamicGoal,
      isDiluted: accumulatedDeficit > 5, 
      deficit: accumulatedDeficit,
      remainingDays
    };
    // CRITICAL: Adicionado activeVehicle?.customDailyGoal para atualização imediata ao salvar
  }, [user.dailyGoal, user.goalType, activeVehicle?.customDailyGoal, activeVehicle?.vehicleId, transactions, today]);

  const depreciationData = useMemo(() => {
    if (!activeVehicle || !activeVehicle.purchaseValue || !activeVehicle.purchaseDate) return null;
    const purchaseDate = new Date(activeVehicle.purchaseDate);
    const monthsOwned = Math.max(1, (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const monthlyDepreciationRate = 0.015; 
    const currentEstimatedValue = activeVehicle.purchaseValue * (1 - Math.min(0.70, monthsOwned * monthlyDepreciationRate));
    const dailyDepreciation = (activeVehicle.purchaseValue * monthlyDepreciationRate) / 30;
    return { currentEstimatedValue, dailyDepreciation };
  }, [activeVehicle?.purchaseValue, activeVehicle?.purchaseDate]);

  const dailyStats = useMemo(() => {
    if (!activeVehicle) return { earnings: 0, expenses: 0, profit: 0, costPerKm: null, amortizedCost: 0, maintReserve: 0, distance: 0 };
    
    const vehicleTxs = transactions.filter(t => t.vehicleId === activeVehicle.vehicleId);
    const todayTxs = vehicleTxs.filter(t => t.date === today);
    
    const earnings = todayTxs.filter(t => t.type === 'earning').reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = todayTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    
    let theoreticalDailyFixed = 0;
    if (activeVehicle.ownershipStatus === 'financiado' && activeVehicle.installmentValue) {
       theoreticalDailyFixed += activeVehicle.installmentValue / 30;
    } else if (activeVehicle.ownershipStatus === 'alugado' && activeVehicle.rentalValue) {
       theoreticalDailyFixed += activeVehicle.rentalValue / (activeVehicle.rentalPeriod === 'semanal' ? 7 : 30);
    }
    if (activeVehicle.hasInsurance && activeVehicle.insuranceValue) {
        theoreticalDailyFixed += activeVehicle.insuranceValue / 365;
    }

    const dailyDepreciation = depreciationData?.dailyDepreciation ?? 0;
    const todayKmEntries = todayTxs.filter(t => typeof t.kmInput === 'number' && t.kmInput > 0);
    let todayDistance = 0;

    if (todayKmEntries.length >= 2) {
      const sortedKms = todayKmEntries.map(e => e.kmInput!).sort((a,b) => a-b);
      todayDistance = sortedKms[sortedKms.length - 1] - sortedKms[0];
    } else if (earnings > 0) {
      todayDistance = earnings * 1.8; 
    }

    const maintReserve = todayDistance * MAINT_RATE;
    const profit = earnings - expenses - theoreticalDailyFixed - maintReserve - dailyDepreciation;

    return { earnings, expenses, amortizedCost: theoreticalDailyFixed, dailyDepreciation, maintReserve, profit, distance: todayDistance };
  }, [transactions, activeVehicle, today, MAINT_RATE, depreciationData]);

  const currentGoal = goalStats.dynamicGoal;
  const percentGoal = Math.min(100, Math.max(0, (dailyStats.profit / currentGoal) * 100));

  if (!activeVehicle) return <div className="p-8 text-center text-gray-500 mt-10">Cadastre um veículo para começar.</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <div className="bg-brand-primary/10 dark:bg-brand-primary/20 px-4 py-2 rounded-full flex items-center gap-2">
             {activeVehicle.ownershipStatus === 'alugado' ? <Key size={14} className="text-brand-primary" /> : activeVehicle.ownershipStatus === 'financiado' ? <CreditCard size={14} className="text-brand-primary" /> : <Wallet size={14} className="text-brand-primary" />}
             <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{activeVehicle.ownershipStatus}</span>
          </div>
          {user.isPro && (
            <div className="bg-orange-500/10 px-3 py-2 rounded-full flex items-center gap-1">
              <Sparkles size={12} className="text-orange-500" />
              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">PRO</span>
            </div>
          )}
        </div>
        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {activeVehicle.model} • {activeVehicle.plate}
        </div>
      </div>

      <div className="bg-white dark:bg-[#2b2930] rounded-[2.5rem] p-8 shadow-xl shadow-brand-primary/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16" />
        
        <button 
          onClick={() => onEditVehicle && onEditVehicle(activeVehicle)}
          className="absolute top-6 right-6 p-2 bg-brand-primary/5 dark:bg-white/5 text-brand-primary rounded-full hover:bg-brand-primary/10 active:scale-90 transition-all z-10"
        >
          <Settings size={20} />
        </button>

        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Lucro Real Líquido</span>
            <AlertTriangle size={12} className="text-orange-400" />
          </div>
          
          <h1 className={`text-6xl font-black tracking-tighter mb-8 ${dailyStats.profit >= 0 ? 'text-brand-primary' : 'text-red-500'}`}>
            {formatCurrency(dailyStats.profit)}
          </h1>
          
          <div className="w-full space-y-4">
            <div className="flex justify-between items-end">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Target size={16} className={goalStats.isDiluted ? "text-orange-500" : "text-brand-primary"} />
                  <span className={`text-sm font-black uppercase tracking-tight ${goalStats.isDiluted ? "text-orange-500" : "text-brand-navy dark:text-white"}`}>
                    {goalStats.isDiluted ? 'Meta Dinâmica' : 'Meta Diária'}
                  </span>
                </div>
                <span className="text-2xl font-black text-brand-navy dark:text-white">
                  {formatCurrency(currentGoal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-primary">{percentGoal.toFixed(0)}%</span>
                <p className="text-[10px] font-black text-gray-400 uppercase">Concluído</p>
              </div>
            </div>

            <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${goalStats.isDiluted ? 'bg-gradient-to-r from-orange-400 to-brand-primary' : 'bg-brand-primary'}`} 
                style={{ width: `${percentGoal}%` }} 
              />
            </div>

            {goalStats.isDiluted && (
              <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info size={14} className="text-orange-500" />
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase">Ajuste de recuperação</span>
                </div>
                <span className="text-[10px] font-black text-gray-400 line-through">{formatCurrency(goalStats.baseGoal)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('manage_transactions', { filter: 'earning' })} className="bg-brand-emerald/5 p-6 rounded-[2rem] border border-brand-emerald/10 flex flex-col justify-between aspect-square active:scale-95 transition-all text-left group">
          <div className="bg-brand-emerald text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-brand-emerald/80 uppercase tracking-widest mb-1">Entradas</p>
            <p className="text-2xl font-black text-brand-emerald tracking-tighter">{formatCurrency(dailyStats.earnings)}</p>
          </div>
        </button>
        
        <button onClick={() => onNavigate('manage_transactions', { filter: 'expense' })} className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30 flex flex-col justify-between aspect-square active:scale-95 transition-all text-left group">
          <div className="bg-red-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mb-1">Saídas</p>
            <p className="text-2xl font-black text-red-500 tracking-tighter">{formatCurrency(dailyStats.expenses)}</p>
          </div>
        </button>
      </div>

      <div className="space-y-4">
        <button 
          onClick={() => setShowMaintInfo(true)}
          className="w-full bg-white dark:bg-[#2b2930] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="bg-brand-primary/10 text-brand-primary p-3 rounded-2xl">
              <Wrench size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reserva de Manutenção</p>
              <p className="text-xl font-black text-brand-navy dark:text-white">{formatCurrency(dailyStats.maintReserve)}</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-300" />
        </button>

        <div className="bg-white dark:bg-[#2b2930] p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 p-3 rounded-2xl">
              <CalendarClock size={24} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custo Fixo/Dia</p>
              <p className="text-xl font-black text-brand-navy dark:text-white">{formatCurrency(dailyStats.amortizedCost)}</p>
            </div>
          </div>
          {user.isPro && (
            <div className="text-right">
              <p className="text-[9px] font-black text-orange-500 uppercase">Depreciação</p>
              <p className="text-xs font-bold text-gray-400">{formatCurrency(dailyStats.dailyDepreciation)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
