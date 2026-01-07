
export interface User {
  uid: string;
  email: string;
  name: string;
  dailyGoal: number; // Meta global/padrão
  isPro: boolean;
  goalType?: 'global' | 'per_vehicle'; // Nova flag de preferência
}

export type OwnershipStatus = 'proprio' | 'financiado' | 'alugado';
export type RentalPeriod = 'semanal' | 'mensal';

export interface Vehicle {
  vehicleId: string;
  userId: string;
  type: 'carro' | 'moto';
  brand: string;
  model: string;
  plate: string;
  isActive: boolean;
  
  // Custom Goal & Technical
  customDailyGoal?: number; 
  customMaintRate?: number; // Taxa de manutenção personalizada R$/KM

  // Depreciação (Exclusivo PRO)
  purchaseValue?: number;
  purchaseDate?: string;
  kmAtPurchase?: number;

  // Year Info
  year?: string;
  modelYear?: string;
  
  // New Fields
  ownershipStatus?: OwnershipStatus;
  vehicleValue?: number; // Valor FIPE/Mercado atual
  currentKm?: number; 
  
  // Financiado
  financedAmount?: number; 
  downPayment?: number; 
  installmentsPaid?: number; 
  totalInstallments?: number; 
  installmentValue?: number; 

  // Aluguel
  securityDeposit?: number; 
  rentalValue?: number; 
  /* Fixed typo: changed rentalPeriod to RentalPeriod */
  rentalPeriod?: RentalPeriod;
  rentalDueDate?: number; 
  kmLimit?: number;

  // Seguro
  hasInsurance?: boolean;
  insuranceValue?: number; 
  insuranceInstallments?: number; 
  insuranceExpiryDate?: string; 
}

export type TransactionType = 'earning' | 'expense';

export type TransactionCategory = 
  | 'Uber' 
  | '99' 
  | 'Indriver' 
  | 'Particular' 
  | 'Combustível' 
  | 'Manutenção' 
  | 'Alimentação' 
  | 'Limpeza' 
  | 'FinanciamentoVeiculo'
  | 'AluguelVeiculo'
  | 'Seguro'
  | 'Outros';

export type FuelType = 'Gasolina' | 'Etanol' | 'GNV' | 'kWh';

export interface Transaction {
  transactionId: string;
  userId: string;
  vehicleId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  kmInput?: number;
  date: string; 
  timestamp: number;
  
  fuelType?: FuelType;
  pricePerUnit?: number; 
  fuelQuantity?: number; 
}

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string[];
  isMandatory: boolean;
}

export type ViewState = 'auth' | 'onboarding' | 'dashboard' | 'vehicles' | 'reports' | 'profile' | 'compare' | 'manage_transactions';
