import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Target,
  Gauge,
  AlertTriangle,
  CalendarClock,
  ShieldAlert
} from 'lucide-react';
import { Transaction, User, Vehicle } from '../types';
import { formatCurrency } from '../App';

interface DashboardProps {
  user: User;
  transactions: Transaction[];
  activeVehicle: Vehicle | undefined;
  onTransactionAdded: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, transactions, activeVehicle }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const dailyStats = useMemo(() => {
    if (!activeVehicle) return { earnings: 0, expenses: 0, profit: 0, costPerKm: null, amortizedCost: 0, isAmortized: false };
    const todayTxs = transactions.filter(t => t.vehicleId === activeVehicle.vehicleId && t.date === today);
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

    const hasPaidFixedToday = todayTxs.some(t => t.type === 'expense' && (t.category === 'FinanciamentoVeiculo' || t.category === 'AluguelVeiculo' || t.category === 'Seguro'));
    const appliedAmortizedCost = hasPaidFixedToday ? 0 : theoreticalDailyFixed;

    const variableExpenses = todayTxs.filter(t => t.type === 'expense' && (t.category === 'Combustível' || t.category === 'Manutenção')).reduce((acc, curr) => acc + curr.amount, 0);
    const kmInputs = todayTxs.map(t => t.kmInput).filter((k): k is number => typeof k === 'number' && k > 0);
    
    let costPerKm = null;
    if (new Set(kmInputs).size >= 2 && variableExpenses > 0) {
      const distance = Math.max(...kmInputs) - Math.min(...kmInputs);
      if (distance > 0) costPerKm = variableExpenses / distance;
    }

    return { earnings, expenses, amortizedCost: appliedAmortizedCost, isAmortized: !hasPaidFixedToday && theoreticalDailyFixed > 0, profit: earnings - expenses - appliedAmortizedCost, costPerKm };
  }, [transactions, activeVehicle, today]);

  const percentGoal = Math.min(100, Math.max(0, (dailyStats.profit / user.dailyGoal) * 100));

  if (!activeVehicle) return <div className="p-8 text-center text-gray-500 mt-10">Selecione um veículo para começar.</div>;

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-brand-navy dark:text-white tracking-tight">Painel de Hoje</h2>
        <p className="text-sm text-gray-500 font-medium">Controle seu rendimento em tempo real</p>
      </div>

      {/* Hero Profit Card - Flutter High Elevation style */}
      <div className="bg-white dark:bg-[#2b2930] rounded-3xl p-6 shadow-xl shadow-brand-primary/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Lucro Líquido</span>
          <h1 className={`text-5xl font-extrabold tracking-tighter ${dailyStats.profit >= 0 ? 'text-brand-primary' : 'text-red-500'}`}>
            {formatCurrency(dailyStats.profit)}
          </h1>
          
          <div className="w-full mt-8 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Target size={14}/> Meta: {formatCurrency(user.dailyGoal)}</span>
              <span className={`text-sm font-bold ${percentGoal >= 100 ? 'text-brand-emerald' : 'text-brand-primary'}`}>{percentGoal.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-brand-primary rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ width: `${percentGoal}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Material Tonal style */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-emerald/5 dark:bg-emerald-950/20 p-5 rounded-3xl border border-brand-emerald/10 flex flex-col justify-between aspect-square">
          <div className="bg-brand-emerald text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ArrowUpRight size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-brand-emerald/80 uppercase">Ganhos Brutos</p>
            <p className="text-2xl font-extrabold text-brand-emerald">{formatCurrency(dailyStats.earnings)}</p>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 flex flex-col justify-between aspect-square">
          <div className="bg-red-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-red-400 uppercase">Despesas Totais</p>
            <p className="text-2xl font-extrabold text-red-500">{formatCurrency(dailyStats.expenses)}</p>
          </div>
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#2b2930] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm">
           <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-500"><CalendarClock size={20} /></div>
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Custo Fixo/Dia</p>
              <p className="text-sm font-bold text-brand-navy dark:text-white">{formatCurrency(dailyStats.amortizedCost)}</p>
           </div>
        </div>
        <div className="bg-white dark:bg-[#2b2930] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm">
           <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center text-orange-500"><Gauge size={20} /></div>
           <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">Custo Real/KM</p>
              <p className="text-sm font-bold text-brand-navy dark:text-white">{dailyStats.costPerKm ? formatCurrency(dailyStats.costPerKm) : '--'}</p>
           </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-brand-navy dark:text-white px-1">Atividades Recentes</h3>
        <div className="space-y-3">
          {transactions.filter(t => t.vehicleId === activeVehicle.vehicleId && t.date === today).sort((a,b) => b.timestamp - a.timestamp).slice(0, 5).map(t => (
            <div key={t.transactionId} className="bg-white dark:bg-[#2b2930] p-4 rounded-2xl flex justify-between items-center shadow-sm active:scale-98 transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold ${t.type === 'earning' ? 'bg-brand-emerald/10 text-brand-emerald' : 'bg-red-50 text-red-500'}`}>
                  {t.category.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-brand-navy dark:text-white">{t.category}</p>
                  <p className="text-xs text-gray-400">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <span className={`font-bold ${t.type === 'earning' ? 'text-brand-emerald' : 'text-red-500'}`}>
                {t.type === 'earning' ? '+' : '-'} {formatCurrency(t.amount)}
              </span>
            </div>
          ))}
          {transactions.length === 0 && <p className="text-center py-8 text-gray-400 italic text-sm">Nenhum lançamento hoje.</p>}
        </div>
      </div>
    </div>
  );
};