/* =========================================================
   Webora — dados da empresa e dos planos
   Edite aqui: preços, itens dos planos, prazos e contatos.
   Tudo no site e no contrato é gerado a partir deste arquivo.
   ========================================================= */

window.WEBORA = {
  marca: 'Webora',
  responsavel: 'Gabriel Valemtim Ribeiro Loriente Hernadez',
  tipo: 'Microempreendedor Individual (MEI)',
  documento: '63.371.209/0001-81',
  endereco: 'Rua Muana, 240, São Paulo/SP',
  whatsapp: '5511959304102',
  whatsappFormatado: '(11) 95930-4102',
  pix: {
    chave: '+5511959304102',          // chave Pix (telefone no formato +55DDDNÚMERO)
    chaveFormatada: '+55 (11) 95930-4102',
    tipo: 'telefone',
    nome: 'GABRIEL VALEMTIM RIBEIRO',  // até 25 letras, sem acento
    cidade: 'SAO PAULO'                // até 15 letras, sem acento
  },
  foro: 'São Paulo/SP',
  versaoContrato: '2.0'
};

window.PLANOS = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    valor: 600.00,
    selo: 'Ótimo para começar',
    chamada: 'Presença profissional para o seu negócio',
    resumo: 'Site profissional de uma página para apresentar o seu negócio e levar clientes direto para o WhatsApp.',
    destaques: [
      'Site de 1 página com até 6 seções',
      'Design personalizado com a sua marca',
      'Perfeito no celular, tablet e computador',
      'Botões e formulário direto no WhatsApp',
      'Instagram e mapa do Google integrados',
      'Otimização básica para o Google',
      'Domínio .com.br grátis por 1 ano',
      'Entrega em até 7 dias úteis'
    ],
    entregas: [
      'Site de 1 página (one-page) com até 6 seções, como início, sobre, serviços, galeria, dúvidas e contato',
      'Design profissional personalizado com as cores e o logotipo da marca da CONTRATANTE',
      'Layout adaptado para celular, tablet e computador',
      'Botões e formulário que levam o cliente direto ao WhatsApp da CONTRATANTE',
      'Integração com Instagram e mapa do Google',
      'Otimização básica para buscadores (SEO): título, descrição e imagem de compartilhamento',
      'Registro de domínio .com.br (ou .com) por 1 ano',
      'Publicação em hospedagem em nuvem com certificado de segurança (https)'
    ],
    naoInclui: [
      'Loja online e carrinho de compras',
      'Pagamentos dentro do site',
      'Páginas além da página única contratada',
      'Vídeo comercial'
    ],
    paginas: '1 página com até 6 seções',
    revisoes: 2,
    prazo: 7,
    suporte: 30
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    valor: 999.99,
    selo: 'Top · Para vender muito online',
    chamada: 'Loja online completa para vender todos os dias',
    resumo: 'O plano mais completo da Webora: site com loja online, pagamento por Pix e cartão e tudo o que a sua empresa precisa para vender pela internet.',
    destaques: [
      'Tudo do Essencial, e mais:',
      'Loja online com carrinho de compras',
      'Pagamento por Pix e cartão no site',
      'Até 8 páginas e 30 produtos cadastrados',
      'Design premium com animações',
      'Pixel da Meta e Google Analytics',
      'Vídeo comercial para Reels e Status',
      '90 dias de suporte prioritário'
    ],
    entregas: [
      'Tudo o que está incluído no plano Essencial',
      'Site com até 8 páginas (por exemplo: início, sobre, loja, produto, carrinho, contato e políticas)',
      'Loja online com catálogo de produtos, carrinho de compras e finalização do pedido',
      'Pagamento online por Pix e cartão, integrado a um intermediador de pagamento em nome da CONTRATANTE (por exemplo, Mercado Pago)',
      'Cadastro inicial de até 30 produtos, com fotos, descrições e preços fornecidos pela CONTRATANTE',
      'Opção de pedido pelo WhatsApp com a mensagem do carrinho pronta',
      'Design premium com animações',
      'Otimização para buscadores focada em vendas e cadastro no Google Search Console',
      'Instalação do Pixel da Meta e do Google Analytics',
      '1 (um) vídeo comercial vertical de até 30 segundos para Reels, Stories e Status',
      'Registro de domínio .com.br (ou .com) por 1 ano',
      'Publicação em hospedagem em nuvem com certificado de segurança (https)'
    ],
    naoInclui: [
      'Gestão de anúncios pagos',
      'Cadastro de produtos além dos 30 iniciais',
      'Taxas cobradas pelo intermediador de pagamento',
      'Produção de fotos profissionais dos produtos'
    ],
    paginas: 'até 8 páginas',
    revisoes: 4,
    prazo: 15,
    suporte: 90
  }
};

/* Linhas da tabela de comparação: [item, Essencial, Pro]. true = incluído, false = não incluído */
window.COMPARATIVO = [
  ['Páginas', '1 página (até 6 seções)', 'Até 8 páginas'],
  ['Design personalizado com a sua marca', true, 'Premium, com animações'],
  ['Celular, tablet e computador', true, true],
  ['WhatsApp integrado', true, true],
  ['Instagram e mapa do Google', true, true],
  ['Otimização para o Google (SEO)', 'Básica', 'Para vendas + Search Console'],
  ['Domínio .com.br por 1 ano', true, true],
  ['Hospedagem com https', true, true],
  ['Loja online com carrinho', false, true],
  ['Pagamento por Pix e cartão no site', false, true],
  ['Produtos cadastrados', false, 'Até 30'],
  ['Pixel da Meta e Google Analytics', false, true],
  ['Vídeo comercial para Reels', false, true],
  ['Rodadas de revisão', '2', '4'],
  ['Prazo de entrega', 'Até 7 dias úteis', 'Até 15 dias úteis'],
  ['Suporte após a entrega', '30 dias', '90 dias, prioritário']
];
