import { randomUUID } from "crypto";
import type {
  Player,
  InsertPlayer,
  Subscription,
  InsertSubscription,
  Payment,
  InsertPayment,
  Transaction,
  Settings,
  PaymentWithPlayer,
} from "@shared/schema";

export interface IStorage {
  // Players
  getPlayers(): Promise<Player[]>;
  getPlayer(id: string): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayerBalance(id: string, amount: number): Promise<Player | undefined>;
  updatePlayerSubscription(id: string, subscriptionId: string | null): Promise<Player | undefined>;
  updatePlayerLastPaymentDate(id: string, date: string): Promise<Player | undefined>;

  // Subscriptions
  getSubscriptions(): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  saveSubscriptions(subscriptions: Array<{ id: string; name: string; coefficient: number }>): Promise<Subscription[]>;

  // Payments
  getPaymentsByDate(date: string): Promise<PaymentWithPlayer[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;

  // Transactions
  getTransactionsByPlayer(playerId: string): Promise<Transaction[]>;
  createTransaction(transaction: Omit<Transaction, "id">): Promise<Transaction>;

  // Settings
  getSettings(): Promise<Settings>;
  updateSettings(settings: Settings): Promise<Settings>;
}

export class MemStorage implements IStorage {
  private players: Map<string, Player>;
  private subscriptions: Map<string, Subscription>;
  private payments: Map<string, Payment>;
  private transactions: Map<string, Transaction>;
  private settings: Settings;

  constructor() {
    this.players = new Map();
    this.subscriptions = new Map();
    this.payments = new Map();
    this.transactions = new Map();
    this.settings = { baseTrainingPrice: 500 };

    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Demo subscriptions
    const demoSubscriptions: Subscription[] = [
      { id: "sub-1", name: "Разовый", coefficient: 1.0 },
      { id: "sub-2", name: "4 тренировки", coefficient: 1.0 },
      { id: "sub-3", name: "8 тренировок", coefficient: 0.9 },
      { id: "sub-4", name: "12 тренировок", coefficient: 0.8 },
      { id: "sub-5", name: "Льготный", coefficient: 0.7 },
    ];

    demoSubscriptions.forEach((sub) => this.subscriptions.set(sub.id, sub));

    // Demo players
    const demoPlayers: Player[] = [
      {
        id: "player-1",
        firstName: "Александр",
        lastName: "Петров",
        phone: "+7 (999) 123-45-67",
        groups: "Пн 19:00, Ср 19:00",
        balance: 1500,
        subscriptionId: "sub-3",
        lastPaymentDate: "2024-12-05",
      },
      {
        id: "player-2",
        firstName: "Мария",
        lastName: "Иванова",
        phone: "+7 (999) 234-56-78",
        groups: "Вт 18:00, Чт 18:00",
        balance: -200,
        subscriptionId: "sub-2",
        lastPaymentDate: "2024-11-28",
      },
      {
        id: "player-3",
        firstName: "Дмитрий",
        lastName: "Сидоров",
        phone: "+7 (999) 345-67-89",
        groups: "Пн 19:00, Ср 19:00, Пт 19:00",
        balance: 3200,
        subscriptionId: "sub-4",
        lastPaymentDate: "2024-12-07",
      },
      {
        id: "player-4",
        firstName: "Елена",
        lastName: "Козлова",
        phone: "+7 (999) 456-78-90",
        groups: "Вт 20:00",
        balance: 0,
        subscriptionId: null,
        lastPaymentDate: null,
      },
      {
        id: "player-5",
        firstName: "Сергей",
        lastName: "Морозов",
        phone: "+7 (999) 567-89-01",
        groups: "Сб 10:00, Вс 10:00",
        balance: 850,
        subscriptionId: "sub-1",
        lastPaymentDate: "2024-12-01",
      },
      {
        id: "player-6",
        firstName: "Анна",
        lastName: "Волкова",
        phone: "+7 (999) 678-90-12",
        groups: "Пн 19:00, Ср 19:00",
        balance: -500,
        subscriptionId: "sub-5",
        lastPaymentDate: "2024-11-15",
      },
      {
        id: "player-7",
        firstName: "Игорь",
        lastName: "Новиков",
        phone: "+7 (999) 789-01-23",
        groups: "Чт 20:00, Сб 12:00",
        balance: 2100,
        subscriptionId: "sub-3",
        lastPaymentDate: "2024-12-08",
      },
      {
        id: "player-8",
        firstName: "Ольга",
        lastName: "Белова",
        phone: "+7 (999) 890-12-34",
        groups: "Вт 18:00, Пт 18:00",
        balance: 430,
        subscriptionId: "sub-2",
        lastPaymentDate: "2024-12-03",
      },
      {
        id: "player-9",
        firstName: "Николай",
        lastName: "Соколов",
        phone: "+7 (999) 901-23-45",
        groups: "Пн 20:00, Ср 20:00",
        balance: -150,
        subscriptionId: "sub-1",
        lastPaymentDate: "2024-11-20",
      },
      {
        id: "player-10",
        firstName: "Татьяна",
        lastName: "Кузнецова",
        phone: "+7 (999) 012-34-56",
        groups: "Сб 14:00",
        balance: 1800,
        subscriptionId: "sub-4",
        lastPaymentDate: "2024-12-06",
      },
    ];

    demoPlayers.forEach((player) => this.players.set(player.id, player));

    // Demo transactions for some players
    const demoTransactions: Transaction[] = [
      {
        id: "tx-1",
        playerId: "player-1",
        type: "payment",
        amount: 3600,
        description: "",
        date: "2024-12-05",
        createdAt: "2024-12-05T10:30:00.000Z",
      },
      {
        id: "tx-2",
        playerId: "player-1",
        type: "deduction",
        amount: 450,
        description: "Тренировка",
        date: "2024-12-06",
        createdAt: "2024-12-06T19:00:00.000Z",
      },
      {
        id: "tx-3",
        playerId: "player-1",
        type: "deduction",
        amount: 450,
        description: "Тренировка",
        date: "2024-12-08",
        createdAt: "2024-12-08T19:00:00.000Z",
      },
      {
        id: "tx-4",
        playerId: "player-3",
        type: "payment",
        amount: 4000,
        description: "",
        date: "2024-12-07",
        createdAt: "2024-12-07T14:15:00.000Z",
      },
      {
        id: "tx-5",
        playerId: "player-7",
        type: "payment",
        amount: 2500,
        description: "",
        date: "2024-12-08",
        createdAt: "2024-12-08T11:00:00.000Z",
      },
    ];

    demoTransactions.forEach((tx) => this.transactions.set(tx.id, tx));
  }

  // Players
  async getPlayers(): Promise<Player[]> {
    return Array.from(this.players.values()).sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, "ru")
    );
  }

  async getPlayer(id: string): Promise<Player | undefined> {
    return this.players.get(id);
  }

  async createPlayer(insertPlayer: InsertPlayer): Promise<Player> {
    const id = randomUUID();
    const player: Player = { ...insertPlayer, id };
    this.players.set(id, player);
    return player;
  }

  async updatePlayerBalance(id: string, amount: number): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    player.balance += amount;
    return player;
  }

  async updatePlayerSubscription(id: string, subscriptionId: string | null): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    player.subscriptionId = subscriptionId;
    return player;
  }

  async updatePlayerLastPaymentDate(id: string, date: string): Promise<Player | undefined> {
    const player = this.players.get(id);
    if (!player) return undefined;
    player.lastPaymentDate = date;
    return player;
  }

  // Subscriptions
  async getSubscriptions(): Promise<Subscription[]> {
    return Array.from(this.subscriptions.values());
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }

  async saveSubscriptions(subscriptions: Array<{ id: string; name: string; coefficient: number }>): Promise<Subscription[]> {
    this.subscriptions.clear();
    const savedSubscriptions: Subscription[] = [];

    for (const sub of subscriptions) {
      const id = sub.id.startsWith("new-") ? randomUUID() : sub.id;
      const subscription: Subscription = {
        id,
        name: sub.name,
        coefficient: sub.coefficient,
      };
      this.subscriptions.set(id, subscription);
      savedSubscriptions.push(subscription);
    }

    return savedSubscriptions;
  }

  // Payments
  async getPaymentsByDate(date: string): Promise<PaymentWithPlayer[]> {
    const paymentsForDate = Array.from(this.payments.values())
      .filter((p) => p.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));

    const result: PaymentWithPlayer[] = [];
    for (const payment of paymentsForDate) {
      const player = this.players.get(payment.playerId);
      if (player) {
        const subscription = payment.subscriptionId
          ? this.subscriptions.get(payment.subscriptionId) || null
          : null;
        result.push({ ...payment, player, subscription });
      }
    }
    return result;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const now = new Date();
    const payment: Payment = {
      id,
      playerId: insertPayment.playerId,
      amount: insertPayment.amount,
      subscriptionId: insertPayment.subscriptionId,
      date: insertPayment.date,
      time: now.toTimeString().slice(0, 5),
      createdAt: now.toISOString(),
    };
    this.payments.set(id, payment);
    return payment;
  }

  // Transactions
  async getTransactionsByPlayer(playerId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.playerId === playerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTransaction(transaction: Omit<Transaction, "id">): Promise<Transaction> {
    const id = randomUUID();
    const fullTransaction: Transaction = { ...transaction, id };
    this.transactions.set(id, fullTransaction);
    return fullTransaction;
  }

  // Settings
  async getSettings(): Promise<Settings> {
    return this.settings;
  }

  async updateSettings(settings: Settings): Promise<Settings> {
    this.settings = settings;
    return this.settings;
  }
}

export const storage = new MemStorage();
