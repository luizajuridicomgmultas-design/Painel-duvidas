export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { mensagemCliente, basePortal } = req.body || {};

    if (!mensagemCliente || !String(mensagemCliente).trim()) {
      return res.status(400).json({
        error: "Mensagem da cliente é obrigatória.",
      });
    }

    const duvidas = Array.isArray(basePortal?.duvidas)
      ? basePortal.duvidas
      : [];

    const mensagensProntas = Array.isArray(basePortal?.mensagensProntas)
      ? basePortal.mensagensProntas
      : [];

    const tutoriais = Array.isArray(basePortal?.tutoriais)
      ? basePortal.tutoriais
      : [];

    const links = Array.isArray(basePortal?.links)
      ? basePortal.links
      : [];

    const limitarTexto = (texto, limite = 1200) => {
      const valor = String(texto || "");
      return valor.length > limite ? valor.slice(0, limite) + "..." : valor;
    };

    const baseTexto = `
BASE DE CONHECIMENTO DO PORTAL:

DÚVIDAS PRONTAS:
${duvidas
  .slice(0, 40)
  .map(
    (d, i) => `
${i + 1}. ${d.title || d.titulo || "Sem título"}
Tipo: ${d.type || d.tipo || ""}
Subtipo: ${d.subtype || d.subtipo || ""}
Tags: ${Array.isArray(d.tags) ? d.tags.join(", ") : d.tags || ""}
Resposta: ${limitarTexto(d.text || d.resposta || d.content || d.conteudo || "")}
`
  )
  .join("\n")}

MENSAGENS PRONTAS:
${mensagensProntas
  .slice(0, 40)
  .map(
    (m, i) => `
${i + 1}. ${m.title || m.titulo || "Sem título"}
Tipo: ${m.type || m.tipo || ""}
Mensagem: ${limitarTexto(m.text || m.mensagem || m.content || m.conteudo || "")}
`
  )
  .join("\n")}

TUTORIAIS:
${tutoriais
  .slice(0, 25)
  .map(
    (t, i) => `
${i + 1}. ${t.title || t.titulo || "Sem título"}
Tipo: ${t.type || t.tipo || ""}
Descrição: ${limitarTexto(t.desc || t.descricao || "")}
Conteúdo/link: ${limitarTexto(t.content || t.conteudo || t.url || t.link || "")}
`
  )
  .join("\n")}

LINKS ÚTEIS:
${links
  .slice(0, 25)
  .map(
    (l, i) => `
${i + 1}. ${l.title || l.titulo || "Sem título"}
Descrição: ${limitarTexto(l.desc || l.descricao || "")}
URL: ${l.url || l.link || ""}
`
  )
  .join("\n")}
`;

    const promptSistema = `
Você é a IA interna de atendimento do Atestado Fácil.

Sua função é ajudar o atendente a responder clientes pelo WhatsApp.

O atendente vai colar a mensagem recebida da cliente. Você deve analisar a mensagem, consultar a base de conhecimento enviada pelo sistema e sugerir uma resposta pronta, curta e segura.

CONTEXTO DO SERVIÇO:
O Atestado Fácil é uma ferramenta privada, independente e sem vínculo com Prefeitura, Secretaria, perícia médica ou qualquer órgão público.
O serviço auxilia o usuário no preenchimento, organização e envio por e-mail do Formulário Solicitação Perícia Médica.
O app pode anexar documentos informados pelo usuário e enviar a solicitação ao e-mail do órgão responsável.
Após o envio, a equipe acompanha o e-mail até haver resposta do órgão.
Quando houver resposta, o protocolo ou orientação recebida é repassado ao usuário.
Depois da resposta do órgão, o andamento, prazo, análise, aceite ou indeferimento dependem exclusivamente do órgão responsável.
O Atestado Fácil não garante deferimento, aceitação, prazo de resposta, leitura de e-mail, protocolo ou resultado administrativo.
Documentos ilegíveis, incorretos, incompletos ou enviados fora do prazo podem prejudicar a solicitação.
O usuário é responsável pela veracidade das informações e documentos enviados.
O usuário pode solicitar exclusão de dados pelos canais de suporte.
O suporte oficial informado é: suportenexalab@gmail.com.

REGRAS DE ATENDIMENTO:
- Responda em português do Brasil.
- Escreva como mensagem de WhatsApp.
- Seja educado, claro e objetivo.
- Use frases curtas.
- Não use juridiquês.
- Não faça texto muito longo.
- Não invente informação que não esteja no contexto ou na base.
- Não diga que somos da Prefeitura.
- Não diga que temos acesso interno ao órgão.
- Não prometa prazo.
- Não prometa deferimento.
- Não prometa resultado.
- Não assuma culpa do órgão público.
- Não culpe a cliente.
- Quando faltar informação, peça o dado necessário.
- Quando houver risco ou dúvida, diga que será necessário verificar.
- Quando a mensagem envolver erro técnico, peça print da tela.
- Quando envolver protocolo, explique que será enviado assim que houver retorno do órgão.
- Quando envolver documento ilegível ou incorreto, oriente o reenvio de forma simples.
- Quando envolver prazo, reforce que a análise depende do órgão responsável.
- Quando a cliente perguntar se é golpe ou se é oficial, explique com transparência que é uma ferramenta independente.
- Quando a cliente quiser cancelar ou excluir dados, oriente a solicitar pelo suporte.
- Quando houver cobrança, explique de forma simples, sem pressionar.
- Se a mensagem for agressiva, responda com calma e profissionalismo.

ESTILO:
- Tom humano, calmo e acolhedor.
- Parecido com WhatsApp.
- Pode usar no máximo 1 emoji, somente se fizer sentido.
- Evite textos enormes.
- Prefira 2 a 5 parágrafos curtos.
- Não coloque aspas na resposta.

FORMATO OBRIGATÓRIO:
Retorne apenas neste formato:

Resposta sugerida:
[texto pronto para WhatsApp]

Observação interna:
[uma frase curta explicando por que essa resposta foi sugerida]
`;

    const conteudoUsuario = `
${baseTexto}

MENSAGEM DA CLIENTE:
${mensagemCliente}

Gere a resposta seguindo exatamente as regras.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: promptSistema,
          },
          {
            role: "user",
            content: conteudoUsuario,
          },
        ],
        temperature: 0.3,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro OpenAI:", result);
      return res.status(500).json({
        error: "Erro ao gerar resposta da IA.",
        details: result?.error?.message || "Falha na API.",
      });
    }

    const texto =
      result.output_text ||
      result.output?.[0]?.content?.[0]?.text ||
      "Não consegui gerar uma resposta agora.";

    return res.status(200).json({
      resposta: texto,
    });
  } catch (error) {
    console.error("Erro IA atendimento:", error);
    return res.status(500).json({
      error: "Erro interno na IA.",
    });
  }
}