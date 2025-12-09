import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { settingsSchema, type Settings } from "@shared/schema";

export default function SettingsPage() {
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });

  const form = useForm<Settings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      baseTrainingPrice: 500,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: Settings) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Настройки сохранены",
        description: "Базовая цена тренировки обновлена",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: Settings) => {
    saveSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="text-page-title">
          Настройки
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">Параметры тренировок</CardTitle>
          <CardDescription>
            Базовая цена используется для расчёта списаний по формуле: базовая цена × коэффициент
            абонемента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="baseTrainingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Базовая цена тренировки, ₽</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="500"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="max-w-xs font-mono"
                        data-testid="input-base-price"
                      />
                    </FormControl>
                    <FormDescription>
                      Эта сумма будет умножаться на коэффициент абонемента игрока при списании за
                      тренировку
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-settings"
              >
                {saveSettingsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Сохранить
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
