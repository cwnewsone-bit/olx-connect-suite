import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login, me } from '@/lib/auth';
import { ApiException } from '@/lib/api';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login({ email, senha });
      await me(); // Valida o token
      
      toast.success('Login realizado com sucesso!');
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Erro no login:', error);
      
      if (error instanceof ApiException) {
        toast.error(error.error.message);
      } else {
        toast.error('Erro ao fazer login. Tente novamente.');
      }
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
            <CardTitle className="text-2xl">{i18n.app.name}</CardTitle>
            <CardDescription className="mt-2">{i18n.app.tagline}</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
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

            <div className="space-y-2">
              <Label htmlFor="senha">{i18n.auth.senha}</Label>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? i18n.auth.loggingIn : i18n.auth.login}
            </Button>

            <div className="text-center space-y-2 text-sm">
              <button
                type="button"
                className="text-muted-foreground hover:text-primary transition-colors"
                disabled
              >
                {i18n.auth.forgotPassword}
              </button>
              <div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  disabled
                >
                  {i18n.auth.createAccount}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
