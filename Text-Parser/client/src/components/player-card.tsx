import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Player, Subscription, Transaction } from "@shared/schema";

const updateSubscriptionSchema = z.object({
  subscriptionId: z.string().nullable(),
});

type UpdateSubscriptionValues = z.infer<typeof updateSubscriptionSchema>;

interface PlayerCardProps {
  player: Player | null;
  onClose: () => void;
}

export function PlayerCard({ player, onClose }: PlayerCardProps) {
  const { toast } = useToast();

  const { data: subscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/players", player?.id, "transactions"],
    queryFn: async () => {
      const res = await fetch(`/api/players/${player?.id}/transactions`);
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return res.json();
    },
    enabled: !!player,
  });

  const form = useForm<UpdateSubscriptionValues>({
    resolver: zodResolver(updateSubscriptionSchema),
    defaultValues: {
      subscriptionId: null,
    },
  });

  useEffect(() => {
    if (player) {
      form.reset({ subscriptionId: player.subscriptionId });
    }
  }, [player, form]);

  const updateSubscriptionMutation = useMutation({
    mutationFn: async (data: UpdateSubscriptionValues) => {
      return apiRequest("PATCH", `/api/players/${player?.id}/subscription`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players", player?.id, "transactions"] });
      toast({
        title: "Абонемент обновлён",
        description: "Изменения сохранены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить абонемент",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateSubscriptionValues) => {
    updateSubscriptionMutation.mutate(data);
  };

  const currentSubscription = subscriptions.find((s) => s.id === player?.subscriptionId);

  const formatTransactionDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "d MMM yyyy", { locale: ru });
    } catch {
      return dateString;
    }
  };

  if (!player) return null;

  return (
    <Dialog open={!!player} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold" data-testid="text-player-name">
            {player.firstName} {player.lastName}
          </DialogTitle>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p data-testid="text-player-phone">{player.phone}</p>
            {player.groups && <p data-testid="text-player-groups">{player.groups}</p>}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center py-4 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Баланс</p>
            <p
              className={`text-3xl font-mono font-semibold ${
                player.balance < 0
                  ? "text-red-600"
                  : player.balance > 0
                  ? "text-green-600"
                  : "text-foreground"
              }`}
              data-testid="text-player-balance"
            >
              {player.balance.toLocaleString("ru-RU")} ₽
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="subscriptionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Абонемент</FormLabel>
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : value)
                      }
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-player-subscription">
                          <SelectValue placeholder="Выберите абонемент" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Без абонемента</SelectItem>
                        {subscriptions.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name} ({sub.coefficient.toFixed(2)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={updateSubscriptionMutation.isPending}
                className="w-full"
                data-testid="button-save-player-subscription"
              >
                {updateSubscriptionMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Сохранить
              </Button>
            </form>
          </Form>

          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">История операций</h3>
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground" data-testid="text-empty-transactions">
                Нет операций
              </div>
            ) : (
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      data-testid={`row-transaction-${tx.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            tx.type === "payment"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {tx.type === "payment" ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {tx.type === "payment" ? "Платёж" : "Списание"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTransactionDate(tx.date)}
                            {tx.description && ` • ${tx.description}`}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-mono text-sm font-medium ${
                          tx.type === "payment" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {tx.type === "payment" ? "+" : "-"}
                        {Math.abs(tx.amount).toLocaleString("ru-RU")} ₽
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
