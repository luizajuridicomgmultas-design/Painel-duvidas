export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido." });
    }

    const { mensagemCliente, basePortal } = req.body || {};

    if (!mensagemCliente || !String(mensagemCliente).trim()) {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY não configurada na Vercel.",
      });
    }

    const duvidas = Array.isArray(basePortal?.duvidas) ? basePortal.duvidas : [];
    const mensagensProntas = Array.isArray(basePortal?.mensagensProntas)
      ? basePortal.mensagensProntas
      : [];
    const tutoriais = Array.isArray(basePortal?.tutoriais) ? basePortal.tutoriais : [];
    const links = Array.isArray(basePortal?.links) ? basePortal.links : [];

    const limitar = (texto, limite = 900) => {
      const valor = String(texto || "");
      return valor.length > limite ? valor.slice(0, limite) + "..." : valor;
    };

    const baseTexto = `
BASE DO PORTAL:

DÚVIDAS PRONTAS:
${duvidas
  .slice(0, 25)
  .map(
    (d, i) => `
${i + 1}. ${d.title || d.titulo || "Sem título"}
Tipo: ${d.type || d.tipo || ""}
Subtipo: ${d.subtype || d.subtipo || ""}
Resposta: ${limitar(d.text || d.resposta || d.content || d.conteudo || "")}
`
  )
  .join("\n")}

MENSAGENS PRONTAS:
${mensagensProntas
  .slice(0, 25)
  .map(
    (m, i) => `
${i + 1}. ${m.title || m.titulo || "Sem título"}
Tipo: ${m.type || m.tipo || ""}
Mensagem: ${limitar(m.text || m.mensagem || m.content || m.conteudo || "")}
`
  )
  .join("\n")}

TUTORIAIS:
${tutoriais
  .slice(0, 12)
  .map(
    (t, i) => `
${i + 1}. ${t.title || t.titulo || "Sem título"}
Tipo: ${t.type || t.tipo || ""}
Descrição: ${limitar(t.desc || t.descricao || "")}
Conteúdo/link: ${limitar(t.content || t.conteudo || t.url || t.link || "")}
`
  )
  .join("\n")}

LINKS ÚTEIS:
${links
  .slice(0, 12)
  .map(
    (l, i) => `
${i + 1}. ${l.title || l.titulo || "Sem título"}
Descrição: ${limitar(l.desc || l.descricao || "")}
URL: ${l.url || l.link || ""}
`
  )
  .join("\n")}
`;

    const prompt = `
Você é a IA interna de atendimento do Atestado Fácil.

Sua função é ajudar o atendente a responder clientes pelo WhatsApp.

CONTEXTO:
O Atestado Fácil é uma ferramenta privada, independente e sem vínculo com Prefeitura, Secretaria, perícia médica ou qualquer órgão público.
O serviço auxilia no preenchimento, organização e envio por e-mail do Formulário Solicitação Perícia Médica.
A equipe acompanha o e-mail até haver resposta do órgão.
Quando houver resposta, o protocolo ou orientação recebida é repassado ao usuário.
Depois da resposta do órgão, o andamento, prazo, análise, aceite ou indeferimento dependem exclusivamente do órgão responsável.
O Atestado Fácil não garante deferimento, aceitação, prazo de resposta, leitura de e-mail, protocolo ou resultado administrativo.
O usuário é responsável pela veracidade das informações e documentos enviados.
Suporte: suportenexalab@gmail.com.

REGRAS:
- Responda em português do Brasil.
- Escreva como WhatsApp.
- Seja humana, simples e direta.
- Não use juridiquês.
- Não faça texto longo.
- Não diga que somos da Prefeitura.
- Não diga que temos acesso interno ao órgão.
- Não prometa prazo.
- Não prometa deferimento.
- Não prometa resultado.
- Quando faltar informação, faça uma pergunta antes de concluir.
- Quando envolver protocolo, explique que só enviamos quando o órgão/perícia responde.
- Quando envolver prazo, pergunte a data do envio ou do afastamento quando fizer sentido.
- Quando envolver documento ilegível, peça reenvio com imagem nítida.
- Quando envolver erro no app, peça print da tela.
- Quando envolver golpe/oficial, explique com transparência que é ferramenta independente.
- Se a cliente estiver brava, responda com calma.
- Se não houver base suficiente, diga que precisa verificar.

ESTILO:
Use tom parecido com:
"Olá, Ana.

Você enviou que dia?

Pois o servidor deve solicitar a perícia em até 2 dias úteis após o início do afastamento..."

FORMATO OBRIGATÓRIO:
Resposta sugerida:
[resposta pronta para WhatsApp]

Observação interna:
[uma frase curta explicando por que essa resposta foi sugerida]

${baseTexto}

MENSAGEM DA CLIENTE:
${mensagemCliente}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Erro Gemini:", result);
      return res.status(500).json({
        error: "Erro ao gerar resposta com Gemini.",
        details:
          result?.error?.message ||
          result?.message ||
          "Falha ao chamar a API do Gemini.",
      });
    }

    const texto =
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "Não consegui gerar uma resposta agora.";

    return res.status(200).json({ resposta: texto });
  } catch (error) {
    console.error("Erro Gemini atendimento:", error);
    return res.status(500).json({
      error: "Erro interno na IA.",
    });
  }
}
