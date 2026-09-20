// PDF — documento do orçamento em HTML próprio para impressão (o navegador salva como PDF).
// Sem dependências; o mesmo HTML serve para gerar PDF no servidor no futuro.
import { brl } from '../share/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function documentHtml(res, info = {}, labels = {}, today = new Date()) {
  const jf = Object.entries(labels.job_fields || {}).filter(([k]) => info[k])
    .map(([k, l]) => `${esc(l)}: ${esc(info[k])}`).join('<br>');
  return `
  <h1>${esc(info.empresa || labels.doc_title || 'Orçamento')}</h1>
  ${info.whats ? `<div>WhatsApp: ${esc(info.whats)}</div>` : ''}
  <p><strong>${esc(labels.doc_title || 'Orçamento')}</strong> · ${today.toLocaleDateString('pt-BR')} · válido por ${info.validade_dias || 7} dias</p>
  ${jf ? `<p>${jf}</p>` : ''}
  <table><tr><th>Serviço</th><th>Qtd</th></tr>
  ${res.itens.map((i) => `<tr><td>${esc(i.descricao)}</td><td>${i.qtd}</td></tr>`).join('')}
  ${info.detalhe ? `<tr><td>${esc(info.detalhe)}</td><td></td></tr>` : ''}</table>
  <p class="tot">À vista: ${brl(res.precos.avista)}</p>
  <p>Ou ${res.precos.parcelas}x de ${brl(res.precos.valor_parcela)} no cartão (${brl(res.precos.parcelado)})</p>
  ${info.prazo ? `<p>Prazo: ${esc(info.prazo)}</p>` : ''}${info.garantia ? `<p>Garantia: ${esc(info.garantia)}</p>` : ''}`;
}

export const PRINT_CSS = `#doc{display:none}@media print{body{background:#fff}.app{display:none!important}
#doc{display:block;padding:24px;font-size:14px;color:#111}#doc h1{font-size:22px;margin:0 0 4px}
#doc table{width:100%;border-collapse:collapse;margin:16px 0}#doc td,#doc th{border-bottom:1px solid #ddd;padding:8px;text-align:left}
#doc .tot{font-size:20px;font-weight:800}}`;
