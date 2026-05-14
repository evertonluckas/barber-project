import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_FROM = 'whatsapp:+14155238886';
const TWILIO_TO   = 'whatsapp:+557998070553';

async function enviarWhatsApp(agendamento) {
  const { nome, telefone, servico, data, horario } = agendamento;

  const [ano, mes, dia] = data.split('-');
  const dataFormatada = `${dia}/${mes}/${ano}`;

  const mensagem =
    `🔔 *Novo Agendamento!*\n\n` +
    `👤 *Cliente:* ${nome}\n` +
    `📞 *Telefone:* ${telefone}\n` +
    `✂️ *Serviço:* ${servico}\n` +
    `📅 *Data:* ${dataFormatada}\n` +
    `🕐 *Horário:* ${horario}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

  const body = new URLSearchParams({
    To: TWILIO_TO,
    From: TWILIO_FROM,
    Body: mensagem,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const err = await response.json();
    console.error('Twilio error:', err);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET: retorna horários ocupados de uma data ──
  if (req.method === 'GET') {
    const { data } = req.query;

    if (!data) {
      return res.status(400).json({ erro: 'Informe a data' });
    }

    const { data: rows, error } = await supabase
      .from('agendamentos')
      .select('horario')
      .eq('data', data)
      .neq('status', 'cancelado');

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    const ocupados = rows.map(r => r.horario.slice(0, 5));
    return res.status(200).json({ ocupados });
  }

  // ── POST: cria novo agendamento ──
  if (req.method === 'POST') {
    const { nome, telefone, servico, data, horario, observacoes } = req.body;

    if (!nome || !telefone || !servico || !data || !horario) {
      return res.status(400).json({ erro: 'Preencha todos os campos obrigatórios' });
    }

    // Salva no Supabase
    const { error } = await supabase
      .from('agendamentos')
      .insert({ nome, telefone, servico, data, horario, observacoes, status: 'pendente' });

    if (error?.code === '23505') {
      return res.status(409).json({ erro: 'Esse horário acabou de ser reservado. Escolha outro.' });
    }

    if (error) {
      return res.status(500).json({ erro: error.message });
    }

    // Envia WhatsApp automaticamente
    await enviarWhatsApp({ nome, telefone, servico, data, horario });

    return res.status(201).json({
      ok: true,
      mensagem: 'Agendamento realizado com sucesso!'
    });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}
