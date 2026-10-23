# Webora: projetos, planos e contratação online

Site da **Webora** (https://www.weborasites.com.br) com o **portfólio** de projetos publicados e os planos **Essencial (R$ 599,99)**, **Loja Online (R$ 599,99)** e **Sites de 10 Mil Profissionais (R$ 999,99)**, todos em pagamento único, sem mensalidade da Webora. O cliente escolhe o plano, preenche os dados, lê e **assina o contrato online** (assinatura desenhada), recebe o **QR Code Pix** com o valor exato, baixa o **contrato em PDF** e envia tudo para a Webora pelo WhatsApp.

Identidade: azul royal `#0754FA`, preto `#080808` e branco, com cinza claro `#F4F6FA`, azul claro `#F0F5FF` e bordas `#E3E7EF`. Sobre o preto, textos pequenos em azul usam `#3D78FF` (contraste 5,1:1). Fonte Plus Jakarta Sans. Formas geométricas em hexágono, como o símbolo.

Ofertas: cada plano mostra os selos "Oferta especial", "Preço único" e "Sem mensalidade da Webora"; o premium destaca "Seu projeto de alto padrão por R$ 999,99." (`chamada` no `config.js`). O site não mostra preço "de" nem contador de urgência.

## Como alterar preços, itens, prazos e projetos

Tudo fica em **`assets/js/config.js`** (fonte única do site, da tabela, do contrato, do PDF, do Pix e da conferência no servidor):

- `WEBORA`: dados da empresa (MEI, CNPJ, endereço, WhatsApp e chave Pix)
- `PLANOS`: nome, preço **em centavos** (`centavos: 59999` = R$ 599,99), selo da oferta, chamada, os três recursos com ícone do topo do card (`chaves`), itens do card, entregas do contrato, prazo, revisões e suporte
- `COMPARATIVO`: linhas da tabela de comparação, em grupos (revisões, prazo e suporte saem de `PLANOS`)
- `PROJETOS`: portfólio. O primeiro da lista aparece em destaque; `categoria` (`loja` ou `institucional`) alimenta o filtro Todos / Lojas online / Institucionais

Depois de mudar um preço, rode `npm test`. O teste aponta os textos estáticos do `index.html` que precisam acompanhar o novo valor: a `<meta name="description">`, os dados estruturados (JSON-LD), o bloco `<noscript>` dos planos e o preço citado nas dúvidas.

### 50% + 50%

Os valores são calculados em centavos. Quando o total tem centavo ímpar, a entrada fica com o centavo a mais e a soma fecha sempre no total: R$ 599,99 → R$ 300,00 + R$ 299,99 e R$ 999,99 → R$ 500,00 + R$ 499,99.

### Adicionar um projeto

1. Rode `npm run print -- <url do site> <id>`. Ele salva os prints em `assets/img/projetos/` (`<id>.webp`, 1280×800, e `<id>-m.webp`, 450×900 do celular).
2. Copie um dos blocos de `PROJETOS` no `config.js` e troque nome, tipo, categoria, link, descrição e imagens. Os prints mantêm as cores próprias de cada site.
3. Em `plano`, coloque o id do plano indicado para um site parecido (`essencial`, `loja` ou `premium`).
4. Atualize o número de projetos no `index.html` (`data-stat="projetos"`); o `npm test` avisa se esquecer.

## Estrutura

```
index.html                 página
404.html                   página de erro
assets/css/style.css       design system e visual
assets/js/config.js        dados da Webora, dos planos e dos projetos (edite aqui)
assets/js/contrato.js      contrato, valores, validação, Pix e PDF (navegador e servidor)
assets/js/app.js           página, vitrine, planos, comparação e assistente de contratação
api/contrato.js            conferência do contrato no servidor (Vercel Function)
assets/img/marca/          símbolo (hexágono com contorno azul) e logotipo (azul+preto e azul+branco)
favicon.ico, icon*.png     ícones da aba, do app e do iPhone (apple-icon.png)
marca/                     imagens originais da marca enviadas pela Webora (não vão para o site)
scripts/                   servidor local, gerador da marca e modelo da imagem de compartilhamento
tests/                     testes (npm test)
```

## Rodar e testar

```bash
npm run dev     # http://localhost:3000, com a função /api/contrato
npm test        # valores, contrato, Pix, consistência dos dados e API
npm run print -- <url> <id>   # prints de um projeto para a vitrine
npm run marca   # regenera logotipo, favicons e assets/img/og.jpg a partir de marca/ (usa o Chrome instalado)
```

## Contratação e conferência no servidor

- O contrato é gerado no navegador do cliente. Cada contrato tem número (ex.: `WB-261020-AB23`) e código de verificação SHA-256 do texto assinado.
- Na assinatura, `POST /api/contrato` recalcula os valores a partir do `config.js` e valida os dados com as mesmas regras do navegador. Se os valores da página estiverem desatualizados, a assinatura é bloqueada e o cliente recarrega a página. Se o servidor não responder, a contratação segue com os valores locais. Nada é armazenado.
- **Recibo assinado (opcional):** crie na Vercel a variável de ambiente `WEBORA_RECIBO_SEGREDO` (um texto longo e aleatório). Com ela, a conferência devolve um recibo HMAC-SHA256 que aparece na tela, no WhatsApp e no PDF. Para conferir um recibo, use `require('./api/contrato.js').recibo(dados, segredo)` com os mesmos dados do contrato.
- O Pix é um BR Code estático com o valor e o número do contrato como referência. O pagamento é confirmado pela Webora; o site não marca nada como pago.
- O cliente pode reabrir o pagamento e o PDF do último contrato assinado no mesmo navegador.
- O modelo de contrato deve ser revisado por um advogado antes do uso definitivo.

## SEO e publicação

- Domínio canônico: `https://www.weborasites.com.br/` (o endereço sem `www` redireciona para ele). O endereço `webora-planos.vercel.app` redireciona para o domínio.
- `sitemap.xml`, `robots.txt`, Open Graph, Twitter/X Cards e dados estruturados (Organization, WebSite e Service com as ofertas).
- As imagens ficam 7 dias em cache no navegador (`vercel.json`). Ao trocar uma imagem, salve com outro nome ou aumente o número de versão (`?v=5`) no endereço.

Publicação: cada `git push` na branch `main` atualiza o site na Vercel.
