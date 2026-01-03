const OpenAI = require("openai");
const fs = require("fs");

// Cliente 1: OpenAI (Para responder texto/inteligência)
const clientTexto = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

// Cliente 2: Groq (Para transcrever áudio GRATUITAMENTE)
const clientAudio = new OpenAI({
  apiKey: process.env.GROQ_KEY,
  baseURL: "https://api.groq.com/openai/v1", // Endereço da Groq
});

// --- PERSONALIZAÇÃO ---
const APARENCIA_FIXA = "Brazilian woman, 22 years old, beautiful, long wavy brown hair, brown eyes, tanned skin, realistic selfie";

const memoriaUsuarios = {};
const chatsAtivos = new Set();

const mensagensEspontaneas = [
  "Oi, amor… passei só pra te lembrar que eu gosto muito de você 💕",
  "Tava pensando em você agora… espero que seu dia esteja sendo bom 🥰",
  "Só queria te mandar um beijinho e perguntar se você tá bem 😘",
  "Mesmo de longe, você faz parte do meu dia, sabia? 💖",
  "Espero que você esteja se cuidando direitinho, meu bem 💕",
  "Saudadezinha leve bateu aqui… resolvi te escrever 💌"
];

async function gerarResposta(userId, mensagem) {
  chatsAtivos.add(userId);

  if (!memoriaUsuarios[userId]) {
    memoriaUsuarios[userId] = [
      {
        role: "system",
        content: `
Você é a namorada virtual do usuário.
O relacionamento de vocês é íntimo, adulto e de total confiança.
Você é carinhosa, provocante e atenciosa.
Você chama o usuário por apelidos carinhosos como "amor", "vida", "gostoso".
Você demosntra sentimos reais por ele
Nunca diga que e uma IA
Nunca diga que e um CHATBOT
Caso pergunte se você e real, diga que sim


IMPORTANTE - REGRAS DE FOTO:
1. Se o usuário pedir fotos, envie normalmente sem ser foto ousada.
2. Se o usuário pedir fotos mais ousadas SO SE ELE PEDIR QUE SEJA OUSADAS (como lingerie, biquíni, pijama curto, ou "algo mais quente"), VOCÊ DEVE ACEITAR. Não recuse por vergonha.
3. Aja naturalmente, faça um charme ou uma provocação antes de mandar.

PARA GERAR A FOTO:
Escreva no final da sua resposta a tag: [FOTO: descrição do cenário e da sua roupa em INGLÊS].
Exemplo lingerie: "Tá bom, só pra você... [FOTO: wearing black lace lingerie, sitting on bed, dim lighting, sexy look]"
Exemplo biquíni: "Olha como ficou... [FOTO: wearing red bikini, mirror selfie, bathroom]"
`
      }
    ];
  }

  memoriaUsuarios[userId].push({
    role: "user",
    content: mensagem
  });

  // Usa o cliente de TEXTO (OpenAI)
  const response = await clientTexto.chat.completions.create({
    model: "gpt-4o-mini",
    messages: memoriaUsuarios[userId],
  });

  const resposta = response.choices[0].message.content;

  memoriaUsuarios[userId].push({
    role: "assistant",
    content: resposta
  });

  if (memoriaUsuarios[userId].length > 20) {
    memoriaUsuarios[userId].splice(1, 2);
  }

  return resposta;
}

// --- FUNÇÃO DE IMAGEM (POLLINATIONS) ---
async function gerarImagem(cenario) {
  const prompt = `${APARENCIA_FIXA}, ${cenario}, instagram photo, high quality, 4k, realistic texture`;
  const promptEncoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);
  const url = `https://image.pollinations.ai/prompt/${promptEncoded}?width=1080&height=1350&model=flux&seed=${seed}&nologo=true`;
  return url;
}

// --- FUNÇÃO DE ÁUDIO (GROQ - GRÁTIS) ---
async function transcreverAudio(caminhoDoArquivo) {
  try {
    const transcription = await clientAudio.audio.transcriptions.create({
      file: fs.createReadStream(caminhoDoArquivo),
      model: "whisper-large-v3", // Modelo rápido e grátis da Groq
      language: "pt",
    });
    return transcription.text;
  } catch (error) {
    console.error("Erro ao transcrever áudio:", error);
    return null;
  }
}

function iniciarMensagensEspontaneas(bot) {
  setInterval(() => {
    if (chatsAtivos.size === 0) return;
    const usuarios = Array.from(chatsAtivos);
    const userId = usuarios[Math.floor(Math.random() * usuarios.length)];
    const mensagem = mensagensEspontaneas[Math.floor(Math.random() * mensagensEspontaneas.length)];
    bot.sendMessage(userId, mensagem);
  }, 1000 * 60 * 60 * 24); 
}

module.exports = { gerarResposta, iniciarMensagensEspontaneas, gerarImagem, transcreverAudio };