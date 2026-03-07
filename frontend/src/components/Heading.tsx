interface HeadingProps {
  title: string;
  description: string;
}

export function Heading({ title, description }: HeadingProps) {
  return (
    <div className="flex flex-col gap-0.5 pl-3 border-l-[3px]" style={{ borderColor: "var(--accent)" }}>
      <h2 className="text-xl font-bold tracking-tight" style={{ color: "var(--navy)" }}>
        {title}
      </h2>
      <p className="text-sm" style={{ color: "var(--text-3)" }}>{description}</p>
    </div>
  );
}
