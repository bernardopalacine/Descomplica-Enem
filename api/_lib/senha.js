// api/_lib/senha.js
// Gera a senha temporária mandada por email (recuperar.js e webhook.js).
// Versão anterior sorteava "adjetivo-substantivo-NNNN" de duas listas de
// só 10 palavras cada + número de 4 dígitos — ~900 mil combinações no
// total. Como ninguém digita essa senha (o aluno só copia do email e
// cola no login), dá pra usar uma string aleatória bem mais longa sem
// perder nada de usabilidade, e ganhar entropia suficiente pra resistir
// a um crack offline mesmo se o banco (coluna senha_hash) algum dia vazar.
const crypto = require('crypto');

// Sem caracteres ambíguos (0/O, 1/l/I) — reduz erro de digitação pro caso
// raro de alguém precisar copiar na mão em vez de colar.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TAMANHO  = 14; // ~82 bits de entropia (58^14)

function gerarSenha() {
  let s = '';
  for (let i = 0; i < TAMANHO; i++) s += ALFABETO[crypto.randomInt(ALFABETO.length)];
  return s;
}

module.exports = { gerarSenha };
