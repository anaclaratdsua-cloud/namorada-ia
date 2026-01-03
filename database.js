const fs = require('fs');
const path = './assinantes.json';

// Cria o arquivo se não existir
if (!fs.existsSync(path)) {
  fs.writeFileSync(path, JSON.stringify({}));
}

function carregarAssinantes() {
  try {
    return JSON.parse(fs.readFileSync(path));
  } catch (e) {
    return {};
  }
}

// Libera acesso (Ativa)
function liberarAcesso(userId, dias) {
  const dados = carregarAssinantes();
  const validade = new Date();
  validade.setDate(validade.getDate() + dias);

  dados[userId] = {
    expiraEm: validade.toISOString(),
    ativo: true // <--- Marcamos como ATIVO
  };

  fs.writeFileSync(path, JSON.stringify(dados, null, 2));
  return validade.toLocaleDateString('pt-BR');
}

// Bloqueia acesso (Desativa) --- NOVA FUNÇÃO
function bloquearAcesso(userId) {
  const dados = carregarAssinantes();
  
  if (dados[userId]) {
    dados[userId].ativo = false; // <--- Marcamos como INATIVO
    fs.writeFileSync(path, JSON.stringify(dados, null, 2));
    return true; // Deu certo
  }
  return false; // Usuário não existia
}

// Verifica acesso
function verificarAcesso(userId) {
  const dados = carregarAssinantes();
  const usuario = dados[userId];

  // Se não existe ou se "ativo" for falso, bloqueia
  if (!usuario || !usuario.ativo) return false;

  const agora = new Date();
  const dataExpiracao = new Date(usuario.expiraEm);

  return agora < dataExpiracao;
}

// Não esqueça de adicionar bloquearAcesso aqui no final
module.exports = { liberarAcesso, verificarAcesso, bloquearAcesso };
