/* =========================================================
   Webora — painel de contratos (/admin)
   Lista quem assinou, a empresa, o plano, os valores e o status; abre cada contrato
   com os dados do cliente, a assinatura e o histórico; muda o status; salva, imprime
   e compartilha o PDF; envia a via ao cliente pelo WhatsApp.
   A senha fica só nesta aba (sessionStorage) e vai em cada pedido a /api/admin.
   ========================================================= */
(function () {
  'use strict';
  const C = window.Contrato, Doc = window.WeboraDoc, PLANOS = window.PLANOS;
  const $ = (s, el = document) => el.querySelector(s);
  const CHAVE = 'webora-painel';
  const STATUS = { assinado: 'Assinado · aguardando Pix', entrada: 'Entrada paga', pago: 'Pago', producao: 'Em produção', entregue: 'Entregue', cancelado: 'Cancelado' };
  const sessao = {
    get: () => { try { return sessionStorage.getItem(CHAVE) || ''; } catch (e) { return ''; } },
    set: v => { try { if (v) sessionStorage.setItem(CHAVE, v); else sessionStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento: pede a senha a cada visita */ } }
  };
  let senha = sessao.get(), itens = [];

  // cria elementos; textos entram sempre como texto, nunca como HTML
  function h(tag, attrs, ...filhos) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    filhos.flat(Infinity).forEach(f => { if (f != null && f !== false) el.append(f instanceof Node ? f : document.createTextNode(String(f))); });
    return el;
  }

  async function api(acao, extra) {
    const r = await fetch('/api/admin', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${senha}` },
      body: JSON.stringify({ acao, ...extra })
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { sair(j.erro || 'Senha incorreta.'); throw new Error('401'); }
    if (!r.ok || !j.ok) throw new Error(j.erro || 'Não foi possível concluir. Tente de novo.');
    return j;
  }

  const quando = iso => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Sao_Paulo' });
  const curto = s => String(s || '').replace(' (horário de Brasília)', '');
  const zap = tel => { const d = C.digits(tel); return d.length === 10 || d.length === 11 ? '55' + d : d; };
  const chip = st => h('span', { class: `chip chip--${st}` }, STATUS[st] || st);
  const erroVisivel = ex => ex.message !== '401';

  /* ---------- entrar e sair ---------- */
  const form = $('[data-login]');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('[data-login-err]'), btn = $('button', form);
    senha = form.elements.senha.value.trim();
    if (!senha) { err.textContent = 'Digite a senha.'; return; }
    err.textContent = ''; btn.disabled = true;
    try { await carregar(); sessao.set(senha); form.reset(); } catch (ex) { if (erroVisivel(ex)) err.textContent = ex.message; } finally { btn.disabled = false; }
  });
  function sair(msg) {
    senha = ''; sessao.set(''); itens = [];
    $('[data-adm]').hidden = true; $('[data-tools]').hidden = true; form.hidden = false;
    if (det.open) det.close();
    $('[data-login-err]').textContent = msg || '';
  }
  $('[data-logout]').addEventListener('click', () => sair());
  $('[data-refresh]').addEventListener('click', () => carregar().catch(ex => { if (erroVisivel(ex)) $('[data-err]').textContent = ex.message; }));

  async function carregar() {
    const j = await api('listar');
    itens = j.itens;
    form.hidden = true; $('[data-adm]').hidden = false; $('[data-tools]').hidden = false;
    $('[data-err]').textContent = '';
    desenhar();
  }

  /* ---------- números, filtros e lista ---------- */
  const fPlano = $('[data-f-plano]'), fStatus = $('[data-f-status]'), q = $('[data-q]');
  Object.values(PLANOS).forEach(P => fPlano.append(h('option', { value: P.id }, P.nome)));
  Object.entries(STATUS).forEach(([k, t]) => fStatus.append(h('option', { value: k }, t)));
  [fPlano, fStatus].forEach(el => el.addEventListener('change', desenhar));
  q.addEventListener('input', desenhar);
  const semAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function filtrados() {
    const termo = semAcento(q.value).trim(), dig = C.digits(q.value);
    return itens.filter(r => (!fPlano.value || r.plano.id === fPlano.value) && (!fStatus.value || r.status === fStatus.value) &&
      (!termo || semAcento([r.numero, r.cliente.nome, r.cliente.empresa, r.cliente.email, r.cliente.cidade].join(' ')).includes(termo) ||
        (dig.length >= 3 && C.digits(`${r.cliente.doc} ${r.cliente.tel}`).includes(dig))));
  }

  function desenhar() {
    const ativos = itens.filter(r => r.status !== 'cancelado');
    $('[data-stat="total"]').textContent = ativos.length;
    $('[data-stat="valor"]').textContent = C.brl(ativos.reduce((s, r) => s + r.pagamento.total, 0));
    $('[data-stat="aguardando"]').textContent = itens.filter(r => r.status === 'assinado').length;
    $('[data-stat="entregues"]').textContent = itens.filter(r => r.status === 'entregue').length;
    const lista = $('[data-list]'), linhas = filtrados();
    if (!linhas.length) {
      lista.replaceChildren(h('p', { class: 'empty' }, itens.length ? 'Nenhum contrato com esses filtros.' : 'Nenhum contrato assinado ainda. Quando um cliente assinar no site, ele aparece aqui.'));
      return;
    }
    lista.replaceChildren(h('table', { class: 'tbl' },
      h('thead', null, h('tr', null, ['Cliente', 'Contrato', 'Plano', 'Valor', 'Pagamento', 'Status', 'Assinado em'].map(t => h('th', { scope: 'col' }, t)))),
      h('tbody', null, linhas.map(r => h('tr', { tabindex: '0', onclick: () => abrir(r.numero), onkeydown: e => { if (e.key === 'Enter') abrir(r.numero); } },
        h('td', { class: 'who' }, h('b', null, r.cliente.nome), h('small', null, [r.cliente.empresa, `${r.cliente.docTipo} ${C.maskDoc(r.cliente.doc)}`].filter(Boolean).join(' · '))),
        h('td', { class: 'num', 'data-label': 'Contrato' }, r.numero),
        h('td', { 'data-label': 'Plano' }, r.plano.nome),
        h('td', { class: 'val', 'data-label': 'Valor' }, C.brl(r.pagamento.total)),
        h('td', { 'data-label': 'Pagamento' }, r.pagamento.depois ? '50% + 50%' : 'À vista'),
        h('td', { 'data-label': 'Status' }, chip(r.status)),
        h('td', { 'data-label': 'Assinado em' }, quando(r.criadoEm))
      )))
    ));
  }

  /* ---------- planilha (Excel / Google Planilhas) ---------- */
  $('[data-csv]').addEventListener('click', () => {
    const cols = ['Contrato', 'Assinado em', 'Cliente', 'Empresa', 'CPF/CNPJ', 'WhatsApp', 'E-mail', 'Cidade', 'Plano', 'Pagamento', 'Valor total', 'Na assinatura', 'Na entrega', 'Status'];
    const reais = c => (c / 100).toFixed(2).replace('.', ',');
    const linhas = filtrados().map(r => [r.numero, quando(r.criadoEm), r.cliente.nome, r.cliente.empresa, C.maskDoc(r.cliente.doc), r.cliente.tel, r.cliente.email, r.cliente.cidade,
      r.plano.nome, r.pagamento.rotulo, reais(r.pagamento.total), reais(r.pagamento.agora), reais(r.pagamento.depois), STATUS[r.status]]);
    // texto que começa com = + - @ vira fórmula na planilha: entra como texto
    const cel = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
    const csv = '﻿' + [cols, ...linhas].map(l => l.map(cel).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = h('a', { href: url, download: `contratos-webora-${new Date().toISOString().slice(0, 10)}.csv` });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });

  /* ---------- contrato aberto ---------- */
  const det = $('[data-det]');
  $('[data-close]').addEventListener('click', () => det.close());
  det.addEventListener('click', e => { if (e.target === det) det.close(); });

  async function abrir(numero) {
    $('[data-d="titulo"]').textContent = numero;
    $('[data-d="sub"]').textContent = 'Carregando…';
    $('[data-d="corpo"]').replaceChildren();
    if (!det.open) det.showModal();
    try { detalhe(await api('ver', { numero })); } catch (ex) { if (erroVisivel(ex)) $('[data-d="sub"]').textContent = ex.message; }
  }

  function detalhe(j) {
    const r = j.registro, cl = r.cliente, pg = r.pagamento, numero = r.numero;
    const via = j.blocks && j.assinatura ? Doc.deRegistro(r, j.blocks, j.assinatura) : null;
    let atual = j.historico.length ? j.historico[j.historico.length - 1].status : 'assinado';
    $('[data-d="titulo"]').textContent = cl.empresa ? `${cl.nome} · ${cl.empresa}` : cl.nome;
    $('[data-d="sub"]').textContent = `Contrato ${numero} · ${r.plano.nome} · assinado em ${curto(r.assinadoEm)}`;

    const kv = pares => h('dl', { class: 'kv' }, pares.filter(([, v]) => v != null && v !== '').map(([k, v]) => [h('dt', null, k), h('dd', null, v)]));
    const link = (href, txt) => h('a', { href, target: '_blank', rel: 'noopener' }, txt);
    const err = h('p', { class: 'msg msg--err', role: 'alert' });
    // botão que mostra "Preparando…" enquanto trabalha; comJanela abre a aba da impressão no clique
    const botao = (rotulo, fn, cls = 'btn btn--light', comJanela = false) => h('button', {
      class: cls, type: 'button',
      onclick: async e => {
        const b = e.currentTarget, antes = b.textContent, janela = comJanela ? Doc.abrirJanela() : null;
        err.textContent = ''; b.disabled = true; b.textContent = 'Preparando…';
        try { await fn(janela); } catch (ex) { if (janela) janela.close(); if (erroVisivel(ex)) err.textContent = ex.message || 'Não foi possível concluir.'; }
        finally { b.disabled = false; b.textContent = antes; }
      }
    }, rotulo);

    // envio da via ao cliente pelo WhatsApp: mensagem pronta com o link do contrato assinado
    const mensagem = [
      `Olá, ${cl.nome.split(' ')[0]}! Aqui é da Webora.`,
      `Segue a sua via do contrato ${numero} (${r.plano.nome}), assinado em ${curto(r.assinadoEm)}.`,
      j.via ? `Pelo link você pode ver, imprimir e salvar o PDF:\n${j.via}` : 'O PDF do contrato vai em anexo.',
      '', 'Qualquer dúvida, é só chamar por aqui.'
    ].join('\n');
    const whats = h('a', { class: 'btn btn--primary', href: `https://wa.me/${zap(cl.tel)}?text=${encodeURIComponent(mensagem)}`, target: '_blank', rel: 'noopener' }, 'Enviar via pelo WhatsApp');

    const sel = h('select', { 'aria-label': 'Status do contrato' }, Object.entries(STATUS).map(([k, t]) => h('option', { value: k, selected: k === atual }, t)));
    const nota = h('input', { type: 'text', maxlength: '500', placeholder: 'Ex.: Pix da entrada recebido', 'aria-label': 'Observação da mudança' });
    const hist = h('ol', { class: 'hist' });
    const itemHist = it => h('li', null, chip(it.status), h('small', null, quando(it.em)), it.nota || null);
    hist.replaceChildren(h('li', null, chip('assinado'), h('small', null, quando(r.criadoEm)), 'Contrato assinado no site'), ...j.historico.map(itemHist));

    const corpo = $('[data-d="corpo"]');
    corpo.replaceChildren(
      h('div', { class: 'card' }, h('h3', null, 'Enviar e guardar a via'),
        h('div', { class: 'acts' },
          whats,
          via ? botao('Salvar PDF', () => Doc.salvar(via)) : null,
          via ? botao('Imprimir', w => Doc.imprimir(via, w), 'btn btn--light', true) : null,
          via && Doc.podeCompartilhar() ? botao('Compartilhar PDF', () => Doc.compartilhar(via, mensagem)) : null,
          j.via ? botao('Copiar link da via', async () => { await navigator.clipboard.writeText(j.via); err.textContent = 'Link copiado.'; }) : null
        ),
        j.via ? null : h('p', { class: 'msg' }, 'O link da via não está configurado (WEBORA_LINK_SEGREDO). Envie o PDF pelo WhatsApp.'),
        err),
      h('div', { class: 'card' }, h('h3', null, 'Status'),
        h('div', { class: 'status-form' },
          h('label', { class: 'fld' }, 'Situação', sel),
          h('label', { class: 'fld' }, 'Observação (opcional)', nota),
          botao('Salvar status', async () => {
            const res = await api('status', { numero, status: sel.value, nota: nota.value });
            atual = res.item.status;
            hist.append(itemHist(res.item));
            nota.value = '';
            const it = itens.find(x => x.numero === numero);
            if (it) { it.status = atual; it.statusEm = res.item.em; desenhar(); }
          }, 'btn btn--primary')),
        hist),
      h('div', { class: 'card' }, h('h3', null, 'Cliente'), kv([
        ['Nome', cl.nome], ['Empresa', cl.empresa], [cl.docTipo, C.maskDoc(cl.doc)],
        ['WhatsApp', link(`https://wa.me/${zap(cl.tel)}`, cl.tel)], ['E-mail', link(`mailto:${cl.email}`, cl.email)],
        ['Cidade', cl.cidade], ['Endereço', cl.endereco], ['Domínio pretendido', cl.dominio], ['Observações', cl.obs]
      ])),
      h('div', { class: 'card' }, h('h3', null, 'Contrato'), kv([
        ['Número', numero], ['Plano', r.plano.nome], ['Valor total', C.brl(pg.total)], ['Pagamento', pg.rotulo],
        ['Na assinatura', C.brl(pg.agora)], ['Na entrega', C.brl(pg.depois)],
        ['Assinado em', r.assinadoEm], ['Código de verificação', r.codigo],
        ['Texto assinado', r.integridade ? h('span', { class: 'ok-tag' }, 'Conferido pelo servidor (SHA-256 igual)') : h('span', { class: 'warn-tag' }, 'Não conferido: confira o PDF com o cliente')],
        ['Recibo do servidor', r.recibo], ['Modelo do contrato', `versão ${r.modelo}`],
        ['IP de quem assinou', r.origem && r.origem.ip], ['Navegador', r.origem && r.origem.agente]
      ])),
      j.assinatura ? h('div', { class: 'card sigbox' }, h('h3', null, 'Assinatura'), h('img', { src: j.assinatura, alt: `Assinatura de ${cl.nome}` }), h('small', null, `${cl.nome} · ${cl.docTipo} ${C.maskDoc(cl.doc)}`)) : null,
      h('div', { class: 'acts' }, botao('Excluir contrato', async () => {
        if (!confirm(`Excluir o contrato ${numero} de ${cl.nome}? Isso apaga o contrato e a assinatura do painel e não pode ser desfeito.`)) return;
        await api('excluir', { numero });
        itens = itens.filter(x => x.numero !== numero);
        det.close();
        desenhar();
      }, 'btn btn--danger'))
    );
  }

  if (senha) carregar().catch(ex => { if (erroVisivel(ex)) sair(ex.message); });
})();
