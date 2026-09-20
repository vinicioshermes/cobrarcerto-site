// RENDERER — monta a interface inteira a partir da config (mobile-first). Nada de nicho aqui.
import { run, allSettings } from '../engine/index.js';
import { fieldsForMode } from '../validation/index.js';
import { custoHora } from '../pricing/index.js';
import { whatsappText, whatsappLink, brl } from '../share/index.js';
import { documentHtml, PRINT_CSS } from '../pdf/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function inputHtml(f, prefix) {
  const id = `${prefix}_${f.id}`;
  if (f.type === 'select') return `<label>${esc(f.label)}<select id="${id}">${f.options.map((o) =>
    `<option value="${esc(o.value)}"${o.value === f.default ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`;
  if (f.type === 'qty-list') return `<p class="muted">${esc(f.label)} — quantidade:</p><div class="qtys">${f.options.map((o) =>
    `<div class="qty"><span>${esc(o.label)}</span><input type="number" min="0" step="1" value="0" data-qty="${id}" data-key="${esc(o.value)}" aria-label="${esc(o.label)}"></div>`).join('')}</div>`;
  const num = f.type === 'number';
  return `<label>${esc(f.label)}<input id="${id}" ${num ? `type="number" inputmode="decimal" step="${f.step ?? 'any'}"` : 'type="text"'}
    value="${esc(f.default ?? '')}" placeholder="${esc(f.placeholder ?? '')}"></label>`;
}

function readField(root, f, prefix) {
  const id = `${prefix}_${f.id}`;
  if (f.type === 'qty-list') {
    const o = {}; root.querySelectorAll(`[data-qty="${id}"]`).forEach((i) => { if (+i.value > 0) o[i.dataset.key] = +i.value; });
    return o;
  }
  return root.querySelector('#' + id)?.value;
}

export function renderApp({ root, config, rules, track = () => {} }) {
  const KEY = `offeros.kit.${config.id}.settings.v1`;
  const settingsDef = allSettings(config);
  let mode = config.modes?.[0]?.id;
  let last = null;
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); return true; } catch { return false; } };

  const style = document.createElement('style');
  style.textContent = `.tabs{display:grid;grid-auto-flow:column;gap:6px;margin:4px 0 14px}
  .tabs button{padding:10px 4px;border:1.5px solid var(--line);background:var(--card);border-radius:10px;font-weight:600;font-size:14px;color:var(--ink)}
  .tabs button[aria-pressed=true]{border-color:var(--brand);background:var(--brand-soft);color:var(--brand-ink)}
  .qtys{display:grid;gap:8px}.qty{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:10px}
  .qty input{width:64px;text-align:center;margin:0}.big{font-size:40px;font-weight:800;letter-spacing:-1px;color:var(--brand-ink);line-height:1.1}
  .kv{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed var(--line);font-size:15px}.kv:last-child{border-bottom:0}
  .warn{background:#fff4e5;border:1px solid #f5c27a;color:#7a4b00;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14px}
  .notice{background:#fdecec;border:1px solid #f3b4b4;color:#8a1c1c;border-radius:10px;padding:8px 12px;font-size:13px;margin-bottom:10px}
  details summary{cursor:pointer;font-weight:600;padding:6px 0}.hidden{display:none!important}${PRINT_CSS}`;
  document.head.appendChild(style);

  const saved = load();
  root.innerHTML = `
  <main class="app wrap">
    ${config.notice ? `<div class="notice">${esc(config.notice)}</div>` : ''}
    <header class="top"><strong class="logo">${esc(config.brand || '')}</strong><span class="muted">${esc(config.title)}</span></header>
    <section class="card"><details id="cfg"${saved ? '' : ' open'}>
      <summary>⚙️ Seus custos e dados <span class="muted" id="cfgStatus">${saved ? '(salvo)' : '(preencha antes do 1º cálculo)'}</span></summary>
      <p class="muted">Preencha uma vez. Fica salvo neste aparelho.</p>
      <details><summary>Não sei meu custo por hora → calcular</summary>
        <label>Custos fixos do mês<input id="h_cf" type="number" inputmode="decimal"></label>
        <label>Quanto quer tirar por mês (pró-labore)<input id="h_pl" type="number" inputmode="decimal"></label>
        <label>Horas produtivas por mês<input id="h_hp" type="number" inputmode="decimal" placeholder="160"></label>
        <button type="button" class="btn ghost" id="hCalc">Calcular minha hora</button><p class="muted" id="hMsg"></p>
      </details>
      <div class="grid2">${settingsDef.map((f) => inputHtml(f, 's')).join('')}</div>
      <button type="button" class="btn" id="saveCfg">Salvar meus dados</button>
    </details></section>
    <section class="card"><h2>Novo cálculo</h2>
      ${config.modes?.length > 1 ? `<div class="tabs" role="group">${config.modes.map((m, i) =>
        `<button type="button" data-mode="${esc(m.id)}" aria-pressed="${i === 0}">${esc(m.label)}</button>`).join('')}</div>` : ''}
      ${(config.fields || []).map((f) => `<div data-field="${esc(f.id)}">${inputHtml(f, 'f')}</div>`).join('')}
      <div class="grid2">${(config.job_info || []).map((f) => inputHtml({ ...f, type: 'text' }, 'j')).join('')}</div>
      <button type="button" class="btn big-btn" id="go">Calcular preço</button><p class="err" id="err" role="alert"></p>
    </section>
    <section class="card hidden" id="res" aria-live="polite">
      <p class="muted">Preço sugerido</p><div class="big" id="rPreco"></div>
      <div class="kv"><span>À vista</span><strong id="rAvista"></strong></div>
      <div class="kv"><span id="rParcL"></span><strong id="rParc"></strong></div>
      <div class="kv"><span>Seu preço mínimo (abaixo disso é prejuízo)</span><strong id="rMin"></strong></div>
      <div id="rAv"></div>
      <details><summary>🔍 Raio-x do preço (só você vê)</summary><div id="rX"></div></details>
      <div class="actions"><a class="btn" id="bW" target="_blank" rel="noopener">Enviar no WhatsApp</a>
      <button type="button" class="btn ghost" id="bP">Gerar PDF</button><button type="button" class="btn ghost" id="bC">Copiar texto</button></div>
    </section>
    ${config.disclaimer ? `<p class="muted small">${esc(config.disclaimer)}</p>` : ''}
  </main><article id="doc"></article>`;

  const $ = (s) => root.querySelector(s);
  if (saved) for (const f of settingsDef) { const el = $('#s_' + f.id); if (el && saved[f.id] !== undefined) el.value = saved[f.id]; }
  const showMode = () => (config.fields || []).forEach((f) =>
    root.querySelector(`[data-field="${f.id}"]`).classList.toggle('hidden', !fieldsForMode([f], mode).length));
  showMode();
  root.querySelectorAll('[data-mode]').forEach((b) => b.onclick = () => {
    mode = b.dataset.mode; root.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); showMode();
  });
  $('#hCalc').onclick = () => {
    try { const h = custoHora({ custos_fixos_mes: $('#h_cf').value, pro_labore: $('#h_pl').value, horas_produtivas_mes: $('#h_hp').value || 160 });
      $('#s_custo_hora').value = h; $('#hMsg').textContent = `Sua hora custa ${brl(h)}. Preenchido abaixo.`; }
    catch (e) { $('#hMsg').textContent = e.message; }
  };
  const readSettings = () => Object.fromEntries(settingsDef.map((f) => [f.id, readField(root, f, 's')]));
  $('#saveCfg').onclick = () => { $('#cfgStatus').textContent = save(readSettings()) ? '(salvo)' : '(não foi possível salvar)'; $('#cfg').open = false; };

  const info = () => {
    const s = readSettings(); const o = { empresa: s.empresa, whats: s.whats, garantia: s.garantia, validade_dias: 7 };
    for (const f of config.job_info || []) o[f.id] = $('#j_' + f.id).value;
    return o;
  };
  $('#go').onclick = () => {
    $('#err').textContent = '';
    const fields = Object.fromEntries(fieldsForMode(config.fields || [], mode).map((f) => [f.id, readField(root, f, 'f')]));
    try { last = run(config, rules, { mode, settings: readSettings(), fields }); } catch (e) { $('#err').textContent = e.message; return; }
    const r = last;
    $('#rPreco').textContent = brl(r.precos.sugerido); $('#rAvista').textContent = brl(r.precos.avista);
    $('#rParcL').textContent = `Parcelado (${r.precos.parcelas}x)`; $('#rParc').textContent = `${r.precos.parcelas}x ${brl(r.precos.valor_parcela)}`;
    $('#rMin').textContent = brl(r.precos.minimo);
    $('#rAv').innerHTML = r.avisos.map((a) => `<div class="warn">⚠️ ${esc(a)}</div>`).join('');
    $('#rX').innerHTML = [['Material', brl(r.custos.material)], [`Mão de obra (${r.custos.horas} h)`, brl(r.custos.mao_de_obra)],
      ['Extras', brl(r.custos.extras)], ['Custo total', brl(r.custos.total)],
      ['Lucro no preço sugerido', `${brl(r.lucro.sugerido)} (${r.lucro.margem_real_pct}%)`], ['Lucro à vista', brl(r.lucro.avista)]]
      .map(([k, v]) => `<div class="kv"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('');
    $('#bW').href = whatsappLink(whatsappText(r, info(), config.labels));
    $('#res').classList.remove('hidden'); $('#res').scrollIntoView({ behavior: 'smooth' });
    track('tool_calc', { mode, kit: config.id });
  };
  $('#bC').onclick = async () => { try { await navigator.clipboard.writeText(whatsappText(last, info(), config.labels)); $('#bC').textContent = 'Copiado ✓'; } catch { $('#bC').textContent = 'Não consegui copiar'; } };
  $('#bP').onclick = () => { $('#doc').innerHTML = documentHtml(last, info(), config.labels); track('tool_pdf', { kit: config.id }); window.print(); };
  $('#bW').addEventListener('click', () => track('tool_whatsapp', { kit: config.id }));
  track('tool_open', { kit: config.id });
  return { run: () => $('#go').click(), last: () => last };
}
