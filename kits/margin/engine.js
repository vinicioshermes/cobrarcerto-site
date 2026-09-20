// Motor da calculadora de margem real por marketplace (Cobrar Certo – Marketplace). Puro, sem DOM.
// Todas as taxas são PARÂMETROS editáveis: os padrões vêm de fontes públicas (set/2026) e o vendedor confere na sua conta.

export const DEFAULTS = {
  shopee: {
    // faixas por preço do item: [preço mínimo da faixa, comissão %, taxa fixa R$]
    bands: [[0, 20, 4], [80, 14, 16], [100, 14, 20], [200, 14, 26], [500, 14, 26]],
    cpf_extra: 0, // R$ por item (ex.: 3 para CPF com mais de 450 pedidos em 90 dias)
  },
  ml_classico: { pct: 13, fixo: 0 },
  ml_premium: { pct: 18, fixo: 0 },
};

const n = (v) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };
export const r2 = (v) => Math.round(v * 100) / 100;

/** Taxa da Shopee para um preço: { pct, fixo } */
export function shopeeFee(price, cfg = DEFAULTS.shopee) {
  let band = cfg.bands[0];
  for (const b of cfg.bands) if (price >= b[0]) band = b;
  return { pct: n(band[1]), fixo: n(band[2]) + n(cfg.cpf_extra) };
}

/** Taxa de um canal para um preço. canal ∈ shopee | ml_classico | ml_premium */
export function channelFee(canal, price, fees = DEFAULTS) {
  if (canal === 'shopee') return shopeeFee(price, fees.shopee);
  const c = fees[canal];
  return { pct: n(c.pct), fixo: n(c.fixo) };
}

/**
 * Resultado de uma venda.
 * p = { preco, custo, embalagem, frete, outros, imposto_pct, ads_pct }
 * frete/outros = custos por unidade que o vendedor paga (envio, brinde, etiqueta).
 */
export function sale(canal, p, fees = DEFAULTS) {
  const preco = n(p.preco);
  const fee = channelFee(canal, preco, fees);
  const comissao = preco * fee.pct / 100;
  const imposto = preco * n(p.imposto_pct) / 100;
  const ads = preco * n(p.ads_pct) / 100;
  const custos = n(p.custo) + n(p.embalagem) + n(p.frete) + n(p.outros);
  const lucro = preco - comissao - fee.fixo - imposto - ads - custos;
  return {
    canal, preco: r2(preco), comissao: r2(comissao), taxa_fixa: r2(fee.fixo), imposto: r2(imposto), ads: r2(ads),
    custos: r2(custos), recebe: r2(preco - comissao - fee.fixo), lucro: r2(lucro),
    margem_pct: preco > 0 ? r2(lucro / preco * 100) : 0,
  };
}

/** Menor preço (ao centavo) que entrega a margem desejada no canal. null se impossível. */
export function minPrice(canal, p, margemPct, fees = DEFAULTS) {
  const m = n(margemPct) / 100, imp = n(p.imposto_pct) / 100, ads = n(p.ads_pct) / 100;
  const custos = n(p.custo) + n(p.embalagem) + n(p.frete) + n(p.outros);
  const cands = [];
  const bands = canal === 'shopee' ? fees.shopee.bands.map((b, i, a) => [b[0], a[i + 1]?.[0] ?? Infinity]) : [[0, Infinity]];
  for (const [lo, hi] of bands) {
    const fee = channelFee(canal, lo, fees);
    const den = 1 - fee.pct / 100 - imp - ads - m;
    if (den <= 0) continue;
    let pr = Math.ceil(((custos + fee.fixo) / den) * 100) / 100;
    if (pr < lo) pr = lo;
    if (pr < hi && sale(canal, { ...p, preco: pr }, fees).margem_pct >= r2(m * 100) - 0.01) cands.push(pr);
  }
  return cands.length ? Math.min(...cands) : null;
}
