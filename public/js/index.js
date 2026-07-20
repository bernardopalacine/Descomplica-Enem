const QS=[
  {q:'Há quanto tempo você estuda para o ENEM?',h:'Seja honesto — isso melhora o diagnóstico.',opts:['Ainda não comecei','Menos de 1 mês','1 a 6 meses','Mais de 6 meses'],sc:[0,1,2,3]},
  {q:'Qual área é sua maior dificuldade?',h:'A que te gera mais insegurança.',opts:['Matemática','Redação','Ciências Humanas','Ciências da Natureza'],sc:[0,1,2,3]},
  {q:'Quantas horas por dia você consegue estudar?',h:'Sua rotina real, não a ideal.',opts:['Menos de 1 hora','1 a 2 horas','2 a 4 horas','Mais de 4 horas'],sc:[0,1,2,3]},
  {q:'Como você prefere estudar?',h:'O formato que mais combina com você.',opts:['Videoaulas','Leitura e resumos','Exercícios e simulados','Tudo junto'],sc:[1,2,2,3]},
  {q:'Qual é sua meta na redação?',h:'Redação vale até 1000 pontos.',opts:['Só não zerar','Acima de 600','Acima de 800','Nota 1000'],sc:[0,1,2,3]}
];
let qi=0,ans=[],sel=null;

function qRender(){
  const q=QS[qi];
  document.getElementById('qQ').textContent=q.q;
  document.getElementById('qHint').textContent=q.h;
  document.getElementById('qCnt').textContent=(qi+1)+' DE '+QS.length;
  document.getElementById('qBack').classList.toggle('v-hidden', qi<=0);
  const nx=document.getElementById('qNext');
  nx.disabled=true;
  nx.textContent=qi===QS.length-1?'Ver resultado →':'Próxima →';
  document.getElementById('qBars').innerHTML=QS.map((_,i)=>`<div class="qp-b ${i<qi?'done':i===qi?'on':''}"></div>`).join('');
  const L=['A','B','C','D'];
  sel=ans[qi]!==undefined?ans[qi]:null;
  const qOpts=document.getElementById('qOpts');
  qOpts.innerHTML=q.opts.map((o,i)=>
    `<button type="button" class="q-opt${sel===i?' sel':''}" data-idx="${i}"><span class="opt-k">${L[i]}</span>${o}</button>`).join('');
  qOpts.querySelectorAll('.q-opt').forEach(function(btn){
    btn.addEventListener('click', function(){ qSel(Number(btn.dataset.idx)); });
  });
  if(sel!==null)nx.disabled=false;
}
function qSel(i){sel=i;ans[qi]=i;document.querySelectorAll('.q-opt').forEach((b,j)=>b.classList.toggle('sel',j===i));document.getElementById('qNext').disabled=false;}
function qStep(){if(sel===null)return;if(qi<QS.length-1){qi++;sel=ans[qi]!==undefined?ans[qi]:null;qRender();}else showQR();}
function qPrev(){if(qi>0){qi--;sel=ans[qi];qRender();}}
function showQR(){
  const tot=ans.reduce((s,a,i)=>s+(QS[i].sc[a]||0),0);
  const max=QS.reduce((s,q)=>s+Math.max(...q.sc),0);
  const pct=Math.round(55+(tot/max)*35);
  let t,tx;
  if(pct<67){t='Você está começando — e isso é ótimo.';tx='Identificamos pontos importantes para desenvolver. Com o Descomplica ENEM, você tem um plano estruturado do zero.';}
  else if(pct<80){t='Você tem base, mas precisa de estratégia.';tx='Seu nível é bom, mas sem estratégia certa você perde pontos. O guia te mostra exatamente onde focar.';}
  else{t='Você está quase lá!';tx='Seu preparo é acima da média. Falta afinar os detalhes — e o Descomplica ENEM te leva ao próximo nível.';}
  document.getElementById('qrS').textContent=pct+'%';
  document.getElementById('qrT').textContent=t;
  document.getElementById('qrTx').textContent=tx;
  document.getElementById('qPanel').classList.add('hidden');
  document.getElementById('qResult').classList.add('show');
}
function qReset(){
  qi=0;ans=[];sel=null;
  document.getElementById('qPanel').classList.remove('hidden');
  document.getElementById('qResult').classList.remove('show');
  qRender();
}

function comprar() {
  window.open("https://pay.cakto.com.br/zbxfpix_946324", "_blank");
}

document.getElementById('qNext').addEventListener('click', qStep);
document.getElementById('qBack').addEventListener('click', qPrev);
document.getElementById('qRetryBtn').addEventListener('click', qReset);
document.getElementById('comprarBtn').addEventListener('click', comprar);

qRender();

const ob=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');ob.unobserve(e.target);}});},{threshold:0.1});
document.querySelectorAll('.rv').forEach(el=>ob.observe(el));
