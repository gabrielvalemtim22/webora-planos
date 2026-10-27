/* =========================================================
   Webora — via do contrato assinado (/contrato?n=…&k=…)
   O cliente vê o contrato, imprime, salva o PDF no celular ou no computador
   e compartilha. Os dados vêm de /api/via, que só abre com a chave do link.
   ========================================================= */
(function () {
  'use strict';
  const C = window.Contrato, Doc = window.WeboraDoc;
  const $ = s => document.querySelector(s);
  const status = $('[data-status]'), err = $('[data-err]');
  const v = (k, txt) => { const el = $(`[data-v="${k}"]`); if (el) el.textContent = txt; };
  let via = null;

  async function abrir() {
    const q = new URLSearchParams(location.search);
    try {
      const r = await fetch(`/api/via?n=${encodeURIComponent(q.get('n') || '')}&k=${encodeURIComponent(q.get('k') || '')}`, { cache: 'no-store' });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { status.textContent = j.erro || 'Não foi possível abrir o contrato.'; return; }
      mostrar(j);
    } catch (e) {
      status.textContent = 'Sem conexão. Verifique a internet e tente de novo.';
    }
  }

  function mostrar(j) {
    const r = j.registro, cl = r.cliente || {}, pg = r.pagamento;
    via = Doc.deRegistro(r, j.blocks, j.assinatura);
    document.title = `Contrato ${r.numero} | Webora`;
    v('titulo', `Contrato ${r.numero}`);
    v('meta', `Assinado em ${r.assinadoEm}`);
    const facts = $('[data-facts]');
    [
      ['Contratante', cl.empresa ? `${cl.nome} · ${cl.empresa}` : cl.nome],
      ['Plano', r.plano.nome],
      ['Valor total', C.brl(pg.total)],
      ['Pagamento', pg.depois ? `${C.brl(pg.agora)} na assinatura + ${C.brl(pg.depois)} na entrega` : `${C.brl(pg.total)} à vista`],
      ['Código de verificação', r.codigo]
    ].forEach(([dt, dd]) => {
      const d = document.createElement('div'), a = document.createElement('dt'), b = document.createElement('dd');
      a.textContent = dt; b.textContent = dd; d.append(a, b); facts.append(d);
    });
    C.renderHTML($('[data-paper]'), j.blocks);
    const sig = new Image(); sig.src = j.assinatura; sig.alt = 'Assinatura da contratante';
    $('[data-sig]').replaceWith(sig);
    v('assinante', `${cl.nome} · ${cl.docTipo} ${C.maskDoc(cl.doc)} · CONTRATANTE`);
    v('registro', `Assinado eletronicamente em ${r.assinadoEm}. Código de verificação (SHA-256): ${r.hash}`);
    $('[data-act="compartilhar"]').hidden = !Doc.podeCompartilhar();
    status.hidden = true;
    $('[data-via]').hidden = false;
  }

  const ACOES = {
    salvar: () => Doc.salvar(via),
    imprimir: janela => Doc.imprimir(via, janela),
    compartilhar: () => Doc.compartilhar(via)
  };
  document.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', async () => {
    if (!via) return;
    const acao = btn.dataset.act;
    const janela = acao === 'imprimir' ? Doc.abrirJanela() : null;   // a aba precisa nascer do clique
    const antes = btn.textContent;
    err.textContent = '';
    btn.disabled = true; btn.textContent = 'Preparando…';
    try { await ACOES[acao](janela); } catch (e) {
      if (janela) janela.close();
      err.textContent = 'Não foi possível gerar o PDF. Verifique a conexão e tente de novo.';
      console.error(e);
    } finally { btn.disabled = false; btn.textContent = antes; }
  }));

  abrir();
})();
