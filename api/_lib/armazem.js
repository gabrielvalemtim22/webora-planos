/* =========================================================
   Webora — onde ficam os contratos assinados
   Na Vercel: Blob PRIVADO (só as funções do site leem e gravam; o token vem
   da própria Vercel, em BLOB_READ_WRITE_TOKEN). No computador (npm run dev e
   testes): a pasta indicada em WEBORA_DADOS_LOCAL.
   Arquivos:
     contratos/<nº>.json                    dados da contratação (pequeno, lido pela lista do painel)
     assinaturas/<nº>.json                  texto assinado e imagem da assinatura
     status/<nº>/<quando>-<status>.json     histórico: cada mudança é um arquivo novo
   Pastas com _ dentro de api/ não viram funções nem páginas na Vercel.
   ========================================================= */
const fs = require('node:fs/promises');
const path = require('node:path');

function local(dir) {
  const arq = p => path.join(dir, ...p.split('/'));
  return {
    async salvar(p, obj) {
      await fs.mkdir(path.dirname(arq(p)), { recursive: true });
      await fs.writeFile(arq(p), JSON.stringify(obj));
    },
    async ler(p) {
      try { return JSON.parse(await fs.readFile(arq(p), 'utf8')); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    },
    async listar(prefixo) {
      const out = [];
      async function walk(d, rel) {
        let itens;
        try { itens = await fs.readdir(d, { withFileTypes: true }); } catch (e) { return; }
        for (const it of itens) {
          if (it.isDirectory()) await walk(path.join(d, it.name), rel + it.name + '/');
          else out.push(rel + it.name);
        }
      }
      await walk(arq(prefixo.replace(/\/$/, '')), prefixo.replace(/\/?$/, '/'));
      return out;
    },
    async apagar(caminhos) {
      await Promise.all(caminhos.map(p => fs.rm(arq(p), { force: true })));
    }
  };
}

function nuvem() {
  const blob = require('@vercel/blob');
  return {
    async salvar(p, obj) {
      await blob.put(p, JSON.stringify(obj), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true });
    },
    async ler(p) {
      const r = await blob.get(p, { access: 'private', useCache: false });
      if (!r || r.statusCode !== 200) return null;
      return JSON.parse(await new Response(r.stream).text());
    },
    async listar(prefixo) {
      const out = [];
      let cursor;
      do {
        const r = await blob.list({ prefix: prefixo, cursor, limit: 1000 });
        r.blobs.forEach(b => out.push(b.pathname));
        cursor = r.hasMore ? r.cursor : undefined;
      } while (cursor);
      return out;
    },
    async apagar(caminhos) {
      if (caminhos.length) await blob.del(caminhos);
    }
  };
}

// null quando o armazenamento não está configurado (o site continua funcionando sem guardar)
function armazem() {
  if (process.env.WEBORA_DADOS_LOCAL) return local(process.env.WEBORA_DADOS_LOCAL);
  if (process.env.BLOB_READ_WRITE_TOKEN) return nuvem();
  return null;
}

// lê vários arquivos sem abrir dezenas de conexões de uma vez
async function lerVarios(loja, caminhos, ao = 8) {
  const out = new Array(caminhos.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(ao, caminhos.length) }, async () => {
    while (i < caminhos.length) { const k = i++; out[k] = await loja.ler(caminhos[k]); }
  }));
  return out;
}

module.exports = { armazem, lerVarios };
