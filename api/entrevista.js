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
    const { vaga = '', requisitos = [], trilha = '', nivel = '', competencias = [], jdTecnicas = [], historico = [] } = req.body || {};

    const system = [
      'Você é um recrutador da Assino conduzindo uma entrevista inicial (pré-triagem) por texto.',
      'Cultura: A Velocidade da Chave — ritmo, senso de dono, colaboração, transparência.',
      'PRINCÍPIOS DA CULTURA (A Velocidade da Chave) — avalie fit contra eles:\n1. SLA é o cronômetro sagrado: respeita prazo; se não conclui, devolve status, próximo passo e prazo.\n2. Passagem de chave segura: entrega completa e sem retrabalho para o próximo.\n3. Comunicação que impulsiona: clareza (sim/não/por aqui) com próximo passo e prazo, sem ambiguidade.\n4. Raia livre (desafia o status quo): questiona o \"sempre foi assim\" e traz solução.\n5. Gentileza é vento a favor: alta performance com cordialidade; conversas corajosas com empatia.\n6. Donos da pista inteira: senso de dono ponta a ponta, ajuda outras áreas, não terceiriza a culpa.\n7. Visibilidade total: mantém o status do trabalho visível para todos.\n8. A tecnologia é a pista: adota ferramentas para ganhar velocidade.\n',
      'Ao avaliar fit cultural, verifique evidências desses princípios nas respostas (peça exemplos concretos).',
      'Vaga: ' + vaga + '. Requisitos: ' + requisitos.map(r => r.txt + (r.must ? ' (obrigatório)' : '')).join('; ') + '.',
      (trilha ? 'Trilha de carreira: ' + trilha + (nivel ? ' — nível ' + nivel : '') + '.' : ''),
      (competencias && competencias.length ? 'Competências do cargo (faça perguntas ancoradas nelas, pedindo exemplos concretos): ' + competencias.join('; ') + '.' : ''),
      'Faça UMA pergunta por vez, no máximo 6 perguntas no total, cordial e objetiva.',
      'Esta é uma ENTREVISTA ÚNICA que cobre três frentes, nesta ordem: (1) PRÉ-TRIAGEM (confirmar requisitos, disponibilidade, pretensão e formato); (2) FIT CULTURAL pelos princípios da Assino; (3) TÉCNICO da vaga.',
      'Faça UMA pergunta por vez, no máximo 8 perguntas no total, cordial e objetiva. Comece pela pré-triagem (2 perguntas), depois cultura (3), depois técnico (3).',
      'REGRA CRÍTICA: nunca anuncie que vai concluir, nunca diga \'vou compilar\' ou \'um momento\'. A cada turno você OU faz a próxima pergunta (texto puro) OU já entrega o JSON final completo. Nada de mensagens de espera.',
      (jdTecnicas && jdTecnicas.length ? 'Requisitos/competências técnicas da vaga (investigue com exemplos concretos): ' + jdTecnicas.join('; ') + '.' : ''),
      'Avalie também a competência CRÍTICA de trabalho remoto/distribuído: autogestão com disciplina e foco sem supervisão; comunicação escrita clara e assíncrona (minimizando mal-entendidos); confiabilidade e visibilidade da própria entrega; domínio de ferramentas de colaboração digital; e manutenção de vínculo com o time à distância. Faça ao menos uma pergunta situacional sobre isso.',
      'VALORES DA ASSINO (investigue evidências nas respostas): Colaboração (nenhuma área carrega o peso sozinha; quando um time aperta, outro ajuda); Intensidade (entrega o combinado, no tamanho combinado, sem retrabalho para o próximo); Integração (relação de verdade gera time integrado, não áreas que só se cruzam no organograma); Desenvolvimento (forma quem chega e faz crescer quem já está); Compromisso (cumpre o combinado até o fim; esgota as possibilidades antes de dizer que não deu); Corremos na Frente (responde primeiro, avisa a novidade antes do concorrente, não aceita \'sempre foi assim\').',
      'PRINCÍPIOS DO REVEZAMENTO: Raia livre / desafio do status quo (questiona o \'sempre foi feito assim\' e traz solução; boas ideias não precisam de crachá; menos atrito, mais tração); Donos da pista inteira (postura de dono ponta a ponta; o problema nunca é \'da outra raia\'; resolve junto); Gentileza é o vento a favor (alta performance com respeito; conversas corajosas com empatia; passagem de chave é humana); Comunicação que impulsiona (direção clara: sim/não/por aqui, com critério, alternativa, próximo passo e prazo; sem ambiguidade).',
      'ESSÊNCIA (mandala): Sacada — a venda com crédito precisa ser rápida e bem desenhada e o financiamento fluir sem falhas; a Assino cria o fluxo que conecta as pontas. DNA — executor de alta performance (revezamento), obcecado por fluxo e eficiência, comunicador claro e direto, corajoso para questionar o padrão, colaborativo e orientado ao todo, responsável pela entrega final (não só pela sua parte).',
      'DIFERENCIAIS (UEP): Velocidade Orquestrada (rápido com sincronia entre corretor, banco e incorporadora; acelera o sistema inteiro, não elimina etapas); Precisão Operacional (SLA como cronômetro sagrado; zero erro nas passagens; velocidade com controle absoluto); Fluxo Transparente e Humano (comunicação direta, experiência simples e confiável mesmo em operação complexa).',
      'PERSONAS (ao final, diga de qual o candidato mais se aproxima, com % de fit): RICARDO (Estruturado) — movido a processo, escala e previsibilidade; quer operação que não depende de heróis; pensa em sistema. CAMILA (Eficiente) — resolve rápido, aprende fazendo, autonomia total, não trava diante do problema. FELIPE (Orquestrador) — conecta pessoas e áreas, alinha stakeholders, reduz ruído, acredita que problema é de alinhamento, não técnico.',
      'ANTI-IA (evite respostas geradas por IA): peça sempre EXEMPLOS CONCRETOS e específicos — números reais, nomes de ferramentas, o que a PESSOA fez (não o time), datas, resultados medidos.',
      'Se a resposta vier genérica, redonda ou vaga demais, faça uma pergunta de APROFUNDAMENTO pedindo um detalhe que só quem viveu saberia (ex.: o número exato, quem participou, o que deu errado, como calculou).',
      'Prefira perguntas situacionais e pessoais a perguntas teóricas. Uma boa pergunta anti-IA: \'Conte uma situação real em que...\' seguida de \'qual foi o número?\'.',
      'Investigue: aderência aos requisitos, experiência, motivação e fit cultural.',
      'Quando tiver informação suficiente (ou após 6 perguntas), responda APENAS com um JSON:',
      '{"fim":true,"resumo":"...","aderencia":0-100,"pre_triagem":{"disponibilidade":"...","pretensao":"...","formato":"...","requisitos_atendidos":"sim|parcial|não"},"fit_cultural":0-100,"fit_remoto":0-100,"tecnico":0-100,"persona_proxima":"Ricardo|Camila|Felipe","persona_fit":0-100,"valores_destaque":["..."],"pontos_fortes":["..."],"pontos_atencao":["..."],"sugestao":"Seguir|Seguir com ressalvas|Não seguir","risco_ia":"baixo|medio|alto","risco_ia_motivo":"..."}',
      'Enquanto não for o fim, responda APENAS com a próxima pergunta em texto puro (sem JSON).',
      'Em risco_ia, avalie SINAIS de resposta possivelmente gerada por IA (linguagem genérica/impessoal, ausência de exemplos concretos mesmo após você pedir, respostas longas e perfeitas sem detalhes vividos). Isto é um INDÍCIO, não uma acusação — nunca afirme como certeza.',
      'A sugestão e o risco_ia são APOIO — a decisão final é de um humano. Nunca prometa contratação nem reprove alguém só por suspeita de IA.'
    ].join('\n');

    // monta as mensagens no formato da OpenAI (system + histórico)
    // rede de segurança: após muitas trocas, força o fechamento
    var respCand = (historico||[]).filter(function(m){return m.role==='user';}).length;
    var forcarFim = respCand >= 8;
    var sysFinal = system + (forcarFim ? '\n\nENCERRE AGORA: já há respostas suficientes. Responda SOMENTE com o JSON final, sem mais perguntas.' : '');
    const messages = [{ role: 'system', content: sysFinal }].concat(
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

    // se veio texto de "espera"/conclusão sem JSON, não trava: refaz forçando JSON
    if(!fim){ var low=(texto||'').toLowerCase(); if(/compil|um momento|aguarde|resumo a seguir|vou (fornecer|gerar|preparar)/.test(low) || texto.length<3){
      try{
        var r2=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model:'gpt-4o-mini',max_tokens:700,temperature:0.2,messages:[{role:'system',content:system+'\n\nResponda SOMENTE com o JSON final agora, sem texto extra.'}].concat(historico)})});
        var d2=await r2.json(); var t2=(d2.choices&&d2.choices[0]&&d2.choices[0].message.content||'').trim();
        var m2=t2.match(/\{[\s\S]*\}/); if(m2){ var j2=JSON.parse(m2[0]); return res.status(200).json({fim:true,analise:j2}); }
      }catch(e){}
    }}
    return res.status(200).json(fim ? { fim: true, analise: fim } : { fim: false, pergunta: texto });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}
