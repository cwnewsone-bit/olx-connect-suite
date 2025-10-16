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

// (Opcional) buscar status/qr etc. Deixei pronto se quiser usar depois
export async function evoGetInstance(instanceName) {
  const { data } = await evo.get(`/instance/${encodeURIComponent(instanceName)}`);
  return data;
}
