require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { gerarResposta, iniciarMensagensEspontaneas, gerarImagem, transcreverAudio } = require("./ai");
const { liberarAcesso, verificarAcesso } = require("./database");

const bot = new TelegramBot(process.env.TOKEN, { polling: true });

// --- CONFIGURAÇÕES DE ASSINATURA ---
const ID_DO_ADMIN = 5891023152; // <--- TROQUE PELO SEU ID (Use o @userinfobot para descobrir)
const CHAVE_PIX = "anaclaratdsua@gmail.com"; // <--- SUA CHAVE PIX
const PRECO = "R$ 19,90";
const SITE = "https://bit.ly/44VM4OZ"

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
iniciarMensagensEspontaneas(bot);

// --- 1. COMANDOS DE ADMIN (SÓ VOCÊ USA) ---

// Comando: /liberar ID
bot.onText(/\/liberar (\d+)/, (msg, match) => {
  if (msg.from.id !== ID_DO_ADMIN) return; // Ignora se não for você

  const idCliente = match[1];
  const dataVencimento = liberarAcesso(idCliente, 30); // Libera 30 dias

  bot.sendMessage(msg.chat.id, `✅ Usuário ${idCliente} liberado até ${dataVencimento}!`);
  bot.sendMessage(idCliente, "🎉 **Pagamento Confirmado!**\n\nSua assinatura mensal está ativa. Pode conversar, pedir fotos e mandar áudios à vontade amor! 💕", { parse_mode: "Markdown" });
});

// --- 2. COMANDOS PÚBLICOS ---

bot.onText(/\/assinar/, (msg) => {
  const texto = `
💎 **Assinatura VIP**

Tenha acesso total à sua namorada virtual:
✅ Conversas ilimitadas
✅ Fotos exclusivas (Do jeito que você pedir)
✅ Ouvirei seus audios e estarei aqui por você

Valor: **${PRECO}** / mês
**Chave Pix** (toque abaixo para copiar):

\`*${CHAVE_PIX}*\`

Site para cartão e boleto: ${SITE}

📩 **Como liberar?**
Faça o Pix e **me envie o comprovante (foto)** aqui mesmo no chat.
⬇️⬇️⬇️
`;
  bot.sendMessage(msg.chat.id, texto, { parse_mode: "Markdown" });
});

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `Seu ID: \`${msg.from.id}\``, { parse_mode: "Markdown" });
});


// --- 3. LÓGICA DE BLOQUEIO E COMPROVANTE ---

async function processarMensagem(msg, tipo) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  // Se for o Admin, libera tudo sempre
  if (userId === ID_DO_ADMIN) {
    if (tipo === 'texto') return processarIA(chatId, userId, msg.text);
    if (tipo === 'audio') return processarAudio(msg);
    return;
  }

  // Verifica se o usuário pagou
  const assinanteAtivo = verificarAcesso(userId);

  // SE NÃO FOR ASSINANTE
  if (!assinanteAtivo) {
    
    // Se ele mandou uma FOTO (provável comprovante)
    if (msg.photo) {
      bot.sendMessage(chatId, "📩 Recebi sua foto/comprovante! Vou encaminhar para análise. Se estiver tudo certo, libero seu acesso em breve! ⏳");
      
      // Encaminha a foto para VOCÊ (Admin)
      bot.sendPhoto(ID_DO_ADMIN, msg.photo[msg.photo.length - 1].file_id, {
        caption: `💰 **Novo Comprovante?**\nDe: ${msg.from.first_name}\nID: \`${userId}\`\n\nPara liberar, digite:\n/liberar ${userId}`,
        parse_mode: "Markdown"
      });
      return;
    }

    // Se mandou texto ou áudio, bloqueia e manda o aviso
    if (tipo !== 'comando') { // Não bloqueia comandos como /assinar
      bot.sendMessage(chatId, "🔒 **Acesso Bloqueado**\n\nEssa conversa é exclusiva para assinantes.\nEnvie /assinar para ver como liberar.");
    }
    return;
  }

  // SE FOR ASSINANTE (Libera a IA)
  if (tipo === 'texto') await processarIA(chatId, userId, msg.text);
  if (tipo === 'audio') await processarAudio(msg);
}


// --- 4. FUNÇÕES DA IA (TEXTO E ÁUDIO) ---

async function processarIA(chatId, userId, texto) {
  bot.sendChatAction(chatId, "typing");
  try {
    let resposta = await gerarResposta(userId, texto);

    // Lógica da Foto
    const regexFoto = /\[FOTO:(.*?)\]/;
    const match = resposta.match(regexFoto);

    if (match) {
      const descricaoCenario = match[1].trim();
      resposta = resposta.replace(match[0], "").trim();
      bot.sendChatAction(chatId, "upload_photo");
      const urlImagem = await gerarImagem(descricaoCenario);
      
      if (urlImagem) await bot.sendPhoto(chatId, urlImagem);
      else resposta += "\n(Erro na câmera 😢)";
    }

    if (resposta) {
      await delay(Math.min(resposta.length * 50, 15000)); // Delay humano
      bot.sendMessage(chatId, resposta);
    }
  } catch (erro) {
    console.error(erro);
    bot.sendMessage(chatId, "Amor, me confundi... 😢");
  }
}

async function processarAudio(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const fileId = msg.voice.file_id;

  bot.sendChatAction(chatId, "typing");

  try {
    const fileLink = await bot.getFileLink(fileId);
    const audioPath = path.join(__dirname, `audio_${userId}.ogg`);
    
    // Baixa o áudio
    const writer = fs.createWriteStream(audioPath);
    const response = await axios({ url: fileLink, method: "GET", responseType: "stream" });
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Transcreve
    const texto = await transcreverAudio(audioPath);
    fs.unlinkSync(audioPath);

    if (texto) await processarIA(chatId, userId, texto);
    else bot.sendMessage(chatId, "Não consegui ouvir... 😢");

  } catch (e) {
    console.error(e);
    bot.sendMessage(chatId, "Erro no áudio 😢");
  }
}

// --- HANDLERS PRINCIPAIS ---

bot.on("message", async (msg) => {
  if (msg.voice) return; // Deixa pro handler de voz
  
  // Se for comando, não processa como IA, mas deixa passar pelo filtro
  const ehComando = msg.text && msg.text.startsWith('/');
  
  await processarMensagem(msg, ehComando ? 'comando' : 'texto');
});

bot.on("voice", async (msg) => {
  await processarMensagem(msg, 'audio');
});

console.log("🤖 Bot iniciado! Não esqueça de configurar seu ID_DO_ADMIN.");