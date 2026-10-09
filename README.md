# Webora — Planos e contratação online

Página da **Webora** com os planos **Essencial (R$ 600)** e **Pro (R$ 999,99)**. O cliente escolhe o plano, preenche os dados, lê e **assina o contrato online** (assinatura desenhada), recebe o **QR Code Pix** com o valor exato, baixa o **contrato em PDF** e envia tudo para a Webora pelo WhatsApp.

## Como alterar preços, itens e prazos

Tudo fica em **`assets/js/config.js`**:

- `WEBORA`: dados da empresa (MEI, CNPJ, endereço, WhatsApp e chave Pix)
- `PLANOS`: nome, valor, itens do card, entregas do contrato, prazo, revisões e suporte de cada plano
- `COMPARATIVO`: linhas da tabela de comparação

O site, a tabela, o contrato e o PDF são gerados a partir desse arquivo.

## Estrutura

```
index.html               página
assets/css/style.css     visual
assets/js/config.js      dados da Webora e dos planos (edite aqui)
assets/js/contrato.js    texto do contrato, validação de CPF/CNPJ, Pix e PDF
assets/js/app.js         página, assistente de contratação e assinatura
assets/img/              logo, ícones e imagem de compartilhamento
```

## Observações

- Não há servidor: o contrato é gerado no navegador do cliente. A Webora recebe o contrato quando o cliente envia o PDF e o comprovante pelo WhatsApp.
- Cada contrato tem número (ex.: `WB-261009-AB12`) e código de verificação SHA-256 do texto assinado.
- O Pix é um BR Code estático com o valor e o número do contrato como referência.
- O modelo de contrato deve ser revisado por um advogado antes do uso definitivo.

Publicação: cada `git push` na branch `main` atualiza o site na Vercel.
