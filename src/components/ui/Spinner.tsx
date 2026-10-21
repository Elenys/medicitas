import { cn } from '@/lib/utils';

export function Spinner({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = { sm: 'h-4 w-4 border-2', md: 'h-8 w-8 border-[3px]', lg: 'h-12 w-12 border-4' }[
    size
  ];
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-t-transparent',
        dims,
        className,
      )}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="text-primary-dark flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}
