import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from './ui/Button';
import { TransactionCategory, TransactionType, FuelType } from '../types';
import { formatDecimal, parseBRL } from '../App';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { 
    type: TransactionType; 
    amount: number; 
    category: TransactionCategory; 
    kmInput?: number; 
    date: string;
    fuelType?: FuelType;
    pricePerUnit?: number;
    fuelQuantity?: number;
  }) => void;
  activeVehicleId: string;
}

const CATEGORIES_EARNING: TransactionCategory[] = ['Uber', '99', 'Indriver', 'Particular'];
const CATEGORIES_EXPENSE: TransactionCategory[] = ['Combustível', 'Manutenção', 'Alimentação', 'Limpeza', 'FinanciamentoVeiculo', 'AluguelVeiculo', 'Outros'];

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const [type, setType] = useState<TransactionType>('earning');
  const [amountInput, setAmountInput] = useState('0,00');
  const [category, setCategory] = useState<TransactionCategory>('Uber');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [km, setKm] = useState('');

  // Fuel Specific States
  const [fuelType, setFuelType] = useState<FuelType>('Gasolina');
  const [pricePerUnitInput, setPricePerUnitInput] = useState('0,000');

  useEffect(() => {
    if (!isOpen) {
      setAmountInput('0,00');
      setKm('');
      setPricePerUnitInput('0,000');
      setFuelType('Gasolina');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numberValue = parseInt(value, 10) / 100;
    setAmountInput(isNaN(numberValue) ? '0,00' : formatDecimal(numberValue));
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    const numberValue = parseInt(value, 10) / 1000; // Postos de combustível usam 3 casas decimais
    setPricePerUnitInput(isNaN(numberValue) ? '0,000' : formatDecimal(numberValue, 3));
  };

  const calculateFuelQuantity = () => {
    const totalVal = parseBRL(amountInput);
    const cleanPrice = pricePerUnitInput.replace(/\D/g, '');
    const unitPrice = parseInt(cleanPrice, 10) / 1000;
    
    if (totalVal > 0 && unitPrice > 0) return totalVal / unitPrice;
    return 0;
  };

  const calculatedQty = calculateFuelQuantity();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseBRL(amountInput);
    if (amount <= 0) return;

    const cleanPrice = pricePerUnitInput.replace(/\D/g, '');
    const pricePerUnit = category === 'Combustível' ? parseInt(cleanPrice, 10) / 1000 : undefined;

    onSubmit({
      type,
      amount,
      category,
      date,
      kmInput: (type === 'expense' && km) ? parseFloat(km) : undefined,
      fuelType: (type === 'expense' && category === 'Combustível') ? fuelType : undefined,
      pricePerUnit,
      fuelQuantity: (type === 'expense' && category === 'Combustível' && calculatedQty > 0) ? calculatedQty : undefined
    });
    
    onClose();
  };

  const getUnitLabel = () => {
    if (fuelType === 'GNV') return 'm³';
    if (fuelType === 'kWh') return 'kWh';
    return 'Litro';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-navy/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
             <button onClick={() => { setType('earning'); setCategory('Uber'); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${type === 'earning' ? 'bg-brand-emerald text-white' : 'text-gray-400'}`}>Ganho</button>
             <button onClick={() => { setType('expense'); setCategory('Combustível'); }} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${type === 'expense' ? 'bg-red-500 text-white' : 'text-gray-400'}`}>Gasto</button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-center py-4">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 block">Valor</label>
            <div className="relative inline-block">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full text-2xl font-medium text-gray-400 pr-2">R$</span>
              <input type="text" value={amountInput} onChange={handleAmountChange} className={`w-48 text-center text-6xl font-extrabold bg-transparent border-none outline-none ${type === 'earning' ? 'text-brand-navy' : 'text-red-500'}`} autoFocus />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Categoria</label>
            <div className="flex flex-wrap gap-2 justify-center">
              {(type === 'earning' ? CATEGORIES_EARNING : CATEGORIES_EXPENSE).map(cat => (
                <button key={cat} type="button" onClick={() => setCategory(cat)} className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${category === cat ? 'bg-brand-navy text-white border-brand-navy shadow-lg' : 'bg-white dark:bg-slate-800 text-gray-500 border-gray-200'}`}>
                  {cat === 'FinanciamentoVeiculo' ? 'Financiamento' : cat === 'AluguelVeiculo' ? 'Aluguel' : cat}
                </button>
              ))}
            </div>
          </div>

          {type === 'expense' && category === 'Combustível' && (
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-orange-400 uppercase mb-2">Combustível</label>
                <div className="flex gap-2">
                  {(['Gasolina', 'Etanol', 'GNV', 'kWh'] as FuelType[]).map(ft => (
                    <button key={ft} type="button" onClick={() => setFuelType(ft)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${fuelType === ft ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 text-orange-400 border-orange-200'}`}>{ft}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                 <div className="flex-1">
                    <label className="block text-[10px] font-bold text-orange-400 uppercase mb-1">Preço / {getUnitLabel()}</label>
                    <div className="relative bg-white dark:bg-slate-800 rounded-xl border border-orange-200 px-3 py-2">
                      <span className="text-gray-400 font-bold mr-1">R$</span>
                      <input type="text" value={pricePerUnitInput} onChange={handlePriceChange} className="w-full bg-transparent font-bold text-brand-navy outline-none" />
                    </div>
                 </div>
                 <div className="flex-1 bg-white/50 dark:bg-slate-800/50 rounded-xl p-2 flex flex-col items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Litros</span>
                    <span className="text-xl font-extrabold text-brand-navy">{calculatedQty > 0 ? calculatedQty.toFixed(2) : '--'}</span>
                 </div>
              </div>
            </div>
          )}

          <div className={`grid ${type === 'expense' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
              <Calendar size={20} className="text-gray-400" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-transparent text-sm font-bold text-brand-navy outline-none" required />
            </div>
            {type === 'expense' && (
               <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-gray-100 flex items-center gap-3">
                 <span className="text-xs font-bold text-gray-400">KM:</span>
                 <input type="number" value={km} onChange={e => setKm(e.target.value)} placeholder="Atual" className="w-full bg-transparent text-sm font-bold text-brand-navy outline-none" />
               </div>
             )}
          </div>
          <Button type="submit" fullWidth variant={type === 'earning' ? 'secondary' : 'danger'} className="py-4 text-lg">Confirmar</Button>
        </form>
      </div>
    </div>
  );
};