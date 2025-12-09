import { z } from "zod";

// ============== Subscriptions (Абонементы) ==============
export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Название обязательно"),
  coefficient: z.number().min(0).max(2),
});

export const insertSubscriptionSchema = subscriptionSchema.omit({ id: true });

export type Subscription = z.infer<typeof subscriptionSchema>;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// ============== Players (Игроки) ==============
export const playerSchema = z.object({
  id: z.string(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string(),
  groups: z.string(), // e.g. "Пн 19:00, Ср 19:00"
  balance: z.number().default(0),
  subscriptionId: z.string().nullable(), // null = "Без абонемента"
  lastPaymentDate: z.string().nullable(), // ISO date string
});

export const insertPlayerSchema = playerSchema.omit({ id: true });

export type Player = z.infer<typeof playerSchema>;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;

// ============== Payments (Платежи) ==============
export const paymentSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  subscriptionId: z.string().nullable(),
  date: z.string(), // ISO date string (date only: YYYY-MM-DD)
  time: z.string(), // HH:mm format
  createdAt: z.string(), // ISO datetime
});

export const insertPaymentSchema = z.object({
  playerId: z.string().min(1, "Выберите игрока"),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  subscriptionId: z.string().nullable(),
  date: z.string(),
});

export type Payment = z.infer<typeof paymentSchema>;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// ============== Transactions (История операций) ==============
export const transactionSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  type: z.enum(["payment", "deduction"]), // Платёж или Списание
  amount: z.number(),
  description: z.string(), // e.g. "Платёж" or "Тренировка/автосписание"
  date: z.string(), // ISO date
  createdAt: z.string(), // ISO datetime
});

export type Transaction = z.infer<typeof transactionSchema>;

// ============== Settings (Настройки) ==============
export const settingsSchema = z.object({
  baseTrainingPrice: z.number().positive("Цена должна быть больше нуля"),
});

export type Settings = z.infer<typeof settingsSchema>;

// ============== API Response Types ==============
export interface PlayerWithSubscription extends Player {
  subscription: Subscription | null;
}

export interface PaymentWithPlayer extends Payment {
  player: Player;
  subscription: Subscription | null;
}

// Legacy User types (kept for compatibility)
export const users = {
  id: "id",
  username: "username",
  password: "password",
};

export const insertUserSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = { id: string; username: string; password: string };
