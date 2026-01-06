import React, { useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Target,
  Gauge,
  CalendarClock,
  TrendingUp,
  TrendingDown,
  Info
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
    if (!activeVehicle) return { earnings: 0, expenses: 0, profit: 0, costPerKm: null, amortizedCost: 0 };
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

    return { earnings, expenses, amortizedCost: appliedAmortizedCost, profit: earnings - expenses - appliedAmortizedCost, costPerKm };
  }, [transactions, activeVehicle, today]);

  const projection = useMemo(() => {
    if (!activeVehicle) return null;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0];
    });
    const history = transactions.filter(t => t.vehicleId === activeVehicle.vehicleId && last7Days.includes(t.date));
    const totalProfit = history.filter(t => t.type === 'earning').reduce((acc, curr) => acc + curr.amount, 0) - history.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const avgDailyProfit = totalProfit / 7;
    
    const now = new Date();
    const daysRemaining = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
    return avgDailyProfit * daysRemaining;
  }, [transactions, activeVehicle]);

  const percentGoal = Math.min(100, Math.max(0, (dailyStats.profit / user.dailyGoal) * 100));

  if (!activeVehicle) return <div className="p-8 text-center text-gray-500 mt-10">Cadastre um veículo para começar.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-brand-navy dark:text-white tracking-tight">Painel de Hoje</h2>
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Seu lucro em tempo real</p>
      </div>

      <div className="bg-white dark:bg-[#2b2930] rounded-3xl p-6 shadow-xl shadow-brand-primary/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16" />
        <div className="flex flex-col items-center">
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Lucro Líquido</span>
          <h1 className={`text-5xl font-black tracking-tighter ${dailyStats.profit >= 0 ? 'text-brand-primary' : 'text-red-500'}`}>
            {formatCurrency(dailyStats.profit)}
          </h1>
          
          <div className="w-full mt-8 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><Target size={14}/> Meta Diária: {formatCurrency(user.dailyGoal)}</span>
              <span className={`text-sm font-black ${percentGoal >= 100 ? 'text-brand-emerald' : 'text-brand-primary'}`}>{percentGoal.toFixed(0)}%</span>
            </div>
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-brand-primary rounded-full transition-all duration-1000 ease-out shadow-sm" style={{ width: `${percentGoal}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-brand-primary p-5 rounded-3xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-20"><TrendingUp size={64} className="text-white" /></div>
          <p className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1"><Info size={10}/> Projeção Fim do Mês</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black text-white">{projection ? formatCurrency(projection) : '--'}</h3>
            <span className="text-white/50 text-xs font-bold italic">estimado</span>
          </div>
          <p className="text-white/60 text-[9px] mt-2 leading-relaxed">Com base na média dos últimos 7 dias. Mantenha o ritmo para atingir este resultado.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-emerald/5 p-5 rounded-3xl border border-brand-emerald/10 flex flex-col justify-between aspect-square">
          <div className="bg-brand-emerald text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <ArrowUpRight size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-brand-emerald/80 uppercase">Ganhos</p>
            <p className="text-2xl font-black text-brand-emerald">{formatCurrency(dailyStats.earnings)}</p>
          </div>
        </div>

        <div className="bg-red-50 p-5 rounded-3xl border border-red-100 flex flex-col justify-between aspect-square">
          <div className="bg-red-500 text-white w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <ArrowDownLeft size={22} />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-400 uppercase">Despesas</p>
            <p className="text-2xl font-black text-red-500">{formatCurrency(dailyStats.expenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#2b2930] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm">
           <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center text-gray-400"><CalendarClock size={20} /></div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Custo Fixo</p>
              <p className="text-sm font-black text-brand-navy dark:text-white">{formatCurrency(dailyStats.amortizedCost)}</p>
           </div>
        </div>
        <div className="bg-white dark:bg-[#2b2930] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 shadow-sm">
           <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/30 rounded-full flex items-center justify-center text-orange-500"><Gauge size={20} /></div>
           <div>
              <p className="text-[10px] font-black text-gray-400 uppercase">Custo/KM</p>
              <p className="text-sm font-black text-brand-navy dark:text-white">{dailyStats.costPerKm ? formatCurrency(dailyStats.costPerKm) : '--'}</p>
           </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-black text-brand-navy dark:text-white px-1">Ganhos por Plataforma</h3>
        <div className="space-y-3">
          {transactions.filter(t => t.vehicleId === activeVehicle.vehicleId && t.date === today && t.type === 'earning').map(t => (
            <div key={t.transactionId} className="bg-white dark:bg-[#2b2930] p-4 rounded-2xl flex justify-between items-center shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-brand-emerald/10 text-brand-emerald rounded-xl flex items-center justify-center font-black text-xl">{t.category.charAt(0)}</div>
                <div>
                  <p className="font-black text-brand-navy dark:text-white">{t.category}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{new Date(t.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
              <span className="font-black text-brand-emerald">+{formatCurrency(t.amount)}</span>
            </div>
          ))}
          {transactions.filter(t => t.date === today && t.type === 'earning').length === 0 && <p className="text-center py-8 text-gray-400 italic text-sm">Nenhum ganho registrado hoje.</p>}
        </div>
      </div>
    </div>
  );
};