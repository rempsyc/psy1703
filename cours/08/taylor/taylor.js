/* Original classroom implementation, inspired by the CRTT/Taylor paradigm.
   No Inquisit code, images or sound files are redistributed. */
(function () {
  'use strict';
  const durations = [0, .5, .67, .83, 1, 1.17, 1.33, 1.5, 1.67, 1.83, 2];
  const wins = [true, false, true, false, true, false, true, false, true, false, true, false, true];
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  function createSession(condition) {
    if (!['A', 'B'].includes(condition)) throw new Error('Unknown condition');
    const rows = [];
    function next() {
      if (rows.length >= 13) return null;
      const n = rows.length;
      const step = n === 0 ? 2 : 1 + ((n - 1) % 4);
      const level = condition === 'A' || n < 5 ? step : step + (n < 9 ? 3 : 6);
      return {trial: n + 1, win: wins[n], opponentIntensity: level, opponentDuration: durations[level]};
    }
    return {condition, rows, next,
      record(choice) {
        const t = next();
        if (!t) throw new Error('Session complete');
        if (!Number.isInteger(choice.intensity) || choice.intensity < 0 || choice.intensity > 10 || !durations.includes(choice.duration)) throw new Error('Invalid choices');
        if (choice.rt !== null && (!Number.isFinite(choice.rt) || choice.rt < 0)) throw new Error('Invalid reaction time');
        const row = {...t, ...choice, feedbackVisible: !t.win};
        rows.push(Object.freeze(row));
        return row;
      },
      summary() {
        const afterLoss = rows.filter((r, n) => n > 0 && !rows[n - 1].win);
        return {n: rows.length, first: rows[0] || null,
          afterLossIntensity: mean(afterLoss.map(r => r.intensity)),
          afterLossDuration: mean(afterLoss.map(r => r.duration)),
          afterLossN: afterLoss.length,
          intensity: mean(rows.map(r => r.intensity)), duration: mean(rows.map(r => r.duration))};
      }
    };
  }
  const core = {durations, createSession};
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (typeof document === 'undefined') return;
  const $ = id => document.getElementById(id);
  const fmt = (v, digits = 1) => v === null ? '—' : v.toLocaleString('fr-CA', {maximumFractionDigits: digits});
  let session = null, phase = 'intro', intensity = null, duration = null, onset = 0;
  let jobs = [], epoch = 0, audio = null, source = null;
  function stopSound() { if (source) {try {source.stop();} catch (_) {} source = null;} }
  function clearJobs() {epoch++; jobs.forEach(clearTimeout); jobs = []; stopSound();}
  function later(fn, ms) {const e = epoch; jobs.push(setTimeout(() => {if (e === epoch) fn();}, ms));}
  function randomDelay() {const v = new Uint32Array(1); crypto.getRandomValues(v); return 1000 + v[0] % 1401;}
  async function prepareAudio() {
    if (!$('sound').checked) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Audio unavailable');
      audio ||= new Audio();
      await audio.resume();
      if (!$('sound').checked) return;
      $('audio-status').textContent = 'Son activé; le volume reste réglable à tout moment.';
    } catch (_) {
      $('sound').checked = false;
      $('audio-status').textContent = 'Son indisponible ici. La tâche reste utilisable à l’écran.';
    }
  }
  function noise(level, seconds) {
    stopSound();
    if (!$('sound').checked || !audio || audio.state !== 'running' || level === 0 || seconds === 0 || +$('volume').value === 0) return;
    const frames = Math.ceil(audio.sampleRate * seconds);
    const buffer = audio.createBuffer(1, frames, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    source = audio.createBufferSource(); source.buffer = buffer;
    const gain = audio.createGain(), t = audio.currentTime;
    const amplitude = .12 * (+$('volume').value / 100) * (level / 10);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(amplitude, t + .02);
    gain.gain.setValueAtTime(amplitude, t + Math.max(.02, seconds - .03));
    gain.gain.linearRampToValueAtTime(0, t + seconds);
    source.connect(gain).connect(audio.destination); source.start(); source.stop(t + seconds);
  }
  function setPanel(name) {
    ['intro', 'play', 'results'].forEach(id => $(id).hidden = id !== name);
    $('quit').hidden = name !== 'play';
  }
  function drawChoices(id, values, label, callback) {
    const box = $(id); box.replaceChildren();
    for (const v of values) {
      const button = document.createElement('button'); button.type = 'button';
      button.textContent = fmt(v, 2); button.setAttribute('aria-label', `${label} ${fmt(v, 2)}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (phase !== 'choose') return;
        box.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        callback(v);
      });
      box.append(button);
    }
  }
  function choose() {
    clearJobs(); phase = 'choose'; intensity = null; duration = null;
    const t = session.next();
    if (!t) {finish(false); return;}
    $('retry').hidden = true;
    setPanel('play'); $('trial').textContent = `Essai ${t.trial} sur 13`;
    $('setting').hidden = false; $('arena').hidden = true; $('feedback').hidden = true;
    $('ready').disabled = true; $('duration-options').disabled = true;
    drawChoices('intensity-options', Array.from({length: 11}, (_, i) => i), 'Intensité', v => {
      intensity = v; $('duration-options').disabled = false;
      $('ready').disabled = duration === null;
    });
    drawChoices('duration-buttons', durations, 'Durée en secondes', v => {duration = v; $('ready').disabled = intensity === null;});
    $('choice-hint').textContent = 'Choisissez d’abord l’intensité, puis la durée à destiner au partenaire si vous gagnez.';
    $('ready').textContent = 'Valider mes choix et jouer';
  }
  function cue(mode, text) {const b = $('target'); b.dataset.signal = mode; b.textContent = text;}
  async function ready() {
    if (phase !== 'choose' || intensity === null || duration === null) return;
    phase = 'arming'; clearJobs(); const e = epoch;
    await prepareAudio(); if (e !== epoch || phase !== 'arming') return;
    $('setting').hidden = true; $('arena').hidden = false; $('feedback').hidden = true;
    phase = 'waiting'; cue('wait', 'Attendez…'); $('arena-hint').textContent = 'Réagissez à « PARTEZ » : touchez le carré ou appuyez sur Espace.';
    $('target').focus({preventScroll: true});
    later(() => {
      cue('warning', 'Prêt…');
      later(() => {
        requestAnimationFrame(() => {
          if (e !== epoch || phase !== 'waiting') return;
          phase = 'go'; cue('go', 'PARTEZ'); onset = performance.now();
          later(() => retrySignal('Temps écoulé', 'Pas de réponse dans le délai. Reprenez le même essai; aucun résultat enregistré.'), 4000);
        });
      }, randomDelay());
    }, 350);
  }
  function early() {
    retrySignal('Trop tôt', 'Même essai, mêmes choix. Aucun résultat enregistré. Relancez quand vous le souhaitez.');
  }
  function retrySignal(title, hint) {
    clearJobs(); phase = 'retry'; cue('early', title);
    $('arena-hint').textContent = hint;
    $('retry').hidden = false;
  }
  function respond(rt) {
    if (phase !== 'go') return;
    clearJobs(); phase = 'feedback';
    const row = session.record({intensity, duration, rt,
      soundEnabled: $('sound').checked, volume: +$('volume').value});
    $('arena').hidden = true; $('feedback').hidden = false;
    $('outcome').textContent = row.win ? 'Vous gagnez cette manche.' : 'Le partenaire gagne cette manche.';
    $('latency').textContent = rt === null ? 'Pas de réponse dans le délai de cette manche.' : `Votre temps de réaction : ${fmt(rt, 0)} ms.`;
    $('opponent').textContent = row.win
      ? `Vos choix pour le partenaire : intensité ${row.intensity}/10 · durée ${fmt(row.duration, 2)} s.`
      : `Choix du partenaire pour vous : intensité ${row.opponentIntensity}/10 · durée ${fmt(row.opponentDuration, 2)} s.`;
    $('signal-fill').style.width = `${10 * (row.win ? row.intensity : row.opponentIntensity)}%`;
    $('sound-note').textContent = row.win ? 'Aucun son envoyé à une autre personne : le partenaire est simulé.'
      : $('sound').checked ? 'Le son suit les choix programmés du partenaire, au volume d’écoute que vous réglez.' : 'Son désactivé : le bruit est représenté à l’écran.';
    if (!row.win) noise(row.opponentIntensity, row.opponentDuration);
    $('next').disabled = true; $('next').textContent = session.next() ? 'Essai suivant' : 'Voir mon bilan';
    later(() => {$('next').disabled = false;}, Math.max(600, row.win ? 600 : row.opponentDuration * 1000));
  }
  function hit() {if (phase === 'waiting') early(); else if (phase === 'go') respond(Math.max(0, performance.now() - onset));}
  function chart(rows) {
    const ns = 'http://www.w3.org/2000/svg'; const svg = $('plot'); svg.replaceChildren();
    function el(tag, attrs, text) {const n = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => n.setAttribute(k,v)); if (text !== undefined) n.textContent = text; svg.append(n); return n;}
    el('title', {}, 'Intensités choisies pendant cette partie, échelle de zéro à dix');
    for (const y of [0, 5, 10]) {el('line', {x1: 40, x2: 650, y1: 160 - y*13, y2: 160-y*13, stroke: '#d7e0e6'}); el('text', {x: 10, y: 165-y*13, fill: '#123b5d'}, y);}
    el('polyline', {points: rows.map((r,i) => `${50+i*49},${160-r.intensity*13}`).join(' '), stroke: '#167c9d', fill: 'none', 'stroke-width': 3});
    rows.forEach((r,i) => {el('circle', {cx: 50+i*49, cy:160-r.intensity*13,r:4,fill:'#167c9d'}); el('text',{x:50+i*49,y:184,'text-anchor':'middle',fill:'#123b5d'},r.trial);});
  }
  function finish(partial) {
    clearJobs(); phase = 'results'; setPanel('results'); const s = session.summary();
    $('result-title').textContent = partial ? `Partie arrêtée — ${s.n} essai(s) terminé(s)` : 'Votre bilan de cette partie';
    $('condition').textContent = session.condition === 'A' ? 'Condition A : provocation faible et stable.' : 'Condition B : provocation progressivement plus élevée.';
    $('first-value').textContent = s.first ? `${s.first.intensity}/10 · ${fmt(s.first.duration,2)} s` : 'Aucun choix enregistré';
    $('after-value').textContent = s.afterLossN ? `${fmt(s.afterLossIntensity)}/10 · ${fmt(s.afterLossDuration,2)} s (${s.afterLossN} choix)` : 'Pas encore de choix après une défaite';
    chart(session.rows);
    const body = $('trials'); body.replaceChildren();
    for (const r of session.rows) {const tr = document.createElement('tr');
      [r.trial, r.intensity, fmt(r.duration,2), r.rt === null ? '—' : fmt(r.rt,0), r.win ? 'Victoire' : 'Défaite', r.feedbackVisible ? `${r.opponentIntensity}/10 · ${fmt(r.opponentDuration,2)} s` : 'Non montré', r.soundEnabled ? `${r.volume} %` : 'Muet'].forEach(v => {const td=document.createElement('td');td.textContent=v;tr.append(td);}); body.append(tr);}
    $('result-title').focus({preventScroll: true});
  }
  $('begin').addEventListener('click', () => {
    clearJobs(); const v = new Uint32Array(1); crypto.getRandomValues(v);
    session = createSession(v[0] < 2147483648 ? 'A' : 'B'); choose();
  });
  $('ready').addEventListener('click', ready);
  $('retry').addEventListener('click', () => {if (phase !== 'retry') return; $('retry').hidden=true; phase='choose'; ready();});
  $('target').addEventListener('pointerdown', e => {if (e.button !== 0) return; e.preventDefault(); hit();});
  $('target').addEventListener('keydown', e => {if (['Space','Enter'].includes(e.code)) {e.preventDefault(); if (!e.repeat) hit();}});
  $('next').addEventListener('click', () => {if (phase === 'feedback' && !$('next').disabled) choose();});
  $('quit').addEventListener('click', () => {if (session) finish(true);});
  $('reset').addEventListener('click', () => {clearJobs(); session=null;phase='intro';setPanel('intro');});
  $('sound').addEventListener('change', async () => {stopSound(); if ($('sound').checked) await prepareAudio(); else $('audio-status').textContent='Son désactivé.';});
  $('volume').addEventListener('input', () => {$('volume-value').textContent=`${$('volume').value} %`; stopSound();});
  $('test-sound').addEventListener('click', async () => {if (!$('sound').checked) {$('audio-status').textContent='Activez le son pour écouter cet exemple.'; return;} await prepareAudio(); noise(5,.3);});
  $('fullscreen').addEventListener('click', async () => {try {if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen();} catch (_) {$('audio-status').textContent='Ouvrez la tâche dans son onglet pour agrandir l’affichage.';}});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopSound();
      if (['waiting','go','arming'].includes(phase)) {clearJobs();phase='retry';$('setting').hidden=true;$('arena').hidden=false;cue('wait','En pause');$('arena-hint').textContent='La page a été masquée. Reprenez le même essai sans résultat enregistré.';$('retry').hidden=false;}
    }
  });
  window.addEventListener('pagehide', clearJobs);
  $('download').addEventListener('click', () => {
    if (!session) return;
    const cols=['condition','trial','intensity','duration_s','reaction_ms','win','opponent_intensity','opponent_duration_s','feedback_visible','sound_enabled','listening_volume'];
    const data=session.rows.map(r=>[session.condition,r.trial,r.intensity,r.duration,r.rt ?? '',r.win,r.opponentIntensity,r.opponentDuration,r.feedbackVisible,r.soundEnabled,r.volume]);
    const blob=new Blob(['\uFEFF'+[cols,...data].map(row=>row.join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download='taylor-demonstration-mes-essais.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
})();
