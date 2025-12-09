import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subscription } from "@shared/schema";

interface EditableSubscription {
  id: string;
  name: string;
  coefficient: number;
  isNew?: boolean;
}

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const [editableSubscriptions, setEditableSubscriptions] = useState<EditableSubscription[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  useEffect(() => {
    if (subscriptions.length > 0) {
      setEditableSubscriptions(
        subscriptions.map((s) => ({ ...s, isNew: false }))
      );
    }
  }, [subscriptions]);

  const saveSubscriptionsMutation = useMutation({
    mutationFn: async (subs: EditableSubscription[]) => {
      return apiRequest("PUT", "/api/subscriptions", { subscriptions: subs });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      setHasChanges(false);
      toast({
        title: "Изменения сохранены",
        description: "Абонементы успешно обновлены",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    },
  });

  const handleNameChange = (id: string, name: string) => {
    setEditableSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    );
    setHasChanges(true);
  };

  const handleCoefficientChange = (id: string, value: string) => {
    const coefficient = parseFloat(value) || 0;
    const clampedCoefficient = Math.min(2, Math.max(0, coefficient));
    setEditableSubscriptions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, coefficient: clampedCoefficient } : s))
    );
    setHasChanges(true);
  };

  const handleAddSubscription = () => {
    const newId = `new-${Date.now()}`;
    setEditableSubscriptions((prev) => [
      ...prev,
      { id: newId, name: "", coefficient: 1.0, isNew: true },
    ]);
    setHasChanges(true);
  };

  const handleRemoveSubscription = (id: string) => {
    setEditableSubscriptions((prev) => prev.filter((s) => s.id !== id));
    setHasChanges(true);
  };

  const handleSave = () => {
    const validSubscriptions = editableSubscriptions.filter((s) => s.name.trim());
    if (validSubscriptions.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы один абонемент с названием",
        variant: "destructive",
      });
      return;
    }
    saveSubscriptionsMutation.mutate(validSubscriptions);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground mb-2" data-testid="text-page-title">
          Абонементы
        </h1>
        <p className="text-sm text-muted-foreground">
          Абонементы задают цену тренировки относительно базовой. При списании сумма = базовая
          цена × коэффициент абонемента.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Список абонементов</CardTitle>
          <CardDescription>
            Коэффициент 1.00 = полная цена, 0.80 = скидка 20%, 0 = бесплатно
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 text-sm font-medium text-muted-foreground pb-2 border-b">
              <div className="col-span-7">Название абонемента</div>
              <div className="col-span-3">Коэффициент</div>
              <div className="col-span-2"></div>
            </div>
            {editableSubscriptions.map((sub, index) => (
              <div
                key={sub.id}
                className="grid grid-cols-12 gap-3 items-center"
                data-testid={`row-subscription-${index}`}
              >
                <div className="col-span-7">
                  <Input
                    value={sub.name}
                    onChange={(e) => handleNameChange(sub.id, e.target.value)}
                    placeholder="Название абонемента"
                    data-testid={`input-subscription-name-${index}`}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="2"
                    value={sub.coefficient}
                    onChange={(e) => handleCoefficientChange(sub.id, e.target.value)}
                    className="font-mono"
                    data-testid={`input-subscription-coefficient-${index}`}
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSubscription(sub.id)}
                    className="text-muted-foreground"
                    data-testid={`button-remove-subscription-${index}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {editableSubscriptions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-empty-subscriptions">
              <p>Нет абонементов.</p>
              <p className="text-sm mt-1">Добавьте первый абонемент.</p>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4 border-t flex-wrap">
            <Button
              variant="outline"
              onClick={handleAddSubscription}
              className="gap-2"
              data-testid="button-add-subscription"
            >
              <Plus className="w-4 h-4" />
              Добавить абонемент
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveSubscriptionsMutation.isPending}
              data-testid="button-save-subscriptions"
            >
              {saveSubscriptionsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Сохранить изменения
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
