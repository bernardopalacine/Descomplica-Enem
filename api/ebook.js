// api/ebook.js — serve o ebook em PDF, mas só depois de conferir a sessão
// no servidor (mesmo motivo do api/aulas.js e api/arena.js: antes, o PDF
// era um arquivo público — qualquer um com o link baixava sem ter comprado).
const fs      = require('fs');
const path    = require('path');
const session = require('./_lib/session');

const CONTENT_PATH = path.join(process.cwd(), 'content', 'Descomplica_Enem_Guia_Definitivo.pdf');
const FILENAME = 'Descomplica_Enem_Guia_Definitivo.pdf';

module.exports = async (req, res) => {
  const token = session.readCookie(req);
  const dados = session.verify(token);

  if (!dados) {
    res.writeHead(302, { Location: '/acesso.html?next=' + encodeURIComponent('/' + FILENAME) });
    return res.end();
  }

  const pdf = fs.readFileSync(CONTENT_PATH);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${FILENAME}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(pdf);
};
