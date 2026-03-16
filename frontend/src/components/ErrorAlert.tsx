import { AlertCircle } from "lucide-react";

interface ErrorAlertProps {
  error: string;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Une erreur s'est produite</h3>
          <p className="mt-1.5 text-sm text-red-600">{error}</p>
        </div>
      </div>
    </div>
  );
}
