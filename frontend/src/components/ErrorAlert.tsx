interface ErrorAlertProps {
  error: string;
}

export function ErrorAlert({ error }: ErrorAlertProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full text-red-500 text-xl">
      {error}
    </div>
  );
}
