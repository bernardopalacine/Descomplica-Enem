// api/arena.js — serve o conteúdo real de arena-enem.html, mas só
// depois de conferir a sessão no servidor (mesmo motivo do api/aulas.js).
const fs      = require('fs');
const path    = require('path');
const session = require('./_lib/session');

const CONTENT_PATH = path.join(process.cwd(), 'content', 'arena-enem.html');

module.exports = async (req, res) => {
  const token = session.readCookie(req);
  const dados = session.verify(token);

  if (!dados) {
    res.writeHead(302, { Location: '/acesso.html?next=' + encodeURIComponent('/arena-enem.html') });
    return res.end();
  }

  const html = fs.readFileSync(CONTENT_PATH, 'utf8');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).send(html);
};
