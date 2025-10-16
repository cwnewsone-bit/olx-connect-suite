import { Badge } from './badge';
import { i18n } from '@/lib/i18n';

interface StatusBadgeProps {
  /** status canônico vindo da API: 'published' | 'sold' | 'deleted_sold' | 'inactive' | ... */
  status: string;
  /** rótulo traduzido opcional (ex.: status_pt da view). Tem prioridade se vier. */
  label?: string;
}

// variantes por status canônico (lowercase)
const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  published: 'success',
  sold: 'warning',
  deleted_sold: 'secondary',
  inactive: 'secondary',
};

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const key = (status || '').toLowerCase();

  const variant = statusVariants[key] || 'secondary';

  // prioridade: label (status_pt) -> i18n -> status cru
  const text =
    label ??
    (i18n.status as any)[key] ??
    status;

  return <Badge variant={variant}>{text}</Badge>;
}
