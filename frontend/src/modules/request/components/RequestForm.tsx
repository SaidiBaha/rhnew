import * as z from "zod";
import { useForm, type DefaultValues } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { RequestSchema } from "@/modules/request/schema";
import { RequestTypes, type RequestStatus } from "@/modules/request/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Combobox } from "@/components/ui/Combobox";
import useAuth from "@/hooks/useAuth";
import type { Employee } from "@/modules/employee/types";

interface RequestFormProps {
  defaultValues: DefaultValues<z.infer<typeof RequestSchema>>;
  employees: Employee[] | undefined;
  onSubmit: (data: z.infer<typeof RequestSchema>) => void;
  isLoading: boolean;
  action: string;
}

export function RequestForm({
  defaultValues,
  employees,
  onSubmit,
  isLoading,
  action,
}: RequestFormProps) {
  const { auth } = useAuth();

  const form = useForm<z.infer<typeof RequestSchema>>({
    resolver: zodResolver(RequestSchema),
    defaultValues,
  });

  // ✅ Always guarantee an array regardless of what the API returns
  const safeEmployees: Employee[] = Array.isArray(employees) ? employees : [];

  const filterRequestStatuses = (): RequestStatus[] => {
    return auth.user?.role == "ADMIN"
      ? ["EN_PROGRESSION", "TRAITÉ", "ANNULÉ"]
      : ["EN_PROGRESSION", "ANNULÉ"];
  };

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
                defaultValue={field.value}
                {...field}
                value={field.value || ""}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full border-[#687818]">
                    <SelectValue placeholder="Sélectionner le type de demande" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RequestTypes.map((requestType) => (
                    <SelectItem key={requestType} value={requestType}>
                      {requestType}
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
                defaultValue={field.value}
                {...field}
                value={field.value || ""}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger className="w-full border-[#687818]">
                    <SelectValue placeholder="Sélectionner le status de la demande" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {filterRequestStatuses().map((requestStatus) => (
                    <SelectItem key={requestStatus} value={requestStatus}>
                      {requestStatus}
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
          name="employee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employé</FormLabel>
              <Combobox
                options={safeEmployees.map((employee) => ({ // ✅ always an array
                  label: `${employee.matricule}\t ${employee.fullName}`,
                  value: employee.matricule,
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
                  className="border-[#687818]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="pt-6 space-x-2 flex items-center justify-end">
          <Button
            disabled={isLoading}
            size="lg"
            type="submit"
            className="bg-[#687818] text-white"
          >
            {action}
          </Button>
        </div>
      </form>
    </Form>
  );
}