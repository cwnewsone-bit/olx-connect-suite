import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Power, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { http } from '@/lib/http';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';

export default function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await http.post('/auth/forgot', { email });
      
      toast.success('Instruções de recuperação enviadas!');
      
      // Em DEV, o backend pode retornar o resetUrl
      if (response.data?.resetUrl) {
        setResetUrl(response.data.resetUrl);
      }
    } catch (error: any) {
      console.error('Erro ao solicitar recuperação:', error);
      
      // Não revela se o email existe ou não (segurança)
      toast.success('Se o email existir, você receberá instruções de recuperação.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
            <Power className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Esqueci minha senha</CardTitle>
            <CardDescription className="mt-2">
              Digite seu email para receber instruções de recuperação
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{i18n.auth.email}</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Enviando...' : 'Enviar instruções'}
            </Button>
          </form>

          {resetUrl && (
            <Alert>
              <AlertDescription className="space-y-2">
                <p className="font-medium">Link de recuperação (DEV):</p>
                <a 
                  href={resetUrl} 
                  className="text-sm text-primary hover:underline break-all block"
                >
                  {resetUrl}
                </a>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-center text-sm">
            <Link 
              to="/login" 
              className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
