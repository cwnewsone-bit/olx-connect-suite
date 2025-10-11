import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Power } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { i18n } from '@/lib/i18n';

export default function OlxConectado() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [progress, setProgress] = useState(0);
  
  const email = searchParams.get('email');
  const error = searchParams.get('error');

  useEffect(() => {
    if (error) return;
    
    // Animação de progresso
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => navigate('/dashboard'), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [error, navigate]);

  if (error) {
    const errorMessages: Record<string, string> = {
      oauth_failed: 'Falha na autorização com a OLX',
      no_code: 'Código de autorização não recebido',
      invalid_state: 'Estado de segurança inválido',
      callback_failed: 'Erro ao processar callback',
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="mt-4">Erro na Conexão</CardTitle>
            <CardDescription>
              {errorMessages[error] || 'Ocorreu um erro desconhecido'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                Por favor, tente conectar novamente. Se o problema persistir, entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <CheckCircle className="h-6 w-6 text-success" />
          </div>
          <CardTitle className="mt-4">Conexão Realizada!</CardTitle>
          <CardDescription>
            {email ? `Conectado como ${email}` : 'Sua conta OLX foi conectada com sucesso'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Power className="h-4 w-4" />
            <span>Redirecionando para o dashboard...</span>
          </div>
          <Progress value={progress} />
        </CardContent>
      </Card>
    </div>
  );
}
