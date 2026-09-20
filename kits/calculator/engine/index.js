// ENGINE — orquestra: validação → regras do nicho (custo) → pricing (preço).
// Um produto novo de calculadora = config.json + rules.js. Nada aqui conhece o nicho.
import { validate, fieldsForMode } from '../validation/index.js';
import { price, PRICING_SETTINGS } from '../pricing/index.js';

export const ENGINE_VERSION = 'calculator-kit-1.0';

/** Todos os campos de configuração: os do nicho + os de preço padrão do kit. */
export function allSettings(config) {
  const own = config.settings || [];
  const ids = new Set(own.map((f) => f.id));
  return [...own, ...PRICING_SETTINGS.filter((f) => !ids.has(f.id))];
}

/**
 * @param config  objeto de config (ver schemas/calculator-config.schema.json)
 * @param rules   módulo com cost(values, config) → {material, horas, extras, itens, quantidades}
 * @param input   { mode, settings:{...}, fields:{...} }
 */
export function run(config, rules, input) {
  const mode = input.mode ?? config.modes?.[0]?.id;
  if (config.modes && !config.modes.some((m) => m.id === mode)) throw new Error(`Modo desconhecido: ${mode}`);
  const s = validate(allSettings(config), input.settings);
  const f = validate(fieldsForMode(config.fields || [], mode), input.fields);
  const errors = [...s.errors, ...f.errors];
  if (errors.length) { const e = new Error(errors[0]); e.errors = errors; throw e; }
  const base = rules.cost({ mode, ...s.values, ...f.values }, config);
  for (const k of ['material', 'horas', 'extras']) {
    if (!Number.isFinite(Number(base[k] ?? 0))) throw new Error(`Regra devolveu ${k} inválido`);
  }
  const p = price(base, s.values);
  return {
    engine: ENGINE_VERSION, config_id: config.id, mode,
    itens: base.itens || [], quantidades: base.quantidades || {},
    ...p, avisos: [...(base.avisos || []), ...p.avisos],
  };
}
