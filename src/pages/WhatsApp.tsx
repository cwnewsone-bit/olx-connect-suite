import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, Trash2, Phone, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { http } from "@/lib/http";

type Instance = {
  id: string;
  instance_name: string;
  number: string;
  webhook?: string;
  created_at: string;
};

type WelcomeFlow = {
  enabled: boolean;
  audioUrl: string;
  list: {
    title?: string;
    text: string;
    buttonText: string;
    sections: Array<{
      title?: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
  actions: Record<string, {
    type: 'AVAILABILITY_CHECK' | 'SEND_PHOTOS_REQUEST' | 'SEND_ADDRESS_TEXT' | 'OTHER_SEND_AUDIO';
    text?: string;
    mapsUrl?: string;
    audioUrl?: string;
  }>;
};

export default function WhatsApp() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [instanceStatus, setInstanceStatus] = useState<any>(null);
  const [welcomeFlow, setWelcomeFlow] = useState<WelcomeFlow>({
    enabled: false,
    audioUrl: "",
    list: {
      text: "Escolha uma opção:",
      buttonText: "Ver opções",
      sections: [{
        title: "Atendimento",
        rows: []
      }]
    },
    actions: {}
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInstances();
  }, []);

  useEffect(() => {
    if (selectedInstance) {
      loadInstanceStatus();
      loadWelcomeFlow();
    }
  }, [selectedInstance]);

  const loadInstances = async () => {
    try {
      const { data } = await http.get('/api/wpp/instances');
      setInstances(data.instances || []);
      if (data.instances?.length > 0 && !selectedInstance) {
        setSelectedInstance(data.instances[0].instance_name);
      }
    } catch (err: any) {
      console.error('Error loading instances:', err);
      toast.error('Erro ao carregar instâncias');
    }
  };

  const loadInstanceStatus = async () => {
    if (!selectedInstance) return;
    try {
      const { data } = await http.get(`/api/wpp/${selectedInstance}/status`);
      setInstanceStatus(data.status);
    } catch (err: any) {
      console.error('Error loading status:', err);
    }
  };

  const loadWelcomeFlow = async () => {
    if (!selectedInstance) return;
    try {
      const { data } = await http.get(`/api/wpp/${selectedInstance}/welcome-flow`);
      setWelcomeFlow(data.flow);
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.log('No welcome flow configured yet');
      } else {
        console.error('Error loading welcome flow:', err);
      }
    }
  };

  const saveWelcomeFlow = async () => {
    if (!selectedInstance) {
      toast.error('Selecione uma instância');
      return;
    }

    const allRowIds = welcomeFlow.list.sections.flatMap(s => s.rows.map(r => r.id));
    const missingActions = allRowIds.filter(id => !welcomeFlow.actions[id]);
    
    if (missingActions.length > 0) {
      toast.error(`Faltam ações para os IDs: ${missingActions.join(', ')}`);
      return;
    }

    if (welcomeFlow.enabled && !welcomeFlow.audioUrl) {
      toast.error('URL do áudio é obrigatória quando o fluxo está ativado');
      return;
    }

    setLoading(true);
    try {
      await http.put(`/api/wpp/${selectedInstance}/welcome-flow`, welcomeFlow);
      toast.success('Fluxo de boas-vindas salvo com sucesso!');
    } catch (err: any) {
      console.error('Error saving welcome flow:', err);
      toast.error(err.response?.data?.message || 'Erro ao salvar fluxo');
    } finally {
      setLoading(false);
    }
  };

  const addRow = (sectionIndex: number) => {
    const newRow = {
      id: `OP_${Date.now()}`,
      title: "",
      description: ""
    };
    
    const newSections = [...welcomeFlow.list.sections];
    newSections[sectionIndex].rows.push(newRow);
    
    setWelcomeFlow({
      ...welcomeFlow,
      list: { ...welcomeFlow.list, sections: newSections }
    });
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const newSections = [...welcomeFlow.list.sections];
    const removedId = newSections[sectionIndex].rows[rowIndex].id;
    newSections[sectionIndex].rows.splice(rowIndex, 1);
    
    const newActions = { ...welcomeFlow.actions };
    delete newActions[removedId];
    
    setWelcomeFlow({
      ...welcomeFlow,
      list: { ...welcomeFlow.list, sections: newSections },
      actions: newActions
    });
  };

  const updateRow = (sectionIndex: number, rowIndex: number, field: string, value: string) => {
    const newSections = [...welcomeFlow.list.sections];
    newSections[sectionIndex].rows[rowIndex] = {
      ...newSections[sectionIndex].rows[rowIndex],
      [field]: value
    };
    
    setWelcomeFlow({
      ...welcomeFlow,
      list: { ...welcomeFlow.list, sections: newSections }
    });
  };

  const updateAction = (rowId: string, field: string, value: any) => {
    setWelcomeFlow({
      ...welcomeFlow,
      actions: {
        ...welcomeFlow.actions,
        [rowId]: {
          ...welcomeFlow.actions[rowId],
          [field]: value
        }
      }
    });
  };

  const getStatusBadge = () => {
    if (!instanceStatus) return <Badge variant="secondary">Carregando...</Badge>;
    
    const state = instanceStatus.instance?.state;
    if (state === 'open') {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Conectado</Badge>;
    } else if (state === 'connecting') {
      return <Badge variant="secondary"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Conectando...</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Desconectado</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">WhatsApp</h1>
        <p className="text-muted-foreground">Gerencie suas instâncias e configure mensagens automáticas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instâncias Conectadas</CardTitle>
          <CardDescription>Selecione uma instância para configurar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {instances.map((inst) => (
              <Button
                key={inst.id}
                variant={selectedInstance === inst.instance_name ? "default" : "outline"}
                onClick={() => setSelectedInstance(inst.instance_name)}
                className="flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                {inst.instance_name}
              </Button>
            ))}
            {instances.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma instância criada ainda</p>
            )}
          </div>

          {selectedInstance && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {getStatusBadge()}
              <Button size="sm" variant="ghost" onClick={loadInstanceStatus}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          )}

          {instanceStatus?.qrcode?.base64 && (
            <div className="mt-4">
              <p className="text-sm mb-2">Escaneie o QR Code com seu WhatsApp:</p>
              <img src={instanceStatus.qrcode.base64} alt="QR Code" className="max-w-xs border rounded" />
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="flow-builder" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flow-builder">Flow Builder</TabsTrigger>
          <TabsTrigger value="manual">Envio Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="flow-builder" className="space-y-4">
          {!selectedInstance ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">Selecione uma instância para configurar o fluxo</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Mensagem de Boas-vindas (Automática)</CardTitle>
                    <CardDescription>Configure o fluxo enviado automaticamente no primeiro contato</CardDescription>
                  </div>
                  <Switch
                    checked={welcomeFlow.enabled}
                    onCheckedChange={(checked) => setWelcomeFlow({ ...welcomeFlow, enabled: checked })}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Passo 1: URL do Áudio Inicial *</Label>
                  <Input
                    id="audioUrl"
                    placeholder="https://cdn.exemplo.com/boas-vindas.mp3"
                    value={welcomeFlow.audioUrl}
                    onChange={(e) => setWelcomeFlow({ ...welcomeFlow, audioUrl: e.target.value })}
                    disabled={!welcomeFlow.enabled}
                  />
                  <p className="text-xs text-muted-foreground">Áudio de boas-vindas (será enviado primeiro)</p>
                </div>

                <div className="space-y-4">
                  <Label>Passo 2: Menu Interativo (WhatsApp List)</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="listTitle">Título (opcional)</Label>
                      <Input
                        id="listTitle"
                        placeholder="Opções"
                        value={welcomeFlow.list.title || ""}
                        onChange={(e) => setWelcomeFlow({
                          ...welcomeFlow,
                          list: { ...welcomeFlow.list, title: e.target.value }
                        })}
                        disabled={!welcomeFlow.enabled}
                      />
                    </div>
                    <div>
                      <Label htmlFor="listButtonText">Texto do Botão *</Label>
                      <Input
                        id="listButtonText"
                        placeholder="Ver opções"
                        value={welcomeFlow.list.buttonText}
                        onChange={(e) => setWelcomeFlow({
                          ...welcomeFlow,
                          list: { ...welcomeFlow.list, buttonText: e.target.value }
                        })}
                        disabled={!welcomeFlow.enabled}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="listText">Texto da Mensagem *</Label>
                    <Textarea
                      id="listText"
                      placeholder="Escolha uma opção:"
                      value={welcomeFlow.list.text}
                      onChange={(e) => setWelcomeFlow({
                        ...welcomeFlow,
                        list: { ...welcomeFlow.list, text: e.target.value }
                      })}
                      disabled={!welcomeFlow.enabled}
                    />
                  </div>

                  {welcomeFlow.list.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="border rounded-lg p-4 space-y-4">
                      <Label>Seção: {section.title || `Seção ${sectionIndex + 1}`}</Label>
                      
                      {section.rows.map((row, rowIndex) => (
                        <Accordion key={rowIndex} type="single" collapsible>
                          <AccordionItem value={row.id}>
                            <AccordionTrigger className="text-sm">
                              {row.title || `Opção ${rowIndex + 1}`} ({row.id})
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>ID da Opção *</Label>
                                  <Input
                                    value={row.id}
                                    onChange={(e) => updateRow(sectionIndex, rowIndex, 'id', e.target.value)}
                                    disabled={!welcomeFlow.enabled}
                                  />
                                </div>
                                <div>
                                  <Label>Título *</Label>
                                  <Input
                                    placeholder="Ex: Disponibilidade do veículo?"
                                    value={row.title}
                                    onChange={(e) => updateRow(sectionIndex, rowIndex, 'title', e.target.value)}
                                    disabled={!welcomeFlow.enabled}
                                  />
                                </div>
                              </div>

                              <div>
                                <Label>Descrição (opcional)</Label>
                                <Input
                                  placeholder="Ex: Consulta OLX"
                                  value={row.description || ""}
                                  onChange={(e) => updateRow(sectionIndex, rowIndex, 'description', e.target.value)}
                                  disabled={!welcomeFlow.enabled}
                                />
                              </div>

                              <div className="border-t pt-4 space-y-4">
                                <Label>Ação ao Selecionar</Label>
                                <Select
                                  value={welcomeFlow.actions[row.id]?.type || ""}
                                  onValueChange={(value) => updateAction(row.id, 'type', value)}
                                  disabled={!welcomeFlow.enabled}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione uma ação" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="AVAILABILITY_CHECK">Consultar Disponibilidade (OLX)</SelectItem>
                                    <SelectItem value="SEND_PHOTOS_REQUEST">Solicitar Fotos (Resposta Texto)</SelectItem>
                                    <SelectItem value="SEND_ADDRESS_TEXT">Enviar Endereço (Google Maps)</SelectItem>
                                    <SelectItem value="OTHER_SEND_AUDIO">Outras (Enviar Áudio)</SelectItem>
                                  </SelectContent>
                                </Select>

                                {welcomeFlow.actions[row.id]?.type === 'SEND_PHOTOS_REQUEST' && (
                                  <div>
                                    <Label>Texto da Resposta</Label>
                                    <Input
                                      placeholder="Um atendente vai te chamar agora 👍"
                                      value={welcomeFlow.actions[row.id]?.text || ""}
                                      onChange={(e) => updateAction(row.id, 'text', e.target.value)}
                                      disabled={!welcomeFlow.enabled}
                                    />
                                  </div>
                                )}

                                {welcomeFlow.actions[row.id]?.type === 'SEND_ADDRESS_TEXT' && (
                                  <div>
                                    <Label>URL do Google Maps</Label>
                                    <Input
                                      placeholder="https://maps.app.goo.gl/XXXX"
                                      value={welcomeFlow.actions[row.id]?.mapsUrl || ""}
                                      onChange={(e) => updateAction(row.id, 'mapsUrl', e.target.value)}
                                      disabled={!welcomeFlow.enabled}
                                    />
                                  </div>
                                )}

                                {welcomeFlow.actions[row.id]?.type === 'OTHER_SEND_AUDIO' && (
                                  <div>
                                    <Label>URL do Áudio</Label>
                                    <Input
                                      placeholder="https://cdn.exemplo.com/outras-duvidas.mp3"
                                      value={welcomeFlow.actions[row.id]?.audioUrl || ""}
                                      onChange={(e) => updateAction(row.id, 'audioUrl', e.target.value)}
                                      disabled={!welcomeFlow.enabled}
                                    />
                                  </div>
                                )}
                              </div>

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeRow(sectionIndex, rowIndex)}
                                disabled={!welcomeFlow.enabled}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Remover Opção
                              </Button>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ))}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addRow(sectionIndex)}
                        disabled={!welcomeFlow.enabled}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Opção
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={saveWelcomeFlow} disabled={loading || !welcomeFlow.enabled}>
                    {loading ? 'Salvando...' : 'Salvar Fluxo'}
                  </Button>
                  <Button variant="outline" onClick={loadWelcomeFlow}>
                    Recarregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle>Envio Manual (Testes)</CardTitle>
              <CardDescription>Envie mensagens manualmente para testar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use os endpoints via API ou cURL para enviar mensagens manuais:
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/text
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/audio
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/media
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/location
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/list
                <br />
                POST /api/wpp/{'{instanceName}'}/messages/contact
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
