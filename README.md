# Webora — Projetos, planos e contratação online

Página da **Webora** com a vitrine de **projetos** já publicados e os planos **Essencial (R$ 597)**, **Profissional (R$ 997)** e **Loja Online (R$ 1.597)**. O cliente escolhe o plano, preenche os dados, lê e **assina o contrato online** (assinatura desenhada), recebe o **QR Code Pix** com o valor exato, baixa o **contrato em PDF** e envia tudo para a Webora pelo WhatsApp.

## Como alterar preços, itens, prazos e projetos

Tudo fica em **`assets/js/config.js`**:

- `WEBORA`: dados da empresa (MEI, CNPJ, endereço, WhatsApp e chave Pix)
- `PLANOS`: nome, valor, itens do card, entregas do contrato, prazo, revisões e suporte de cada plano
- `COMPARATIVO`: linhas da tabela de comparação (uma coluna por plano)
- `PROJETOS`: portfólio. O primeiro da lista aparece em destaque

O site, a tabela, o contrato e o PDF são gerados a partir desse arquivo. Se mudar os preços, atualize também a `<meta name="description">` do `index.html` e a primeira linha deste README.

### Adicionar um projeto

1. Salve um print da página inicial em `assets/img/projetos/` (1280×800, de preferência `.webp`).
2. Copie um dos blocos de `PROJETOS` no `config.js` e troque nome, tipo, link, descrição e imagem.
3. Em `plano`, coloque o id do plano indicado para um site parecido (`essencial`, `profissional` ou `loja`).

## Estrutura

```
index.html               página
assets/css/style.css     visual (azul royal, branco e preto)
assets/js/config.js      dados da Webora, dos planos e dos projetos (edite aqui)
assets/js/contrato.js    texto do contrato, validação de CPF/CNPJ, Pix e PDF
assets/js/app.js         página, vitrine de projetos, assistente de contratação e assinatura
assets/img/              logo, ícones e imagem de compartilhamento
assets/img/projetos/     prints dos projetos
```

## Observações

- Não há servidor: o contrato é gerado no navegador do cliente. A Webora recebe o contrato quando o cliente envia o PDF e o comprovante pelo WhatsApp.
- Cada contrato tem número (ex.: `WB-261009-AB12`) e código de verificação SHA-256 do texto assinado.
- O Pix é um BR Code estático com o valor e o número do contrato como referência.
- O modelo de contrato deve ser revisado por um advogado antes do uso definitivo.
- As imagens ficam 7 dias em cache no navegador (`vercel.json`). Ao trocar uma imagem, salve com outro nome ou acrescente `?v=3` no endereço dentro do `index.html`.

Publicação: cada `git push` na branch `main` atualiza o site na Vercel.
