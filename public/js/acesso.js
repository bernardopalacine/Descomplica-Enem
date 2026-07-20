// A sessão agora é um cookie HttpOnly assinado pelo servidor (login.js) —
// o navegador não consegue mais fabricar um "estou logado" sozinho.
// Este arquivo só pergunta pro servidor se a sessão é válida.
async function checarSessao() {
  try {
    var r = await fetch('/api/verificar-sessao', { credentials: 'same-origin' });
    return await r.json();
  } catch (e) { return { ok: false }; }
}

// Pega destino do parâmetro ?next= — só aceita caminhos internos do
// próprio site (ex.: /aulas-completas.html). Sem essa checagem, alguém
// poderia montar um link tipo acesso.html?next=https://site-falso.com
// e, depois do login de verdade, a pessoa seria mandada pra fora do
// site (golpe clássico de "open redirect" usado em phishing).
//
// Versão anterior comparava a STRING crua com uma regex (bloqueando
// "//evil.com" e "/\evil.com"). Isso não bastava: um caractere de
// tabulação entre as barras (ex. "/\t/evil.com") passava na regex, mas o
// navegador remove tabs/quebras de linha ao resolver a URL (spec WHATWG
// URL) e reconstrói "//evil.com" de qualquer forma — ou seja, a checagem
// e o comportamento real do navegador podiam discordar. Agora deixamos o
// próprio parser de URL do navegador resolver primeiro e comparamos o
// ORIGIN resultante: não tem como o resultado divergir do que o
// navegador vai de fato usar no redirecionamento, porque é a mesma
// resolução.
function getNext() {
  try {
    var p = new URLSearchParams(location.search);
    var n = p.get('next');
    if (!n) return null;
    n = decodeURIComponent(n);
    var resolvido = new URL(n, location.origin);
    if (resolvido.origin !== location.origin) return null;
    return resolvido.pathname + resolvido.search + resolvido.hash;
  } catch(e) {}
  return null;
}

function ir(id) {
  document.querySelectorAll('.panel').forEach(function(p){ p.classList.remove('on'); });
  document.getElementById(id).classList.add('on');
  document.querySelectorAll('.msg').forEach(function(m){ m.className = 'msg'; });
}

function togglePw() {
  var i = document.getElementById('iSenha');
  i.type = i.type === 'password' ? 'text' : 'password';
}

async function logar() {
  var email = document.getElementById('iEmail').value.trim().toLowerCase();
  var senha = document.getElementById('iSenha').value.trim();
  var msg   = document.getElementById('mLogin');
  var btn   = document.getElementById('btnLogin');
  msg.className = 'msg';

  if (!email || !senha) {
    msg.textContent = 'Preencha email e senha.';
    msg.className = 'msg err'; return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spin"></div> Verificando...';

  try {
    var r = await fetch('/api/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, senha: senha })
    });
    var d = await r.json();

    if (d.ok) {
      // O servidor já mandou o cookie de sessão (Set-Cookie na resposta acima).

      // Redireciona para destino original se veio de página protegida
      var next = getNext();
      if (next && next.indexOf('acesso') === -1) {
        location.replace(next);
        return;
      }

      document.getElementById('nomeAluno').textContent = d.nome || 'aluno';
      ir('pWelcome');
    } else {
      msg.textContent = d.msg || 'Email ou senha incorretos.';
      msg.className = 'msg err';
      btn.disabled = false;
      btn.innerHTML = 'Entrar →';
    }
  } catch(e) {
    msg.textContent = 'Erro de conexão. Tente novamente.';
    msg.className = 'msg err';
    btn.disabled = false;
    btn.innerHTML = 'Entrar →';
  }
}

async function recuperar() {
  var email = document.getElementById('iRecEmail').value.trim().toLowerCase();
  var msg   = document.getElementById('mRec');
  var btn   = document.getElementById('btnRec');
  msg.className = 'msg';

  if (!email || !email.includes('@')) {
    msg.textContent = 'Digite um email válido.';
    msg.className = 'msg err'; return;
  }

  btn.disabled = true;
  btn.innerHTML = '<div class="spin"></div> Enviando...';

  try {
    var r = await fetch('/api/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email })
    });
    var d = await r.json();
    msg.textContent = d.msg;
    msg.className = d.ok ? 'msg info' : 'msg err';
  } catch(e) {
    msg.textContent = 'Erro ao enviar. Tente novamente.';
    msg.className = 'msg err';
  }
  btn.disabled = false;
  btn.innerHTML = 'Enviar nova senha';
}

async function sair() {
  try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (e) {}
  document.getElementById('iEmail').value = '';
  document.getElementById('iSenha').value = '';
  ir('pLogin');
}

document.getElementById('iEmail').addEventListener('keydown', function(e){
  if (e.key === 'Enter') document.getElementById('iSenha').focus();
});
document.getElementById('iSenha').addEventListener('keydown', function(e){
  if (e.key === 'Enter') logar();
});
document.getElementById('btnTogglePw').addEventListener('click', togglePw);
document.getElementById('btnLogin').addEventListener('click', logar);
document.getElementById('btnEsqueciSenha').addEventListener('click', function(){ ir('pRec'); });
document.getElementById('iRecEmail').addEventListener('keydown', function(e){
  if (e.key === 'Enter') recuperar();
});
document.getElementById('btnRec').addEventListener('click', recuperar);
document.getElementById('btnVoltarLogin').addEventListener('click', function(){ ir('pLogin'); });
document.getElementById('btnSair').addEventListener('click', sair);

// Sessão ativa → boas-vindas
(async function(){
  var s = await checarSessao();
  if (s && s.ok) {
    ir('pWelcome');
    document.getElementById('nomeAluno').textContent = s.nome || 'aluno';
  }
})();
