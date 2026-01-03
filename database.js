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

// Salva o usuário com a data de validade
function liberarAcesso(userId, dias) {
  const dados = carregarAssinantes();
  const validade = new Date();
  validade.setDate(validade.getDate() + dias); // Soma os dias a partir de hoje

  dados[userId] = {
    expiraEm: validade.toISOString(),
    ativo: true
  };

  fs.writeFileSync(path, JSON.stringify(dados, null, 2));
  return validade.toLocaleDateString('pt-BR');
}

// Verifica se o acesso está válido
function verificarAcesso(userId) {
  const dados = carregarAssinantes();
  const usuario = dados[userId];

  if (!usuario || !usuario.ativo) return false;

  const agora = new Date();
  const dataExpiracao = new Date(usuario.expiraEm);

  return agora < dataExpiracao;
}

module.exports = { liberarAcesso, verificarAcesso };