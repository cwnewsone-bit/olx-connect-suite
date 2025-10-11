import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { AnuncioSchema, type Anuncio } from '@/lib/schemas';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import { ExternalLink, RefreshCw, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Anuncios() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    cidade: '',
    bairro: '',
  });

  useEffect(() => {
    loadAnuncios();
  }, [filters]);

  async function loadAnuncios() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.cidade) params.set('cidade', filters.cidade);
      if (filters.bairro) params.set('bairro', filters.bairro);

      const data = await api.get(`/api/anuncios?${params.toString()}`);
      const parsed = z.array(AnuncioSchema).parse(data);
      setAnuncios(parsed);
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setIsLoading(false);
    }
  }

  function clearFilters() {
    setFilters({ status: '', cidade: '', bairro: '' });
  }

  function formatLastRenovacao(dateStr: string | null | undefined) {
    if (!dateStr) return '—';
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '—';
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{i18n.anuncios.title}</h1>
        <p className="text-muted-foreground">{i18n.anuncios.subtitle}</p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            {i18n.anuncios.filters}
          </CardTitle>
          <CardDescription>Filtre seus anúncios por status, localização e mais</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Input
              placeholder={i18n.anuncios.status}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            />
            <Input
              placeholder={i18n.anuncios.cidade}
              value={filters.cidade}
              onChange={(e) => setFilters({ ...filters, cidade: e.target.value })}
            />
            <Input
              placeholder={i18n.anuncios.bairro}
              value={filters.bairro}
              onChange={(e) => setFilters({ ...filters, bairro: e.target.value })}
            />
            <Button variant="outline" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              {i18n.anuncios.clearFilters}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de anúncios */}
      <Card>
        <CardContent className="p-0">
          {anuncios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">{i18n.anuncios.empty}</p>
              <p className="text-sm text-muted-foreground">{i18n.anuncios.emptyDesc}</p>
            </div>
          ) : (
            <div className="divide-y">
              {anuncios.map((anuncio) => (
                <div key={anuncio.anuncio_id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                  {/* Foto */}
                  {anuncio.foto ? (
                    <img
                      src={anuncio.foto}
                      alt={anuncio.titulo}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
                      —
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{anuncio.titulo}</h3>
                      {anuncio.url && (
                        <a
                          href={anuncio.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{anuncio.categoria || '—'}</span>
                      <span>•</span>
                      <span>{anuncio.bairro}, {anuncio.cidade}</span>
                    </div>
                  </div>

                  {/* Status e ações */}
                  <div className="flex items-center gap-4">
                    <StatusBadge status={anuncio.status} />
                    <div className="text-right text-sm">
                      <div className="font-medium">{anuncio.dias_online} dias</div>
                      <div className="text-muted-foreground">
                        {formatLastRenovacao(anuncio.last_renovacao_at)}
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
