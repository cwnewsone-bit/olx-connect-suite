import { Router } from 'express';
import { pool } from '../db.mjs';
import { evoSendAudio, evoSendList, evoSendText } from '../services/evolution.mjs';
import axios from 'axios';

const router = Router();

// POST /webhooks/evolution - Webhook da Evolution API
router.post('/evolution', async (req, res) => {
  try {
    const payload = req.body;
    console.log('[WEBHOOK] Evolution payload:', JSON.stringify(payload, null, 2));

    // Exemplo de payload Evolution:
    // {
    //   "event": "messages.upsert",
    //   "instance": "inst_xxx",
    //   "data": {
    //     "key": { "remoteJid": "5527997222542@s.whatsapp.net", "fromMe": false, "id": "..." },
    //     "message": { "conversation": "Olá" }
    //   }
    // }

    const event = payload.event;
    const instanceName = payload.instance;
    const data = payload.data;

    if (!event || !instanceName || !data) {
      console.log('[WEBHOOK] Missing required fields, ignoring');
      return res.status(200).json({ ok: true, message: 'Ignored (incomplete payload)' });
    }

    // Buscar instance_id
    const { rows: instRows } = await pool.query(
      'SELECT id, user_id FROM wpp.instances WHERE instance_name = $1',
      [instanceName]
    );

    if (instRows.length === 0) {
      console.log('[WEBHOOK] Instance not found:', instanceName);
      return res.status(200).json({ ok: true, message: 'Instance not found' });
    }

    const instanceId = instRows[0].id;
    const userId = instRows[0].user_id;

    // Processar eventos
    if (event === 'messages.upsert' && data.key && !data.key.fromMe) {
      // Mensagem recebida de cliente
      const phone = data.key.remoteJid.replace('@s.whatsapp.net', '');
      const messageText = data.message?.conversation || data.message?.extendedTextMessage?.text || '';

      console.log('[WEBHOOK] Message from:', phone, '| Text:', messageText);

      // Verificar se é primeiro contato (nunca recebeu boas-vindas)
      const { rows: welcomedRows } = await pool.query(
        'SELECT id FROM wpp.contacts_welcomed WHERE instance_id = $1 AND phone = $2',
        [instanceId, phone]
      );

      const isFirstContact = welcomedRows.length === 0;

      if (isFirstContact) {
        console.log('[WEBHOOK] First contact detected:', phone);

        // Buscar welcome flow
        const { rows: flowRows } = await pool.query(
          'SELECT enabled, audio_url, list_config FROM wpp.welcome_flows WHERE instance_id = $1 AND enabled = true',
          [instanceId]
        );

        if (flowRows.length > 0) {
          const flow = flowRows[0];
          console.log('[WEBHOOK] Sending welcome flow to:', phone);

          // 1. Enviar áudio
          await evoSendAudio(instanceName, phone, flow.audio_url);
          console.log('[WEBHOOK] Audio sent');

          // 2. Aguardar 2 segundos e enviar lista
          await new Promise(resolve => setTimeout(resolve, 2000));

          const listPayload = {
            number: phone,
            ...flow.list_config
          };
          await evoSendList(instanceName, listPayload);
          console.log('[WEBHOOK] List sent');

          // Marcar como welcomed
          await pool.query(
            'INSERT INTO wpp.contacts_welcomed (instance_id, phone) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [instanceId, phone]
          );

          // Salvar contato no banco (se não existir)
          await pool.query(
            `INSERT INTO wpp.contacts (user_id, phone, name) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id, phone) DO NOTHING`,
            [userId, phone, phone] // Nome default = phone
          );
        }
      }
    } else if (event === 'messages.upsert' && data.message?.listResponseMessage) {
      // Resposta de lista interativa
      const phone = data.key.remoteJid.replace('@s.whatsapp.net', '');
      const selectedRowId = data.message.listResponseMessage.singleSelectReply?.selectedRowId;

      console.log('[WEBHOOK] List response from:', phone, '| Selected:', selectedRowId);

      if (selectedRowId) {
        // Buscar welcome flow e actions
        const { rows: flowRows } = await pool.query(
          'SELECT actions FROM wpp.welcome_flows WHERE instance_id = $1',
          [instanceId]
        );

        if (flowRows.length > 0) {
          const actions = flowRows[0].actions;
          const action = actions[selectedRowId];

          if (action) {
            console.log('[WEBHOOK] Executing action:', action.type);

            switch (action.type) {
              case 'AVAILABILITY_CHECK':
                // Consultar OLX (exemplo simplificado)
                try {
                  // TODO: implementar consulta real à API OLX usando tokens do usuário
                  // const olxData = await checkOlxAvailability(userId);
                  const available = Math.random() > 0.5; // Mock
                  const responseText = available 
                    ? '✅ Sim, o veículo está disponível!' 
                    : '❌ Não, o veículo já foi vendido.';
                  await evoSendText(instanceName, phone, responseText);
                } catch (err) {
                  console.error('[WEBHOOK] Error checking availability:', err);
                  await evoSendText(instanceName, phone, '⚠️ Erro ao consultar disponibilidade.');
                }
                break;

              case 'SEND_PHOTOS_REQUEST':
                await evoSendText(instanceName, phone, action.text || 'Um atendente vai te chamar agora 👍');
                // TODO: notificar humano (webhook interno, notificação push etc.)
                break;

              case 'SEND_ADDRESS_TEXT':
                await evoSendText(instanceName, phone, `📍 Endereço da loja:\n${action.mapsUrl}`);
                break;

              case 'OTHER_SEND_AUDIO':
                await evoSendAudio(instanceName, phone, action.audioUrl);
                break;

              default:
                console.log('[WEBHOOK] Unknown action type:', action.type);
            }
          }
        }
      }
    }

    return res.status(200).json({ ok: true, message: 'Processed' });
  } catch (err) {
    console.error('[WEBHOOK] Error processing webhook:', err);
    return res.status(200).json({ ok: false, error: err.message }); // Sempre 200 para não retentar
  }
});

export default router;
