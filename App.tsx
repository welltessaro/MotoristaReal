import React, { useEffect, useState, useMemo } from 'react';
import { User, Vehicle, Transaction, ViewState, OwnershipStatus, RentalPeriod, AppVersionInfo } from './types';
import { MockBackend } from './services/mockBackend';
import { loginWithGoogle, logoutFirebase } from './services/firebase';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './components/Dashboard';
import { TransactionModal } from './components/TransactionModal';
import { Button } from './components/ui/Button';
import { Car, Bike, ChevronRight, ChevronDown, LogOut, PlusCircle, TrendingUp, ShieldCheck, DollarSign, Calendar, AlertCircle, Gauge, Check, X, Lock, Download, Shield, ArrowLeftRight, Trophy, Sparkles, Rocket, Info, RefreshCw } from 'lucide-react';
// Importação do Recharts para gráficos
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Utilitários de Formatação ---

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
  return parseInt(cleanValue, 10) / 100;
};

// --- Dados de Veículos ---

const VEHICLE_OPTIONS: Record<'carro' | 'moto', Record<string, string[]>> = {
  carro: {
    'Chevrolet': ['Onix', 'Onix Plus', 'Tracker', 'Spin', 'Montana', 'Cruze'],
    'Fiat': ['Strada', 'Mobi', 'Argo', 'Cronos', 'Pulse', 'Fastback', 'Toro', 'Fiorino'],
    'Volkswagen': ['Polo', 'Polo Track', 'Virtus', 'T-Cross', 'Nivus', 'Saveiro', 'Gol', 'Voyage'],
    'Hyundai': ['HB20', 'HB20S', 'Creta'],
    'Toyota': ['Yaris', 'Corolla', 'Corolla Cross', 'Hilux', 'Etios'],
    'Jeep': ['Renegade', 'Compass', 'Commander'],
    'Renault': ['Kwid', 'Stepway', 'Logan', 'Duster', 'Oroch', 'Sandero'],
    'Honda': ['City', 'HR-V', 'Civic', 'Fit', 'WR-V'],
    'Nissan': ['Kicks', 'Versa', 'Sentra'],
    'BYD': ['Dolphin', 'Dolphin Mini', 'Song Plus', 'Yuan Plus'],
    'Caoa Chery': ['Tiggo 5x', 'Tiggo 7', 'Tiggo 8'],
    'Ford': ['Ka', 'Ka Sedan', 'EcoSport', 'Ranger'],
    'Citroën': ['C3', 'C3 Aircross', 'C4 Cactus']
  },
  moto: {
    'Honda': ['CG 160 Fan', 'CG 160 Titan', 'CG 160 Start', 'Biz 125', 'Biz 110i', 'NXR 160 Bros', 'Pop 110i', 'XRE 300', 'CB 300F', 'PCX'],
    'Yamaha': ['Fazer 250', 'Fazer 150', 'Factor 150', 'Crosser 150', 'NMAX 160', 'XMAX', 'Neo 125', 'Lander 250'],
    'Shineray': ['XY 50', 'Worker 125', 'Rio 125'],
    'Mottu': ['Sport 110i'],
    'BMW': ['G 310 R', 'G 310 GS', 'F 850 GS', 'R 1250 GS'],
    'Suzuki': ['Haojue DK 150', 'Haojue Chopper', 'V-Strom'],
    'Royal Enfield': ['Hunter 350', 'Meteor 350', 'Classic 350'],
    'Triumph': ['Tiger 900', 'Tiger 660']
  }
};

// --- Helpers de UI ---

const InputLabel = ({ children }: { children?: React.ReactNode }) => (
  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1">{children}</label>
);

const StyledInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input 
    className="w-full p-4 bg-white rounded-xl border border-gray-200 focus:border-brand-emerald outline-none shadow-sm text-brand-navy font-semibold transition-all dark:bg-slate-800 dark:border-slate-700"
    {...props}
  />
);

const StyledSelect = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    className="w-full p-4 bg-white rounded-xl border border-gray-100 focus:border-brand-emerald outline-none shadow-sm text-brand-navy font-semibold transition-all dark:bg-slate-800 dark:border-slate-700 appearance-none"
    {...props}
  />
);

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// --- Componentes de Notificação ---

const UpdateBanner = ({ version, onAction }: { version: string, onAction: () => void }) => (
  <div className="bg-brand-primary text-white p-3 flex justify-between items-center animate-fade-in shadow-lg sticky top-0 z-50">
    <div className="flex items-center gap-2">
      <Rocket size={16} />
      <span className="text-[11px] font-bold">Nova versão v{version} disponível na Play Store!</span>
    </div>
    <button onClick={onAction} className="bg-white text-brand-primary px-3 py-1 rounded-full text-[10px] font-extrabold active:scale-95 transition-all">
      ATUALIZAR
    </button>
  </div>
);

const ReleaseNotesModal = ({ notes, version, onDismiss }: { notes: string[], version: string, onDismiss: () => void }) => (
  <div className="fixed inset-0 z-[100] bg-brand-navy/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden animate-slide-up">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16" />
      
      <div className="flex flex-col items-center text-center">
        <div className="bg-brand-primary text-white p-4 rounded-3xl shadow-xl shadow-brand-primary/20 mb-6">
          <Sparkles size={32} />
        </div>
        <h2 className="text-2xl font-black text-brand-navy dark:text-white mb-1">O que há de novo?</h2>
        <p className="text-[10px] font-bold text-brand-primary uppercase tracking-widest mb-6">Versão {version}</p>
        
        <ul className="space-y-4 text-left w-full mb-8">
          {notes.map((note, i) => (
            <li key={i} className="text-sm font-medium text-gray-600 dark:text-gray-300 flex gap-3">
              <div className="w-5 h-5 bg-brand-primary/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-brand-primary" />
              </div>
              {note}
            </li>
          ))}
        </ul>
        
        <Button 
          onClick={onDismiss}
          fullWidth
          className="py-4 text-lg shadow-xl shadow-brand-primary/10"
        >
          Excelente!
        </Button>
      </div>
    </div>
  </div>
);

// --- Views ---

const AuthView = ({ onLogin, onGoogleLogin }: any) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <div className="min-h-screen bg-brand-navy flex flex-col justify-center items-center p-8 text-white max-w-lg mx-auto relative overflow-hidden">
      <div className="absolute top-0 left-0 w-64 h-64 bg-brand-emerald opacity-10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="w-full max-w-sm z-10 animate-fade-in">
        <div className="mb-10 text-center">
          <div className="bg-gradient-to-br from-brand-emerald to-emerald-700 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-emerald-500/20 transform rotate-3"><TrendingUp size={40} className="text-white" /></div>
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">Motorista<span className="text-brand-emerald">Real</span></h1>
          <p className="text-gray-400 font-medium text-lg">Acabe com a cegueira financeira.</p>
        </div>
        <div className="bg-white/5 backdrop-blur-lg p-6 rounded-3xl border border-white/10 shadow-xl">
          <button onClick={onGoogleLogin} disabled={loading} className="w-full bg-white text-brand-navy font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-lg mb-6">
            <GoogleIcon /> Entrar com Google
          </button>
          <div className="relative flex py-2 items-center mb-6"><div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase">Ou use e-mail</span><div className="flex-grow border-t border-gray-600"></div></div>
          <form onSubmit={(e) => { e.preventDefault(); onLogin(email); }} className="space-y-4">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-slate-800/50 border border-slate-600 rounded-xl p-4 text-white placeholder-gray-500 outline-none focus:border-brand-emerald transition-all" placeholder="seu@email.com" />
            <Button fullWidth variant="secondary" disabled={loading} className="py-4 text-lg">Entrar Agora</Button>
          </form>
        </div>
      </div>
    </div>
  );
};

const OnboardingView = ({ onFinish }: any) => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [ownership, setOwnership] = useState<OwnershipStatus>('proprio');
  return (
    <div className="min-h-screen bg-brand-surface flex flex-col pt-safe px-4 max-w-lg mx-auto overflow-y-auto no-scrollbar">
      <div className="mt-8 mb-10 text-center">
         <h2 className="text-3xl font-black text-brand-navy">Vamos começar?</h2>
         <p className="text-gray-500 mt-2 font-medium">Cadastre seu primeiro veículo de trabalho.</p>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); onFinish({ brand, model, ownershipStatus: ownership, type: 'carro', plate: 'PRO-2025' }); }} className="space-y-6">
        <div><InputLabel>Marca</InputLabel><StyledInput placeholder="Ex: Chevrolet" value={brand} onChange={e => setBrand(e.target.value)} required /></div>
        <div><InputLabel>Modelo</InputLabel><StyledInput placeholder="Ex: Onix" value={model} onChange={e => setModel(e.target.value)} required /></div>
        <div><InputLabel>Situação</InputLabel><div className="grid grid-cols-3 gap-2 mt-2">{(['proprio', 'financiado', 'alugado'] as OwnershipStatus[]).map(s => (<button key={s} type="button" onClick={() => setOwnership(s)} className={`py-3 px-1 rounded-xl text-xs font-bold uppercase transition-all border ${ownership === s ? 'bg-brand-primary text-white border-brand-primary shadow-lg' : 'bg-white text-gray-400 border-gray-100'}`}>{s === 'proprio' ? 'Próprio' : s}</button>))}</div></div>
        <Button type="submit" fullWidth className="py-5 text-lg mt-10" variant="primary">Finalizar Cadastro</Button>
      </form>
    </div>
  );
};

const VehiclesView = ({ vehicles, onAdd, onCompare }: any) => (
  <div className="space-y-6 animate-fade-in pb-24">
    <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold text-brand-navy dark:text-white">Meus Veículos</h2><div className="flex gap-2"><button onClick={onCompare} className="p-2 bg-brand-primary/10 text-brand-primary rounded-xl"><ArrowLeftRight size={20} /></button><button onClick={onAdd} className="p-2 bg-brand-emerald/10 text-brand-emerald rounded-xl"><PlusCircle size={20} /></button></div></div>
    <div className="space-y-4">
      {vehicles.map((v: any) => (
        <div key={v.vehicleId} className={`bg-white dark:bg-[#2b2930] p-5 rounded-3xl border ${v.isActive ? 'border-brand-primary shadow-lg' : 'border-gray-100 dark:border-gray-800'}`}>
          <div className="flex items-center gap-4"><div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl">{v.type === 'moto' ? <Bike size={24}/> : <Car size={24}/>}</div><div className="flex-1"><h3 className="font-bold text-lg text-brand-navy dark:text-white">{v.model}</h3><p className="text-sm text-gray-500">{v.brand}</p></div></div>
        </div>
      ))}
    </div>
  </div>
);

const ReportsView = ({ transactions }: { transactions: Transaction[] }) => {
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split('T')[0];
    });
    return last7Days.map(date => {
      const dayTxs = transactions.filter(t => t.date === date);
      const earnings = dayTxs.filter(t => t.type === 'earning').reduce((acc, c) => acc + c.amount, 0);
      const expenses = dayTxs.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
      return { name: date.split('-')[2], ganho: earnings, gasto: expenses, lucro: earnings - expenses };
    });
  }, [transactions]);

  const stats = useMemo(() => {
    const earnings = transactions.filter(t => t.type === 'earning').reduce((acc, c) => acc + c.amount, 0);
    const expenses = transactions.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
    return { totalEarnings: earnings, totalExpenses: expenses, netProfit: earnings - expenses };
  }, [transactions]);

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <h2 className="text-2xl font-bold text-brand-navy dark:text-white">Relatórios</h2>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#2b2930] p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
           <p className="text-[9px] font-bold text-gray-400 uppercase">Ganhos</p>
           <p className="text-sm font-bold text-brand-emerald">{formatCurrency(stats.totalEarnings)}</p>
        </div>
        <div className="bg-white dark:bg-[#2b2930] p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
           <p className="text-[9px] font-bold text-gray-400 uppercase">Gastos</p>
           <p className="text-sm font-bold text-red-500">{formatCurrency(stats.totalExpenses)}</p>
        </div>
        <div className="bg-brand-primary/10 p-3 rounded-2xl border border-brand-primary/20">
           <p className="text-[9px] font-bold text-brand-primary uppercase">Lucro</p>
           <p className="text-sm font-bold text-brand-primary">{formatCurrency(stats.netProfit)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#2b2930] p-4 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 className="text-sm font-bold text-gray-500 mb-4 px-2 uppercase tracking-widest">Últimos 7 Dias</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fontWeight: 'bold', fill: '#999'}} />
              <YAxis hide />
              <Tooltip 
                cursor={{fill: 'rgba(103, 80, 164, 0.05)'}}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
              />
              <Bar dataKey="lucro" radius={[6, 6, 0, 0]}>
                 {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.lucro >= 0 ? '#10b981' : '#ef4444'} />
                 ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const CompareView = ({ vehicles, transactions, onBack }: any) => {
  const comparisonData = useMemo(() => {
    return vehicles.map((v: any) => {
      const vTxs = transactions.filter(t => t.vehicleId === v.vehicleId);
      const earnings = vTxs.filter(t => t.type === 'earning').reduce((acc, c) => acc + c.amount, 0);
      const expenses = vTxs.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
      return { ...v, profit: earnings - expenses };
    }).sort((a: any, b: any) => b.profit - a.profit);
  }, [vehicles, transactions]);
  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <div className="flex items-center gap-2 mb-4"><button onClick={onBack} className="p-2 -ml-2 text-brand-navy hover:bg-gray-100 rounded-full"><ChevronRight size={24} className="rotate-180" /></button><h2 className="text-2xl font-bold text-brand-navy">Comparar Desempenho</h2></div>
      <div className="space-y-4">{comparisonData.map((data: any, index: number) => (<div key={data.vehicleId} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">{index === 0 && <div className="absolute top-0 right-0 bg-brand-emerald text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl"><Trophy size={10} className="inline mr-1" /> Melhor Lucro</div>}<h3 className="font-bold text-brand-navy">{data.model}</h3><p className="text-lg font-bold text-brand-emerald">{formatCurrency(data.profit)}</p></div>))}</div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    const u = MockBackend.getUser();
    if (u) { setUser(u); loadUserData(u); }
    
    // Check Version for Update Management
    MockBackend.getAppVersion().then(info => {
      setVersionInfo(info);
      if (MockBackend.checkUpdateStatus(info.currentVersion)) {
        setShowNotes(true);
      }
    });
  }, []);

  const loadUserData = async (currentUser: User) => {
    const v = await MockBackend.getVehicles(currentUser.uid);
    const t = await MockBackend.getTransactions(currentUser.uid);
    setVehicles(v); setTransactions(t);
    if (v.length === 0) setView('onboarding'); else setView(prev => (prev === 'auth' || prev === 'onboarding') ? 'dashboard' : prev);
  };

  const handleLogin = async (email: string) => { const u = await MockBackend.login(email); setUser(u); loadUserData(u); };
  const handleGoogleLogin = async () => { const firebaseUser = await loginWithGoogle(); const appUser: User = { uid: firebaseUser.uid, email: firebaseUser.email || '', name: firebaseUser.displayName || 'Motorista', dailyGoal: 200, isPro: false }; localStorage.setItem('motoristareal_user', JSON.stringify(appUser)); setUser(appUser); loadUserData(appUser); };
  const handleLogout = async () => { await logoutFirebase(); MockBackend.logout(); setView('auth'); setUser(null); setVehicles([]); setTransactions([]); };

  const handleUpdateCheck = async () => {
    setIsCheckingUpdate(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsCheckingUpdate(false);
    if (versionInfo && versionInfo.latestVersion !== versionInfo.currentVersion) {
      alert(`Uma nova versão (${versionInfo.latestVersion}) está disponível na Play Store!`);
    } else {
      alert("Seu aplicativo já está na versão mais recente.");
    }
  };

  const handleDismissNotes = () => {
    if (versionInfo) {
      MockBackend.dismissVersionNotes(versionInfo.currentVersion);
      setShowNotes(false);
    }
  };

  const isUpdateAvailable = versionInfo && versionInfo.latestVersion !== versionInfo.currentVersion;

  if (view === 'auth') return <AuthView onLogin={handleLogin} onGoogleLogin={handleGoogleLogin} />;
  if (view === 'onboarding') return <OnboardingView onFinish={(d: any) => user && MockBackend.addVehicle({...d, userId: user.uid}).then(() => loadUserData(user))} />;
  if (!user) return null;

  return (
    <AppLayout 
      user={user} 
      vehicles={vehicles}
      activeVehicleId={vehicles.find(v => v.isActive)?.vehicleId}
      onSwitchVehicle={async (id) => { const v = await MockBackend.setActiveVehicle(id); setVehicles(v); }}
      currentView={view}
      onNavigate={setView}
      onAddTransaction={() => setIsTransactionModalOpen(true)}
    >
      {isUpdateAvailable && view === 'dashboard' && (
        <UpdateBanner version={versionInfo.latestVersion} onAction={() => window.open('https://play.google.com/store/apps/details?id=com.motoristareal')} />
      )}
      
      {showNotes && versionInfo && (
        <ReleaseNotesModal notes={versionInfo.releaseNotes} version={versionInfo.currentVersion} onDismiss={handleDismissNotes} />
      )}

      {view === 'dashboard' && <Dashboard user={user} transactions={transactions} activeVehicle={vehicles.find(v => v.isActive)} onTransactionAdded={() => loadUserData(user)} />}
      {view === 'vehicles' && <VehiclesView vehicles={vehicles} onAdd={() => setView('onboarding')} onCompare={() => setView('compare')} />}
      {view === 'reports' && <ReportsView transactions={transactions} />}
      {view === 'compare' && <CompareView vehicles={vehicles} transactions={transactions} onBack={() => setView('vehicles')} />}
      
      {view === 'profile' && (
        <div className="space-y-6">
          <h2 className="text-3xl font-black text-brand-navy dark:text-white">Perfil</h2>
          <div className="bg-white dark:bg-[#2b2930] p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-brand-primary to-slate-800 rounded-full flex items-center justify-center text-white font-black text-3xl mb-4 shadow-xl shadow-brand-primary/20">{user.name.charAt(0).toUpperCase()}</div>
            <h3 className="font-black text-xl text-brand-navy dark:text-white">{user.name}</h3>
            <p className="text-gray-500 font-medium">{user.email}</p>
          </div>

          <div className="space-y-3">
             <button 
              onClick={handleUpdateCheck}
              disabled={isCheckingUpdate}
              className="w-full bg-white dark:bg-[#2b2930] p-4 rounded-2xl border border-gray-100 flex items-center justify-between font-bold text-sm text-brand-navy dark:text-white active:scale-95 transition-all"
             >
                <div className="flex items-center gap-3">
                  <RefreshCw size={20} className={`text-brand-primary ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  Verificar atualizações
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase">v{versionInfo?.currentVersion}</span>
             </button>

             <button 
              onClick={() => setShowNotes(true)}
              className="w-full bg-white dark:bg-[#2b2930] p-4 rounded-2xl border border-gray-100 flex items-center justify-between font-bold text-sm text-brand-navy dark:text-white active:scale-95 transition-all"
             >
                <div className="flex items-center gap-3">
                  <Info size={20} className="text-brand-primary" />
                  O que há de novo
                </div>
                <ChevronRight size={16} className="text-gray-400" />
             </button>

             <button 
              onClick={handleLogout}
              className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center gap-3 font-bold text-sm text-red-500 active:scale-95 transition-all"
             >
                <LogOut size={20} />
                Sair da Conta
             </button>
          </div>
        </div>
      )}

      <TransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        onSubmit={async (d: any) => { 
          const activeId = vehicles.find(v => v.isActive)?.vehicleId; 
          if(activeId && user) { 
            await MockBackend.addTransaction({...d, userId: user.uid, vehicleId: activeId}); 
            loadUserData(user); 
            setIsTransactionModalOpen(false); 
          } 
        }} 
        activeVehicleId={vehicles.find(v => v.isActive)?.vehicleId || ''} 
      />
    </AppLayout>
  );
};

export default App;