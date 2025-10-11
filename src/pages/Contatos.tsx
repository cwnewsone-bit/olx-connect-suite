import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ContatoSchema, type Contato } from '@/lib/schemas';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Contatos() {
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodo, setPeriodo] = useState('30');
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    loadContatos();
  }, [periodo]);

  async function loadContatos() {
    setIsLoading(true);
    try {
      const data = await api.get(`/api/contatos?periodo=${periodo}`);
      const parsed = z.array(ContatoSchema).parse(data);
      setContatos(parsed);
    } catch (error) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '—';
    }
  }

  function formatRelativeDate(dateStr: string | null | undefined) {
    if (!dateStr) return '';
    try {
      return formatDistanceToNow(new Date(dateStr), {
        addSuffix: true,
        locale: ptBR,
      });
    } catch {
      return '';
    }
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      toast.success('Telefone copiado!');
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      toast.error('Erro ao copiar telefone');
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
              <Skeleton key={i} className="h-20" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{i18n.contatos.title}</h1>
          <p className="text-muted-foreground">{i18n.contatos.subtitle}</p>
        </div>
        
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{i18n.contatos.days7}</SelectItem>
            <SelectItem value="30">{i18n.contatos.days30}</SelectItem>
            <SelectItem value="90">{i18n.contatos.days90}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de contatos */}
      <Card>
        <CardContent className="p-0">
          {contatos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-lg font-medium">{i18n.contatos.empty}</p>
              <p className="text-sm text-muted-foreground">{i18n.contatos.emptyDesc}</p>
            </div>
          ) : (
            <div className="divide-y">
              {contatos.map((contato) => (
                <div
                  key={contato.contato_id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedContato(contato)}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{contato.nome || 'Anônimo'}</h3>
                        {contato.telefone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyPhone(contato.telefone!);
                            }}
                          >
                            {copiedPhone ? (
                              <Check className="h-3 w-3 text-success" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {contato.telefone || '—'}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {contato.mensagem}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(contato.quando)}</span>
                        <span>•</span>
                        <span className="truncate">{contato.anuncio_titulo}</span>
                        {contato.anuncio_url && (
                          <a
                            href={contato.anuncio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary-hover"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={contato.origin === 'buyer' ? 'info' : 'secondary'}>
                        {contato.origin === 'buyer' ? 'Comprador' : 'Vendedor'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeDate(contato.quando)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Drawer de detalhes */}
      <Sheet open={!!selectedContato} onOpenChange={() => setSelectedContato(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedContato && (
            <>
              <SheetHeader>
                <SheetTitle>{i18n.contatos.detalhes}</SheetTitle>
                <SheetDescription>
                  {formatDate(selectedContato.quando)}
                </SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                <div>
                  <h4 className="text-sm font-medium mb-2">Contato</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Nome:</span>
                      <span className="font-medium">{selectedContato.nome || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Telefone:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{selectedContato.telefone || '—'}</span>
                        {selectedContato.telefone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => copyPhone(selectedContato.telefone!)}
                          >
                            {copiedPhone ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedContato.email || '—'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Mensagem</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedContato.mensagem}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Anúncio</h4>
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm text-muted-foreground flex-1">
                        {selectedContato.anuncio_titulo}
                      </span>
                      {selectedContato.anuncio_url && (
                        <a
                          href={selectedContato.anuncio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary-hover"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {selectedContato.categoria || '—'} • {selectedContato.bairro}, {selectedContato.cidade}
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Informações Técnicas</h4>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Chat ID: {selectedContato.chat_id}</div>
                    <div>Message ID: {selectedContato.message_id}</div>
                    <div>Sender: {selectedContato.sender_type}</div>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
