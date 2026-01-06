export interface User {
  uid: string;
  email: string;
  name: string;
  dailyGoal: number;
  isPro: boolean;
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
  
  // New Fields
  ownershipStatus?: OwnershipStatus;
  vehicleValue?: number; // Valor do Veículo (Próprio/Financiado)
  currentKm?: number; // KM Atual do Veículo (Painel)
  
  // Financiado
  financedAmount?: number; // Valor Financiado
  downPayment?: number; // Valor Entrada
  installmentsPaid?: number; // Parcelas Pagas
  totalInstallments?: number; // Qtd Parcelas
  installmentValue?: number; // Valor da Parcela (para gerar o financeiro)

  // Aluguel
  securityDeposit?: number; // Caução
  rentalValue?: number; // Valor Aluguel
  rentalPeriod?: RentalPeriod;
  kmLimit?: number;

  // Seguro
  hasInsurance?: boolean;
  insuranceValue?: number; // Valor Total da Apólice
  insuranceInstallments?: number; // Número de parcelas
  insuranceExpiryDate?: string; // Data de vencimento da apólice
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
  date: string; // ISO String YYYY-MM-DD
  timestamp: number;
  
  // Combustível Específico
  fuelType?: FuelType;
  pricePerUnit?: number; // Preço por Litro/m3/kWh
  fuelQuantity?: number; // Quantidade abastecida calculada
}

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string[];
  isMandatory: boolean;
}

export type ViewState = 'auth' | 'onboarding' | 'dashboard' | 'vehicles' | 'reports' | 'profile' | 'compare';