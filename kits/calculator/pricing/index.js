// PRICING — genérico: transforma CUSTO em PREÇO. Não conhece nenhum nicho.
// preço = custo ÷ (1 − imposto − margem)   |   mínimo = custo ÷ (1 − imposto)
export const PRICING_SETTINGS = [
  { id: 'custo_hora', type: 'number', label: 'Custo da sua hora (R$)', default: 45, min: 0, step: 0.01 },
  { id: 'imposto_pct', type: 'number', label: 'Imposto (%)', default: 6, min: 0, max: 60, step: 0.1 },
  { id: 'margem_pct', type: 'number', label: 'Margem de lucro (%)', default: 30, min: 0, max: 80, step: 1 },
  { id: 'desconto_avista_pct', type: 'number', label: 'Desconto à vista (%)', default: 5, min: 0, max: 50, step: 1 },
  { id: 'taxa_cartao_pct', type: 'number', label: 'Taxa do parcelamento (%)', default: 12, min: 0, max: 40, step: 0.1 },
  { id: 'parcelas', type: 'number', label: 'Parcelas', default: 10, min: 1, max: 24, step: 1 },
  { id: 'arredondar', type: 'number', label: 'Arredondar para múltiplos de (R$)', default: 10, min: 0, step: 1 },
];

const n = (v, d = 0) => { const x = Number(v); return Number.isFinite(x) ? x : d; };
export const r2 = (v) => Math.round(v * 100) / 100;
const ceilTo = (v, step) => (step > 0 ? Math.ceil(v / step) * step : r2(v));

/** Custo real da hora: (custos fixos do mês + pró-labore) ÷ horas produtivas. */
export function custoHora({ custos_fixos_mes = 0, pro_labore = 0, horas_produtivas_mes = 0 } = {}) {
  const h = n(horas_produtivas_mes);
  if (h <= 0) throw new Error('Informe as horas produtivas do mês (maior que zero).');
  return r2((n(custos_fixos_mes) + n(pro_labore)) / h);
}

/**
 * @param {{material:number, horas:number, extras:number}} base  custos vindos das regras do nicho
 * @param {object} s  configurações de preço (PRICING_SETTINGS)
 */
export function price(base, s) {
  const material = n(base.material), horas = n(base.horas), extras = n(base.extras);
  const maoDeObra = horas * n(s.custo_hora);
  const custo = material + maoDeObra + extras;
  const imp = n(s.imposto_pct) / 100, mg = n(s.margem_pct) / 100;
  if (mg < 0) throw new Error('Margem não pode ser negativa.');
  if (imp + mg >= 0.9) throw new Error('Imposto + margem não pode passar de 90%.');
  const step = n(s.arredondar);
  const minimo = custo / (1 - imp);
  const sugerido = ceilTo(custo / (1 - imp - mg), step);
  const avista = ceilTo(sugerido * (1 - n(s.desconto_avista_pct) / 100), step);
  const parcelado = ceilTo(sugerido / (1 - n(s.taxa_cartao_pct) / 100), step);
  const parcelas = Math.max(1, Math.round(n(s.parcelas, 1)));
  const lucro = sugerido * (1 - imp) - custo;
  const lucroAvista = avista * (1 - imp) - custo;
  const avisos = [];
  if (avista < minimo) avisos.push('O desconto à vista deixa o serviço no prejuízo. Reduza o desconto.');
  if (n(s.margem_pct) < 15) avisos.push('Margem abaixo de 15%: qualquer imprevisto vira prejuízo.');
  if (n(s.custo_hora) <= 0 && horas > 0) avisos.push('Custo da hora zerado: sua mão de obra está saindo de graça.');
  return {
    custos: { material: r2(material), mao_de_obra: r2(maoDeObra), extras: r2(extras), total: r2(custo), horas: r2(horas) },
    precos: { minimo: r2(minimo), sugerido: r2(sugerido), avista: r2(avista), parcelado: r2(parcelado),
              parcelas, valor_parcela: r2(parcelado / parcelas) },
    lucro: { sugerido: r2(lucro), avista: r2(lucroAvista), margem_real_pct: sugerido > 0 ? r2((lucro / sugerido) * 100) : 0 },
    avisos,
  };
}
