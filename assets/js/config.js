/* =========================================================
   Webora — dados da empresa, dos planos e dos projetos
   Edite aqui: preços, itens dos planos, prazos, contatos e portfólio.
   Tudo no site e no contrato é gerado a partir deste arquivo.
   (Se mudar os preços, atualize também a <meta name="description"> do index.html.)
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
  versaoContrato: '3.1'
};

/* Planos, na ordem em que aparecem no site.
   prazo                     → dias úteis para a entrega
   prazoMax                  → teto do prazo em alta demanda ou problemas técnicos (aparece no site e no contrato)
   destaque: true            → card em azul ("Recomendado") e opção já marcada na contratação
   loja: true                → o contrato pede a lista de produtos
   suportePrioritario: true  → o contrato cita atendimento prioritário */
window.PLANOS = {
  essencial: {
    id: 'essencial',
    nome: 'Essencial',
    artigo: 'o',
    valor: 597.00,
    selo: 'Para começar',
    chamada: 'Uma página profissional para o cliente encontrar você e chamar no WhatsApp',
    ideal: 'autônomos, prestadores de serviço e negócios locais',
    resumo: 'Site profissional de uma página para apresentar o seu negócio e levar clientes direto para o WhatsApp.',
    destaques: [
      'Site de 1 página com até 6 seções',
      'Design personalizado com a sua marca',
      'Perfeito no celular, tablet e computador',
      'Botões e formulário direto no WhatsApp',
      'Instagram e mapa do Google integrados',
      'Otimização básica para o Google',
      'Domínio .com.br grátis por 1 ano'
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
      'Páginas além da página única contratada',
      'Loja online e carrinho de compras',
      'Pagamentos dentro do site',
      'Vídeo comercial'
    ],
    paginas: '1 página com até 6 seções',
    revisoes: 2,
    prazo: 1,
    prazoMax: 3,
    suporte: 30
  },
  profissional: {
    id: 'profissional',
    nome: 'Profissional',
    artigo: 'o',
    valor: 997.00,
    selo: 'Recomendado',
    destaque: true,
    chamada: 'Site completo, com várias páginas, para a sua empresa passar confiança',
    ideal: 'empresas, clínicas, restaurantes e escritórios',
    resumo: 'Site institucional completo, com várias páginas, design premium e as ferramentas para a sua empresa ser encontrada no Google e receber pedidos de orçamento.',
    destaques: [
      'Tudo do Essencial, e mais:',
      'Site com até 5 páginas',
      'Design premium com animações',
      'Galeria, cardápio ou tabela de preços',
      'SEO em todas as páginas + Search Console',
      'Pixel da Meta e Google Analytics'
    ],
    entregas: [
      'Tudo o que está incluído no plano Essencial',
      'Site com até 5 páginas (por exemplo: início, sobre, serviços, galeria e contato)',
      'Design premium com animações',
      'Uma seção de conteúdo sob medida, como galeria de fotos ou de projetos, cardápio ou tabela de serviços e preços, com o conteúdo fornecido pela CONTRATANTE',
      'Otimização para buscadores (SEO) em todas as páginas e cadastro no Google Search Console',
      'Instalação do Pixel da Meta e do Google Analytics',
      'Registro de domínio .com.br (ou .com) por 1 ano',
      'Publicação em hospedagem em nuvem com certificado de segurança (https)'
    ],
    naoInclui: [
      'Loja online e carrinho de compras',
      'Pagamentos dentro do site',
      'Vídeo comercial',
      'Gestão de anúncios pagos'
    ],
    paginas: 'até 5 páginas',
    revisoes: 3,
    prazo: 1,
    prazoMax: 3,
    suporte: 60
  },
  loja: {
    id: 'loja',
    nome: 'Loja Online',
    artigo: 'a',
    valor: 1597.00,
    selo: 'Para vender online',
    loja: true,
    suportePrioritario: true,
    chamada: 'Loja completa, com carrinho e pagamento no site, para vender todos os dias',
    ideal: 'quem vende produtos e quer receber pedidos pelo site',
    resumo: 'O plano mais completo da Webora: site com loja online, pagamento por Pix e cartão e tudo o que a sua empresa precisa para vender pela internet.',
    destaques: [
      'Tudo do Profissional, e mais:',
      'Loja online com carrinho de compras',
      'Pagamento por Pix e cartão no site',
      'Até 8 páginas e 30 produtos cadastrados',
      'Pedido pelo WhatsApp com o carrinho pronto',
      'Vídeo comercial para Reels e Status',
      'Suporte prioritário'
    ],
    entregas: [
      'Tudo o que está incluído no plano Profissional',
      'Site com até 8 páginas (por exemplo: início, sobre, loja, produto, carrinho, contato e políticas)',
      'Loja online com catálogo de produtos, carrinho de compras e finalização do pedido',
      'Pagamento online por Pix e cartão, integrado a um intermediador de pagamento em nome da CONTRATANTE (por exemplo, Mercado Pago)',
      'Cadastro inicial de até 30 produtos, com fotos, descrições e preços fornecidos pela CONTRATANTE',
      'Opção de pedido pelo WhatsApp com a mensagem do carrinho pronta',
      'Otimização para buscadores focada em vendas',
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
    prazo: 1,
    prazoMax: 3,
    suporte: 90
  }
};

/* Linhas da tabela de comparação: [item, Essencial, Profissional, Loja Online].
   true = incluído, false = não incluído */
window.COMPARATIVO = [
  ['Páginas', '1 página (até 6 seções)', 'Até 5 páginas', 'Até 8 páginas'],
  ['Design personalizado com a sua marca', true, 'Premium, com animações', 'Premium, com animações'],
  ['Celular, tablet e computador', true, true, true],
  ['WhatsApp integrado', true, true, true],
  ['Instagram e mapa do Google', true, true, true],
  ['Domínio .com.br por 1 ano', true, true, true],
  ['Hospedagem com https', true, true, true],
  ['Otimização para o Google (SEO)', 'Básica', 'Completa + Search Console', 'Para vendas + Search Console'],
  ['Galeria, cardápio ou tabela de preços', false, true, true],
  ['Pixel da Meta e Google Analytics', false, true, true],
  ['Loja online com carrinho', false, false, true],
  ['Pagamento por Pix e cartão no site', false, false, true],
  ['Produtos cadastrados', false, false, 'Até 30'],
  ['Vídeo comercial para Reels', false, false, true],
  ['Rodadas de revisão', '2', '3', '4'],
  ['Prazo de entrega', '1 dia útil', '1 dia útil', '1 dia útil'],
  ['Suporte após a entrega', '30 dias', '60 dias', '90 dias, prioritário']
];

/* Portfólio. O primeiro projeto aparece em destaque (card grande).
   Para adicionar um projeto: salve um print de 1280×800 em assets/img/projetos/
   e copie um dos blocos abaixo. "plano" é o id do plano indicado para um site parecido. */
window.PROJETOS = [
  {
    id: 'kivora',
    nome: 'Kivora',
    tipo: 'Loja online',
    segmento: 'Marketplace de eletrônicos, casa e moda',
    url: 'https://www.kivorashop.com.br/',
    dominio: 'kivorashop.com.br',
    plano: 'loja',
    descricao: 'Loja online completa, com busca, departamentos, ofertas relâmpago, cupons, favoritos e carrinho de compras. No celular, funciona como um aplicativo.',
    recursos: ['Busca e departamentos', 'Ofertas e cupons', 'Carrinho e favoritos', 'Conta do cliente'],
    imagem: 'assets/img/projetos/kivora.webp',
    imagemCelular: 'assets/img/projetos/kivora-m.webp'
  },
  {
    id: 'jesusnewjob',
    nome: 'Jesus New Job',
    tipo: 'Site institucional',
    segmento: 'Comunicação visual · São Paulo',
    url: 'https://www.jesusnewjob.com.br/',
    dominio: 'jesusnewjob.com.br',
    plano: 'profissional',
    descricao: 'Site institucional para empresa de comunicação visual, com serviços, galeria de projetos, bastidores e pedido de orçamento.',
    recursos: ['Galeria de projetos', 'Bastidores', 'Pedido de orçamento'],
    imagem: 'assets/img/projetos/jesusnewjob.webp',
    imagemCelular: 'assets/img/projetos/jesusnewjob-m.webp'
  },
  {
    id: 'gvclean',
    nome: 'GVClean',
    tipo: 'Site de serviços',
    segmento: 'Higienização de estofados · São Paulo',
    url: 'https://gvclean.vercel.app/',
    dominio: 'gvclean.vercel.app',
    plano: 'profissional',
    descricao: 'Site de serviços com tabela de valores, antes e depois interativo e orçamento direto pelo WhatsApp.',
    recursos: ['Tabela de valores', 'Antes e depois interativo', 'Orçamento pelo WhatsApp'],
    imagem: 'assets/img/projetos/gvclean.webp',
    imagemCelular: 'assets/img/projetos/gvclean-m.webp'
  },
  {
    id: 'pointsantana',
    nome: 'Point Santana',
    tipo: 'Site de restaurante',
    segmento: 'Restaurante e pizzaria · Santana, São Paulo',
    url: 'https://point-santana-site.vercel.app/',
    dominio: 'point-santana-site.vercel.app',
    plano: 'profissional',
    descricao: 'Site de restaurante com cardápio completo, fotos do espaço, avaliações de clientes e pedido pelo WhatsApp.',
    recursos: ['Cardápio completo', 'Avaliações', 'Pedido pelo WhatsApp'],
    imagem: 'assets/img/projetos/pointsantana.webp',
    imagemCelular: 'assets/img/projetos/pointsantana-m.webp'
  },
  {
    id: 'divasbags',
    nome: 'Divas Bags Eco',
    tipo: 'Loja online',
    segmento: 'Bolsas e moda feminina',
    url: 'https://divasbagseco.vercel.app/',
    dominio: 'divasbagseco.vercel.app',
    plano: 'loja',
    descricao: 'Loja de bolsas, roupas e acessórios femininos, com categorias, vitrine de novidades, favoritos e sacola de compras.',
    recursos: ['Categorias e novidades', 'Favoritos e sacola', 'Acompanhamento de pedido'],
    imagem: 'assets/img/projetos/divasbags.webp',
    imagemCelular: 'assets/img/projetos/divasbags-m.webp'
  }
];
