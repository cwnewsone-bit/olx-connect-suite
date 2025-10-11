import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { OlxStatusSchema, type OlxStatus, MeSchema, type Me } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { User, LogOut, Settings } from 'lucide-react';
import { logout } from '@/lib/auth';
import { i18n } from '@/lib/i18n';

export function DashboardHeader() {
  const [olxStatus, setOlxStatus] = useState<OlxStatus | null>(null);
  const [user, setUser] = useState<Me | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [statusData, userData] = await Promise.all([
        api.get('/api/olx/status'),
        api.get('/auth/me'),
      ]);
      
      setOlxStatus(OlxStatusSchema.parse(statusData));
      setUser(MeSchema.parse(userData));
    } catch (error) {
      console.error('Erro ao carregar dados do header:', error);
    }
  }

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card px-4 shadow-sm">
      <SidebarTrigger />
      
      <div className="flex-1" />
      
      {/* Status OLX */}
      {olxStatus && (
        <Badge variant={olxStatus.connected ? 'success' : 'secondary'}>
          OLX {olxStatus.connected ? 'Conectada' : 'Desconectada'}
        </Badge>
      )}
      
      {/* Menu do usuário */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user?.nome || 'Usuário'}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            {i18n.nav.settings}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {i18n.nav.logout}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
