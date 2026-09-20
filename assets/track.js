// Rastreamento mínimo e à prova de falha: se não estiver configurado, não faz nada.
// Envia eventos para a função track_event do banco (Supabase RPC) com experimento/variante.
// Nunca envia dado pessoal (nome, telefone, e-mail): só evento, página e parâmetros do experimento.
const CFG = (globalThis.OFFEROS_CONFIG ?? {});
const SK = 'offeros.ctx.v1';

function ctx() {
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem(SK) || '{}'); } catch {}
  const q = new URLSearchParams(location.search);
  const pick = (k) => q.get(k) || saved[k] || '';
  const c = {
    exp: pick('exp'), v: pick('v'),
    utm_source: pick('utm_source'), utm_campaign: pick('utm_campaign'), utm_content: pick('utm_content'),
  };
  try { sessionStorage.setItem(SK, JSON.stringify(c)); } catch {}
  return c;
}
export const context = ctx();

export function track(event, props = {}) {
  if (!CFG.supabaseUrl || !CFG.anonKey) return;
  try {
    fetch(`${CFG.supabaseUrl}/rest/v1/rpc/track_event`, {
      method: 'POST', keepalive: true,
      headers: { 'content-type': 'application/json', apikey: CFG.anonKey, authorization: `Bearer ${CFG.anonKey}` },
      body: JSON.stringify({ p: { event, page: location.pathname, exp: context.exp, variant: context.v,
        utm_source: context.utm_source, utm_campaign: context.utm_campaign, utm_content: context.utm_content, props } }),
    }).catch(() => {});
  } catch {}
}

/** Anexa experimento/variante/UTMs ao link do checkout (a Kiwify repassa UTMs ao pedido). */
export function decorate(url) {
  try {
    const u = new URL(url);
    const c = context;
    if (c.utm_source) u.searchParams.set('utm_source', c.utm_source);
    if (c.utm_campaign) u.searchParams.set('utm_campaign', c.utm_campaign);
    u.searchParams.set('utm_content', [c.exp, c.v, c.utm_content].filter(Boolean).join('|'));
    if (c.exp) u.searchParams.set('src', c.exp + (c.v ? '-' + c.v : ''));
    return u.toString();
  } catch { return url; }
}
