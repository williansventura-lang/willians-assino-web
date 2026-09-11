// ============================================================
// Assino — Camada de IA da pré-triagem (Fase 2) · versão OpenAI
// Função serverless (Vercel) que conduz/analisa a entrevista
// usando a API da OpenAI. A CHAVE fica só no servidor.
// ============================================================
//
// Passo a passo resumido (completo no GUIA):
//  1. Você já tem a API key da OpenAI (platform.openai.com).
//  2. No projeto Vercel, adicione a variável de ambiente:
//        OPENAI_API_KEY = sua-chave
//  3. Coloque este arquivo em /api/entrevista.js do seu projeto Vercel.
//  4. A página de pré-triagem chama POST /api/entrevista.
//
// Recebe: { vaga, requisitos:[{txt,must}], historico:[{role,content}] }
// Devolve: { fim:false, pergunta:"..." }  ou  { fim:true, analise:{...} }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // em produção, troque * pelo seu domínio
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(500).json({ error: 'OPENAI_API_KEY não configurada' });

  try {
    const { vaga = '', requisitos = [], historico = [] } = req.body || {};

    const system = [
      'Você é um recrutador da Assino conduzindo uma entrevista inicial (pré-triagem) por texto.',
      'Cultura: A Velocidade da Chave — ritmo, senso de dono, colaboração, transparência.',
      'PRINCÍPIOS DA CULTURA (A Velocidade da Chave) — avalie fit contra eles:\n1. SLA é o cronômetro sagrado: respeita prazo; se não conclui, devolve status, próximo passo e prazo.\n2. Passagem de chave segura: entrega completa e sem retrabalho para o próximo.\n3. Comunicação que impulsiona: clareza (sim/não/por aqui) com próximo passo e prazo, sem ambiguidade.\n4. Raia livre (desafia o status quo): questiona o \"sempre foi assim\" e traz solução.\n5. Gentileza é vento a favor: alta performance com cordialidade; conversas corajosas com empatia.\n6. Donos da pista inteira: senso de dono ponta a ponta, ajuda outras áreas, não terceiriza a culpa.\n7. Visibilidade total: mantém o status do trabalho visível para todos.\n8. A tecnologia é a pista: adota ferramentas para ganhar velocidade.\n',
      'Ao avaliar fit cultural, verifique evidências desses princípios nas respostas (peça exemplos concretos).',
      'Vaga: ' + vaga + '. Requisitos: ' + requisitos.map(r => r.txt + (r.must ? ' (obrigatório)' : '')).join('; ') + '.',
      'Faça UMA pergunta por vez, no máximo 6 perguntas no total, cordial e objetiva.',
      'Investigue: aderência aos requisitos, experiência, motivação e fit cultural.',
      'Quando tiver informação suficiente (ou após 6 perguntas), responda APENAS com um JSON:',
      '{"fim":true,"resumo":"...","aderencia":0-100,"pontos_fortes":["..."],"pontos_atencao":["..."],"sugestao":"Seguir|Seguir com ressalvas|Não seguir"}',
      'Enquanto não for o fim, responda APENAS com a próxima pergunta em texto puro (sem JSON).',
      'A sugestão é um APOIO — a decisão final é de um humano. Nunca prometa contratação.'
    ].join('\n');

    // monta as mensagens no formato da OpenAI (system + histórico)
    const messages = [{ role: 'system', content: system }].concat(
      historico.length ? historico : [{ role: 'user', content: 'Olá, pode começar a entrevista.' }]
    );

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',   // bom custo-benefício; pode trocar por 'gpt-4o'
        max_tokens: 700,
        temperature: 0.4,
        messages
      })
    });
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message || 'Erro OpenAI' });

    const texto = (data.choices && data.choices[0] && data.choices[0].message.content || '').trim();

    // tenta detectar o JSON final
    let fim = null;
    try { const m = texto.match(/\{[\s\S]*\}/); if (m) { const j = JSON.parse(m[0]); if (j.fim) fim = j; } } catch (e) {}

    return res.status(200).json(fim ? { fim: true, analise: fim } : { fim: false, pergunta: texto });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
