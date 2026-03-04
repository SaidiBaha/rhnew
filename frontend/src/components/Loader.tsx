import { Spinner } from "@/components/ui/Spinner";

export const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] w-full gap-4">
      <Spinner className="size-10 text-[#687818]" />
      <p className="text-sm text-slate-400 animate-pulse tracking-wide">Chargement en cours…</p>
    </div>
  );
};
