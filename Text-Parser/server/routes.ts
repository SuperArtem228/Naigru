import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPaymentSchema, settingsSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============== Players ==============

  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  app.get("/api/players/:id/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactionsByPlayer(req.params.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.patch("/api/players/:id/subscription", async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      const player = await storage.updatePlayerSubscription(
        req.params.id,
        subscriptionId
      );
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  app.post("/api/players/:id/deduct-training", async (req, res) => {
    try {
      const player = await storage.getPlayer(req.params.id);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }

      const settings = await storage.getSettings();
      let deductionAmount = settings.baseTrainingPrice;

      // Apply subscription coefficient if player has one
      if (player.subscriptionId) {
        const subscription = await storage.getSubscription(player.subscriptionId);
        if (subscription) {
          deductionAmount = Math.round(settings.baseTrainingPrice * subscription.coefficient);
        }
      }

      // Deduct from balance
      await storage.updatePlayerBalance(req.params.id, -deductionAmount);

      // Create transaction record
      const now = new Date();
      await storage.createTransaction({
        playerId: req.params.id,
        type: "deduction",
        amount: deductionAmount,
        description: "Тренировка",
        date: now.toISOString().split("T")[0],
        createdAt: now.toISOString(),
      });

      const updatedPlayer = await storage.getPlayer(req.params.id);
      res.json(updatedPlayer);
    } catch (error) {
      res.status(500).json({ error: "Failed to deduct training" });
    }
  });

  // ============== Subscriptions ==============

  app.get("/api/subscriptions", async (req, res) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      res.json(subscriptions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch subscriptions" });
    }
  });

  app.put("/api/subscriptions", async (req, res) => {
    try {
      const { subscriptions } = req.body;
      if (!Array.isArray(subscriptions)) {
        return res.status(400).json({ error: "Invalid subscriptions data" });
      }

      const saved = await storage.saveSubscriptions(subscriptions);
      res.json(saved);
    } catch (error) {
      res.status(500).json({ error: "Failed to save subscriptions" });
    }
  });

  // ============== Payments ==============

  app.get("/api/payments/:date", async (req, res) => {
    try {
      const payments = await storage.getPaymentsByDate(req.params.date);
      res.json(payments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payments" });
    }
  });

  app.post("/api/payments", async (req, res) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);

      // Create payment
      const payment = await storage.createPayment(validatedData);

      // Update player balance
      await storage.updatePlayerBalance(validatedData.playerId, validatedData.amount);

      // Update player's subscription if provided
      if (validatedData.subscriptionId !== undefined) {
        await storage.updatePlayerSubscription(
          validatedData.playerId,
          validatedData.subscriptionId
        );
      }

      // Update last payment date
      await storage.updatePlayerLastPaymentDate(validatedData.playerId, validatedData.date);

      // Create transaction record
      await storage.createTransaction({
        playerId: validatedData.playerId,
        type: "payment",
        amount: validatedData.amount,
        description: "",
        date: validatedData.date,
        createdAt: new Date().toISOString(),
      });

      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create payment" });
    }
  });

  // ============== Settings ==============

  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const validatedData = settingsSchema.parse(req.body);
      const settings = await storage.updateSettings(validatedData);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return httpServer;
}
