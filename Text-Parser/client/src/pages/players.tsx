import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Search, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PlayerCard } from "@/components/player-card";
import type { Player, Subscription, Settings } from "@shared/schema";

type BalanceFilter = "all" | "negative" | "zero" | "positive";

export default function PlayersPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<string>("all");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: subscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const deductTrainingMutation = useMutation({
    mutationFn: async (playerId: string) => {
      return apiRequest("POST", `/api/players/${playerId}/deduct-training`);
    },
    onSuccess: (_, playerId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players", playerId, "transactions"] });
      toast({
        title: "Списание выполнено",
        description: "Средства за тренировку списаны",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось выполнить списание",
        variant: "destructive",
      });
    },
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ playerId, subscriptionId }: { playerId: string; subscriptionId: string | null }) => {
      return apiRequest("PATCH", `/api/players/${playerId}/subscription`, { subscriptionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({
        title: "Абонемент обновлён",
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

  const filteredPlayers = useMemo(() => {
    let result = players;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
          p.phone.includes(query) ||
          p.id.includes(query)
      );
    }

    if (balanceFilter !== "all") {
      result = result.filter((p) => {
        switch (balanceFilter) {
          case "negative":
            return p.balance < 0;
          case "zero":
            return p.balance >= -50 && p.balance <= 50;
          case "positive":
            return p.balance > 0;
          default:
            return true;
        }
      });
    }

    if (subscriptionFilter !== "all") {
      if (subscriptionFilter === "none") {
        result = result.filter((p) => !p.subscriptionId);
      } else {
        result = result.filter((p) => p.subscriptionId === subscriptionFilter);
      }
    }

    return result;
  }, [players, searchQuery, balanceFilter, subscriptionFilter]);

  const getSubscriptionName = (subscriptionId: string | null) => {
    if (!subscriptionId) return "Без абонемента";
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    return sub?.name || "Без абонемента";
  };

  const formatLastPaymentDate = (dateString: string | null) => {
    if (!dateString) return "—";
    try {
      return format(new Date(dateString), "dd.MM.yyyy", { locale: ru });
    } catch {
      return "—";
    }
  };

  const handleSubscriptionChange = (playerId: string, subscriptionId: string) => {
    updateSubscriptionMutation.mutate({
      playerId,
      subscriptionId: subscriptionId === "none" ? null : subscriptionId,
    });
  };

  const handleDeductTraining = (playerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deductTrainingMutation.mutate(playerId);
  };

  if (playersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-4" data-testid="text-page-title">
          Игроки
        </h1>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск по ФИО, телефону или ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-player-search"
            />
          </div>
          <div className="flex gap-3 flex-wrap">
            <Select value={balanceFilter} onValueChange={(v) => setBalanceFilter(v as BalanceFilter)}>
              <SelectTrigger className="w-40" data-testid="select-balance-filter">
                <SelectValue placeholder="Баланс" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="negative">Долг</SelectItem>
                <SelectItem value="zero">Около нуля</SelectItem>
                <SelectItem value="positive">Положительный</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subscriptionFilter} onValueChange={setSubscriptionFilter}>
              <SelectTrigger className="w-48" data-testid="select-subscription-filter">
                <SelectValue placeholder="Абонемент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все абонементы</SelectItem>
                <SelectItem value="none">Без абонемента</SelectItem>
                {subscriptions.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {filteredPlayers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-players">
              {players.length === 0 ? (
                <p>Нет игроков в системе</p>
              ) : (
                <p>Нет игроков, соответствующих фильтрам</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Игрок</TableHead>
                    <TableHead>Группы</TableHead>
                    <TableHead className="text-right">Баланс, ₽</TableHead>
                    <TableHead>Абонемент</TableHead>
                    <TableHead>Последний платеж</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow
                      key={player.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedPlayer(player)}
                      data-testid={`row-player-${player.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {player.firstName} {player.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{player.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {player.groups || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-mono font-medium ${
                            player.balance < 0
                              ? "text-red-600"
                              : player.balance > 0
                              ? "text-green-600"
                              : "text-foreground"
                          }`}
                        >
                          {player.balance.toLocaleString("ru-RU")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={player.subscriptionId || "none"}
                          onValueChange={(v) => handleSubscriptionChange(player.id, v)}
                        >
                          <SelectTrigger
                            className="w-36 h-8 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            data-testid={`select-player-subscription-${player.id}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Без абонемента</SelectItem>
                            {subscriptions.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastPaymentDate(player.lastPaymentDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeductTraining(player.id, e)}
                          disabled={deductTrainingMutation.isPending}
                          title="Списать за тренировку"
                          data-testid={`button-deduct-${player.id}`}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </div>
  );
}
