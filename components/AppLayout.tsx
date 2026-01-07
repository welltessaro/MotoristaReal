import React, { useState } from 'react';
import { User, Vehicle, ViewState } from '../types';
import { ChevronDown, LayoutDashboard, Car as CarIcon, PieChart, Plus, User as UserIcon } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  user: User;
  vehicles: Vehicle[];
  activeVehicleId: string | undefined;
  onSwitchVehicle: (id: string) => void;
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
  onAddTransaction: () => void;
  onHeaderClick?: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  user,
  vehicles, 
  activeVehicleId, 
  onSwitchVehicle,
  currentView,
  onNavigate,
  onAddTransaction,
  onHeaderClick
}) => {
  const [isVehicleMenuOpen, setIsVehicleMenuOpen] = useState(false);
  const activeVehicle = vehicles.find(v => v.vehicleId === activeVehicleId);
  const isFocusMode = currentView === 'onboarding' || currentView === 'auth';

  const getVehicleLabel = (v: Vehicle) => {
    const plateFormatted = v.plate.length === 7 ? `${v.plate.slice(0, 3)}-${v.plate.slice(3)}` : v.plate;
    return `${v.model} • ${plateFormatted}`;
  };

  return (
    <div className="h-[100dvh] flex flex-col max-w-lg mx-auto overflow-hidden relative bg-brand-surface dark:bg-brand-navy">
      
      {!isFocusMode && (
        <header className="bg-brand-surface/90 dark:bg-brand-navy/90 backdrop-blur-md sticky top-0 z-30 pt-safe px-4 py-3 shrink-0">
          <div className="flex justify-between items-center h-12">
            <div className="flex items-center gap-2">
               <button 
                 onClick={() => onHeaderClick ? onHeaderClick() : setIsVehicleMenuOpen(!isVehicleMenuOpen)}
                 className="flex items-center gap-2 bg-brand-secondary/10 dark:bg-brand-secondary/20 py-2 px-4 rounded-full transition-all active:scale-95"
               >
                 <span className="w-2 h-2 rounded-full bg-brand-emerald"></span>
                 <span className="text-sm font-bold text-brand-navy dark:text-gray-200">
                   {activeVehicle ? getVehicleLabel(activeVehicle) : 'Selecionar Veículo'}
                 </span>
                 <ChevronDown size={16} className={`text-gray-500 transition-transform ${isVehicleMenuOpen ? 'rotate-180' : ''}`} />
               </button>
               
               {isVehicleMenuOpen && (
                 <>
                   <div className="fixed inset-0 z-40" onClick={() => setIsVehicleMenuOpen(false)}></div>
                   <div className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-[#2b2930] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden py-2 z-50 animate-fade-in">
                     <p className="px-6 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Meus Veículos</p>
                     {vehicles.map(v => (
                       <button
                         key={v.vehicleId}
                         onClick={() => {
                           onSwitchVehicle(v.vehicleId);
                           setIsVehicleMenuOpen(false);
                         }}
                         className={`w-full text-left px-6 py-4 text-sm flex justify-between items-center ${v.vehicleId === activeVehicleId ? 'bg-brand-primary/10 text-brand-primary font-bold' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                       >
                         {getVehicleLabel(v)}
                         {v.vehicleId === activeVehicleId && <div className="w-2 h-2 rounded-full bg-brand-primary" />}
                       </button>
                     ))}
                     <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-2"></div>
                     <button onClick={() => { onNavigate('vehicles'); setIsVehicleMenuOpen(false); }} className="w-full text-left px-6 py-4 text-sm font-black text-brand-primary">Gerenciar Frota</button>
                   </div>
                 </>
               )}
            </div>

            <button onClick={() => onNavigate('profile')} className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold text-sm shadow-md active:scale-90 transition-all">
               {user.name.charAt(0).toUpperCase()}
            </button>
          </div>
        </header>
      )}

      <main className="flex-1 overflow-y-auto no-scrollbar w-full animate-slide-up">
        <div className="p-4 pb-32">
          {children}
        </div>
      </main>

      {!isFocusMode && (
        <>
          <button 
            onClick={onAddTransaction}
            className="fixed bottom-24 right-6 w-16 h-16 bg-brand-primary dark:bg-brand-primary text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-90 hover:scale-105 transition-all z-40 border-4 border-white dark:border-brand-navy"
            aria-label="Adicionar"
          >
            <Plus size={32} strokeWidth={2.5} />
          </button>

          <nav className="bg-white dark:bg-[#2b2930] border-t border-gray-100 dark:border-gray-800 px-2 pb-safe shrink-0 z-30 h-20 flex items-center">
            <ul className="flex justify-around items-center w-full">
              <FlutterNavItem 
                icon={<LayoutDashboard size={24} />} 
                label="Painel" 
                isActive={currentView === 'dashboard'} 
                onClick={() => onNavigate('dashboard')} 
              />
              <FlutterNavItem 
                icon={<CarIcon size={24} />} 
                label="Veículos" 
                isActive={currentView === 'vehicles'} 
                onClick={() => onNavigate('vehicles')} 
              />
              <FlutterNavItem 
                icon={<PieChart size={24} />} 
                label="Relatórios" 
                isActive={currentView === 'reports'} 
                onClick={() => onNavigate('reports')} 
              />
              <FlutterNavItem 
                icon={<UserIcon size={24} />} 
                label="Perfil" 
                isActive={currentView === 'profile'} 
                onClick={() => onNavigate('profile')} 
              />
            </ul>
          </nav>
        </>
      )}
    </div>
  );
};

const FlutterNavItem = ({ icon, label, isActive, onClick }: any) => (
  <li className="flex-1">
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-16 gap-1 group relative transition-all`}
    >
      <div className={`w-16 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-500 dark:text-gray-400 group-active:bg-gray-100'}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-bold transition-all ${isActive ? 'text-brand-primary opacity-100' : 'text-gray-500 dark:text-gray-400 opacity-80'}`}>
        {label}
      </span>
    </button>
  </li>
);