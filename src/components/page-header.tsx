export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

export function LoadingBlock({ label = "불러오는 중…" }: { label?: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed bg-background text-sm text-muted-foreground">
      {label}
    </div>
  );
}
