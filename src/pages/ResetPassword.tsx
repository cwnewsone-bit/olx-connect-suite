import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { http } from '@/lib/http';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [isLoading, setIsLoading] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');

  useEffect(() => {
    if (!token) {
      toast.error('Token de recuperação inválido');
      navigate('/login');
    }
  }, [token, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (novaSenha !== confirmaSenha) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (novaSenha.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      await http.post('/auth/reset', {
        token,
        novaSenha,
      });

      toast.success('Senha redefinida com sucesso!');
      navigate('/login');
    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      
      const message = error.response?.data?.message || 'Erro ao redefinir senha. O link pode ter expirado.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
            <Power className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">Redefinir senha</CardTitle>
            <CardDescription className="mt-2">
              Digite sua nova senha
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <Input
                id="novaSenha"
                type="password"
                placeholder="••••••••"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmaSenha">Confirmar senha</Label>
              <Input
                id="confirmaSenha"
                type="password"
                placeholder="••••••••"
                value={confirmaSenha}
                onChange={(e) => setConfirmaSenha(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Redefinindo...' : 'Redefinir senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
