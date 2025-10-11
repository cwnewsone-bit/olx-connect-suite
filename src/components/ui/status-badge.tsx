import { Badge } from './badge';
import { i18n } from '@/lib/i18n';

interface StatusBadgeProps {
  status: string;
}

const statusVariants: Record<string, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  Ativo: 'success',
  Pausado: 'warning',
  Vendido: 'destructive',
  Rascunho: 'secondary',
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalizedStatus = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const variant = statusVariants[normalizedStatus] || 'secondary';
  const label = (i18n.status as any)[normalizedStatus.toLowerCase()] || status;
  
  return <Badge variant={variant}>{label}</Badge>;
}
