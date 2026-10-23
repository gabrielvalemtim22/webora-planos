/* Testes da Webora: valores, contrato, Pix, consistência dos dados e conferência no servidor.
   Rodar: npm test */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { PLANOS, COMPARATIVO, PROJETOS, WEBORA } = require('../assets/js/config.js');
const C = require('../assets/js/contrato.js');
const handler = require('../api/contrato.js');
const LISTA = Object.values(PLANOS);
const norm = s => s.replace(/ /g, ' ');
const read = f => readFile(path.join(ROOT, f), 'utf8');

const CLIENTE = { nome: 'Maria Teste da Silva', doc: '529.982.247-25', tel: '(11) 98888-7777', email: 'maria@example.com', cidade: 'São Paulo/SP' };

test('preços oficiais em centavos', () => {
  assert.deepEqual(LISTA.map(P => [P.id, P.centavos]), [['essencial', 59999], ['loja', 59999], ['premium', 99999]]);
  assert.deepEqual(LISTA.map(P => P.nome), ['Essencial', 'Loja Online', 'Sites de 10 Mil Profissionais']);
  LISTA.forEach(P => assert.ok(Number.isInteger(P.centavos) && P.centavos > 0, P.id));
  assert.equal(LISTA.filter(P => P.destaque).length, 1);
  assert.equal(LISTA[1].destaque, true, 'Loja Online fica no centro e em destaque');
});

test('ofertas: selo, três recursos com ícone e chamada do premium com o preço certo', async () => {
  const html = await read('index.html');
  for (const P of LISTA) {
    assert.equal(P.oferta, 'Oferta especial', P.id);
    assert.equal(P.chaves.length, 3, P.id);
    P.chaves.forEach(k => assert.ok(html.includes(`<symbol id="i-${k.icone}"`), `${P.id}: ícone ${k.icone}`));
  }
  assert.equal(norm(PLANOS.premium.chamada.replace('{preco}', C.brl(PLANOS.premium.centavos))), 'Seu projeto de alto padrão por R$ 999,99.');
});

test('50% + 50% fecha exatamente o total, com o centavo ímpar na entrada', () => {
  for (const P of LISTA) {
    const av = C.condicoes(P, 'avista');
    assert.deepEqual([av.total, av.agora, av.depois], [P.centavos, P.centavos, 0]);
    const pc = C.condicoes(P, 'parcelado');
    assert.equal(pc.agora + pc.depois, P.centavos, P.id);
    assert.ok(pc.agora - pc.depois === 0 || pc.agora - pc.depois === 1, P.id);
  }
  const par = id => { const c = C.condicoes(PLANOS[id], 'parcelado'); return [norm(C.brl(c.agora)), norm(C.brl(c.depois))]; };
  assert.deepEqual(par('essencial'), ['R$ 300,00', 'R$ 299,99']);
  assert.deepEqual(par('loja'), ['R$ 300,00', 'R$ 299,99']);
  assert.deepEqual(par('premium'), ['R$ 500,00', 'R$ 499,99']);
  assert.equal(C.condicoes({ centavos: 100000 }, 'parcelado').agora, 50000);
});

test('formatação em reais e por extenso', () => {
  assert.equal(norm(C.brl(59999)), 'R$ 599,99');
  assert.equal(norm(C.brl(159999)), 'R$ 1.599,99');
  assert.equal(C.reais(99999), '999.99');
  assert.equal(C.reais(50000), '500.00');
  assert.equal(C.extenso(99999), 'novecentos e noventa e nove reais e noventa e nove centavos');
  assert.equal(C.extenso(159999), 'mil quinhentos e noventa e nove reais e noventa e nove centavos');
  assert.equal(C.extenso(50000), 'quinhentos reais');
  assert.equal(C.extenso(100), 'um real');
  assert.equal(C.extenso(1), 'um centavo');
  assert.equal(C.porExtenso(1100), 'mil e cem');
});

test('Pix: valor exato, referência e CRC válidos', () => {
  for (const P of LISTA) for (const f of C.PAGAMENTOS) {
    const { agora } = C.condicoes(P, f);
    const p = C.pixWebora(agora, 'WB-261020-AB12');
    assert.ok(p.includes(`54${String(C.reais(agora).length).padStart(2, '0')}${C.reais(agora)}`), `${P.id} ${f}`);
    assert.ok(p.includes('WB261020AB12'));
    assert.equal(C.crc16(p.slice(0, -4)), p.slice(-4));
  }
});

test('validação de CPF, CNPJ e dados obrigatórios', () => {
  assert.ok(C.validCPF('529.982.247-25'));
  assert.ok(!C.validCPF('111.111.111-11'));
  assert.ok(C.validCNPJ(WEBORA.documento));
  assert.deepEqual(C.validar(CLIENTE), {});
  assert.deepEqual(Object.keys(C.validar({})).sort(), ['cidade', 'doc', 'email', 'nome', 'tel']);
  assert.equal(C.validar({ ...CLIENTE, doc: '123.456.789-00' }).doc, 'CPF inválido.');
  assert.equal(C.limpar({ nome: '  Ana\u0007 Lima  ', email: 'A@B.COM' }).nome, 'Ana Lima');
  assert.equal(C.limpar({ email: 'A@B.COM' }).email, 'a@b.com');
});

test('contrato usa os valores e as cláusulas certas de cada plano', () => {
  for (const P of LISTA) for (const f of C.PAGAMENTOS) {
    const b = C.build({ ...CLIENTE, plano: P.id, pagamento: f, numero: 'WB-261020-AB12', dataLonga: '20 de outubro de 2026' });
    const txt = norm(C.toText(b.blocks));
    assert.ok(txt.includes(`valor total de ${norm(C.brl(P.centavos))} (${C.extenso(P.centavos)})`), P.id);
    assert.ok(txt.includes(`ANEXO I: PLANO ${P.nome.toUpperCase()}`));
    assert.ok(txt.includes(`Rodadas de revisão: ${P.revisoes}`));
    if (f === 'parcelado') assert.ok(txt.includes(`entrada de ${norm(C.brl(b.pagamento.agora))}`) && txt.includes(`saldo de ${norm(C.brl(b.pagamento.depois))}`));
    // numeração da cláusula 2 sem saltos
    const c2 = b.blocks.filter(x => /^2\.\d+\./.test(x.text)).map(x => +x.text.match(/^2\.(\d+)/)[1]);
    assert.deepEqual(c2, c2.map((_, i) => i + 1));
    assert.equal(txt.includes('nome comercial do plano'), !!P.premium);
    assert.equal(txt.includes('provedor de pagamento'), !!(P.loja || P.premium));
    assert.ok(!/Profissional\b(?! )/.test(txt.replace('Sites de 10 Mil Profissionais', '')), 'sem o plano antigo');
  }
  const premium = norm(C.toText(C.build({ ...CLIENTE, plano: 'premium', pagamento: 'avista', numero: 'WB-261020-AB12', dataLonga: 'x' }).blocks));
  assert.ok(premium.includes('aprovação do briefing previsto na cláusula 2.4'));
  assert.ok(premium.includes('até 12 (doze) páginas'));
});

test('tabela comparativa e projetos batem com os planos', () => {
  COMPARATIVO.forEach(g => g.linhas.forEach(l => LISTA.forEach(P => assert.ok(P.id in l, `${l.item} sem ${P.id}`))));
  PROJETOS.forEach(p => assert.ok(PLANOS[p.plano], `${p.id}: plano ${p.plano}`));
  PROJETOS.forEach(p => assert.ok(['loja', 'institucional'].includes(p.categoria), `${p.id}: categoria ${p.categoria}`));
  const ids = new Set(PROJETOS.map(p => p.id));
  assert.equal(ids.size, PROJETOS.length);
});

test('prints dos projetos e do topo existem', async () => {
  const html = await read('index.html');
  const usados = [...PROJETOS.flatMap(p => [p.imagem, p.imagemCelular]), ...[...html.matchAll(/src="(\/assets\/img\/projetos\/[^"]+)"/g)].map(m => m[1])];
  for (const src of usados) await assert.doesNotReject(readFile(path.join(ROOT, src.split('?')[0])), src);
  assert.ok(html.includes(`<span data-stat="projetos">${PROJETOS.length}</span>`), 'número de projetos no topo');
});

test('textos estáticos do index.html acompanham config.js', async () => {
  const html = await read('index.html');
  const desc = html.match(/<meta name="description" content="([^"]+)"/)[1];
  const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const ofertas = ld['@graph'].find(n => n['@type'] === 'Service').hasOfferCatalog.itemListElement;
  for (const P of LISTA) {
    assert.ok(desc.includes(`${P.nome} (${norm(C.brl(P.centavos))})`), `descrição: ${P.nome}`);
    assert.ok(html.includes(`<li>${P.nome}: ${norm(C.brl(P.centavos))}</li>`), `noscript: ${P.nome}`);
    const o = ofertas.find(x => x.name === P.nome);
    assert.equal(o && o.price, C.reais(P.centavos), `JSON-LD: ${P.nome}`);
  }
  assert.ok(html.includes(`data-preco="premium">${norm(C.brl(PLANOS.premium.centavos))}<`));
  assert.ok(html.includes('<link rel="canonical" href="https://www.weborasites.com.br/">'));
});

test('identidade azul royal: sem o verde-neon, preços antigos ou urgência falsa', async () => {
  const files = ['index.html', '404.html', 'assets/css/style.css', 'assets/js/app.js', 'assets/js/config.js', 'assets/js/contrato.js', 'site.webmanifest', 'scripts/og.html'];
  for (const f of files) {
    const s = await read(f);
    assert.ok(!/#(9BFF00|B5FF45|86E000|EDFFD1|C8FF66)\b/i.test(s), `verde-neon em ${f}`);
    assert.ok(!/--neon|btn--neon|t-neon|155,\s*255,\s*0/.test(s), `token verde em ${f}`);
    assert.ok(!/R\$\s?(597|997|1\.597|1\.599)\b|valor: (597|997|1597)|1599\.99|159999/.test(s), `preço antigo em ${f}`);
    assert.ok(!/R\$\s?10\.000|de R\$\s?10/.test(s), `preço "de" sem comprovação em ${f}`);
    assert.ok(!/últimas horas|vai esgotar|nunca mais/i.test(s), `urgência falsa em ${f}`);
    assert.ok(!/webora-planos\.vercel\.app/.test(s), `domínio antigo em ${f}`);
  }
  assert.match(await read('assets/css/style.css'), /--blue: #0754FA;/);
  const img = await readdir(path.join(ROOT, 'assets/img'));
  assert.ok(!img.includes('webora-mark.webp') && !img.includes('favicon-48.png'), 'logo/ícones antigos removidos');
  const marca = await readdir(path.join(ROOT, 'assets/img/marca'));
  assert.deepEqual(marca.sort(), ['webora-logotipo-branco.webp', 'webora-logotipo-preto.webp', 'webora-logotipo.png', 'webora-simbolo.webp']);
});

/* ---------- api/contrato.js ---------- */
function call(body, { method = 'POST' } = {}) {
  return new Promise(resolve => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(b) { resolve({ status: this.statusCode, headers: this.headers, body: b ? JSON.parse(b) : null }); }
    };
    handler({ method, body }, res);
  });
}
const PEDIDO = { ...CLIENTE, plano: 'loja', pagamento: 'parcelado', numero: 'WB-261020-AB23', hash: 'A'.repeat(64) };

test('API: confere e devolve os valores oficiais', async () => {
  delete process.env.WEBORA_RECIBO_SEGREDO;
  const r = await call({ ...PEDIDO, total: 1, agora: 1, centavos: 1 });   // valores enviados pelo navegador são ignorados
  assert.equal(r.status, 200);
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.deepEqual(r.body.pagamento, { tipo: 'parcelado', total: 59999, agora: 30000, depois: 29999 });
  assert.equal(r.body.pix, C.pixWebora(30000, PEDIDO.numero));
  const premium = await call({ ...PEDIDO, plano: 'premium', pagamento: 'avista' });
  assert.deepEqual(premium.body.pagamento, { tipo: 'avista', total: 99999, agora: 99999, depois: 0 });
  assert.equal(r.body.recibo, null);
});

test('API: recibo assinado quando o segredo está configurado', async () => {
  process.env.WEBORA_RECIBO_SEGREDO = 'segredo-de-teste';
  const r = await call(PEDIDO);
  delete process.env.WEBORA_RECIBO_SEGREDO;
  assert.match(r.body.recibo, /^[0-9A-F]{4}(-[0-9A-F]{4}){4}$/);
  const dados = { numero: r.body.numero, plano: r.body.plano, pagamento: r.body.pagamento, doc: PEDIDO.doc, hash: PEDIDO.hash, conferidoEm: r.body.conferidoEm };
  assert.equal(handler.recibo(dados, 'segredo-de-teste'), r.body.recibo);
  assert.notEqual(handler.recibo({ ...dados, pagamento: { ...dados.pagamento, agora: 1 } }, 'segredo-de-teste'), r.body.recibo);
});

test('API: recusa pedidos inválidos', async () => {
  assert.equal((await call(PEDIDO, { method: 'GET' })).status, 405);
  assert.equal((await call({ ...PEDIDO, plano: 'profissional' })).status, 400);
  assert.equal((await call({ ...PEDIDO, plano: '__proto__' })).status, 400);
  assert.equal((await call({ ...PEDIDO, pagamento: 'cartao' })).status, 400);
  assert.equal((await call({ ...PEDIDO, numero: 'X' })).status, 400);
  assert.equal((await call({ ...PEDIDO, hash: 'abc' })).status, 400);
  assert.equal((await call('{nao é json')).status, 400);
  assert.equal((await call(null)).status, 400);
  const r = await call({ ...PEDIDO, doc: '111.111.111-11' });
  assert.equal(r.status, 400);
  assert.equal(r.body.erros.doc, 'CPF inválido.');
});
