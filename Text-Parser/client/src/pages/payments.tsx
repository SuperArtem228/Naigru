import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import type {
  Player,
  Subscription,
  PaymentWithPlayer,
  Settings,
} from "@shared/schema";

const paymentFormSchema = z.object({
  playerId: z.string().min(1, "Выберите игрока"),
  amount: z.number().positive("Сумма должна быть больше нуля"),
  subscriptionId: z.string().nullable(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export default function PaymentsPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [playerSearchOpen, setPlayerSearchOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [lastAmount, setLastAmount] = useState<number>(430);
  const [lastSubscriptionId, setLastSubscriptionId] = useState<string | null>(
    null
  );

  const dateString = format(selectedDate, "yyyy-MM-dd");

  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: subscriptions = [], isLoading: subscriptionsLoading } =
    useQuery<Subscription[]>({
      queryKey: ["/api/subscriptions"],
    });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<
    PaymentWithPlayer[]
  >({
    queryKey: ["/api/payments", dateString],
    queryFn: async () => {
      const res = await fetch(`/api/payments/${dateString}`);
      if (!res.ok) throw new Error("Failed to fetch payments");
      return res.json();
    },
  });

  const { data: settings } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      playerId: "",
      amount: lastAmount,
      subscriptionId: null,
    },
  });

  const watchedSubscriptionId = form.watch("subscriptionId");

  const selectedSubscription = subscriptions.find(
    (s) => s.id === watchedSubscriptionId
  );

  const currentPlayerSubscription = selectedPlayer
    ? subscriptions.find((s) => s.id === selectedPlayer.subscriptionId)
    : null;

  const totalPayments = payments.length;
  const totalSum = payments.reduce((sum, p) => sum + p.amount, 0);

  const filteredPlayers = useMemo(() => {
    if (!playerSearchQuery.trim()) return players;
    const query = playerSearchQuery.toLowerCase();
    return players.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        p.phone.includes(query) ||
        p.id.includes(query)
    );
  }, [players, playerSearchQuery]);

  // помощник: выбрать абонемент и пересчитать сумму
  function handleSelectSubscription(subId: string | null) {
    form.setValue("subscriptionId", subId);
    setLastSubscriptionId(subId);

    // если есть базовая цена — пересчитываем стоимость списания
    if (!settings?.baseTrainingPrice) return;

    if (!subId) {
      // без абонемента — просто базовая цена
      form.setValue("amount", settings.baseTrainingPrice);
      return;
    }

    const sub = subscriptions.find((s) => s.id === subId);
    if (!sub) return;

    const newAmount = Math.round(
      settings.baseTrainingPrice * sub.coefficient
    );
    form.setValue("amount", newAmount);
  }

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      return apiRequest("POST", "/api/payments", {
        ...data,
        date: dateString,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments", dateString] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });

      const amount = form.getValues("amount");
      const currentSubId = form.getValues("subscriptionId");

      toast({
        title: "Платёж сохранён",
        description: `Оплата на сумму ${amount} ₽ добавлена`,
      });

      setLastAmount(amount);
      setLastSubscriptionId(currentSubId ?? null);

      // автофокус на том же абонементе и той же сумме
      form.reset({
        playerId: "",
        amount,
        subscriptionId: currentSubId ?? null,
      });
      setSelectedPlayer(null);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить платёж",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormValues) => {
    createPaymentMutation.mutate(data);
  };

  const getSubscriptionName = (subscriptionId: string | null) => {
    if (!subscriptionId) return "Без абонемента";
    const sub = subscriptions.find((s) => s.id === subscriptionId);
    return sub?.name || "Без абонемента";
  };

  if (playersLoading || subscriptionsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1
          className="text-2xl font-semibold text-foreground"
          data-testid="text-page-title"
        >
          Ввод оплат
        </h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="gap-2"
              data-testid="button-date-picker"
            >
              <CalendarIcon className="w-4 h-4" />
              {format(selectedDate, "d MMMM yyyy", { locale: ru })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ru}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium">
                Новый платеж
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="playerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Игрок</FormLabel>
                        <Popover
                          open={playerSearchOpen}
                          onOpenChange={setPlayerSearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between font-normal"
                                data-testid="select-player"
                              >
                                {selectedPlayer
                                  ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}`
                                  : "Поиск по ФИО, телефону или ID..."}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-full p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Поиск игрока..."
                                value={playerSearchQuery}
                                onValueChange={setPlayerSearchQuery}
                                data-testid="input-player-search"
                              />
                              <CommandList>
                                <CommandEmpty>Игрок не найден</CommandEmpty>
                                <CommandGroup>
                                  {filteredPlayers.map((player) => (
                                    <CommandItem
                                      key={player.id}
                                      value={`${player.firstName} ${player.lastName} ${player.phone}`}
                                      onSelect={() => {
                                        field.onChange(player.id);
                                        setSelectedPlayer(player);
                                        setPlayerSearchOpen(false);
                                        setPlayerSearchQuery("");

                                        // если у игрока есть абонемент — подставляем его и пересчитываем сумму
                                        if (player.subscriptionId) {
                                          handleSelectSubscription(
                                            player.subscriptionId
                                          );
                                        } else {
                                          handleSelectSubscription(null);
                                        }
                                      }}
                                      data-testid={`player-option-${player.id}`}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">
                                          {player.firstName} {player.lastName}
                                        </span>
                                        <span className="text-sm text-muted-foreground">
                                          {player.phone}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedPlayer && (
                    <div className="bg-muted/50 p-3 rounded-md space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Баланс:</span>
                        <span
                          className={`font-mono font-medium ${
                            selectedPlayer.balance < 0
                              ? "text-red-600"
                              : selectedPlayer.balance > 0
                              ? "text-green-600"
                              : "text-foreground"
                          }`}
                          data-testid="text-player-balance"
                        >
                          {selectedPlayer.balance.toLocaleString("ru-RU")} ₽
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Текущий абонемент:
                        </span>
                        <span
                          className="font-medium"
                          data-testid="text-player-subscription"
                        >
                          {currentPlayerSubscription?.name || "Без абонемента"}
                        </span>
                      </div>
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Сумма, ₽</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* новый блок: абонементы как кнопки */}
                  <FormField
                    control={form.control}
                    name="subscriptionId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Абонемент</FormLabel>
                        <FormControl>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={
                                watchedSubscriptionId == null
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() => handleSelectSubscription(null)}
                              data-testid="subscription-chip-none"
                            >
                              Без абонемента
                            </Button>
                            {subscriptions.map((sub) => (
                              <Button
                                key={sub.id}
                                type="button"
                                size="sm"
                                variant={
                                  watchedSubscriptionId === sub.id
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() =>
                                  handleSelectSubscription(sub.id)
                                }
                                className="gap-1"
                                data-testid={`subscription-chip-${sub.id}`}
                              >
                                {sub.name}
                              </Button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                        {selectedSubscription &&
                          settings?.baseTrainingPrice && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Коэффициент:{" "}
                              {selectedSubscription.coefficient.toFixed(2)}.
                              Списания будут по цене{" "}
                              {Math.round(
                                settings.baseTrainingPrice *
                                  selectedSubscription.coefficient
                              )}{" "}
                              ₽
                            </p>
                          )}
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      createPaymentMutation.isPending || !selectedPlayer
                    }
                    data-testid="button-save-payment"
                  >
                    {createPaymentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Сохранить и следующий
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg font-medium">
                  Платежи за{" "}
                  {format(selectedDate, "d MMMM", {
                    locale: ru,
                  })}
                </CardTitle>
                {totalPayments > 0 && (
                  <div
                    className="text-sm text-muted-foreground"
                    data-testid="text-payments-summary"
                  >
                    Всего платежей: {totalPayments}, сумма:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {totalSum.toLocaleString("ru-RU")} ₽
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : payments.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-testid="text-empty-payments"
                >
                  <p>В этот день пока нет платежей.</p>
                  <p className="text-sm mt-1">
                    Внесите первую оплату через форму слева.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Время</TableHead>
                        <TableHead>Игрок</TableHead>
                        <TableHead className="text-right">Сумма, ₽</TableHead>
                        <TableHead>Абонемент</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow
                          key={payment.id}
                          data-testid={`row-payment-${payment.id}`}
                        >
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {payment.time}
                          </TableCell>
                          <TableCell className="font-medium">
                            {payment.player.firstName}{" "}
                            {payment.player.lastName}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {payment.amount.toLocaleString("ru-RU")}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {getSubscriptionName(payment.subscriptionId)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
