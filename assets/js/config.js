/* =========================================================
   Webora — dados da empresa, dos planos e dos projetos
   FONTE ÚNICA: cards, tabela comparativa, contratação, contrato, PDF,
   Pix e conferência no servidor (api/contrato.js) leem daqui.

   Valores sempre em CENTAVOS (inteiros): R$ 599,99 → 59999.
   Ao mudar um preço, rode `npm test`: ele aponta os textos estáticos do
   index.html (descrição, dados estruturados) que precisam acompanhar.
   ========================================================= */
(function (root, factory) {
  const data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else Object.assign(root, data);
})(typeof self !== 'undefined' ? self : this, function () {
  const SITE = {
    url: 'https://www.weborasites.com.br',
    nome: 'Webora'
  };

  const WEBORA = {
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
    versaoContrato: '4.0'
  };

  /* Planos, na ordem em que aparecem no site (o do meio é o destaque).
     centavos            → preço em centavos (inteiro), pagamento único
     oferta              → selo da oferta junto do preço
     chamada             → frase de destaque do card ({preco} vira o valor do plano)
     chaves              → três recursos com ícone no topo do card (ícones do index.html: #i-<icone>)
     destaques           → itens do card (lista com check)
     entregas/naoInclui  → Anexo I do contrato
     prazo / prazoMax    → dias úteis de entrega / teto em alta demanda ou problemas técnicos
     destaque: true      → card azul e opção já marcada na contratação
     loja: true          → o contrato pede a lista de produtos
     premium: true       → card preto e cláusulas do nome comercial e do escopo definido no briefing
     suportePrioritario  → o contrato cita atendimento prioritário */
  const PLANOS = {
    essencial: {
      id: 'essencial',
      nome: 'Essencial',
      nomeCurto: 'Essencial',
      artigo: 'o',
      centavos: 59999,
      selo: 'Para começar',
      oferta: 'Oferta especial',
      botao: 'Escolher Essencial',
      chaves: [{ icone: 'doc', texto: 'Landing page' }, { icone: 'wa', texto: 'WhatsApp' }, { icone: 'globe', texto: 'Domínio por 1 ano' }],
      descricao: 'Uma presença digital profissional para clientes encontrarem sua empresa e entrarem em contato rapidamente.',
      ideal: 'autônomos, prestadores de serviço e negócios locais que querem começar',
      resumo: 'Landing page profissional de uma página para apresentar a empresa e levar o cliente direto para o WhatsApp.',
      destaques: [
        'Landing page profissional de alta qualidade',
        'Uma página com até seis seções',
        'Design personalizado para a sua marca',
        'Perfeito no celular, tablet e computador',
        'Integração com WhatsApp',
        'Botões de Instagram e redes sociais',
        'Localização pelo Google Maps',
        'SEO básico',
        'Domínio .com.br incluído por 1 ano'
      ],
      entregas: [
        'Landing page profissional de 1 (uma) página com até 6 (seis) seções, como início, sobre, serviços, galeria, dúvidas e contato',
        'Design personalizado com as cores e o logotipo da marca da CONTRATANTE',
        'Layout responsivo para celular, tablet e computador',
        'Integração com o WhatsApp da CONTRATANTE: botões e formulário que abrem a conversa',
        'Botões para o Instagram e demais redes sociais da CONTRATANTE',
        'Localização da empresa pelo Google Maps',
        'Otimização básica para buscadores (SEO): título, descrição e imagem de compartilhamento',
        'Registro de domínio .com.br (ou .com) por 1 (um) ano',
        'Publicação em hospedagem em nuvem com certificado de segurança (https)'
      ],
      naoInclui: [
        'Páginas além da página única contratada',
        'Loja virtual, carrinho de compras e pagamentos dentro do site',
        'Gestão de anúncios pagos',
        'Produção de fotos e textos'
      ],
      paginas: '1 (uma) página com até 6 (seis) seções',
      revisoes: 2,
      prazo: 1,
      prazoMax: 3,
      suporte: 30
    },
    loja: {
      id: 'loja',
      nome: 'Loja Online',
      nomeCurto: 'Loja Online',
      artigo: 'a',
      centavos: 59999,
      selo: 'Mais escolhido',
      oferta: 'Oferta especial',
      botao: 'Escolher Loja Online',
      chaves: [{ icone: 'box', texto: 'Catálogo' }, { icone: 'cart', texto: 'Carrinho' }, { icone: 'card', texto: 'Pix e cartão' }],
      destaque: true,
      loja: true,
      descricao: 'Uma estrutura completa de vendas online para transformar visitantes em clientes.',
      ideal: 'quem quer vender produtos ou serviços pela internet com praticidade e segurança',
      resumo: 'Estrutura completa de vendas online: loja virtual, landing page premium, checkout com Pix e cartão e as ferramentas para vender pela internet.',
      lista: 'Tudo do Essencial, e mais:',
      destaques: [
        'Loja virtual moderna',
        'Landing page premium de alta conversão',
        'Design personalizado de alto padrão',
        'Catálogo e página de cada produto',
        'Busca e categorias',
        'Carrinho de compras e checkout funcional',
        'Pix e cartão pelo provedor de pagamento configurado',
        'Cadastro inicial de até 30 produtos',
        'Gestão de produtos e estoque',
        'SEO avançado + Google Search Console',
        'Google Analytics e Pixel da Meta, quando configurados'
      ],
      entregas: [
        'Tudo o que está incluído no plano Essencial',
        'Loja virtual moderna com até 8 (oito) páginas-modelo, como início, catálogo, produto, carrinho, checkout, contato e políticas, e uma página para cada produto cadastrado',
        'Landing page premium de alta conversão',
        'Design personalizado de alto padrão',
        'Catálogo de produtos com busca e categorias',
        'Carrinho de compras e checkout funcional',
        'Pagamento online por Pix e cartão, integrado a um provedor de pagamento (por exemplo, Mercado Pago) em conta da CONTRATANTE',
        'Cadastro inicial de até 30 (trinta) produtos, com fotos, descrições e preços fornecidos pela CONTRATANTE',
        'Gestão de produtos e estoque',
        'Integração com o WhatsApp da CONTRATANTE',
        'SEO avançado e cadastro no Google Search Console',
        'Instalação do Google Analytics e do Pixel da Meta, quando a CONTRATANTE fornecer ou autorizar a criação das contas',
        'Registro de domínio .com.br (ou .com) por 1 (um) ano',
        'Publicação em hospedagem em nuvem com certificado de segurança (https)'
      ],
      naoInclui: [
        'Cadastro de produtos além dos 30 iniciais',
        'Taxas cobradas pelo provedor de pagamento',
        'Gestão de anúncios pagos',
        'Produção de fotos profissionais dos produtos'
      ],
      paginas: 'loja com até 8 (oito) páginas-modelo, mais a página de cada produto cadastrado',
      revisoes: 3,
      prazo: 1,
      prazoMax: 3,
      suporte: 60
    },
    premium: {
      id: 'premium',
      nome: 'Sites de 10 Mil Profissionais',
      nomeCurto: 'Premium',
      artigo: 'o',
      centavos: 99999,
      selo: 'Experiência premium',
      oferta: 'Oferta especial',
      chamada: 'Seu projeto de alto padrão por {preco}.',
      botao: 'Escolher plano Premium',
      chaves: [{ icone: 'spark', texto: 'Design exclusivo' }, { icone: 'layers', texto: 'Até 12 páginas' }, { icone: 'bars', texto: 'Animações' }],
      premium: true,
      suportePrioritario: true,
      descricao: 'Uma experiência digital exclusiva para empresas que exigem sofisticação, velocidade, tecnologia e uma presença online de alto padrão.',
      ideal: 'empresas, clínicas, escritórios e marcas que querem autoridade e máxima performance',
      resumo: 'O plano de maior nível da Webora: site exclusivo de múltiplas páginas, com design premium, animações refinadas, SEO técnico avançado e os recursos da Loja Online que se aplicarem ao projeto.',
      lista: 'Tudo da Loja Online, e mais:',
      nota: 'Recursos de loja incluídos quando o projeto vender produtos.',
      destaques: [
        'Design premium totalmente personalizado',
        'Layout exclusivo, sem aparência de template',
        'Landing page de altíssima conversão',
        'Até 12 páginas, com escopo definido no contrato',
        'Páginas institucionais completas',
        'Portfólio ou catálogo interativo',
        'Animações cinematográficas e transições avançadas',
        'Painel administrativo, quando previsto no escopo',
        'SEO técnico avançado',
        'Integrações de analytics e marketing',
        'Otimização avançada de desempenho',
        'Segurança e acessibilidade'
      ],
      entregas: [
        'Todos os recursos do plano Loja Online que se aplicarem ao projeto da CONTRATANTE (por exemplo, loja virtual e checkout quando a CONTRATANTE vender produtos pelo site)',
        'Design premium totalmente personalizado, com layout exclusivo e sem aparência de template',
        'Landing page de altíssima conversão',
        'Estrutura de múltiplas páginas, até 12 (doze) páginas, com o mapa de páginas definido no briefing',
        'Páginas institucionais completas',
        'Portfólio ou catálogo interativo',
        'Animações de interface refinadas, animações cinematográficas discretas e transições avançadas',
        'Painel administrativo, quando necessário ao projeto e previsto no escopo definido no briefing',
        'SEO técnico avançado e cadastro no Google Search Console',
        'Integrações de analytics e marketing, como Google Analytics, Google Tag Manager e Pixel da Meta, com contas fornecidas ou autorizadas pela CONTRATANTE',
        'Otimização avançada de desempenho',
        'Boas práticas de segurança e de acessibilidade',
        'Registro de domínio .com.br (ou .com) por 1 (um) ano',
        'Publicação em hospedagem em nuvem com certificado de segurança (https)'
      ],
      naoInclui: [
        'Páginas além das 12 (doze) previstas e funcionalidades fora do escopo definido no briefing',
        'Taxas cobradas por provedores de pagamento e por ferramentas pagas de terceiros',
        'Gestão de anúncios pagos',
        'Produção de fotos e vídeos profissionais'
      ],
      paginas: 'até 12 (doze) páginas, com o mapa de páginas definido no briefing',
      revisoes: 4,
      prazo: 1,
      prazoMax: 3,
      suporte: 90
    }
  };

  /* Tabela "Tudo o que vem em cada plano", em grupos.
     Em cada linha: true = incluído, false = não incluído, texto = detalhe.
     As linhas de revisões, prazo e suporte são geradas a partir de PLANOS. */
  const COMPARATIVO = [
    { grupo: 'Estrutura e design', linhas: [
      { item: 'Estrutura do site', essencial: '1 página, até 6 seções', loja: 'Loja com até 8 páginas-modelo + página de cada produto', premium: 'Até 12 páginas, definidas no contrato' },
      { item: 'Landing page', essencial: 'Profissional', loja: 'Premium, de alta conversão', premium: 'Altíssima conversão' },
      { item: 'Design', essencial: 'Personalizado para a marca', loja: 'Personalizado de alto padrão', premium: 'Premium exclusivo, sem template' },
      { item: 'Celular, tablet e computador', essencial: true, loja: true, premium: true }
    ] },
    { grupo: 'Contato e presença', linhas: [
      { item: 'Integração com WhatsApp', essencial: true, loja: true, premium: true },
      { item: 'Instagram e redes sociais', essencial: true, loja: true, premium: true },
      { item: 'Localização pelo Google Maps', essencial: true, loja: true, premium: true },
      { item: 'Domínio .com.br por 1 ano', essencial: true, loja: true, premium: true },
      { item: 'Hospedagem em nuvem com https', essencial: true, loja: true, premium: true }
    ] },
    { grupo: 'Google e marketing', linhas: [
      { item: 'SEO', essencial: 'Básico', loja: 'Avançado + Search Console', premium: 'Técnico avançado + Search Console' },
      { item: 'Google Analytics e Pixel da Meta', essencial: false, loja: 'Quando configurados', premium: 'Analytics e marketing integrados' }
    ] },
    { grupo: 'Vendas online', linhas: [
      { item: 'Loja virtual, catálogo e carrinho', essencial: false, loja: true, premium: 'Quando aplicável' },
      { item: 'Checkout com Pix e cartão', essencial: false, loja: true, premium: 'Quando aplicável' },
      { item: 'Produtos cadastrados', essencial: false, loja: 'Até 30', premium: 'Até 30, quando aplicável' },
      { item: 'Gestão de produtos e estoque', essencial: false, loja: true, premium: 'Quando aplicável' },
      { item: 'Busca e categorias', essencial: false, loja: true, premium: 'Quando aplicável' }
    ] },
    { grupo: 'Experiência premium', linhas: [
      { item: 'Páginas institucionais completas', essencial: false, loja: false, premium: true },
      { item: 'Portfólio ou catálogo interativo', essencial: false, loja: false, premium: true },
      { item: 'Animações e transições avançadas', essencial: false, loja: false, premium: true },
      { item: 'Painel administrativo', essencial: false, loja: false, premium: 'Quando previsto no escopo' },
      { item: 'Otimização avançada de desempenho', essencial: false, loja: false, premium: true },
      { item: 'Segurança e acessibilidade avançadas', essencial: false, loja: false, premium: true }
    ] }
  ];

  /* Portfólio. O primeiro projeto aparece em destaque (card grande).
     Para adicionar um projeto: rode `npm run print -- <url> <id>` (gera os prints em
     assets/img/projetos/) e copie um dos blocos abaixo. "plano" é o id do plano indicado para um site parecido.
     "categoria" alimenta o filtro do portfólio: 'loja' (Lojas online) ou 'institucional' (Institucionais). */
  const PROJETOS = [
    {
      id: 'kivora',
      nome: 'Kivora',
      tipo: 'Loja online',
      categoria: 'loja',
      segmento: 'Marketplace de eletrônicos, casa e moda',
      url: 'https://www.kivorashop.com.br/',
      dominio: 'kivorashop.com.br',
      plano: 'loja',
      descricao: 'Loja online completa, com busca, departamentos, ofertas relâmpago, cupons, favoritos e carrinho de compras. No celular, funciona como um aplicativo.',
      recursos: ['Busca e departamentos', 'Ofertas e cupons', 'Carrinho e favoritos', 'Conta do cliente'],
      imagem: '/assets/img/projetos/kivora.webp?v=2',
      imagemCelular: '/assets/img/projetos/kivora-m.webp?v=2'
    },
    {
      id: 'jesusnewjob',
      nome: 'Jesus New Job',
      tipo: 'Site institucional',
      categoria: 'institucional',
      segmento: 'Comunicação visual · São Paulo',
      url: 'https://www.jesusnewjob.com.br/',
      dominio: 'jesusnewjob.com.br',
      plano: 'essencial',
      descricao: 'Site institucional para empresa de comunicação visual, com serviços, galeria de projetos, bastidores e pedido de orçamento.',
      recursos: ['Galeria de projetos', 'Bastidores', 'Pedido de orçamento'],
      imagem: '/assets/img/projetos/jesusnewjob.webp',
      imagemCelular: '/assets/img/projetos/jesusnewjob-m.webp'
    },
    {
      id: 'oficinakeke',
      nome: 'Oficina Mecânica Keke',
      tipo: 'Site de oficina',
      categoria: 'institucional',
      segmento: 'Oficina mecânica · Revisão, motor, freios e suspensão',
      url: 'https://oficina-keke.vercel.app/',
      dominio: 'oficina-keke.vercel.app',
      plano: 'essencial',
      descricao: 'Site de uma página para oficina mecânica, com serviços, banners de destaque, passo a passo do atendimento, dúvidas frequentes e orçamento direto pelo WhatsApp.',
      recursos: ['Serviços', 'Banners de destaque', 'Orçamento pelo WhatsApp'],
      imagem: '/assets/img/projetos/oficinakeke.webp',
      imagemCelular: '/assets/img/projetos/oficinakeke-m.webp'
    },
    {
      id: 'conectagoogle',
      nome: 'Conecta Google',
      tipo: 'Site de serviços',
      categoria: 'institucional',
      segmento: 'Google Meu Negócio e plaquinhas NFC',
      url: 'https://conectagoogle.vercel.app/',
      dominio: 'conectagoogle.vercel.app',
      plano: 'essencial',
      descricao: 'Site para quem implanta e atualiza o Google Meu Negócio e vende plaquinhas NFC, com os serviços, os dois tamanhos de plaquinha e um personalizador para o cliente montar a sua.',
      recursos: ['Gestão no Google', 'Plaquinhas NFC', 'Personalizador'],
      imagem: '/assets/img/projetos/conectagoogle.webp',
      imagemCelular: '/assets/img/projetos/conectagoogle-m.webp'
    }
  ];

  return { SITE, WEBORA, PLANOS, COMPARATIVO, PROJETOS };
});
