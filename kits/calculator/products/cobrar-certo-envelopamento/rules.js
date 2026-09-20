// Regras ESPECÍFICAS do demo de envelopamento: só calculam CUSTO BASE (material, horas, extras).
// Preço, validação, PDF e WhatsApp são do motor genérico.
const r2 = (v) => Math.round(v * 100) / 100;

export function cost(v, config) {
  const T = config.tables;
  const perda = 1 + (Number(v.perda_pct) || 0) / 100;
  const itens = [];
  let ml = 0, horas = 0, material = 0;

  if (v.mode === 'total') {
    const p = T.portes[v.porte];
    ml = p.ml; horas = p.horas;
    itens.push({ descricao: `Envelopamento completo — ${p.nome}`, qtd: 1 });
  } else if (v.mode === 'parcial') {
    for (const [k, qtd] of Object.entries(v.pecas)) {
      const p = T.pecas[k];
      ml += p.ml * qtd; horas += p.horas * qtd;
      itens.push({ descricao: `Envelopamento parcial — ${p.nome}`, qtd });
    }
  } else if (v.mode === 'adesivacao') {
    horas = v.m2 * v.horas_m2;
    material = v.m2 * v.preco_m2 * perda;
    itens.push({ descricao: `Adesivação / plotagem — ${r2(v.m2)} m² impressos e aplicados`, qtd: 1 });
  }
  if (v.mode !== 'adesivacao') { ml = ml * perda; material = ml * v.preco_ml; }
  horas += v.horas_ajuste;

  const avisos = [];
  if (v.mode !== 'adesivacao' && v.preco_ml <= 0) avisos.push('Preço do vinil zerado.');
  return { material, horas, extras: v.extras, itens, quantidades: { metros_lineares: r2(ml), horas: r2(horas) }, avisos };
}
