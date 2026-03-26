import * as z from "zod";
import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RequestSchema } from "@/modules/request/schema";
import { RequestTypes, type RequestStatus } from "@/modules/request/types";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import useAuth from "@/hooks/useAuth";
import type { Employee } from "@/modules/employee/types";

interface RequestFormProps {
  defaultValues: DefaultValues<z.infer<typeof RequestSchema>>;
  employees: Employee[];
  onSubmit: (data: z.infer<typeof RequestSchema>) => void;
  isLoading: boolean;
  action: string;
  currentStatus?: RequestStatus;
}

export function RequestForm({
  defaultValues, employees, onSubmit, isLoading, action, currentStatus,
}: RequestFormProps) {
  const { auth } = useAuth();
  const isAdmin = auth.user?.role === "ADMIN";

  const form = useForm<z.infer<typeof RequestSchema>>({
    resolver: zodResolver(RequestSchema),
    defaultValues,
  });

  const statusOptions = (): RequestStatus[] => {
    if (isAdmin) {
      // Admin can treat or reject a SOUMIS request
      if (currentStatus === "SOUMIS") return ["SOUMIS", "TRAITÉ", "REJETÉ"];
      return currentStatus ? [currentStatus] : ["SOUMIS"];
    }
    // Supervisor can only cancel a SOUMIS request
    return currentStatus ? [currentStatus] : ["SOUMIS"];
  };

  const isStatusLocked = currentStatus !== "SOUMIS" && !!currentStatus;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 w-full">
        <FormField
          control={form.control}
          name="requestType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type de Demande</FormLabel>
              <Select
                onValueChange={field.onChange}
                {...field}
                value={field.value || ""}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner le type de demande" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RequestTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                {...field}
                value={field.value || ""}
                disabled={isLoading || isStatusLocked}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sélectionner le status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {statusOptions().map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isStatusLocked && (
                <p className="text-xs text-muted-foreground mt-1">
                  Ce statut ne peut plus être modifié.
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="employee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employé</FormLabel>
              <Combobox
                options={(employees ?? []).map((e) => ({
                  label: `${e.matricule}\t ${e.fullName}`,
                  value: e.matricule,
                }))}
                onValueChange={(value) => field.onChange(value)}
                defaultValue={field.value}
                placeholder="Sélectionner l'employé"
                disabled={isLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motif</FormLabel>
              <FormControl>
                <Input
                  placeholder="Motif"
                  {...field}
                  value={field.value || ""}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-6 flex items-center justify-end">
          <Button disabled={isLoading} size="lg" type="submit" className="ds-btn-primary">
            {action}
          </Button>
        </div>
      </form>
    </Form>
  );
}