/* =========================================================
   Webora — via do contrato assinado: PDF, salvar, imprimir e compartilhar
   Usado na contratação (app.js), na via do cliente (/contrato) e no painel (/admin).
   jsPDF e qrcode-generator vêm do cdnjs, com SRI, só quando forem usados.
   Depende de config.js e contrato.js (window.Contrato).
   ========================================================= */
(function () {
  'use strict';
  const C = window.Contrato;

  const LIBS = [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', sri: 'sha384-mZT2gIty7ZDdOGkxfP6joZcYdMW1Jvj9dRlfpTmaJAKKXTqzygtB22k7FLe+KZC1', ok: () => typeof window.qrcode === 'function' },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', sri: 'sha384-JcnsjUPPylna1s1fvi1u12X5qjY5OL56iySh75FdtrwhO/SWXgMjoVqcKyIIWOLk', ok: () => !!(window.jspdf && window.jspdf.jsPDF) }
  ];
  let libsP = null, logoP = null;
  function carregar() {
    if (!libsP) {
      libsP = Promise.all(LIBS.map(l => l.ok() ? null : new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = l.src; s.async = true; s.integrity = l.sri; s.crossOrigin = 'anonymous'; s.referrerPolicy = 'no-referrer';
        s.onload = res; s.onerror = () => { s.remove(); rej(new Error(`Falha ao carregar ${l.src}`)); };
        document.head.append(s);
      }))).catch(e => { libsP = null; throw e; });
    }
    return libsP;
  }
  const logo = () => logoP || (logoP = fetch('/assets/img/marca/webora-logotipo.png?v=6')
    .then(r => (r.ok ? r.blob() : Promise.reject(new Error('logo'))))
    .then(b => new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(b); }))
    .then(async data => { const img = new Image(); img.src = data; await img.decode(); return { data, ratio: img.naturalWidth / img.naturalHeight }; })
    .catch(() => { logoP = null; return null; }));

  // QR Code do Pix em PNG (precisa de carregar() antes)
  function qr(text) {
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    const n = q.getModuleCount(), cell = 8, quiet = 2, size = (n + quiet * 2) * cell;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.fillStyle = '#080808';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
    return cv.toDataURL('image/png');
  }

  // contrato guardado no servidor → o mesmo formato da contratação no navegador
  function deRegistro(registro, blocks, assinatura) {
    const cl = registro.cliente || {};
    return {
      numero: registro.numero, nome: cl.nome, doc: cl.doc, docTipo: cl.docTipo,
      plano: registro.plano, pagamento: registro.pagamento, blocks, assinatura,
      assinadoEm: registro.assinadoEm, hash: registro.hash, codigo: registro.codigo,
      servidor: { conferidoEm: registro.criadoEm, recibo: registro.recibo }
    };
  }

  async function gerar(s) {
    const [, lg] = await Promise.all([carregar(), logo()]);
    const pix = s.pix || C.pixWebora(s.pagamento.agora, s.numero);
    return C.pdf({
      ...s, pix, qr: s.qr || qr(pix), logo: lg,
      servidor: s.servidor && s.servidor.conferidoEm ? { ...s.servidor, conferidoEmTexto: C.dataHora(new Date(s.servidor.conferidoEm)) } : null
    });
  }

  const nome = s => `Contrato-Webora-${s.numero}.pdf`;
  const celular = () => matchMedia('(pointer: coarse)').matches;
  const arquivo = (doc, s) => new File([doc.output('blob')], nome(s), { type: 'application/pdf' });
  function podeCompartilhar() {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(['%PDF'], 'x.pdf', { type: 'application/pdf' })] })); } catch (e) { return false; }
  }

  // salvar no celular ou no computador
  async function salvar(s) { (await gerar(s)).save(nome(s)); }

  // compartilhar o PDF (WhatsApp, e-mail, Drive…); sem suporte, baixa o arquivo
  async function compartilhar(s, texto) {
    const doc = await gerar(s);
    if (podeCompartilhar()) {
      try { await navigator.share({ files: [arquivo(doc, s)], title: `Contrato Webora ${s.numero}`, text: texto || `Contrato ${s.numero} assinado com a Webora.` }); return 'compartilhado'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
    }
    doc.save(nome(s));
    return 'baixado';
  }

  // imprimir: no computador abre o PDF numa aba já com a janela de impressão;
  // no celular, o compartilhamento do sistema tem a opção "Imprimir".
  // Chame abrirJanela() no clique, antes de qualquer await, para o navegador não bloquear a aba.
  const abrirJanela = () => (celular() && podeCompartilhar() ? null : window.open('', '_blank'));
  async function imprimir(s, janela) {
    if (!janela && celular() && podeCompartilhar()) return compartilhar(s);
    const doc = await gerar(s);
    doc.autoPrint();
    const url = URL.createObjectURL(doc.output('blob'));
    if (janela && !janela.closed) { janela.location.href = url; return 'impressao'; }
    if (window.open(url, '_blank')) return 'impressao';
    doc.save(nome(s));
    return 'baixado';
  }

  window.WeboraDoc = { carregar, qr, deRegistro, gerar, salvar, compartilhar, imprimir, abrirJanela, podeCompartilhar };
})();
