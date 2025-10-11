import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Zap, RefreshCw, PauseCircle } from 'lucide-react';
import { toast } from 'sonner';
import { i18n } from '@/lib/i18n';

export default function Automacao() {
  const [pausaAutomatica, setPausaAutomatica] = useState(false);
  const [pausaDias, setPausaDias] = useState('7');
  const [renovacaoInteligente, setRenovacaoInteligente] = useState(false);
  const [quedaPercentual, setQuedaPercentual] = useState('30');
  const [janelaDias, setJanelaDias] = useState('3');

  function handleSave() {
    toast.success('Configurações salvas com sucesso!');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{i18n.automacao.title}</h1>
        <p className="text-muted-foreground">{i18n.automacao.subtitle}</p>
      </div>

      {/* Renovação Manual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            <CardTitle>{i18n.automacao.renovacaoManual}</CardTitle>
          </div>
          <CardDescription>{i18n.automacao.renovacaoManualDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Renovar Anúncios Selecionados
          </Button>
        </CardContent>
      </Card>

      {/* Pausa Automática */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PauseCircle className="h-5 w-5 text-warning" />
            <CardTitle>{i18n.automacao.pausaAutomatica}</CardTitle>
          </div>
          <CardDescription>{i18n.automacao.pausaAutomaticaDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="pausa-auto">Ativar pausa automática</Label>
            <Switch
              id="pausa-auto"
              checked={pausaAutomatica}
              onCheckedChange={setPausaAutomatica}
            />
          </div>
          
          {pausaAutomatica && (
            <div className="space-y-2">
              <Label htmlFor="pausa-dias">Pausar após X dias sem contato</Label>
              <Input
                id="pausa-dias"
                type="number"
                min="1"
                value={pausaDias}
                onChange={(e) => setPausaDias(e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renovação Inteligente */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-accent" />
            <CardTitle>{i18n.automacao.renovacaoInteligente}</CardTitle>
          </div>
          <CardDescription>{i18n.automacao.renovacaoInteligenteDesc}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="renovacao-inteligente">Ativar renovação inteligente</Label>
            <Switch
              id="renovacao-inteligente"
              checked={renovacaoInteligente}
              onCheckedChange={setRenovacaoInteligente}
            />
          </div>
          
          {renovacaoInteligente && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="queda-percentual">Renovar quando visualizações caírem (%)</Label>
                <Input
                  id="queda-percentual"
                  type="number"
                  min="1"
                  max="100"
                  value={quedaPercentual}
                  onChange={(e) => setQuedaPercentual(e.target.value)}
                  className="w-32"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="janela-dias">Janela de comparação (dias)</Label>
                <Input
                  id="janela-dias"
                  type="number"
                  min="1"
                  value={janelaDias}
                  onChange={(e) => setJanelaDias(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão salvar */}
      <div className="sticky bottom-4 flex justify-end">
        <Button onClick={handleSave} size="lg" className="shadow-primary">
          {i18n.automacao.salvar}
        </Button>
      </div>
    </div>
  );
}
