import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Copy, Check, ExternalLink, Eye, EyeOff, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { http } from '@/lib/http';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';

export default function Onboarding() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Dados passados via state do register
  const stateData = location.state as { webhookToken?: string; webhookUrl?: string } | null;
  const [webhookToken, setWebhookToken] = useState(stateData?.webhookToken || '');
  const [webhookUrl, setWebhookUrl] = useState(stateData?.webhookUrl || '');

  useEffect(() => {
    // Se não veio do register, buscar config existente
    if (!webhookToken) {
      fetchWebhookConfig();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchWebhookConfig() {
    try {
      // Busca a primeira config do usuário
      const response = await http.get('/api/olx/leads/config');
      const configs = response.data;
      
      if (configs && configs.length > 0) {
        const config = configs[0];
        setWebhookToken(config.token_path || '');
        setWebhookUrl(config.webhook_url || '');
      }
    } catch (error) {
      console.error('Erro ao buscar config webhook:', error);
    }
  }

  async function handleCopy(text: string, type: 'token' | 'url') {
    try {
      await navigator.clipboard.writeText(text);
      
      if (type === 'token') {
        setCopiedToken(true);
        setTimeout(() => setCopiedToken(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      
      toast.success('Copiado!');
    } catch (error) {
      toast.error('Erro ao copiar');
    }
  }

  async function handleConnectOlx() {
    setIsConnecting(true);
    try {
      const response = await http.get('/oauth/olx/start-url', {
        params: { returnTo: '/olx/conectado' }
      });
      
      const { url } = response.data;
      
      // Abre em nova aba
      window.open(url, '_blank');
      
      toast.success('Autorização OLX aberta em nova aba');
    } catch (error: any) {
      console.error('Erro ao iniciar conexão OLX:', error);
      toast.error(error.response?.data?.message || 'Erro ao conectar com OLX');
    } finally {
      setIsConnecting(false);
    }
  }

  const maskedToken = webhookToken 
    ? `${webhookToken.substring(0, 8)}${'•'.repeat(Math.max(0, webhookToken.length - 8))}`
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4 pt-20">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-primary mb-4">
            <Power className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold">Bem-vindo ao {i18n.app.name}! 🎉</h1>
          <p className="text-muted-foreground">
            Configure sua integração com a OLX em poucos passos
          </p>
        </div>

        {/* Webhook Token */}
        <Card>
          <CardHeader>
            <CardTitle>1. Webhook Token</CardTitle>
            <CardDescription>
              Token único para receber leads da OLX. Configure este token no painel da OLX.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Token</Label>
              <div className="flex gap-2">
                <Input
                  value={showToken ? webhookToken : maskedToken}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(webhookToken, 'token')}
                >
                  {copiedToken ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(webhookUrl, 'url')}
                >
                  {copiedUrl ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conectar OLX */}
        <Card>
          <CardHeader>
            <CardTitle>2. Conectar sua conta OLX</CardTitle>
            <CardDescription>
              Autorize o acesso aos seus anúncios e mensagens da OLX
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleConnectOlx}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              {isConnecting ? 'Conectando...' : 'Conectar OLX'}
            </Button>
          </CardContent>
        </Card>

        {/* Próximos passos */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos passos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Após conectar sua conta OLX, você poderá:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-2">
              <li>Visualizar e gerenciar seus anúncios</li>
              <li>Receber e responder leads automaticamente</li>
              <li>Configurar automações de renovação</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/dashboard">
            <Button variant="outline">
              Ir para o Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
