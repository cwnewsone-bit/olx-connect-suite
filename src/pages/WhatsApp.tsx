import { useState } from 'react';
import { Send, MessageSquare, Mic, Image, MapPin, List, User, Plus, Copy, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { http } from '@/lib/http';

export default function WhatsApp() {
  const [instanceName, setInstanceName] = useState('');
  const [instanceNumber, setInstanceNumber] = useState('');
  const [webhook, setWebhook] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [createdInstance, setCreatedInstance] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para mensagens
  const [recipient, setRecipient] = useState('');
  const [activeInstance, setActiveInstance] = useState('');

  // Criar instância
  const handleCreateInstance = async () => {
    if (!instanceName || !instanceNumber) {
      toast.error('Preencha nome da instância e número');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        instanceName,
        number: instanceNumber,
      };
      if (webhook) payload.webhook = webhook;

      const { data } = await http.post('/api/wpp/instances', payload);
      
      toast.success('Instância criada com sucesso!');
      setCreatedInstance(instanceName);
      setActiveInstance(instanceName);
      
      // Verificar se tem QR code na resposta
      if (data.evolution?.qrcode?.base64) {
        setQrCode(data.evolution.qrcode.base64);
      } else if (data.evolution?.qrcode) {
        setQrCode(data.evolution.qrcode);
      }
    } catch (error: any) {
      const msg = error?.response?.data?.details?.message || error?.response?.data?.message || 'Erro ao criar instância';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Enviar texto
  const handleSendText = async (text: string) => {
    if (!activeInstance || !recipient || !text) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/text`, {
        to: recipient,
        text,
      });
      toast.success('Mensagem enviada!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Enviar áudio
  const handleSendAudio = async (audioUrl: string) => {
    if (!activeInstance || !recipient || !audioUrl) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/audio`, {
        to: recipient,
        audioUrl,
      });
      toast.success('Áudio enviado!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Enviar mídia
  const handleSendMedia = async (mediaUrl: string, caption?: string) => {
    if (!activeInstance || !recipient || !mediaUrl) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/media`, {
        to: recipient,
        mediaUrl,
        caption,
      });
      toast.success('Mídia enviada!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Enviar localização
  const handleSendLocation = async (lat: number, lng: number, name?: string, address?: string) => {
    if (!activeInstance || !recipient || !lat || !lng) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/location`, {
        to: recipient,
        latitude: lat,
        longitude: lng,
        name,
        address,
      });
      toast.success('Localização enviada!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Enviar lista
  const handleSendList = async (title: string, text: string, buttonText: string, sections: any[]) => {
    if (!activeInstance || !recipient || !text || !buttonText || sections.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/list`, {
        to: recipient,
        title,
        text,
        buttonText,
        sections,
      });
      toast.success('Lista enviada!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Enviar contato
  const handleSendContact = async (fullName: string, org: string, phones: any[]) => {
    if (!activeInstance || !recipient || !fullName || phones.length === 0) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await http.post(`/api/wpp/${activeInstance}/messages/contact`, {
        to: recipient,
        contact: {
          fullName,
          org,
          phones,
        },
      });
      toast.success('Contato enviado!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  // Salvar contato no banco
  const handleSaveContact = async (phone: string, name: string) => {
    if (!phone || !name) {
      toast.error('Preencha telefone e nome');
      return;
    }

    setLoading(true);
    try {
      await http.post('/api/contacts', { phone, name });
      toast.success('Contato salvo!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Erro ao salvar contato');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-muted-foreground">Configure instâncias e envie mensagens</p>
        </div>
      </div>

      {/* Seção: Criar Instância */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Criar Instância
          </CardTitle>
          <CardDescription>Conecte um número do WhatsApp via Evolution API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="instanceName">Nome da Instância*</Label>
              <Input
                id="instanceName"
                placeholder="inst_meuusuario_001"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="instanceNumber">Número (E.164)*</Label>
              <Input
                id="instanceNumber"
                placeholder="5527997222542"
                value={instanceNumber}
                onChange={(e) => setInstanceNumber(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="webhook">Webhook (HTTPS, opcional)</Label>
            <Input
              id="webhook"
              placeholder="https://seu-dominio.com/webhooks/evolution"
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
            />
          </div>

          <Button onClick={handleCreateInstance} disabled={loading}>
            {loading ? 'Criando...' : 'Criar Instância'}
          </Button>

          {createdInstance && (
            <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">✓ Instância criada: {createdInstance}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(createdInstance);
                  toast.success('Copiado!');
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar nome
              </Button>
            </div>
          )}

          {qrCode && (
            <div className="mt-4 p-4 border rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                <p className="font-medium">Escaneie o QR Code no WhatsApp</p>
              </div>
              <img src={qrCode} alt="QR Code" className="max-w-xs mx-auto" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seção: Mensagens */}
      <Card>
        <CardHeader>
          <CardTitle>Enviar Mensagens</CardTitle>
          <CardDescription>Configure mensagens de boas-vindas e automações</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="activeInstance">Instância Ativa</Label>
              <Input
                id="activeInstance"
                placeholder="Nome da instância"
                value={activeInstance}
                onChange={(e) => setActiveInstance(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="recipient">Destinatário (E.164)*</Label>
              <Input
                id="recipient"
                placeholder="5527997222542"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              />
            </div>
          </div>

          <Tabs defaultValue="text" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="text">
                <MessageSquare className="h-4 w-4 mr-2" />
                Texto
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Mic className="h-4 w-4 mr-2" />
                Áudio
              </TabsTrigger>
              <TabsTrigger value="media">
                <Image className="h-4 w-4 mr-2" />
                Mídia
              </TabsTrigger>
              <TabsTrigger value="location">
                <MapPin className="h-4 w-4 mr-2" />
                Local
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4 mr-2" />
                Lista
              </TabsTrigger>
              <TabsTrigger value="contact">
                <User className="h-4 w-4 mr-2" />
                Contato
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <TextMessageForm onSend={handleSendText} loading={loading} />
            </TabsContent>

            <TabsContent value="audio" className="space-y-4">
              <AudioMessageForm onSend={handleSendAudio} loading={loading} />
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              <MediaMessageForm onSend={handleSendMedia} loading={loading} />
            </TabsContent>

            <TabsContent value="location" className="space-y-4">
              <LocationMessageForm onSend={handleSendLocation} loading={loading} />
            </TabsContent>

            <TabsContent value="list" className="space-y-4">
              <ListMessageForm onSend={handleSendList} loading={loading} />
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <ContactMessageForm onSend={handleSendContact} loading={loading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Seção: Salvar Contatos */}
      <Card>
        <CardHeader>
          <CardTitle>Salvar Contato</CardTitle>
          <CardDescription>Adicione contatos ao banco de dados local</CardDescription>
        </CardHeader>
        <CardContent>
          <SaveContactForm onSave={handleSaveContact} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-componentes de formulários
function TextMessageForm({ onSend, loading }: { onSend: (text: string) => void; loading: boolean }) {
  const [text, setText] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="text">Mensagem</Label>
        <Textarea
          id="text"
          placeholder="Digite a mensagem..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
        />
      </div>
      <Button onClick={() => onSend(text)} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Texto
      </Button>
    </div>
  );
}

function AudioMessageForm({ onSend, loading }: { onSend: (url: string) => void; loading: boolean }) {
  const [audioUrl, setAudioUrl] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="audioUrl">URL do Áudio</Label>
        <Input
          id="audioUrl"
          placeholder="https://exemplo.com/audio.mp3"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
        />
      </div>
      <Button onClick={() => onSend(audioUrl)} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Áudio
      </Button>
    </div>
  );
}

function MediaMessageForm({ onSend, loading }: { onSend: (url: string, caption?: string) => void; loading: boolean }) {
  const [mediaUrl, setMediaUrl] = useState('');
  const [caption, setCaption] = useState('');

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="mediaUrl">URL da Mídia</Label>
        <Input
          id="mediaUrl"
          placeholder="https://exemplo.com/imagem.jpg"
          value={mediaUrl}
          onChange={(e) => setMediaUrl(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="caption">Legenda (opcional)</Label>
        <Input
          id="caption"
          placeholder="Descrição da imagem..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
      </div>
      <Button onClick={() => onSend(mediaUrl, caption)} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Mídia
      </Button>
    </div>
  );
}

function LocationMessageForm({
  onSend,
  loading,
}: {
  onSend: (lat: number, lng: number, name?: string, address?: string) => void;
  loading: boolean;
}) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="lat">Latitude*</Label>
          <Input id="lat" placeholder="-20.2976178" value={lat} onChange={(e) => setLat(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="lng">Longitude*</Label>
          <Input id="lng" placeholder="-40.2957768" value={lng} onChange={(e) => setLng(e.target.value)} />
        </div>
      </div>
      <div>
        <Label htmlFor="locName">Nome (opcional)</Label>
        <Input id="locName" placeholder="Minha Loja" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="address">Endereço (opcional)</Label>
        <Input
          id="address"
          placeholder="Rua Exemplo, 123"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>
      <Button onClick={() => onSend(parseFloat(lat), parseFloat(lng), name, address)} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Localização
      </Button>
    </div>
  );
}

function ListMessageForm({
  onSend,
  loading,
}: {
  onSend: (title: string, text: string, buttonText: string, sections: any[]) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [buttonText, setButtonText] = useState('');

  const handleSend = () => {
    const sections = [
      {
        title: 'Atendimento',
        rows: [
          { id: 'OP1', title: 'Falar com humano', description: 'Encaminhar ao atendente' },
          { id: 'OP2', title: 'Status do pedido', description: 'Consultar automaticamente' },
        ],
      },
    ];
    onSend(title, text, buttonText, sections);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="listTitle">Título (opcional)</Label>
        <Input id="listTitle" placeholder="Opções" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="listText">Texto*</Label>
        <Input
          id="listText"
          placeholder="Escolha uma opção:"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="listButton">Texto do Botão*</Label>
        <Input
          id="listButton"
          placeholder="Ver opções"
          value={buttonText}
          onChange={(e) => setButtonText(e.target.value)}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        (Seções/opções pré-configuradas: "Falar com humano" e "Status do pedido")
      </p>
      <Button onClick={handleSend} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Lista
      </Button>
    </div>
  );
}

function ContactMessageForm({
  onSend,
  loading,
}: {
  onSend: (fullName: string, org: string, phones: any[]) => void;
  loading: boolean;
}) {
  const [fullName, setFullName] = useState('');
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');

  const handleSend = () => {
    const phones = [{ number: phone, type: 'WORK' }];
    onSend(fullName, org, phones);
  };

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="fullName">Nome Completo*</Label>
        <Input
          id="fullName"
          placeholder="Fulano da Silva"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="org">Organização (opcional)</Label>
        <Input id="org" placeholder="Minha Empresa" value={org} onChange={(e) => setOrg(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="phone">Telefone*</Label>
        <Input id="phone" placeholder="5527997000000" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <Button onClick={handleSend} disabled={loading}>
        <Send className="h-4 w-4 mr-2" />
        Enviar Contato
      </Button>
    </div>
  );
}

function SaveContactForm({ onSave, loading }: { onSave: (phone: string, name: string) => void; loading: boolean }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label htmlFor="savePhone">Telefone*</Label>
          <Input id="savePhone" placeholder="5527997222542" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="saveName">Nome*</Label>
          <Input id="saveName" placeholder="João Silva" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
      </div>
      <Button onClick={() => onSave(phone, name)} disabled={loading}>
        Salvar Contato
      </Button>
    </div>
  );
}
