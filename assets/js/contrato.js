/* =========================================================
   Webora — contrato, valores, validação, Pix e PDF
   Funciona no navegador (window.Contrato) e no servidor (require),
   para que a conferência em api/contrato.js use exatamente as mesmas regras.
   Valores sempre em CENTAVOS (inteiros).
   ========================================================= */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./config.js'));
  else root.Contrato = factory(root);
})(typeof self !== 'undefined' ? self : this, function (D) {
  'use strict';
  const W = D.WEBORA, PLANOS = D.PLANOS;

  /* ---------- dinheiro ---------- */
  const FMT = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  const brl = c => FMT.format(c / 100);
  const reais = c => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;   // "999.99" (Pix)
  const dias = n => `${n} ${n === 1 ? 'dia útil' : 'dias úteis'}`;

  /* ---------- por extenso ---------- */
  const U = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const DZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const CT = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function ate999(n) {
    if (n === 100) return 'cem';
    const p = [], h = Math.floor(n / 100), r = n % 100;
    if (h) p.push(CT[h]);
    if (r) p.push(r < 20 ? U[r] : (r % 10 ? DZ[Math.floor(r / 10)] + ' e ' + U[r % 10] : DZ[r / 10]));
    return p.join(' e ');
  }
  function porExtenso(n) {                 // inteiros de 0 a 999.999
    if (!n) return 'zero';
    const mil = Math.floor(n / 1000), resto = n % 1000, p = [];
    if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
    if (resto) p.push(ate999(resto));
    return p.join(mil && resto && (resto < 100 || resto % 100 === 0) ? ' e ' : ' ');
  }
  function extenso(c) {                    // centavos → "novecentos e noventa e nove reais e noventa e nove centavos"
    const r = Math.floor(c / 100), ct = c % 100;
    let txt = r ? porExtenso(r) + (r === 1 ? ' real' : ' reais') : '';
    if (ct) txt += (txt ? ' e ' : '') + porExtenso(ct) + (ct === 1 ? ' centavo' : ' centavos');
    return txt || 'zero reais';
  }
  const feminino = s => s.replace(/^um$/, 'uma').replace(/^dois$/, 'duas');

  /* ---------- documentos e contato ---------- */
  const digits = s => String(s == null ? '' : s).replace(/\D/g, '');
  function validCPF(s) {
    s = digits(s);
    if (s.length !== 11 || /^(\d)\1+$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += +s[i] * (10 - i);
    if ((sum * 10) % 11 % 10 !== +s[9]) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += +s[i] * (11 - i);
    return (sum * 10) % 11 % 10 === +s[10];
  }
  function validCNPJ(s) {
    s = digits(s);
    if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false;
    const calc = n => {
      const w = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      let sum = 0;
      for (let i = 0; i < n; i++) sum += +s[i] * w[i];
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +s[12] && calc(13) === +s[13];
  }
  function maskDoc(v) {
    const s = digits(v).slice(0, 14);
    if (s.length <= 11) return s.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    return s.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  }
  function maskPhone(v) {
    const s = digits(v).slice(0, 11);
    if (s.length <= 2) return s.length ? '(' + s : '';
    if (s.length <= 6) return `(${s.slice(0, 2)}) ${s.slice(2)}`;
    if (s.length <= 10) return `(${s.slice(0, 2)}) ${s.slice(2, 6)}-${s.slice(6)}`;
    return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
  }

  /* ---------- dados do cliente: limpeza e validação (navegador e servidor) ---------- */
  const LIMITES = { nome: 120, doc: 18, tel: 15, email: 120, cidade: 80, empresa: 120, dominio: 80, endereco: 160, obs: 800 };
  const CAMPOS = Object.keys(LIMITES);
  const PAGAMENTOS = ['avista', 'parcelado'];
  function limpar(d) {
    const o = {};
    CAMPOS.forEach(k => { o[k] = String(d && d[k] != null ? d[k] : '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, LIMITES[k]); });
    o.email = o.email.toLowerCase();
    return o;
  }
  const REGRAS = {
    nome: v => v.split(/\s+/).length >= 2 && v.length >= 5 ? '' : 'Informe seu nome completo.',
    doc: v => { const n = digits(v).length; return n === 11 ? (validCPF(v) ? '' : 'CPF inválido.') : n === 14 ? (validCNPJ(v) ? '' : 'CNPJ inválido.') : 'Informe um CPF ou CNPJ.'; },
    tel: v => { const n = digits(v).length; return n >= 10 && n <= 11 ? '' : 'Informe um WhatsApp com DDD.'; },
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Informe um e-mail válido.',
    cidade: v => v.length >= 3 ? '' : 'Informe sua cidade e estado.'
  };
  function validar(d) {
    const erros = {};
    Object.keys(REGRAS).forEach(k => { const m = REGRAS[k](String(d[k] == null ? '' : d[k]).trim()); if (m) erros[k] = m; });
    return erros;
  }

  /* ---------- condições de pagamento ---------- */
  // 50% + 50%: quando o total tem centavo ímpar, a entrada fica com o centavo a mais
  // (R$ 999,99 → R$ 500,00 + R$ 499,99) e a soma fecha sempre no total exato.
  function condicoes(plano, pagamento) {
    const total = plano.centavos;
    if (pagamento === 'parcelado') {
      const agora = Math.ceil(total / 2);
      return { tipo: 'parcelado', total, agora, depois: total - agora, rotulo: '50% de entrada + 50% na entrega (Pix)' };
    }
    return { tipo: 'avista', total, agora: total, depois: 0, rotulo: 'À vista no Pix (valor total)' };
  }

  /* ---------- Pix (BR Code estático) ---------- */
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function pixPayload({ chave, nome, cidade, centavos, txid }) {
    const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const conta = f('00', 'br.gov.bcb.pix') + f('01', chave);
    const ref = (txid || '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***';
    const p = f('00', '01') + f('26', conta) + f('52', '0000') + f('53', '986') +
      (centavos ? f('54', reais(centavos)) : '') + f('58', 'BR') + f('59', nome.slice(0, 25)) +
      f('60', cidade.slice(0, 15)) + f('62', f('05', ref)) + '6304';
    return p + crc16(p);
  }
  const pixWebora = (centavos, txid) => pixPayload({ chave: W.pix.chave, nome: W.pix.nome, cidade: W.pix.cidade, centavos, txid });

  /* ---------- datas, número, hash ---------- */
  const TZ = 'America/Sao_Paulo';
  const dataLonga = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
  const dataHora = d => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: TZ }) + ' (horário de Brasília)';
  const NUMERO = /^WB-\d{6}-[A-HJ-NP-Z2-9]{4}$/;
  function numeroContrato(d = new Date()) {
    const p = d.toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, '').slice(2);
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    crypto.getRandomValues(new Uint8Array(4)).forEach(n => { r += abc[n % abc.length]; });
    return `WB-${p}-${r}`;
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  // Texto que o servidor assina (HMAC) no recibo da conferência. Use o mesmo para verificar um recibo.
  const reciboCanonico = r => [r.numero, r.plano, r.pagamento.tipo, r.pagamento.total, r.pagamento.agora, r.pagamento.depois, digits(r.doc), r.hash, r.conferidoEm].join('|');

  /* ---------- texto do contrato ---------- */
  // Blocos: title | meta | h | p | li
  function build(d) {
    const P = PLANOS[d.plano];
    const pg = condicoes(P, d.pagamento);
    const docTipo = digits(d.doc).length === 14 ? 'CNPJ' : 'CPF';
    const B = [];
    const t = (type, text) => B.push({ t: type, text });
    const prazoMax = P.prazoMax > P.prazo ? P.prazoMax : 0;

    t('title', 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CRIAÇÃO DE SITE');
    t('meta', `Contrato nº ${d.numero} · Plano ${P.nome} · Modelo versão ${W.versaoContrato} · ${d.dataLonga}`);

    t('h', '1. PARTES');
    t('p', `1.1. CONTRATADA: ${W.responsavel}, ${W.tipo}, nome fantasia ${W.marca}, inscrita no CNPJ sob o nº ${W.documento}, com endereço em ${W.endereco}, WhatsApp ${W.whatsappFormatado}.`);
    t('p', `1.2. CONTRATANTE: ${d.nome}, inscrito(a) no ${docTipo} sob o nº ${maskDoc(d.doc)}` +
      (d.empresa ? `, responsável pelo negócio "${d.empresa}"` : '') +
      (d.endereco ? `, com endereço em ${d.endereco}, ${d.cidade}` : `, domiciliado(a) em ${d.cidade}`) +
      `, e-mail ${d.email}, WhatsApp ${maskPhone(d.tel)}.`);

    t('h', '2. OBJETO');
    let c2 = 1, clBriefing = '';
    t('p', `2.${c2++}. Este contrato tem por objeto a criação de 1 (um) site pela CONTRATADA para a CONTRATANTE, no plano ${P.nome}, conforme as entregas descritas no Anexo I, que faz parte deste contrato.`);
    t('p', `2.${c2++}. Serviços não descritos no Anexo I não estão incluídos e, se solicitados, serão orçados à parte.`);
    if (P.premium) {
      t('p', `2.${c2++}. O nome comercial do plano "${P.nome}" se refere ao padrão visual e técnico do site entregue, e não ao seu preço. O valor efetivamente cobrado é o informado na cláusula 3.1.`);
      clBriefing = `2.${c2}`;
      t('p', `2.${c2++}. O mapa de páginas e as funcionalidades específicas do projeto, como o painel administrativo, serão definidos no briefing, registrado por escrito (WhatsApp ou e-mail) e aprovado pelas partes antes do início do desenvolvimento, respeitados os limites do Anexo I.`);
    }
    if (P.loja || P.premium) {
      t('p', `2.${c2++}. ${P.loja ? 'Para receber pagamentos online' : 'Quando o projeto incluir pagamentos online'}, a CONTRATANTE deverá criar e manter, em seu nome, conta em um provedor de pagamento (por exemplo, Mercado Pago). Os valores das vendas são creditados diretamente nessa conta, e as taxas do provedor são de responsabilidade da CONTRATANTE.`);
    }

    t('h', '3. VALOR E CONDIÇÕES DE PAGAMENTO');
    t('p', `3.1. Pela criação do site, a CONTRATANTE pagará à CONTRATADA o valor total de ${brl(pg.total)} (${extenso(pg.total)}), em pagamento único.`);
    if (pg.tipo === 'parcelado') {
      t('p', `3.2. Condição escolhida: entrada de ${brl(pg.agora)} (${extenso(pg.agora)}) via Pix na assinatura deste contrato e saldo de ${brl(pg.depois)} (${extenso(pg.depois)}) via Pix na entrega do site, antes da publicação no domínio definitivo. A soma da entrada e do saldo corresponde exatamente ao valor total da cláusula 3.1.`);
    } else {
      t('p', `3.2. Condição escolhida: pagamento do valor total de ${brl(pg.total)} via Pix na assinatura deste contrato.`);
    }
    t('p', `3.3. Dados para pagamento: Pix com chave ${W.pix.tipo} ${W.pix.chaveFormatada}, em nome de ${W.responsavel} (${W.marca}). Sempre que o banco permitir, informe o nº deste contrato (${d.numero}) na mensagem do Pix.`);
    t('p', '3.4. O início dos serviços depende da confirmação do recebimento do pagamento (ou da entrada) pela CONTRATADA.');
    t('p', '3.5. Não estão incluídos custos de terceiros, como renovação do domínio após o período incluído, taxas de provedores de pagamento, anúncios pagos, ferramentas pagas e planos pagos de hospedagem, salvo quando expressamente previstos no Anexo I.');

    t('h', '4. PRAZO DE ENTREGA');
    let c4 = 1;
    t('p', `4.${c4++}. O site será entregue em até ${P.prazo} (${porExtenso(P.prazo)}) ${P.prazo === 1 ? 'dia útil, contado' : 'dias úteis, contados'} a partir do último dos seguintes eventos: (a) confirmação do pagamento ou da entrada; (b) recebimento de todo o material necessário, como logotipo, textos, fotos e informações de contato${P.loja ? ' e, para a loja virtual, a lista de produtos com fotos, descrições e preços' : ''}${clBriefing ? `; (c) aprovação do briefing previsto na cláusula ${clBriefing}` : ''}.`);
    if (prazoMax) t('p', `4.${c4++}. Em períodos de alta demanda ou em caso de problemas técnicos, o prazo da cláusula 4.1 poderá ser de até ${prazoMax} (${porExtenso(prazoMax)}) dias úteis, contados da mesma forma, e a CONTRATADA avisará a CONTRATANTE pelo WhatsApp.`);
    t('p', `4.${c4++}. Atrasos no envio de material, de informações ou de aprovações pela CONTRATANTE prorrogam o prazo pelo mesmo período.`);
    t('p', `4.${c4++}. Antes da publicação final, a CONTRATADA apresentará uma versão do site para aprovação da CONTRATANTE.`);

    t('h', '5. REVISÕES');
    t('p', `5.1. Estão incluídas ${P.revisoes} (${feminino(porExtenso(P.revisoes))}) rodadas de revisão sobre a versão apresentada. Cada rodada corresponde a uma lista única de ajustes enviada pela CONTRATANTE.`);
    t('p', '5.2. Alterações que mudem o escopo contratado, como novas páginas, novas funcionalidades ou a troca completa do layout após a aprovação, serão orçadas à parte.');

    t('h', '6. OBRIGAÇÕES DA CONTRATADA');
    t('p', '6.1. Criar e publicar o site conforme o Anexo I, com layout adaptado para celular, tablet e computador.');
    t('p', '6.2. Manter sigilo sobre as informações da CONTRATANTE a que tiver acesso.');
    t('p', '6.3. Prestar o suporte previsto na cláusula 9.');
    t('p', '6.4. Entregar à CONTRATANTE os acessos ao domínio e ao site após a quitação integral.');

    t('h', '7. OBRIGAÇÕES DA CONTRATANTE');
    t('p', '7.1. Efetuar os pagamentos nas condições acordadas.');
    t('p', '7.2. Fornecer material e informações verdadeiras, completas e dentro dos prazos.');
    t('p', '7.3. Garantir que possui os direitos de uso das marcas, textos, fotos e demais conteúdos enviados, respondendo por eles.');
    t('p', '7.4. Manter seus dados de contato atualizados.');

    t('h', '8. DOMÍNIO E HOSPEDAGEM');
    t('p', '8.1. Está incluído o registro de 1 (um) domínio .com.br (ou .com) por 1 (um) ano, em nome da CONTRATANTE, sujeito à disponibilidade do nome escolhido no momento do registro' + (d.dominio ? `. Sugestão informada pela CONTRATANTE: ${d.dominio}.` : '.'));
    t('p', '8.2. A renovação do domínio após o primeiro ano é de responsabilidade da CONTRATANTE.');
    t('p', '8.3. O site será publicado em hospedagem em nuvem sem mensalidade para a CONTRATANTE, enquanto o uso permanecer dentro dos limites do plano gratuito do provedor. Se o volume de acessos ou os recursos exigirem um plano pago, os custos serão informados previamente e ficarão a cargo da CONTRATANTE.');

    t('h', '9. SUPORTE E MANUTENÇÃO');
    t('p', `9.1. A CONTRATADA prestará suporte por ${P.suporte} (${porExtenso(P.suporte)}) dias corridos após a entrega, para correção de falhas e pequenos ajustes de texto e imagem${P.suportePrioritario ? ', com atendimento prioritário' : ''}.`);
    t('p', '9.2. Após esse período, manutenções e alterações serão orçadas à parte.');

    t('h', '10. PROPRIEDADE E PORTFÓLIO');
    t('p', '10.1. Após a quitação integral, o site entregue e seus conteúdos pertencem à CONTRATANTE.');
    t('p', '10.2. A CONTRATADA poderá exibir o site em seu portfólio e redes sociais, salvo manifestação contrária da CONTRATANTE por escrito.');

    t('h', '11. CANCELAMENTO');
    t('p', '11.1. Quando aplicável o art. 49 do Código de Defesa do Consumidor, a CONTRATANTE poderá desistir deste contrato em até 7 (sete) dias da assinatura, com devolução integral dos valores pagos.');
    t('p', '11.2. Fora dessa hipótese, se o cancelamento ocorrer antes do início do projeto, os valores pagos serão devolvidos, descontados os custos já assumidos com terceiros, como o registro do domínio. Após o início do projeto, os valores correspondentes ao trabalho já executado não serão devolvidos.');
    t('p', '11.3. Qualquer das partes poderá rescindir este contrato em caso de descumprimento pela outra parte, mediante aviso por escrito.');

    t('h', '12. DADOS PESSOAIS');
    t('p', '12.1. A CONTRATADA tratará os dados pessoais da CONTRATANTE apenas para executar este contrato e cumprir obrigações legais, nos termos da Lei nº 13.709/2018 (LGPD).');

    t('h', '13. ASSINATURA ELETRÔNICA');
    t('p', '13.1. As partes admitem a assinatura deste contrato por meio eletrônico, nos termos do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. O registro da assinatura, com data, hora e código de verificação, acompanha este documento.');
    t('p', '13.2. A assinatura deste contrato não confirma o pagamento.');

    t('h', '14. FORO');
    t('p', `14.1. Fica eleito o foro da comarca de ${W.foro}, ressalvado o direito da CONTRATANTE consumidora de propor ação no foro de seu domicílio.`);
    t('p', `E, por estarem de acordo, as partes assinam eletronicamente este contrato. São Paulo, ${d.dataLonga}.`);

    t('h', `ANEXO I: PLANO ${P.nome.toUpperCase()}`);
    t('p', `Valor de criação: ${brl(P.centavos)}. Condição de pagamento: ${pg.rotulo}` + (pg.depois ? ` (${brl(pg.agora)} na assinatura e ${brl(pg.depois)} na entrega).` : '.'));
    t('p', P.resumo);
    t('p', 'Entregas:');
    P.entregas.forEach(e => t('li', e));
    t('p', 'Não inclui:');
    P.naoInclui.forEach(e => t('li', e));
    t('p', 'Escopo:');
    t('li', `Estrutura: ${P.paginas}`);
    t('li', `Rodadas de revisão: ${P.revisoes}`);
    t('li', `Prazo de entrega: até ${dias(P.prazo)}${prazoMax ? `, ou até ${dias(prazoMax)} em períodos de alta demanda ou em caso de problemas técnicos` : ''}`);
    t('li', `Suporte após a entrega: ${P.suporte} dias${P.suportePrioritario ? ', prioritário' : ''}`);
    t('li', 'Domínio: 1 ano incluído');
    t('li', 'Hospedagem: em nuvem, sem mensalidade dentro dos limites do plano gratuito do provedor');
    if (d.obs) { t('p', 'Observações da CONTRATANTE sobre o projeto:'); t('p', d.obs); }

    return { blocks: B, plano: P, pagamento: pg, docTipo };
  }

  const toText = blocks => blocks.map(b => (b.t === 'li' ? '- ' : '') + b.text).join('\n');

  function renderHTML(el, blocks) {
    el.replaceChildren();
    let ul = null;
    blocks.forEach(b => {
      if (b.t !== 'li') ul = null;
      let node;
      if (b.t === 'title') node = document.createElement('h3');
      else if (b.t === 'meta') { node = document.createElement('p'); node.className = 'paper__meta'; }
      else if (b.t === 'h') node = document.createElement('h4');
      else if (b.t === 'li') {
        if (!ul) { ul = document.createElement('ul'); el.append(ul); }
        node = document.createElement('li'); node.textContent = b.text; ul.append(node); return;
      } else node = document.createElement('p');
      node.textContent = b.text;
      el.append(node);
    });
  }

  /* ---------- PDF (jsPDF, carregado só na hora de gerar) ---------- */
  function pdf(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const M = 20, PW = 210, PH = 297, CW = PW - 2 * M;
    const INK = [17, 18, 20], MUTED = [104, 110, 122], LINE = [226, 229, 234], NEON = [155, 255, 0];
    const clean = s => String(s).replace(/[  ]/g, ' ').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[•✦✓→]/g, '-');
    let y = M + 12;
    const head = () => {
      doc.setFillColor(8, 8, 8); doc.rect(0, 0, PW, 16, 'F');
      doc.setFillColor(...NEON); doc.rect(0, 16, PW, 0.9, 'F');
      if (c.logo) doc.addImage(c.logo.data, 'PNG', M, 5, 6 * c.logo.ratio, 6);
      else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
        doc.setTextColor(255, 255, 255); doc.text('web', M, 10.6);
        doc.setTextColor(...NEON); doc.text('ora', M + doc.getTextWidth('web'), 10.6);
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(200, 203, 209);
      doc.text(clean(`Contrato nº ${c.numero}`), PW - M, 9.8, { align: 'right' });
      doc.setTextColor(...INK);
    };
    const room = h => { if (y + h > PH - M - 4) { doc.addPage(); head(); y = M + 12; } };
    head();
    c.blocks.forEach(b => {
      if (b.t === 'title') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        const lines = doc.splitTextToSize(clean(b.text), CW); room(lines.length * 6 + 2);
        doc.text(lines, PW / 2, y, { align: 'center' }); y += lines.length * 6 + 1;
      } else if (b.t === 'meta') {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        const lines = doc.splitTextToSize(clean(b.text), CW); room(lines.length * 4.2 + 4);
        doc.text(lines, PW / 2, y, { align: 'center' }); y += lines.length * 4.2 + 5; doc.setTextColor(...INK);
      } else if (b.t === 'h') {
        room(14); y += 2.5;
        doc.setFillColor(...NEON); doc.rect(M, y - 3.1, 1.1, 3.9, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(clean(b.text), M + 3.4, y); y += 5.5;
      } else if (b.t === 'li') {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3);
        const lines = doc.splitTextToSize(clean(b.text), CW - 6); room(lines.length * 4.4 + 1);
        doc.text('-', M + 1.5, y); doc.text(lines, M + 6, y); y += lines.length * 4.4 + 1;
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9.3);
        const lines = doc.splitTextToSize(clean(b.text), CW); room(lines.length * 4.4 + 2);
        doc.text(lines, M, y); y += lines.length * 4.4 + 2.2;
      }
    });

    // Pix
    if (c.qr) {
      room(62); y += 4;
      doc.setDrawColor(...LINE); doc.roundedRect(M, y, CW, 56, 3, 3);
      doc.addImage(c.qr, 'PNG', M + 4, y + 4, 48, 48);
      doc.setFillColor(...NEON); doc.rect(M + 58, y + 7, 1.1, 3.9, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PAGAMENTO VIA PIX', M + 61.4, y + 10);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const info = [
        `Valor a pagar agora: ${clean(brl(c.pagamento.agora))}`,
        c.pagamento.depois ? `Saldo na entrega: ${clean(brl(c.pagamento.depois))}` : 'Pagamento único (valor total)',
        `Chave (${W.pix.tipo}): ${W.pix.chaveFormatada}`,
        `Favorecido: ${W.responsavel}`,
        `Referência: ${c.numero}`
      ];
      info.forEach((l, i) => doc.text(clean(l), M + 58, y + 17 + i * 5.2));
      doc.setFontSize(7); doc.setTextColor(...MUTED);
      doc.text(doc.splitTextToSize('Pix Copia e Cola: ' + c.pix, CW - 62), M + 58, y + 45);
      doc.setTextColor(...INK);
      y += 62;
    }

    // registro da assinatura
    const reg = [
      `Assinado em: ${c.assinadoEm}`,
      'Método: aceite eletrônico com assinatura desenhada no site da Webora',
      `Código de verificação (SHA-256): ${c.hash.slice(0, 32)}`,
      `${c.hash.slice(32)}`,
      `CONTRATADA: ${W.responsavel} (${W.marca}), CNPJ ${W.documento}, pela oferta publicada no site.`
    ];
    if (c.servidor) reg.push(`Valores conferidos pelo servidor da Webora em ${c.servidor.conferidoEmTexto}` + (c.servidor.recibo ? ` · Recibo ${c.servidor.recibo}` : '') + '.');
    const boxH = 50 + reg.length * 3.8;
    room(boxH + 12); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('REGISTRO DA ASSINATURA ELETRÔNICA', M, y); y += 4;
    doc.setDrawColor(...LINE); doc.roundedRect(M, y, CW, boxH, 3, 3);
    if (c.assinatura) doc.addImage(c.assinatura, 'PNG', M + 6, y + 4, 70, 26);
    doc.setDrawColor(60, 60, 60); doc.line(M + 6, y + 32, M + 82, y + 32);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(clean(c.nome), M + 6, y + 37);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(clean(`${c.docTipo} ${maskDoc(c.doc)} · CONTRATANTE`), M + 6, y + 41.5);
    doc.setFontSize(7.6); doc.setTextColor(80, 80, 80);
    reg.forEach((l, i) => doc.text(doc.splitTextToSize(clean(l), CW - 12), M + 6, y + 48 + i * 3.8));
    doc.setTextColor(...INK);

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
      doc.text(clean(`Página ${i} de ${n} · Código de verificação ${c.codigo}`), PW / 2, PH - 10, { align: 'center' });
    }
    return doc;
  }

  return {
    brl, reais, dias, extenso, porExtenso, digits, validCPF, validCNPJ, maskDoc, maskPhone,
    CAMPOS, PAGAMENTOS, NUMERO, limpar, validar, condicoes, crc16, pixPayload, pixWebora,
    dataLonga, dataHora, numeroContrato, sha256, reciboCanonico, build, toText, renderHTML, pdf
  };
});
