import { User, Vehicle, Transaction, AppVersionInfo } from '../types';

// Keys for LocalStorage
const KEYS = {
  USER: 'motoristareal_user',
  VEHICLES: 'motoristareal_vehicles',
  TRANSACTIONS: 'motoristareal_transactions',
  LAST_SEEN_VERSION: 'motoristareal_last_version',
};

// Utilities
const generateId = () => Math.random().toString(36).substring(2, 9);

export const MockBackend = {
  // --- Versioning ---
  getAppVersion: async (): Promise<AppVersionInfo> => {
    // Simula uma chamada de API para verificar a versão na Play Store
    // Para teste: currentVersion < latestVersion dispara o banner
    return {
      currentVersion: "1.2.0",
      latestVersion: "1.3.0", // Versão simulada na Play Store
      isMandatory: false,
      releaseNotes: [
        "✨ Novo gráfico de performance financeira",
        "🚀 Sistema de comparação de veículos turbinado",
        "📊 Relatórios semanais com Recharts",
        "💸 Correções no cálculo de amortização"
      ]
    };
  },

  checkUpdateStatus: (currentVersion: string): boolean => {
    const lastSeen = localStorage.getItem(KEYS.LAST_SEEN_VERSION);
    if (lastSeen !== currentVersion) {
      return true;
    }
    return false;
  },

  dismissVersionNotes: (version: string) => {
    localStorage.setItem(KEYS.LAST_SEEN_VERSION, version);
  },

  // --- Auth ---
  login: async (email: string): Promise<User> => {
    await new Promise(r => setTimeout(r, 800));
    const uid = btoa(email).substring(0, 12);
    const user: User = {
      uid,
      email,
      name: email.split('@')[0],
      dailyGoal: 200,
      isPro: false,
    };
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
    return user;
  },

  logout: () => {
    localStorage.removeItem(KEYS.USER);
    return Promise.resolve();
  },

  getUser: (): User | null => {
    const u = localStorage.getItem(KEYS.USER);
    return u ? JSON.parse(u) : null;
  },

  updateUser: (updates: Partial<User>) => {
    const u = MockBackend.getUser();
    if (u) {
      const updated = { ...u, ...updates };
      localStorage.setItem(KEYS.USER, JSON.stringify(updated));
      return updated;
    }
    return null;
  },

  // --- Vehicles ---
  getVehicles: async (userId: string): Promise<Vehicle[]> => {
    const v = localStorage.getItem(KEYS.VEHICLES);
    const allVehicles: Vehicle[] = v ? JSON.parse(v) : [];
    return allVehicles.filter(veh => veh.userId === userId);
  },

  addVehicle: async (vehicleData: Omit<Vehicle, 'vehicleId' | 'isActive'>): Promise<Vehicle> => {
    const v = localStorage.getItem(KEYS.VEHICLES);
    const allVehicles: Vehicle[] = v ? JSON.parse(v) : [];
    
    const userVehicles = allVehicles.filter(veh => veh.userId === vehicleData.userId);
    const isActive = userVehicles.length === 0;

    const newVehicle: Vehicle = {
      ...vehicleData,
      vehicleId: generateId(),
      isActive,
    };

    const t = localStorage.getItem(KEYS.TRANSACTIONS);
    const currentTransactions: Transaction[] = t ? JSON.parse(t) : [];
    const newTransactions: Transaction[] = [];
    const today = new Date();

    if (newVehicle.ownershipStatus === 'financiado' && newVehicle.installmentValue) {
      const remaining = (newVehicle.totalInstallments || 0) - (newVehicle.installmentsPaid || 0);
      for (let i = 1; i <= remaining; i++) {
        const futureDate = new Date(today);
        futureDate.setMonth(today.getMonth() + i);
        newTransactions.push({
          transactionId: generateId() + `_parc_${i}`,
          userId: newVehicle.userId,
          vehicleId: newVehicle.vehicleId,
          type: 'expense',
          category: 'FinanciamentoVeiculo',
          amount: newVehicle.installmentValue,
          date: futureDate.toISOString().split('T')[0],
          timestamp: futureDate.getTime(),
        });
      }
    }

    if (newVehicle.hasInsurance && newVehicle.insuranceValue && newVehicle.insuranceInstallments) {
      const installmentVal = newVehicle.insuranceValue / newVehicle.insuranceInstallments;
      for (let i = 0; i < newVehicle.insuranceInstallments; i++) {
          const paymentDate = new Date(today);
          paymentDate.setMonth(today.getMonth() + i);
          newTransactions.push({
            transactionId: generateId() + `_seguro_${i}`,
            userId: newVehicle.userId,
            vehicleId: newVehicle.vehicleId,
            type: 'expense',
            category: 'Seguro',
            amount: installmentVal,
            date: paymentDate.toISOString().split('T')[0],
            timestamp: paymentDate.getTime(),
          });
      }
    }
    
    if (newTransactions.length > 0) {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify([...newTransactions, ...currentTransactions]));
    }

    const updatedList = [...allVehicles, newVehicle];
    localStorage.setItem(KEYS.VEHICLES, JSON.stringify(updatedList));
    return newVehicle;
  },

  setActiveVehicle: async (vehicleId: string): Promise<Vehicle[]> => {
    const v = localStorage.getItem(KEYS.VEHICLES);
    let allVehicles: Vehicle[] = v ? JSON.parse(v) : [];
    const targetVehicle = allVehicles.find(veh => veh.vehicleId === vehicleId);
    if (!targetVehicle) return [];
    const userId = targetVehicle.userId;
    allVehicles = allVehicles.map(veh => {
      if (veh.userId === userId) return { ...veh, isActive: veh.vehicleId === vehicleId };
      return veh;
    });
    localStorage.setItem(KEYS.VEHICLES, JSON.stringify(allVehicles));
    return allVehicles.filter(veh => veh.userId === userId);
  },

  // --- Transactions ---
  getTransactions: async (userId: string): Promise<Transaction[]> => {
    const t = localStorage.getItem(KEYS.TRANSACTIONS);
    const allTransactions: Transaction[] = t ? JSON.parse(t) : [];
    return allTransactions.filter(tr => tr.userId === userId);
  },

  addTransaction: async (data: Omit<Transaction, 'transactionId' | 'timestamp'>): Promise<Transaction> => {
    const t = localStorage.getItem(KEYS.TRANSACTIONS);
    const transactions = t ? JSON.parse(t) : [];
    const newTx: Transaction = {
      ...data,
      transactionId: generateId(),
      timestamp: Date.now(),
    };
    const updated = [newTx, ...transactions];
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(updated));
    return newTx;
  }
};