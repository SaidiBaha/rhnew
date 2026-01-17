import { Spinner } from "@/components/ui/Spinner";

export const Loader = () => {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full">
      <Spinner className="size-32" />
    </div>
  );
};
