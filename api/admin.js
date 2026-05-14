import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Verifica senha do admin
  if (req.headers['x-admin-key'] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  // ── GET: lista agendamentos de um mês ──
  if (req.method === 'GET') {
    const { mes, ano } = req.query;

    if (!mes || !ano) {
      return res.status(400).json({ erro: 'Informe mes e ano' });
    }

    const dataInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
    const dataFim    = `${ano}-${String(mes).padStart(2, '0')}-31`;

    const { data: rows, error } = await supabase
      .from('agendamentos')
      .select('*')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true })
      .order('horario', { ascending: true });

    if (error) return res.status(500).json({ erro: error.message });

    return res.status(200).json({ agendamentos: rows });
  }

  // ── PATCH: cancela um agendamento ──
  if (req.method === 'PATCH') {
    const { id } = req.body;

    if (!id) return res.status(400).json({ erro: 'Informe o id' });

    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'cancelado' })
      .eq('id', id);

    if (error) return res.status(500).json({ erro: error.message });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ erro: 'Método não permitido' });
}
