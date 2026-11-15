# Webora

A página inicial apresenta os serviços da Webora, as vantagens, uma vitrine de projetos filtrável e os planos com links de orçamento pelo WhatsApp. O portfólio usa capturas para computador e celular em molduras 3D.

Identidade em branco e azul royal (#233DEA), com a fonte Source Sans 3.

## Como alterar preços, itens, prazos e projetos

Tudo fica em **`assets/js/config.js`** (dados usados pelo contrato, pelo PDF, pelo Pix e pela conferência no servidor):

- `WEBORA`: dados da empresa (MEI, CNPJ, endereço, WhatsApp e chave Pix)
- `PLANOS`: nome, preço **em centavos** (`centavos: 59999` = R$ 599,99), selo da oferta, chamada, os três recursos com ícone do topo do card (`chaves`), itens do card, entregas do contrato, prazo, revisões e suporte
- `COMPARATIVO`: linhas da tabela de comparação, em grupos (revisões, prazo e suporte saem de `PLANOS`)
- `PROJETOS`: portfólio. os projetos e suas capturas são exibidos na vitrine

Atualize os cards, links e dados estruturados em index.html junto com as alterações de preço, contato ou portfólio. Rode npm test para conferir a consistência com os dados cadastrados.

### 50% + 50%

Os valores são calculados em centavos. Quando o total tem centavo ímpar, a entrada fica com o centavo a mais e a soma fecha sempre no total: R$ 599,99 → R$ 300,00 + R$ 299,99 e R$ 999,99 → R$ 500,00 + R$ 499,99.

### Adicionar um projeto

1. Rode `npm run print -- <url do site> <id>`. Ele salva os prints em `assets/img/projetos/` (`<id>.webp`, 1280×800, e `<id>-m.webp`, 450×900 do celular).
2. Copie um dos blocos de `PROJETOS` no `config.js` e troque nome, tipo, categoria, link, descrição e imagens. Os prints mantêm as cores próprias de cada site.
3. Em `plano`, coloque o id do plano indicado para um site parecido (`essencial`, `loja` ou `premium`).

## Estrutura

```
index.html                 página inicial com vitrine, preços e links de contato
404.html                   página de erro
assets/css/vitrine.css     estilos da página inicial e da vitrine 3D
assets/js/vitrine.js       menu móvel, abas de vantagens, filtros e movimento dos dispositivos
assets/css/style.css       estilos compartilhados das demais páginas
assets/js/config.js        dados da Webora, dos planos e dos projetos (edite aqui)
assets/js/contrato.js      contrato, valores, validação, Pix e PDF (navegador e servidor)
contrato.html, admin.html  via de contrato e painel
api/contrato.js            conferência do contrato no servidor (Vercel Function)
assets/img/marca/          símbolo, logotipo preto e branco, arte royal e assinatura do PDF
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
- `sitemap.xml`, `robots.txt`, Open Graph, Twitter/X Cards e dados estruturados de contato e planos da Webora.
- As imagens ficam 7 dias em cache no navegador (`vercel.json`). Ao trocar uma imagem, salve com outro nome ou aumente o número de versão (`?v=6`) no endereço.

Publicação: cada `git push` na branch `main` atualiza o site na Vercel.
