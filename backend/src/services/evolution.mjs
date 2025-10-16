// backend/src/services/evolution.mjs
import axios from 'axios';
import env from '../env.mjs';

const evo = axios.create({
  baseURL: env.EVO_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    apikey: env.EVO_API_KEY,
  },
});

// Cria instância na Evolution
export async function evoCreateInstance(payload) {
  const { data } = await evo.post('/instance/create', payload);
  return data;
}

// Buscar status/qr
export async function evoGetInstance(instanceName) {
  const { data } = await evo.get(`/instance/${encodeURIComponent(instanceName)}`);
  return data;
}

// Enviar texto
export async function evoSendText(instanceName, to, text) {
  const { data } = await evo.post(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    number: to,
    text,
  });
  return data;
}

// Enviar áudio
export async function evoSendAudio(instanceName, to, audioUrl) {
  const { data } = await evo.post(`/message/sendAudio/${encodeURIComponent(instanceName)}`, {
    number: to,
    audio: audioUrl,
  });
  return data;
}

// Enviar mídia (imagem/vídeo/documento)
export async function evoSendMedia(instanceName, to, mediaUrl, caption) {
  const { data } = await evo.post(`/message/sendMedia/${encodeURIComponent(instanceName)}`, {
    number: to,
    mediaUrl,
    ...(caption ? { caption } : {}),
  });
  return data;
}

// Enviar localização
export async function evoSendLocation(instanceName, payload) {
  const { data } = await evo.post(`/message/sendLocation/${encodeURIComponent(instanceName)}`, {
    number: payload.to,
    latitude: payload.latitude,
    longitude: payload.longitude,
    ...(payload.name ? { name: payload.name } : {}),
    ...(payload.address ? { address: payload.address } : {}),
  });
  return data;
}

// Enviar lista (menu)
export async function evoSendList(instanceName, payload) {
  const { data } = await evo.post(`/message/sendList/${encodeURIComponent(instanceName)}`, {
    number: payload.to,
    title: payload.title || '',
    description: payload.text,
    buttonText: payload.buttonText,
    sections: payload.sections,
  });
  return data;
}

// Enviar contato (vCard)
export async function evoSendContact(instanceName, payload) {
  const { data } = await evo.post(`/message/sendContact/${encodeURIComponent(instanceName)}`, {
    number: payload.to,
    contact: [payload.contact],
  });
  return data;
}
