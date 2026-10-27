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

  /* ---------- texto do contrato: modelo de 3 páginas + Anexo I ---------- */
  // Blocos: page | meta | h | p | hl | field | check | note | sign | li
  // page abre uma página do contrato (no PDF, cada uma cabe numa folha); field é um campo do modelo,
  // já preenchido; em p, `bold` lista os trechos em negrito (só textos fixos, nunca dados do cliente).
  // Os textos seguem os modelos da Webora: um por plano (Essencial, Loja Online, Personalizado),
  // com as cláusulas de pagamento à vista ou 50% + 50%; preço, revisões, suporte e prazo vêm do plano (config.js).
  // Um plano novo, sem modelo próprio, usa o modelo conjunto "site ou loja online", com a modalidade marcada.
  const SITE_CURTO = 'weborasites.com.br';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const MODELO = {
    essencial: { titulo: 'Contrato de criação de site essencial', rodape: 'Plano Essencial' },
    loja: { titulo: 'Contrato de criação de loja online', rodape: 'Loja Online' },
    premium: { titulo: 'Contrato de criação de site personalizado', rodape: 'Site Personalizado' }
  };
  const modelo = P => (P && MODELO[P.id]) || { titulo: 'Contrato de criação de site ou loja online', rodape: 'Essencial ou Loja Online' };
  const rodape = P => modelo(P).rodape;

  function build(d) {
    const P = PLANOS[d.plano];
    const pg = condicoes(P, d.pagamento);
    const docTipo = digits(d.doc).length === 14 ? 'CNPJ' : 'CPF';
    const prazoMax = P.prazoMax > P.prazo ? P.prazoMax : 0;
    const avista = pg.tipo === 'avista';
    const preco = brl(pg.total);
    const B = [];
    const add = (t, text, x) => B.push(Object.assign({ t, text }, x));

    add('page', modelo(P).titulo);
    add('meta', `Contrato nº ${d.numero} · Plano ${P.nome} · Modelo versão ${W.versaoContrato} · ${d.dataLonga}`);
    add('p', 'As partes abaixo contratam o desenvolvimento do projeto descrito neste instrumento. Os campos de identificação, escopo e prazo devem ser preenchidos e conferidos antes da assinatura.');

    add('h', '1 Identificação das partes');
    add('field', `${W.responsavel}, nome fantasia ${W.marca}`, { label: `CONTRATADA | Nome civil ou razão social responsável pela marca ${W.marca}` });
    add('field', `CNPJ ${W.documento} · ${W.tipo}`, { label: 'CPF ou CNPJ da contratada e representante legal quando houver' });
    add('field', `${W.endereco} · WhatsApp ${W.whatsappFormatado} · ${SITE_CURTO}`, { label: 'Endereço completo da contratada e contato para notificações' });
    add('field', d.nome + (d.empresa ? `, responsável pelo negócio "${d.empresa}"` : ''), { label: 'CONTRATANTE | Nome ou razão social e representante legal quando houver' });
    add('field', `${docTipo} ${maskDoc(d.doc)}`, { label: 'CPF ou CNPJ do contratante' });
    add('field', [d.endereco, d.cidade].filter(Boolean).join(', ') + ` · E-mail ${d.email} · WhatsApp ${maskPhone(d.tel)}`, { label: 'Endereço completo do contratante e contato para notificações', rows: 2 });

    add('h', '2 Valor e pagamento');
    const total = `Preço total do desenvolvimento: ${preco}`;
    add('p', `${total} (${extenso(pg.total)}). ` + (avista
      ? 'Pagamento integral antecipado, em parcela única na assinatura deste contrato.'
      : 'Pagamento em duas etapas: entrada na assinatura e saldo após aprovação expressa da versão final, antes da publicação e entrega dos acessos.'), { bold: [total] });
    if (avista) {
      add('hl', P.id === 'essencial' ? `Pagamento à vista: ${preco}  |  Saldo: ${brl(0)}` : `Entrada integral: ${preco}  |  Saldo na entrega: ${brl(0)}`);
      add('p', 'O pagamento na assinatura corresponde a 100% do valor do desenvolvimento. Não haverá segunda parcela ou cobrança de saldo na entrega.');
    } else {
      add('hl', `Entrada: ${brl(pg.agora)}  |  Saldo na entrega: ${brl(pg.depois)}`);
      add('p', pg.agora === pg.depois ? 'Cada parcela corresponde a 50% do valor total.'
        : P.loja ? `Pagamento de 50% na entrada e 50% na entrega, com ajuste de arredondamento de um centavo entre as parcelas para preservar o total de ${preco}.`
        : 'A divisão corresponde a 50% de entrada e 50% na entrega, com arredondamento de um centavo na entrada e compensação no saldo.');
    }
    add('field', `Pix · chave ${W.pix.tipo} ${W.pix.chaveFormatada} · beneficiário ${W.responsavel} (${W.marca}). Quando o banco permitir, informe o nº do contrato (${d.numero}) na mensagem do Pix.`,
      { label: 'Forma de pagamento | Chave Pix ou dados bancários e nome do beneficiário', rows: 2 });
    add('p', 'O beneficiário deve ser a contratada ou terceiro expressamente autorizado por ela. Custos adicionais somente serão devidos se discriminados e aceitos por escrito.');

    add('page', 'Escopo e execução do projeto');
    add('h', '3 Modalidade e entregas');
    if (P.premium) {
      add('p', `Modalidade: Site Personalizado, comercialmente denominado ${P.nome}. Esse nome não altera o preço total de ${preco} nem representa uma avaliação de mercado ou garantia de resultado.`, { bold: ['Site Personalizado', P.nome] });
      add('p', 'Inclui criação de layout conforme identidade visual fornecida, adaptação para celular e computador, navegação entre as páginas contratadas, canais de contato e configuração técnica básica de títulos e descrições para buscadores. Recursos exclusivos serão descritos abaixo.');
    } else if (P.id === 'essencial') {
      add('p', 'Modalidade contratada: Plano Essencial. Inclui uma página de apresentação do negócio, com seções de serviços ou produtos, informações de contato e botão para WhatsApp, adaptada para celular e computador conforme a identidade visual fornecida.', { bold: ['Plano Essencial'] });
      add('p', `O valor do desenvolvimento é ${preco}. Este plano não inclui loja virtual com carrinho, checkout, gestão de pedidos, estoque ou integrações de pagamento. Qualquer ampliação será objeto de orçamento e aceite prévios.`);
    } else if (P.loja) {
      add('p', 'Modalidade contratada: Loja Online. Inclui vitrine de produtos, adaptação para celular e computador e aplicação da identidade visual fornecida. A quantidade de produtos e o fluxo de pedidos devem constar abaixo.', { bold: ['Loja Online'] });
      add('p', `Indicar se os pedidos seguem para WhatsApp ou se há checkout integrado. Integrações de pagamento, cálculo de frete, estoque e painel administrativo só integram a entrega quando expressamente descritos no escopo. O valor do desenvolvimento é ${preco}.`);
    } else {
      add('p', `Marcar somente uma modalidade. O preço de ${preco} remunera a opção escolhida, conforme os limites e recursos registrados abaixo.`);
      add('check', 'Plano Essencial  |  Página de apresentação com contato e WhatsApp', { on: P.id === 'essencial' });
      add('check', 'Loja Online  |  Vitrine de produtos e fluxo de pedidos definido abaixo', { on: P.id === 'loja' });
      add('p', 'Ambas incluem adaptação para celular e computador e aplicação da identidade visual fornecida. Na loja, indicar se os pedidos seguem para WhatsApp ou se há checkout integrado. Pagamentos, frete, estoque e painel só integram a entrega quando expressamente descritos.');
    }
    add('field', (d.empresa || d.nome) + ' · ' + (d.dominio ? `domínio pretendido: ${d.dominio}` : 'domínio a definir com a CONTRATANTE, sujeito à disponibilidade no registro'),
      { label: 'Empresa ou marca do projeto e endereço de domínio pretendido' });
    add('field', `${cap(P.paginas)} · ${P.cadastro}`, { label: 'Quantidade de páginas ou seções e de produtos com cadastro inicial' });
    const pagamentos = P.loja
      ? ' Pedidos pelo checkout integrado, com Pix e cartão por provedor de pagamento (por exemplo, Mercado Pago) em conta da CONTRATANTE, que arca com as taxas do provedor.'
      : P.premium ? ' Quando o projeto incluir pagamentos online, eles serão feitos por provedor de pagamento em conta da CONTRATANTE, que arca com as taxas do provedor.' : '';
    add('field', P.destaques.join('; ') + '.' + pagamentos + ' Entregas detalhadas no Anexo I.',
      { label: 'Funcionalidades e integrações incluídas | Detalhar pedidos, pagamento e gestão quando houver', rows: 4 });
    add('field', 'Domínio .com.br (ou .com) por 1 (um) ano incluído no preço, registrado pela CONTRATADA em nome da CONTRATANTE, sujeito à disponibilidade do nome; renovação a partir do segundo ano por conta da CONTRATANTE. Hospedagem em nuvem com https, sem mensalidade enquanto o uso couber no plano gratuito do provedor; se for preciso um plano pago, o custo será informado antes e ficará a cargo da CONTRATANTE.',
      { label: 'Domínio e hospedagem | Informar responsável, fornecedor, preço e período ou não incluso', rows: 3 });
    add('p', 'Sem contratação expressa, domínio, hospedagem, assinaturas, taxas de meios de pagamento, manutenção contínua, produção de textos e fotos, anúncios e integrações adicionais não compõem o preço acima. Não há mensalidade de desenvolvimento instituída por este contrato.');

    add('h', '4 Prazo e aprovação');
    const confirmacao = avista ? 'do pagamento integral' : 'da entrada';
    add('field', `Até ${dias(P.prazo)}` +
      (prazoMax ? `, ou até ${dias(prazoMax)} em períodos de alta demanda ou em caso de problemas técnicos, com aviso pelo WhatsApp` : '') +
      (P.premium ? '. Neste plano, o prazo conta também da aprovação do briefing com o mapa de páginas' : '') +
      `. A data prevista será informada por escrito pela CONTRATADA ao confirmar ${avista ? 'o pagamento integral' : 'a entrada'} e o recebimento dos materiais.`,
      { label: 'Prazo de entrega em dias úteis e data prevista | Preencher antes de assinar', rows: 2 });
    add('p', `O prazo começa no primeiro dia útil após a confirmação ${confirmacao} e o recebimento dos materiais e acessos indispensáveis. Pendências do cliente suspendem apenas as atividades afetadas; a Webora informará o impacto e a nova previsão por escrito.`);
    add('p', `A Webora apresentará uma prévia e realizará até ${feminino(porExtenso(P.revisoes))} ${P.revisoes === 1 ? 'rodada' : 'rodadas'} de ajustes dentro do escopo. O cliente deverá reunir seus pedidos em uma lista por rodada. Alterações de escopo exigem orçamento e aceite prévios. Silêncio não vale como aprovação.`);
    add('p', avista
      ? 'A entrega compreende publicação no ambiente acordado após aprovação expressa da versão final, testes dos recursos contratados e disponibilização dos acessos administrativos aplicáveis. O cliente terá acesso à prévia para aprovação, sem pagamento adicional de saldo na entrega.'
      : P.loja ? 'A entrega compreende publicação no ambiente acordado após aprovação expressa da versão final, testes dos recursos contratados e disponibilização dos acessos administrativos aplicáveis. O cliente terá acesso à prévia para aprovação antes do pagamento do saldo. A publicação e a entrega dos acessos ocorrerão após a quitação.'
      : 'A entrega compreende publicação no ambiente acordado, testes dos recursos contratados e disponibilização dos acessos administrativos aplicáveis após a quitação. O cliente mantém acesso à prévia para aprovar a entrega antes do saldo.');

    add('page', 'Condições gerais e assinaturas');
    add('h', '5 Responsabilidades e suporte');
    add('p', 'A Webora executará o escopo com diligência e corrigirá falhas de implementação. O cliente fornecerá informações corretas, materiais autorizados e aprovações, além de definir preços, atendimento, frete e políticas de sua operação. Não se promete volume de vendas, aprovação em plataformas ou posição no Google.');
    add('p', `Inclui suporte de orientação e correção de falhas por ${P.suporte} dias corridos após a entrega${P.suportePrioritario ? ', com atendimento prioritário' : ''}, sem limitar garantias e direitos previstos em lei. Novos recursos e manutenção futura dependerão de contratação separada. Falhas de terceiros serão comunicadas e tratadas no que couber à atuação da Webora.`);
    add('h', '6 Titularidade e proteção de dados');
    add('p', 'Após a quitação, o cliente poderá utilizar e administrar as entregas produzidas para o projeto e receberá os arquivos e acessos necessários à operação e migração, conforme a plataforma escolhida. Bibliotecas, fontes, ferramentas e plataformas de terceiros mantêm suas licenças e limitações, que devem ser informadas antes da contratação.');
    add('p', 'As partes manterão sigilo sobre credenciais e informações não públicas. Tratarão dados pessoais apenas para executar o contrato e cumprir obrigações legais, com medidas de segurança compatíveis e observância da LGPD. Se operar dados em nome do cliente, a Webora seguirá suas instruções lícitas e comunicará incidentes de que tiver ciência sem demora injustificada. Uso em portfólio exige autorização específica do cliente.');
    add('h', '7 Cancelamento e solução de divergências');
    add('p', 'Quando aplicável o art. 49 do Código de Defesa do Consumidor, fica assegurado o arrependimento em sete dias, contados conforme a lei, com restituição integral e imediata dos valores pagos, monetariamente atualizados. A autorização para iniciar o projeto não afasta esse direito.');
    add('p', 'Fora dessa hipótese, o cancelamento deve ser comunicado por escrito. As partes apurarão etapas efetivamente executadas e custos previamente autorizados e comprovados, com acerto proporcional, sem perda automática da entrada. A Webora devolverá valores relativos a serviços não executados em até dez dias úteis do acerto, sem afastar prazos legais mais favoráveis. Descumprimentos serão notificados para correção em cinco dias úteis, salvo urgência ou regra legal diversa.');
    add('p', 'Aplicam-se as leis brasileiras e o juízo legalmente competente, respeitado o foro do consumidor quando cabível. As partes buscarão solução amigável. Mudanças só terão efeito mediante acordo escrito; ofertas e direitos legalmente vinculantes ficam preservados.');
    add('h', '8 Aceite');
    add('p', 'As partes declaram que conferiram os campos preenchidos e o escopo e aceitam estas três páginas como um único contrato. Admite-se assinatura física ou eletrônica com registro de autoria e integridade. Cada parte receberá uma via.');
    add('field', `${d.cidade}, ${d.dataLonga} · assinatura eletrônica no site da ${W.marca}`, { label: 'Local e data da assinatura' });
    add('sign', '', {
      a: `CONTRATADA  |  ${W.marca.toUpperCase()}`, an: `${W.responsavel} · CNPJ ${W.documento}`,
      b: 'CONTRATANTE', bn: `${d.nome} · ${docTipo} ${maskDoc(d.doc)}`
    });
    add('note', 'Assinar somente após preencher os dados das partes, prazo, modalidade e funcionalidades. Anexos e propostas aceitos devem ser identificados e acompanhados deste instrumento.');

    add('page', `Anexo I · Plano ${P.nome}`, { anexo: 'Anexo I' });
    add('p', P.resumo);
    add('h', 'Entregas');
    P.entregas.forEach(e => add('li', e));
    add('h', 'Não inclui');
    P.naoInclui.forEach(e => add('li', e));
    add('h', 'Escopo');
    add('li', `Estrutura: ${P.paginas}`);
    add('li', `Produtos: ${P.cadastro}`);
    add('li', `Rodadas de ajustes: ${P.revisoes}`);
    add('li', `Prazo de entrega: até ${dias(P.prazo)}${prazoMax ? `, ou até ${dias(prazoMax)} em períodos de alta demanda ou em caso de problemas técnicos` : ''}`);
    add('li', `Suporte após a entrega: ${P.suporte} dias corridos${P.suportePrioritario ? ', prioritário' : ''}`);
    add('li', `Pagamento: ${pg.rotulo}` + (pg.depois ? ` (${brl(pg.agora)} na assinatura e ${brl(pg.depois)} na entrega)` : ''));
    if (d.obs) { add('h', 'Observações da CONTRATANTE sobre o projeto'); add('p', d.obs); }

    return { blocks: B, plano: P, pagamento: pg, docTipo };
  }

  // texto corrido (é o que o código de verificação SHA-256 assina)
  const toText = blocks => blocks.map(b => {
    if (b.t === 'field') return `${b.label}: ${b.text}`;
    if (b.t === 'check') return `[${b.on ? 'x' : ' '}] ${b.text}`;
    if (b.t === 'sign') return `${b.a}: ${b.an}\n${b.b}: ${b.bn}`;
    return (b.t === 'li' ? '- ' : '') + b.text;
  }).join('\n');

  // divide um parágrafo nos trechos em negrito, na ordem em que aparecem
  function runs(b) {
    const out = [];
    let rest = b.text;
    (b.bold || []).forEach(s => {
      const i = rest.indexOf(s);
      if (i < 0) return;
      if (i) out.push([rest.slice(0, i), false]);
      out.push([s, true]);
      rest = rest.slice(i + s.length);
    });
    if (rest) out.push([rest, false]);
    return out;
  }

  function renderHTML(el, blocks) {
    el.replaceChildren();
    const node = (tag, cls, text) => {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    };
    let ul = null;
    blocks.forEach(b => {
      if (b.t !== 'li') ul = null;
      if (b.t === 'li') { if (!ul) el.append(ul = node('ul')); ul.append(node('li', '', b.text)); }
      else if (b.t === 'page' || b.t === 'title') el.append(node('h3', el.childElementCount ? 'paper__page' : '', b.text));
      else if (b.t === 'meta') el.append(node('p', 'paper__meta', b.text));
      else if (b.t === 'h') el.append(node('h4', '', b.text));
      else if (b.t === 'hl') el.append(node('p', 'paper__hl', b.text));
      else if (b.t === 'note') el.append(node('p', 'paper__note', b.text));
      else if (b.t === 'field') {
        const f = node('div', 'paper__field');
        f.append(node('span', 'paper__label', b.label), node('span', 'paper__value', b.text));
        el.append(f);
      } else if (b.t === 'check') {
        const c = node('p', 'paper__check' + (b.on ? ' is-on' : ''));
        c.append(node('span', 'paper__box'), node('span', 'sr-only', b.on ? 'Marcado: ' : 'Não marcado: '), document.createTextNode(b.text));
        el.append(c);
      } else if (b.t === 'sign') {
        const s = node('div', 'paper__sign');
        [[b.a, b.an], [b.b, b.bn]].forEach(([rot, nome]) => {
          const col = node('div');
          col.append(node('span', 'paper__line'), node('b', '', rot), node('small', '', nome));
          s.append(col);
        });
        el.append(s);
      } else {
        const p = node('p');
        runs(b).forEach(([txt, bold]) => p.append(bold ? node('strong', '', txt) : document.createTextNode(txt)));
        el.append(p);
      }
    });
  }

  /* ---------- PDF no modelo da Webora (jsPDF, carregado só na hora de gerar) ----------
     Cabeçalho com logotipo, "Prestação de serviços digitais" e filete azul; campos em caixas;
     rodapé com o plano e a página. As três páginas do contrato cabem cada uma numa folha
     (o texto encolhe um pouco se precisar); o Anexo I corre livre e o Anexo II traz o Pix
     e o registro da assinatura eletrônica. */
  function pdf(c) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const M = 16, PW = 210, PH = 297, CW = PW - 2 * M, TOP = 41, BOTTOM = PH - 18;
    const INK = [17, 18, 20], BODY = [38, 40, 44], MUTED = [96, 104, 118], LINE = [226, 229, 234], BOX = [238, 226, 212], BLUE = [7, 84, 250];
    const clean = s => String(s).replace(/[\t  ]/g, ' ').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[•✦✓→]/g, '-');
    const mm = pt => pt * 0.3528;
    const LHF = 1.38;
    const font = (style, size, color) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    const plano = PLANOS[c.plano && c.plano.id];
    let y = TOP;

    const head = () => {
      if (c.logo) doc.addImage(c.logo.data, 'PNG', M, 13.6, 9 * c.logo.ratio, 9);
      else {
        font('bold', 24, BLUE); doc.text('web', M, 21);
        doc.setTextColor(8, 8, 8); doc.text('ora', M + doc.getTextWidth('web'), 21);
      }
      font('normal', 7.8, MUTED);
      doc.text('PRESTAÇÃO DE SERVIÇOS DIGITAIS', PW - M, 18.2, { align: 'right' });
      font('normal', 7.2, MUTED);
      doc.text(clean(`Contrato nº ${c.numero}`), PW - M, 22.4, { align: 'right' });
      doc.setDrawColor(...BLUE); doc.setLineWidth(0.7); doc.line(M, 30.5, PW - M, 30.5);
    };
    const pages = [];                      // rótulo do rodapé de cada folha
    const newPage = label => { if (pages.length) doc.addPage(); pages.push(label); head(); y = TOP; };

    // quebra um parágrafo com trechos em negrito em linhas de [texto, negrito]; respeita as quebras de linha
    function wrapRich(parts, width, size) {
      const lines = [[]];
      let w = 0;
      parts.forEach(([txt, bold]) => clean(txt).split('\n').forEach((seg, si) => {
        if (si) { lines.push([]); w = 0; }
        seg.split(/( +)/).filter(Boolean).forEach(tok => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
        const tw = doc.getTextWidth(tok), space = /^ +$/.test(tok);
        if (space && !lines[lines.length - 1].length) return;
        if (!space && w + tw > width && lines[lines.length - 1].length) {
          const prev = lines[lines.length - 1];
          while (prev.length && /^ +$/.test(prev[prev.length - 1][0])) prev.pop();
          lines.push([]); w = 0;
        }
        lines[lines.length - 1].push([tok, bold, tw]); w += tw;
        });
      }));
      // junta as palavras seguidas do mesmo estilo: cada trecho sai num só texto, com o espaçamento do próprio jsPDF
      return lines.map(ln => ln.reduce((acc, [tok, bold]) => {
        const last = acc[acc.length - 1];
        if (last && last[1] === bold) last[0] += tok; else acc.push([tok, bold]);
        return acc;
      }, []));
    }

    // mede (draw = false) ou desenha um bloco em y; devolve a altura
    function block(b, s, draw) {
      const t = b.t === 'title' ? 'page' : b.t;
      if (t === 'page') {
        const size = 15.5 * s; font('bold', size, INK);
        const lines = doc.splitTextToSize(clean(b.text), CW);
        if (draw) doc.text(lines, M, y + mm(size), { lineHeightFactor: 1.2 });
        return lines.length * mm(size) * 1.2 + 3.2 * s;
      }
      if (t === 'meta') {
        const size = 7.8 * s; font('normal', size, MUTED);
        const lines = doc.splitTextToSize(clean(b.text), CW);
        if (draw) doc.text(lines, M, y + mm(size), { lineHeightFactor: LHF });
        return lines.length * mm(size) * LHF + 3.4 * s;
      }
      if (t === 'h') {
        const size = 10.8 * s; font('bold', size, INK);
        const lines = doc.splitTextToSize(clean(b.text), CW);
        if (draw) doc.text(lines, M, y + 2.6 * s + mm(size), { lineHeightFactor: 1.2 });
        return 2.6 * s + lines.length * mm(size) * 1.2 + 2 * s;
      }
      if (t === 'hl') {
        const size = 11.6 * s; font('bold', size, BLUE);
        const lines = doc.splitTextToSize(clean(b.text), CW);
        if (draw) doc.text(lines, M, y + 0.8 * s + mm(size), { lineHeightFactor: 1.25 });
        return 0.8 * s + lines.length * mm(size) * 1.25 + 2.4 * s;
      }
      if (t === 'note') {
        const size = 7.6 * s; font('normal', size, MUTED);
        const lines = doc.splitTextToSize(clean(b.text), CW);
        if (draw) doc.text(lines, M, y + mm(size), { lineHeightFactor: LHF });
        return lines.length * mm(size) * LHF + 2 * s;
      }
      if (t === 'li') {
        const size = 9.3 * s; font('normal', size, BODY);
        const lines = doc.splitTextToSize(clean(b.text), CW - 6);
        if (draw) { doc.text('-', M + 1.5, y + mm(size)); doc.text(lines, M + 6, y + mm(size), { lineHeightFactor: LHF }); }
        return lines.length * mm(size) * LHF + 1.3 * s;
      }
      if (t === 'field') {
        const ls = 7.8 * s, vs = 9.2 * s, pad = 2.4 * s;
        font('normal', ls, MUTED);
        const label = doc.splitTextToSize(clean(b.label), CW);
        const lh = label.length * mm(ls) * LHF;
        if (draw) doc.text(label, M, y + mm(ls), { lineHeightFactor: LHF });
        font('normal', vs, INK);
        const lines = doc.splitTextToSize(clean(b.text), CW - 6);
        const boxH = Math.max((7.6 + ((b.rows || 1) - 1) * 3.8) * s, lines.length * mm(vs) * LHF + 2 * pad);
        const by = y + lh + 1.2 * s;
        if (draw) {
          doc.setDrawColor(...BOX); doc.setLineWidth(0.3); doc.roundedRect(M, by, CW, boxH, 1, 1);
          doc.text(lines, M + 3, by + pad + mm(vs) * 0.9, { lineHeightFactor: LHF });
        }
        return lh + 1.2 * s + boxH + 3.6 * s;
      }
      if (t === 'check') {
        const size = 9.5 * s, box = 3.6 * s; font('normal', size, BODY);
        const lines = doc.splitTextToSize(clean(b.text), CW - 8);
        if (draw) {
          if (b.on) {
            doc.setFillColor(...BLUE); doc.roundedRect(M, y, box, box, 0.6, 0.6, 'F');
            doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.45);
            doc.line(M + box * .22, y + box * .52, M + box * .42, y + box * .74);
            doc.line(M + box * .42, y + box * .74, M + box * .8, y + box * .28);
          } else {
            doc.setDrawColor(150, 156, 166); doc.setLineWidth(0.3); doc.roundedRect(M, y, box, box, 0.6, 0.6);
          }
          doc.text(lines, M + 7.5, y + box * .5 + mm(size) * .35, { lineHeightFactor: LHF });
        }
        return Math.max(box, lines.length * mm(size) * LHF) + 3.2 * s;
      }
      if (t === 'sign') {
        const gap = 10, colW = (CW - gap) / 2, area = 17 * s;
        if (draw) {
          [[b.a, b.an, M], [b.b, b.bn, M + colW + gap]].forEach(([rot, nome, x], i) => {
            if (i === 1 && c.assinatura) doc.addImage(c.assinatura, 'PNG', x + 2, y + 0.5 * s, area * 70 / 26 * .92, area * .92);
            if (i === 0) { font('normal', 7.4 * s, MUTED); doc.text('Aceite pela oferta publicada no site', x, y + area - 2 * s); }
            doc.setDrawColor(70, 76, 88); doc.setLineWidth(0.3); doc.line(x, y + area, x + colW, y + area);
            font('normal', 7.8 * s, MUTED); doc.text(clean(rot), x, y + area + 4.2 * s);
            font('normal', 7.2 * s, MUTED); doc.text(doc.splitTextToSize(clean(nome), colW), x, y + area + 7.8 * s);
          });
        }
        return area + 12 * s;
      }
      // parágrafo, com os trechos em negrito
      const size = 9.5 * s, L = mm(size) * LHF;
      const lines = wrapRich(runs(b), CW, size);
      if (draw) {
        lines.forEach((ln, i) => {
          let x = M;
          ln.forEach(([txt, bold]) => { font(bold ? 'bold' : 'normal', size, BODY); doc.text(txt, x, y + mm(size) + i * L); x += doc.getTextWidth(txt); });
        });
      }
      return lines.length * L + 2.6 * s;
    }

    // páginas do contrato: escolhe o tamanho que cabe numa folha; anexos correm livres
    const groups = [];
    c.blocks.forEach(b => {
      if (b.t === 'page' || b.t === 'title' || !groups.length) groups.push({ anexo: b.anexo || null, blocks: [] });
      groups[groups.length - 1].blocks.push(b);
    });
    groups.forEach(g => {
      let s = 1;
      if (!g.anexo) {
        const height = k => g.blocks.reduce((h, b) => h + block(b, k, false), TOP);
        while (s > 0.8 && height(s) > BOTTOM) s -= 0.02;
      }
      newPage(g.anexo || 'contrato');
      g.blocks.forEach((b, i) => {
        const h = block(b, s, false);
        // o título vai junto com o começo do bloco seguinte
        const next = b.t === 'h' && g.blocks[i + 1] ? Math.min(block(g.blocks[i + 1], s, false), 14) : 0;
        if (y + h + next > BOTTOM && y > TOP) newPage(g.anexo || 'contrato');
        block(b, s, true);
        y += h;
      });
    });

    // Anexo II: Pix e registro da assinatura eletrônica
    const put = b => { const h = block(b, 1, false); block(b, 1, true); y += h; };
    newPage('Anexo II');
    put({ t: 'page', text: 'Anexo II · Registro da assinatura e pagamento' });
    put({ t: 'p', text: `Este anexo acompanha o contrato nº ${c.numero} e registra a assinatura eletrônica da CONTRATANTE e os dados para o pagamento via Pix.` });
    if (c.qr) {
      put({ t: 'h', text: 'Pagamento via Pix' });
      doc.setDrawColor(...BOX); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, 56, 1.4, 1.4);
      doc.addImage(c.qr, 'PNG', M + 4, y + 4, 48, 48);
      font('bold', 11.6, BLUE);
      doc.text(clean(`Valor a pagar agora: ${brl(c.pagamento.agora)}`), M + 58, y + 11);
      font('normal', 9, BODY);
      [
        c.pagamento.depois ? `Saldo na entrega: ${brl(c.pagamento.depois)}` : 'Pagamento único (valor total)',
        `Chave (${W.pix.tipo}): ${W.pix.chaveFormatada}`,
        `Beneficiário: ${W.responsavel}`,
        `Referência: ${c.numero}`
      ].forEach((l, i) => doc.text(clean(l), M + 58, y + 18 + i * 5.2));
      font('normal', 7, MUTED);
      doc.text(doc.splitTextToSize('Pix Copia e Cola: ' + c.pix, CW - 62), M + 58, y + 42);
      y += 62;
    }
    const reg = [
      `Assinado em: ${c.assinadoEm}`,
      `Método: aceite eletrônico com assinatura desenhada no site da ${W.marca}`,
      `Código de verificação (SHA-256): ${c.hash.slice(0, 32)}`,
      c.hash.slice(32),
      `CONTRATADA: ${W.responsavel} (${W.marca}), CNPJ ${W.documento}, pela oferta publicada no site.`
    ];
    if (c.servidor) reg.push(`Valores conferidos pelo servidor da ${W.marca} em ${c.servidor.conferidoEmTexto}` + (c.servidor.recibo ? ` · Recibo ${c.servidor.recibo}` : '') + '.');
    put({ t: 'h', text: 'Registro da assinatura eletrônica' });
    font('bold', 9, INK);
    const nome = doc.splitTextToSize(clean(c.nome), CW - 12), extra = (nome.length - 1) * 4;
    const boxH = 46 + extra + reg.length * 3.9;
    doc.setDrawColor(...BOX); doc.setLineWidth(0.3); doc.roundedRect(M, y, CW, boxH, 1.4, 1.4);
    if (c.assinatura) doc.addImage(c.assinatura, 'PNG', M + 6, y + 4, 62, 23);
    doc.setDrawColor(70, 76, 88); doc.line(M + 6, y + 29, M + 82, y + 29);
    doc.text(nome, M + 6, y + 34, { lineHeightFactor: 1.25 });
    font('normal', 8.4, BODY); doc.text(clean(`${c.docTipo} ${maskDoc(c.doc)} · CONTRATANTE`), M + 6, y + 38.4 + extra);
    font('normal', 7.6, MUTED);
    reg.forEach((l, i) => doc.text(doc.splitTextToSize(clean(l), CW - 12), M + 6, y + 45 + extra + i * 3.9));

    // rodapé do modelo: plano à esquerda; página do contrato (1 / 3) ou nome do anexo à direita
    const nContrato = pages.filter(p => p === 'contrato').length;
    let k = 0;
    pages.forEach((label, i) => {
      doc.setPage(i + 1);
      doc.setDrawColor(...LINE); doc.setLineWidth(0.25); doc.line(M, PH - 12.8, PW - M, PH - 12.8);
      font('normal', 7.4, MUTED);
      doc.text(clean(`WEBORA  |  ${rodape(plano)}  |  ${SITE_CURTO}`), M, PH - 8.6);
      const pag = label === 'contrato' ? `${++k} / ${nContrato}` : label;
      doc.text(clean(`Código ${c.codigo}     ${pag}`), PW - M, PH - 8.6, { align: 'right' });
    });
    return doc;
  }

  return {
    brl, reais, dias, extenso, porExtenso, digits, validCPF, validCNPJ, maskDoc, maskPhone,
    CAMPOS, PAGAMENTOS, NUMERO, limpar, validar, condicoes, crc16, pixPayload, pixWebora,
    dataLonga, dataHora, numeroContrato, sha256, reciboCanonico, build, toText, renderHTML, pdf
  };
});
