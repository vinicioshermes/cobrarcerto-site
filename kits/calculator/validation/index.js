// VALIDATION — genérico: converte e valida valores conforme a definição dos campos da config.
// Tipos suportados: number, text, select, qty-list.
const num = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

export function fieldsForMode(fields, mode) {
  return fields.filter((f) => !f.modes || f.modes.includes(mode));
}

/** @returns {{values: object, errors: string[]}} */
export function validate(fields, raw = {}) {
  const values = {}, errors = [];
  for (const f of fields) {
    const v = raw[f.id] ?? f.default;
    switch (f.type) {
      case 'number': {
        const x = num(v);
        if (!Number.isFinite(x)) { if (f.required) errors.push(`${f.label}: informe um número.`); values[f.id] = f.default ?? 0; break; }
        if (f.min !== undefined && x < f.min) errors.push(`${f.label}: mínimo ${f.min}.`);
        if (f.max !== undefined && x > f.max) errors.push(`${f.label}: máximo ${f.max}.`);
        if (f.required && f.positive && x <= 0) errors.push(`${f.label}: precisa ser maior que zero.`);
        values[f.id] = x; break;
      }
      case 'select': {
        const ok = (f.options || []).some((o) => o.value === v);
        if (!ok) errors.push(`${f.label}: opção inválida.`);
        values[f.id] = v; break;
      }
      case 'qty-list': {
        const out = {};
        for (const [k, q] of Object.entries(v || {})) {
          if (!(f.options || []).some((o) => o.value === k)) { errors.push(`${f.label}: item desconhecido (${k}).`); continue; }
          const x = num(q);
          if (Number.isFinite(x) && x > 0) out[k] = x;
        }
        if (f.required && !Object.keys(out).length) errors.push(f.required_message || `${f.label}: escolha pelo menos um item.`);
        values[f.id] = out; break;
      }
      case 'text':
      default:
        values[f.id] = String(v ?? '').slice(0, f.maxLength ?? 200);
        if (f.required && !values[f.id].trim()) errors.push(`${f.label}: obrigatório.`);
    }
  }
  return { values, errors };
}
