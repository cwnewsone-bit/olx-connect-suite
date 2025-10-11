import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { OlxStatusSchema, type OlxStatus } from '@/lib/schemas';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Power, ListOrdered, DollarSign, TrendingUp, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';

export default function Dashboard() {
  const navigate = useNavigate();
  const [olxStatus, setOlxStatus] = useState<OlxStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await api.get('/api/olx/status');
      setOlxStatus(OlxStatusSchema.parse(data));
    } catch (error) {
      console.error('Erro ao carregar status OLX:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConnectOlx() {
    try {
      const data = await api.get<{ ok: boolean; url: string }>('/oauth/olx/start-url');
      if (data.ok && data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Erro ao iniciar OAuth:', error);
      toast.error('Erro ao conectar com OLX');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{i18n.dashboard.title}</h1>
          <p className="text-muted-foreground">{i18n.dashboard.welcome}</p>
        </div>
        
        {olxStatus?.connected && (
          <Button onClick={() => navigate('/olx')}>
            {i18n.dashboard.manageConnection}
          </Button>
        )}
      </div>

      {/* CTA de conexão OLX */}
      {!olxStatus?.connected && (
        <Card className="border-2 border-primary/20 bg-gradient-card">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Power className="h-5 w-5 text-primary" />
              <CardTitle>{i18n.dashboard.notConnected}</CardTitle>
            </div>
            <CardDescription>
              {i18n.dashboard.notConnectedDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleConnectOlx} className="w-full md:w-auto">
              <Power className="mr-2 h-4 w-4" />
              {i18n.dashboard.connectOlx}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {i18n.dashboard.totalAnuncios}
            </CardTitle>
            <ListOrdered className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Conecte a OLX para ver dados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {i18n.dashboard.valorTotal}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Valor total estimado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {i18n.dashboard.taxaResposta}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Taxa de resposta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {i18n.dashboard.totalContatos}
            </CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
