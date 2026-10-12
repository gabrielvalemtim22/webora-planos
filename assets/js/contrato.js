/* =========================================================
   Webora — geração do contrato, Pix e PDF
   ========================================================= */
(function () {
  const W = window.WEBORA;

  /* ---------- dinheiro e extenso ---------- */
  const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const cents = v => Math.round(v * 100);

  function extenso(v) {
    const u = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
    const d = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const c = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    const ate999 = n => {
      if (n === 100) return 'cem';
      const p = [], h = Math.floor(n / 100), r = n % 100;
      if (h) p.push(c[h]);
      if (r) p.push(r < 20 ? u[r] : (r % 10 ? d[Math.floor(r / 10)] + ' e ' + u[r % 10] : d[r / 10]));
      return p.join(' e ');
    };
    const total = cents(v), reais = Math.floor(total / 100), cent = total % 100;
    let txt = '';
    if (reais) {
      const mil = Math.floor(reais / 1000), resto = reais % 1000, p = [];
      if (mil) p.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
      if (resto) p.push(ate999(resto));
      txt = p.join(mil && resto && (resto < 100 || resto % 100 === 0) ? ' e ' : ' ') + (reais === 1 ? ' real' : ' reais');
    }
    if (cent) txt += (txt ? ' e ' : '') + ate999(cent) + (cent === 1 ? ' centavo' : ' centavos');
    return txt || 'zero reais';
  }

  /* ---------- documentos ---------- */
  const digits = s => String(s || '').replace(/\D/g, '');
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

  /* ---------- Pix (BR Code estático) ---------- */
  function crc16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
      crc ^= str.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xFFFF;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }
  function pixPayload({ chave, nome, cidade, valor, txid }) {
    const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
    const conta = f('00', 'br.gov.bcb.pix') + f('01', chave);
    const ref = (txid || '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***';
    const p = f('00', '01') + f('26', conta) + f('52', '0000') + f('53', '986') +
      (valor ? f('54', valor.toFixed(2)) : '') + f('58', 'BR') + f('59', nome.slice(0, 25)) +
      f('60', cidade.slice(0, 15)) + f('62', f('05', ref)) + '6304';
    return p + crc16(p);
  }

  /* ---------- datas, número, hash ---------- */
  const TZ = 'America/Sao_Paulo';
  const dataLonga = d => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
  const dataHora = d => d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: TZ }) + ' (horário de Brasília)';
  function numeroContrato(d = new Date()) {
    const p = d.toLocaleDateString('en-CA', { timeZone: TZ }).replace(/-/g, '').slice(2);
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let r = '';
    const rnd = crypto.getRandomValues(new Uint8Array(4));
    rnd.forEach(n => { r += abc[n % abc.length]; });
    return `WB-${p}-${r}`;
  }
  async function sha256(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  /* ---------- condições de pagamento ---------- */
  function condicoes(plano, pagamento) {
    const total = cents(plano.valor);
    if (pagamento === 'parcelado') {
      const entrada = Math.round(total / 2), saldo = total - entrada;
      return { tipo: 'parcelado', total: total / 100, agora: entrada / 100, depois: saldo / 100, rotulo: '50% de entrada + 50% na entrega (Pix)' };
    }
    return { tipo: 'avista', total: total / 100, agora: total / 100, depois: 0, rotulo: 'À vista no Pix (valor total)' };
  }

  /* ---------- texto do contrato ---------- */
  // Blocos: t = title | meta | h | p | li | sign
  function build(d) {
    const P = window.PLANOS[d.plano];
    const pg = condicoes(P, d.pagamento);
    const docTipo = digits(d.doc).length === 14 ? 'CNPJ' : 'CPF';
    const B = [];
    const t = (type, text) => B.push({ t: type, text });

    t('title', 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CRIAÇÃO DE SITE');
    t('meta', `Contrato nº ${d.numero} · Plano ${P.nome} · Modelo versão ${W.versaoContrato} · ${d.dataLonga}`);

    t('h', '1. PARTES');
    t('p', `1.1. CONTRATADA: ${W.responsavel}, ${W.tipo}, nome fantasia ${W.marca}, inscrita no CNPJ sob o nº ${W.documento}, com endereço em ${W.endereco}, WhatsApp ${W.whatsappFormatado}.`);
    t('p', `1.2. CONTRATANTE: ${d.nome}, inscrito(a) no ${docTipo} sob o nº ${maskDoc(d.doc)}` +
      (d.empresa ? `, responsável pelo negócio "${d.empresa}"` : '') +
      (d.endereco ? `, com endereço em ${d.endereco}, ${d.cidade}` : `, domiciliado(a) em ${d.cidade}`) +
      `, e-mail ${d.email}, WhatsApp ${maskPhone(d.tel)}.`);

    t('h', '2. OBJETO');
    t('p', `2.1. Este contrato tem por objeto a criação de 1 (um) site pela CONTRATADA para a CONTRATANTE, no plano ${P.nome}, conforme as entregas descritas no Anexo I, que faz parte deste contrato.`);
    t('p', '2.2. Serviços não descritos no Anexo I não estão incluídos e, se solicitados, serão orçados à parte.');

    t('h', '3. VALOR E CONDIÇÕES DE PAGAMENTO');
    t('p', `3.1. Pela criação do site, a CONTRATANTE pagará à CONTRATADA o valor total de ${brl(pg.total)} (${extenso(pg.total)}), em pagamento único.`);
    if (pg.tipo === 'parcelado') {
      t('p', `3.2. Condição escolhida: entrada de ${brl(pg.agora)} (${extenso(pg.agora)}) via Pix na assinatura deste contrato e saldo de ${brl(pg.depois)} (${extenso(pg.depois)}) via Pix na entrega do site, antes da publicação no domínio definitivo.`);
    } else {
      t('p', `3.2. Condição escolhida: pagamento do valor total de ${brl(pg.total)} via Pix na assinatura deste contrato.`);
    }
    t('p', `3.3. Dados para pagamento: Pix com chave ${W.pix.tipo} ${W.pix.chaveFormatada}, em nome de ${W.responsavel} (${W.marca}). Sempre que o banco permitir, informe o nº deste contrato (${d.numero}) na mensagem do Pix.`);
    t('p', '3.4. O início dos serviços depende da confirmação do recebimento do pagamento (ou da entrada) pela CONTRATADA.');
    t('p', '3.5. Não estão incluídos custos de terceiros, como renovação do domínio após o período incluído, taxas de intermediadores de pagamento, anúncios pagos e planos pagos de hospedagem, salvo quando expressamente previstos no Anexo I.');

    t('h', '4. PRAZO DE ENTREGA');
    t('p', `4.1. O site será entregue em até ${P.prazo} (${extenso(P.prazo).replace(/ reais?$/, '')}) dias úteis, contados a partir do último dos seguintes eventos: (a) confirmação do pagamento ou da entrada; (b) recebimento de todo o material necessário, como logotipo, textos, fotos e informações de contato${P.loja ? ' e, para a loja online, a lista de produtos com fotos, descrições e preços' : ''}.`);
    t('p', '4.2. Atrasos no envio de material, de informações ou de aprovações pela CONTRATANTE prorrogam o prazo pelo mesmo período.');
    t('p', '4.3. Antes da publicação final, a CONTRATADA apresentará uma versão do site para aprovação da CONTRATANTE.');

    t('h', '5. REVISÕES');
    t('p', `5.1. Estão incluídas ${P.revisoes} (${extenso(P.revisoes).replace(/ reais?$/, '').replace(/^um$/, 'uma').replace(/^dois$/, 'duas')}) rodadas de revisão sobre a versão apresentada. Cada rodada corresponde a uma lista única de ajustes enviada pela CONTRATANTE.`);
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
    t('p', `9.1. A CONTRATADA prestará suporte por ${P.suporte} (${extenso(P.suporte).replace(/ reais?$/, '')}) dias corridos após a entrega, para correção de falhas e pequenos ajustes de texto e imagem${P.suportePrioritario ? ', com atendimento prioritário' : ''}.`);
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
    t('p', `Valor de criação: ${brl(P.valor)}. Condição de pagamento: ${pg.rotulo}.`);
    t('p', P.resumo);
    t('p', 'Entregas:');
    P.entregas.forEach(e => t('li', e));
    t('p', 'Não inclui:');
    P.naoInclui.forEach(e => t('li', e));
    t('p', 'Escopo:');
    t('li', `Quantidade de páginas: ${P.paginas}`);
    t('li', `Rodadas de revisão: ${P.revisoes}`);
    t('li', `Prazo de entrega: até ${P.prazo} dias úteis`);
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

  /* ---------- PDF ---------- */
  function pdf(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const M = 20, PW = 210, PH = 297, CW = PW - 2 * M;
    const clean = s => String(s).replace(/[  ]/g, ' ').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[•✦✓]/g, '-');
    let y = M + 10;
    const head = () => {
      doc.setFillColor(0, 82, 255); doc.rect(0, 0, PW, 14, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255); doc.text('webora', M, 9.4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(226, 234, 255);
      doc.text(clean(`Contrato nº ${c.numero}`), PW - M, 9.4, { align: 'right' });
      doc.setTextColor(20, 20, 20);
    };
    const room = h => { if (y + h > PH - M - 4) { doc.addPage(); head(); y = M + 10; } };
    head();
    c.blocks.forEach(b => {
      if (b.t === 'title') {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        const lines = doc.splitTextToSize(clean(b.text), CW); room(lines.length * 6 + 2);
        doc.text(lines, PW / 2, y, { align: 'center' }); y += lines.length * 6 + 1;
      } else if (b.t === 'meta') {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110);
        const lines = doc.splitTextToSize(clean(b.text), CW); room(lines.length * 4.2 + 4);
        doc.text(lines, PW / 2, y, { align: 'center' }); y += lines.length * 4.2 + 5; doc.setTextColor(20, 20, 20);
      } else if (b.t === 'h') {
        room(14); y += 2.5;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.text(clean(b.text), M, y); y += 5.5;
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
      doc.setDrawColor(220, 220, 220); doc.roundedRect(M, y, CW, 56, 3, 3);
      doc.addImage(c.qr, 'PNG', M + 4, y + 4, 48, 48);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('PAGAMENTO VIA PIX', M + 58, y + 10);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      const info = [
        `Valor a pagar agora: ${clean(brl(c.pagamento.agora))}`,
        c.pagamento.depois ? `Saldo na entrega: ${clean(brl(c.pagamento.depois))}` : 'Pagamento único (valor total)',
        `Chave (${W.pix.tipo}): ${W.pix.chaveFormatada}`,
        `Favorecido: ${W.responsavel}`,
        `Referência: ${c.numero}`
      ];
      info.forEach((l, i) => doc.text(clean(l), M + 58, y + 17 + i * 5.2));
      doc.setFontSize(7); doc.setTextColor(120, 120, 120);
      doc.text(doc.splitTextToSize('Pix Copia e Cola: ' + c.pix, CW - 62), M + 58, y + 45);
      doc.setTextColor(20, 20, 20);
      y += 62;
    }

    // registro da assinatura
    room(78); y += 4;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('REGISTRO DA ASSINATURA ELETRÔNICA', M, y); y += 4;
    doc.setDrawColor(220, 220, 220); doc.roundedRect(M, y, CW, 66, 3, 3);
    if (c.assinatura) doc.addImage(c.assinatura, 'PNG', M + 6, y + 4, 70, 26);
    doc.setDrawColor(60, 60, 60); doc.line(M + 6, y + 32, M + 82, y + 32);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text(clean(c.nome), M + 6, y + 37);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    doc.text(clean(`${c.docTipo} ${maskDoc(c.doc)} · CONTRATANTE`), M + 6, y + 41.5);
    const reg = [
      `Assinado em: ${c.assinadoEm}`,
      'Método: aceite eletrônico com assinatura desenhada no site da Webora',
      `Código de verificação (SHA-256): ${c.hash.slice(0, 32)}`,
      `${c.hash.slice(32)}`,
      `CONTRATADA: ${W.responsavel} (${W.marca}), CNPJ ${W.documento}, pela oferta publicada no site.`
    ];
    doc.setFontSize(7.6); doc.setTextColor(80, 80, 80);
    reg.forEach((l, i) => doc.text(doc.splitTextToSize(clean(l), CW - 12), M + 6, y + 48 + i * 3.8));
    doc.setTextColor(20, 20, 20);

    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
      doc.text(clean(`Página ${i} de ${n} · Código de verificação ${c.codigo}`), PW / 2, PH - 10, { align: 'center' });
    }
    return doc;
  }

  window.Contrato = { brl, extenso, validCPF, validCNPJ, maskDoc, maskPhone, digits, pixPayload, crc16, dataLonga, dataHora, numeroContrato, sha256, condicoes, build, toText, renderHTML, pdf };
})();
