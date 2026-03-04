interface HeadingProps {
  title: string;
  description: string;
}

export function Heading({ title, description }: HeadingProps) {
  return (
    <div className="flex flex-col gap-0.5 pl-3 border-l-[3px] border-[#687818]">
      <h2 className="text-2xl font-bold tracking-tight text-slate-800">
        {title}
      </h2>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
