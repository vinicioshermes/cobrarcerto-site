// SHARE — texto pronto para WhatsApp. Nunca expõe custo, margem ou lucro.
export const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function whatsappText(res, info = {}, labels = {}) {
  const L = [`*${labels.doc_title || 'Orçamento'} — ${info.empresa || 'Minha empresa'}*`];
  for (const [k, lbl] of Object.entries(labels.job_fields || {})) if (info[k]) L.push(`${lbl}: ${info[k]}`);
  L.push('');
  for (const it of res.itens) L.push(`• ${it.descricao}${it.qtd > 1 ? ` (x${it.qtd})` : ''}`);
  if (info.detalhe) L.push(`• ${info.detalhe}`);
  L.push('', `*À vista: ${brl(res.precos.avista)}*`, `Ou ${res.precos.parcelas}x de ${brl(res.precos.valor_parcela)} no cartão`);
  if (info.prazo) L.push(`Prazo: ${info.prazo}`);
  if (info.garantia) L.push(`Garantia: ${info.garantia}`);
  L.push(`Validade: ${info.validade_dias || 7} dias`);
  return L.join('\n');
}

export const whatsappLink = (text, phone = '') =>
  `https://wa.me/${String(phone).replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
