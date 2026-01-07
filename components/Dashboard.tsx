
import React, { useMemo, useState } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Target,
  CreditCard,
  Key,
  CalendarClock,
  Wrench,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Check,
  Info,
  Sparkles,
  Wallet,
  X,
  Calculator,
  HelpCircle,
  PiggyBank,
  Coins,
  TrendingUp,
  Settings
} from 'lucide-react';
import { Transaction, User, Vehicle, ViewState } from '../types';
import { formatCurrency } from '../App';

interface DashboardProps {
  user: User;
  transactions: Transaction[];
  vehicles: Vehicle[]; // Lista completa para o switcher
  activeVehicle: Vehicle | undefined;
  onTransactionAdded: () => void;
  onUserUpdate: (updates: Partial<User>) => void;
  onVehicleUpdate: (vId: string, updates: Partial<Vehicle>) => void;
  onSwitchVehicle: (id: string) => void; // Função de troca
  onNavigate: (view: ViewState, state?: any) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  transactions, 
  vehicles,
  activeVehicle, 
  onTransactionAdded,
  onSwitchVehicle,
  onNavigate, 
  onEditVehicle 
}) => {
  const [showGoalInfo, setShowGoalInfo] = useState(false);
  const [showProfitDetails, setShowProfitDetails] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const MAINT_RATE = activeVehicle?.customMaintRate ?? (activeVehicle?.type === 'moto' ? 0.08 : 0.15);
  const hasMultipleVehicles = vehicles.length > 1;

  const goalStats = useMemo(() => {
    const baseGoal = activeVehicle?.customDailyGoal || user.dailyGoal || 0;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const remainingDays = (daysInMonth - dayOfMonth) + 1;

    let accumulatedDeficit = 0;
    for (let d = 1; d < dayOfMonth; d++) {
      const dateString = new Date(year, month, d).toISOString().split('T')[0];
      const dayTxs = transactions.filter(t => t.vehicleId === activeVehicle?.vehicleId && t.date === dateString);
      const dayProfit = dayTxs.reduce((acc, t) => t.type === 'earning' ? acc + t.amount : acc - t.amount, 0);
      if (dayProfit < baseGoal) accumulatedDeficit += (baseGoal - dayProfit);
    }

    const dynamicGoal = baseGoal + (accumulatedDeficit / remainingDays);
    return {
      baseGoal,
      dynamicGoal: baseGoal > 0 ? dynamicGoal : 0,
      isDiluted: accumulatedDeficit > 5 && baseGoal > 0
    };
  }, [user.dailyGoal, activeVehicle?.customDailyGoal, activeVehicle?.vehicleId, transactions]);

  const dailyStats = useMemo(() => {
    if (!activeVehicle) return { earnings: 0, expenses: 0, profit: 0, amortizedCost: 0, maintReserve: 0, distance: 0 };
    
    const vehicleTxs = transactions.filter(t => t.vehicleId === activeVehicle.vehicleId);
    const todayTxs = vehicleTxs.filter(t => t.date === today);
    
    const earnings = todayTxs.filter(t => t.type === 'earning').reduce((acc, curr) => acc + curr.amount, 0);
    const expenses = todayTxs.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    
    // Verificação se houve pagamento real de financiamento/aluguel no mês vigente para zerar o custo teórico
    const now = new Date();
    const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

    const hasPaidFinancingThisMonth = vehicleTxs.some(t => 
       t.category === 'FinanciamentoVeiculo' && 
       t.type === 'expense' && 
       t.date.startsWith(currentMonthStr)
    );

    const hasPaidRentThisMonth = vehicleTxs.some(t => 
       t.category === 'AluguelVeiculo' && 
       t.type === 'expense' && 
       t.date.startsWith(currentMonthStr)
    );

    // Cálculo Dinâmico de Custo Fixo baseado em Vencimento e Pagamentos Realizados
    let theoreticalDailyFixed = 0;
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    if (activeVehicle.ownershipStatus === 'financiado' && activeVehicle.installmentValue && !hasPaidFinancingThisMonth) {
       const dueDate = activeVehicle.rentalDueDate || 10;
       const daysToPay = dueDate >= currentDay ? (dueDate - currentDay + 1) : (daysInMonth - currentDay + dueDate);
       theoreticalDailyFixed += activeVehicle.installmentValue / Math.max(1, daysToPay);
    } else if (activeVehicle.ownershipStatus === 'alugado' && activeVehicle.rentalValue && !hasPaidRentThisMonth) {
       const period = activeVehicle.rentalPeriod === 'semanal' ? 7 : daysInMonth;
       theoreticalDailyFixed += activeVehicle.rentalValue / period;
    }

    if (activeVehicle.hasInsurance && activeVehicle.insuranceValue) {
        theoreticalDailyFixed += activeVehicle.insuranceValue / 30;
    }

    const todayKmEntries = todayTxs.filter(t => typeof t.kmInput === 'number' && t.kmInput > 0);
    let todayDistance = 0;
    if (todayKmEntries.length >= 2) {
      const sortedKms = todayKmEntries.map(e => e.kmInput!).sort((a,b) => a-b);
      todayDistance = sortedKms[sortedKms.length - 1] - sortedKms[0];
    } else if (earnings > 0) {
      todayDistance = earnings * 1.8; 
    }

    const maintReserve = todayDistance * MAINT_RATE;
    const profit = earnings - expenses - theoreticalDailyFixed - maintReserve;

    return { earnings, expenses, amortizedCost: theoreticalDailyFixed, maintReserve, profit, distance: todayDistance };
  }, [transactions, activeVehicle, today, MAINT_RATE]);

  const currentGoal = goalStats.dynamicGoal;
  
  // Cálculo da porcentagem:
  // rawPercent: valor real matemático (pode ser negativo ou maior que 100)
  const rawPercent = currentGoal > 0 ? (dailyStats.profit / currentGoal) * 100 : 0;
  
  // displayPercent: Para exibição em texto (permite > 100%, mas não negativo)
  const displayPercent = Math.max(0, rawPercent);
  
  // progressPercent: Para a barra visual (limita entre 0 e 100 para não quebrar layout)
  const progressPercent = Math.min(100, Math.max(0, rawPercent));

  if (!activeVehicle) return <div className="p-8 text-center text-gray-500 mt-10">Cadastre um veículo para começar.</div>;

  return (
    <div className="space-y-4 animate-fade-in pb-20">
      {/* Header do Veículo com Switcher */}
      <div className="relative z-20 mb-2 px-1">
        <button 
          className={`flex items-center gap-2 group transition-all ${hasMultipleVehicles ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
          onClick={() => hasMultipleVehicles && setIsSwitcherOpen(!isSwitcherOpen)}
          disabled={!hasMultipleVehicles}
        >
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:text-brand-primary transition-colors flex items-center gap-1">
            {activeVehicle.model} • {activeVehicle.plate}
            {hasMultipleVehicles && <ChevronDown size={12} className={`transition-transform duration-300 ${isSwitcherOpen ? 'rotate-180' : ''}`} />}
          </div>
        </button>

        {/* Dropdown Menu */}
        {isSwitcherOpen && hasMultipleVehicles && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsSwitcherOpen(false)} />
            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-[#2b2930] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-2 z-20 animate-fade-in">
              <div className="mb-2 px-3 py-2 text-[9px] font-bold text-gray-300 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800">
                Alternar Veículo
              </div>
              {vehicles.map(v => (
                <button
                  key={v.vehicleId}
                  onClick={() => {
                    onSwitchVehicle(v.vehicleId);
                    setIsSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-xl text-xs font-bold flex items-center justify-between mb-1 transition-colors ${
                    v.vehicleId === activeVehicle.vehicleId 
                      ? 'bg-brand-primary/10 text-brand-primary' 
                      : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span>{v.model} <span className="text-[9px] font-normal opacity-70 ml-1">{v.plate}</span></span>
                  {v.vehicleId === activeVehicle.vehicleId && <Check size={14} />}
                </button>
              ))}
              
              <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
              
              <button
                onClick={() => {
                  onEditVehicle?.(activeVehicle);
                  setIsSwitcherOpen(false);
                }}
                className="w-full text-left px-3 py-3 rounded-xl text-xs font-bold text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
              >
                <Settings size={14} />
                Configurar {activeVehicle.model}
              </button>
            </div>
          </>
        )}
      </div>

      {/* CARD 1: LUCRO REAL LÍQUIDO */}
      <div 
        onClick={() => setShowProfitDetails(true)}
        className="bg-white dark:bg-[#2b2930] rounded-[2.5rem] p-8 shadow-xl shadow-brand-primary/5 border border-gray-100 dark:border-gray-800 relative overflow-hidden transition-all cursor-pointer active:scale-[0.98] group"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 group-hover:bg-brand-primary/10 transition-colors" />
        
        <div className="flex flex-col items-center relative z-10">
          <div className="flex items-center gap-2 mb-3 bg-gray-50 dark:bg-white/5 px-3 py-1 rounded-full">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Lucro Real Líquido</span>
            <HelpCircle size={12} className="text-brand-primary" />
          </div>
          
          <h1 className={`text-6xl font-black tracking-tighter mb-2 ${dailyStats.profit >= 0 ? 'text-brand-primary' : 'text-red-500'}`}>
            {formatCurrency(dailyStats.profit)}
          </h1>
          
          <p className="text-xs font-medium text-gray-400">
             {dailyStats.profit >= 0 ? 'Seu saldo limpo hoje' : 'Saldo negativo, corra atrás!'}
          </p>
        </div>
      </div>

      {/* CARD 2: META DIÁRIA */}
      <div 
        onClick={() => setShowGoalInfo(true)}
        className="bg-white dark:bg-[#2b2930] rounded-[2rem] p-6 shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer active:scale-[0.98] transition-all"
      >
         <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
               <div className={`p-2.5 rounded-xl ${goalStats.isDiluted ? "bg-orange-100 text-orange-500" : "bg-brand-primary/10 text-brand-primary"}`}>
                  <Target size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Meta de Hoje</p>
                  <p className={`text-xl font-black ${goalStats.isDiluted ? "text-orange-500" : "text-brand-navy dark:text-white"}`}>
                     {currentGoal > 0 ? formatCurrency(currentGoal) : '---'}
                  </p>
               </div>
            </div>
            <div className="text-right">
               <span className="text-2xl font-black text-brand-primary">{displayPercent.toFixed(0)}%</span>
            </div>
         </div>
         
         <div className="h-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden mb-3 relative">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out ${goalStats.isDiluted ? 'bg-orange-400' : 'bg-brand-primary'}`} 
              style={{ width: `${progressPercent}%` }} 
            />
         </div>

         <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1">
               <span className={`w-1.5 h-1.5 rounded-full ${dailyStats.profit >= 0 ? 'bg-brand-emerald' : 'bg-red-500'}`}></span>
               <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Realizado: <span className={dailyStats.profit >= 0 ? 'text-brand-emerald' : 'text-red-400'}>{formatCurrency(dailyStats.profit)}</span>
               </span>
            </div>
            
            {currentGoal > dailyStats.profit && dailyStats.profit > 0 && (
               <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Falta: {formatCurrency(currentGoal - dailyStats.profit)}
               </span>
            )}
            
            {dailyStats.profit <= 0 && (
               <span className="text-[10px] font-bold text-orange-400 uppercase">
                  Recuperando custos
               </span>
            )}
         </div>
         
         {goalStats.isDiluted && (
            <p className="text-[9px] font-bold text-orange-400 mt-2 text-center border-t border-orange-100 dark:border-orange-900/30 pt-2">
               Meta ajustada para cobrir dias anteriores.
            </p>
         )}
      </div>

      {/* GRID ENTRADAS / SAÍDAS */}
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => onNavigate('manage_transactions', { filter: 'earning', date: today })} className="bg-brand-emerald/5 p-6 rounded-[2rem] border border-brand-emerald/10 flex flex-col justify-between aspect-square active:scale-95 transition-all text-left group">
          <div className="bg-brand-emerald text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-brand-emerald/80 uppercase tracking-widest mb-1">Entradas</p>
            <p className="text-2xl font-black text-brand-emerald tracking-tighter">{formatCurrency(dailyStats.earnings)}</p>
          </div>
        </button>
        
        <button onClick={() => onNavigate('manage_transactions', { filter: 'expense', date: today })} className="bg-red-50 dark:bg-red-900/10 p-6 rounded-[2rem] border border-red-100 dark:border-red-900/30 flex flex-col justify-between aspect-square active:scale-95 transition-all text-left group">
          <div className="bg-red-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-red-500/80 uppercase tracking-widest mb-1">Saídas</p>
            <p className="text-2xl font-black text-red-500 tracking-tighter">{formatCurrency(dailyStats.expenses)}</p>
          </div>
        </button>
      </div>

      {/* CUSTO FIXO CARD */}
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
          <button 
            onClick={() => onEditVehicle?.(activeVehicle)}
            className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl text-[10px] font-black uppercase"
          >
            Débitos
          </button>
      </div>

      {/* --- MODAIS (Sem Alterações Funcionais) --- */}

      {/* Modal de Explicação da Meta */}
      {showGoalInfo && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setShowGoalInfo(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-brand-primary/10 p-3 rounded-2xl text-brand-primary"><Target size={24} /></div>
                <h3 className="text-lg font-black leading-tight">Cálculo da<br/>Meta Diária</h3>
              </div>
              <button onClick={() => setShowGoalInfo(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <div className="space-y-6">
              <div className="relative pl-6 border-l-2 border-gray-100 dark:border-gray-800 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">1. Meta Base</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    Você definiu que quer ganhar <strong className="text-brand-navy dark:text-white">{formatCurrency(goalStats.baseGoal)}</strong> por dia.
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">2. Compensação Mensal</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    O app ajusta sua meta baseando-se no saldo dos dias anteriores deste mês para garantir que você feche o mês no verde.
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest mb-1">3. Meta Dinâmica (Hoje)</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                    Sua meta hoje é <strong className="text-brand-primary text-lg">{formatCurrency(goalStats.dynamicGoal)}</strong>.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowGoalInfo(false)} 
                className="w-full py-4 bg-brand-primary text-white rounded-2xl font-bold text-sm"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalhamento do Lucro Real */}
      {showProfitDetails && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm p-6 animate-fade-in" onClick={() => setShowProfitDetails(false)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-slide-up relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-brand-emerald/10 p-3 rounded-2xl text-brand-emerald"><PiggyBank size={24} /></div>
                <h3 className="text-lg font-black leading-tight">Entenda seu<br/>Lucro Real</h3>
              </div>
              <button onClick={() => setShowProfitDetails(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-500">Ganhos do dia</span>
                  <span className="text-base font-black text-brand-emerald">+ {formatCurrency(dailyStats.earnings)}</span>
               </div>
               <div className="flex justify-between items-center py-2 border-b border-gray-50 dark:border-gray-800">
                  <span className="text-sm font-bold text-gray-500">Gastos de rua</span>
                  <span className="text-base font-black text-red-500">- {formatCurrency(dailyStats.expenses)}</span>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                     <AlertTriangle size={14} className="text-orange-400" />
                     <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Custos Invisíveis</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-gray-500">Fixo Diário</span>
                       <span className="text-[9px] text-gray-400">Parcela/Aluguel + Seguro (dividido por dias)</span>
                    </div>
                    <span className="text-sm font-black text-gray-600 dark:text-gray-300">- {formatCurrency(dailyStats.amortizedCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-gray-500">Reserva Manutenção</span>
                       <span className="text-[9px] text-gray-400">Estimado por KM rodado</span>
                    </div>
                    <span className="text-sm font-black text-gray-600 dark:text-gray-300">- {formatCurrency(dailyStats.maintReserve)}</span>
                  </div>
               </div>
            </div>

            <div className="bg-brand-primary/5 p-4 rounded-2xl text-center">
               <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest block mb-1">Lucro Real Líquido</span>
               <span className="text-3xl font-black text-brand-primary tracking-tighter">{formatCurrency(dailyStats.profit)}</span>
               <p className="text-[10px] font-medium text-gray-400 mt-2 leading-tight">
                 Isso é o que realmente sobra limpo para você após pagar todas as contas do veículo, hoje ou no futuro.
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
