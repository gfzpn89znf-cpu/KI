/**
 * Prüft die reine Logik der App ohne React Native:
 * Markdown-Parser, Ableitung der Oberfläche aus dem API-Verlauf und Systemprompt.
 *
 * Ausführen mit:  npm test
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseBlocks, parseInline } from '../src/lib/markdown';
import { buildSystemPrompt } from '../src/lib/prompt';
import { formatBytes, quantOf } from '../src/lib/local/hub';
import { iosMajor, isOtherBrowserOnIOS, webgpuAdvice } from '../src/lib/local/ua';
import { buildLocalSystemPrompt, toLocalMessages } from '../src/lib/localAgent';
import { deriveItems } from '../src/lib/render';
import { DEFAULT_SETTINGS } from '../src/state/defaults';

test('Markdown: Codeblock mit Sprache', () => {
  const blocks = parseBlocks('Text\n\n```ts\nconst a = 1;\n```\n\nEnde');
  assert.equal(blocks.length, 3);
  assert.deepEqual(blocks[1], { kind: 'code', language: 'ts', code: 'const a = 1;' });
});

test('Markdown: nicht geschlossener Codeblock schluckt den Rest, statt abzustürzen', () => {
  const blocks = parseBlocks('```\nkaputt');
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].kind, 'code');
});

test('Markdown: Listen werden gebündelt', () => {
  const blocks = parseBlocks('- eins\n- zwei\n\n1. a\n2. b');
  assert.deepEqual(blocks[0], { kind: 'bullet', items: ['eins', 'zwei'] });
  assert.deepEqual(blocks[1], { kind: 'ordered', items: ['a', 'b'] });
});

test('Markdown: Überschriften und Zitate', () => {
  const blocks = parseBlocks('## Titel\n> zitiert\n> weiter');
  assert.deepEqual(blocks[0], { kind: 'heading', level: 2, text: 'Titel' });
  assert.deepEqual(blocks[1], { kind: 'quote', text: 'zitiert\nweiter' });
});

test('Markdown inline: fett, Code und Links', () => {
  const segments = parseInline('Das ist **wichtig**, `code` und ein [Link](https://example.com).');
  assert.deepEqual(
    segments.filter((s) => s.bold || s.code || s.href),
    [
      { text: 'wichtig', bold: true },
      { text: 'code', code: true },
      { text: 'Link', href: 'https://example.com' },
    ],
  );
  assert.equal(segments.map((s) => s.text).join(''), 'Das ist wichtig, code und ein Link.');
});

test('Markdown inline: Sternchen ohne Partner bleiben Text', () => {
  const segments = parseInline('3 * 4 = 12');
  assert.equal(segments.length, 1);
  assert.equal(segments[0].text, '3 * 4 = 12');
});

test('Verlauf: Werkzeugrunden werden zu einer Antwort zusammengefasst', () => {
  const items = deriveItems([
    { role: 'user', content: [{ type: 'text', text: 'Wie ist das Wetter?' }] },
    {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'Nachschauen.', signature: '' },
        { type: 'server_tool_use', id: 't1', name: 'web_search', input: { query: 'Wetter Berlin' } },
      ],
    },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Sonnig.' }] },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].role, 'user');
  const answer = items[1];
  assert.equal(answer.role, 'assistant');
  if (answer.role !== 'assistant') return;
  assert.equal(answer.text, 'Sonnig.');
  assert.equal(answer.thinking, 'Nachschauen.');
  assert.deepEqual(answer.tools, ['Gesucht: Wetter Berlin']);
});

test('Verlauf: Anhänge erscheinen als Chips, nicht als Rohdaten', () => {
  const items = deriveItems([
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
        { type: 'document', title: 'Vertrag.pdf', source: { type: 'base64', media_type: 'application/pdf', data: 'AAAA' } },
        { type: 'text', text: 'Was steht da?' },
      ],
    },
  ]);

  assert.equal(items.length, 1);
  const first = items[0];
  if (first.role !== 'user') throw new Error('erwartet: Nutzer-Nachricht');
  assert.deepEqual(first.attachments, [
    { kind: 'image', name: 'Bild' },
    { kind: 'document', name: 'Vertrag.pdf' },
  ]);
  assert.equal(first.text, 'Was steht da?');
});

test('Verlauf: leere Assistenz-Nachrichten erzeugen keine leeren Blasen', () => {
  const items = deriveItems([
    { role: 'user', content: 'Hallo' },
    { role: 'assistant', content: [] },
  ]);
  assert.equal(items.length, 1);
});

test('Systemprompt: Gedächtnis wird mit IDs eingebettet', () => {
  const prompt = buildSystemPrompt({ ...DEFAULT_SETTINGS, persona: 'Duze mich.' }, [
    { id: 'm_1', fact: 'Wohnt in Bremen.', createdAt: 0 },
  ]);
  assert.match(prompt, /\[m_1\] Wohnt in Bremen\./);
  assert.match(prompt, /Duze mich\./);
  assert.match(prompt, /Heutiges Datum: \d{4}-\d{2}-\d{2}\./);
  // Keine Uhrzeit: sonst wäre der Prompt-Cache-Präfix jede Minute hinüber.
  assert.doesNotMatch(prompt, /\d{2}:\d{2}/);
});

test('Systemprompt: ohne Gedächtnis keine Gedächtnis-Anweisungen', () => {
  const prompt = buildSystemPrompt({ ...DEFAULT_SETTINGS, memoryEnabled: false }, [
    { id: 'm_1', fact: 'Wohnt in Bremen.', createdAt: 0 },
  ]);
  assert.doesNotMatch(prompt, /m_1/);
  assert.doesNotMatch(prompt, /remember/);
});

// --- Lokaler Betrieb ---

test('Lokal: Verlauf wird zu reinem Text, Werkzeug-Ergebnisse fliegen raus', () => {
  const messages = toLocalMessages('SYSTEM', [
    { role: 'user', content: [{ type: 'text', text: 'Hallo' }] },
    {
      role: 'assistant',
      content: [
        { type: 'thinking', thinking: 'Interner Kram', signature: '' },
        { type: 'server_tool_use', id: 't1', name: 'web_search', input: {} },
      ],
    },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: 'x' }] },
    { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] },
  ]);

  assert.deepEqual(messages, [
    { role: 'system', content: 'SYSTEM' },
    { role: 'user', content: 'Hallo' },
    { role: 'assistant', content: 'Hi!' },
  ]);
});

test('Lokal: Anhänge werden benannt statt verschluckt', () => {
  const messages = toLocalMessages('S', [
    {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'AA' } },
        { type: 'text', text: 'Was ist das?' },
      ],
    },
  ]);
  assert.match(String(messages[1].content), /Bild angehängt/);
  assert.match(String(messages[1].content), /Was ist das\?/);
});

test('Lokal: zwei gleiche Rollen hintereinander werden zusammengefasst', () => {
  const messages = toLocalMessages('S', [
    { role: 'user', content: 'eins' },
    { role: 'user', content: 'zwei' },
  ]);
  assert.equal(messages.length, 2);
  assert.equal(messages[1].content, 'eins\n\nzwei');
});

test('Lokal: Systemprompt verspricht kein Internet und keine Werkzeuge', () => {
  const prompt = buildLocalSystemPrompt('Duze mich.', [{ fact: 'Wohnt in Bremen.' }]);
  assert.match(prompt, /kein(en)? Internetzugang/i);
  assert.match(prompt, /Duze mich\./);
  assert.match(prompt, /Wohnt in Bremen\./);
  assert.doesNotMatch(prompt, /remember/);
});

test('Hub: Dateiname verrät die Quantisierung, Größen werden lesbar', () => {
  assert.equal(quantOf('Qwen3-4B-Q4_K_M.gguf'), 'Q4_K_M');
  assert.equal(quantOf('modell-IQ3_XXS.gguf'), 'IQ3_XXS');
  assert.equal(quantOf('ohne-angabe.gguf'), '–');
  assert.equal(formatBytes(2.4 * 1024 ** 3), '2.4 GB');
  assert.equal(formatBytes(700 * 1024 ** 2), '700 MB');
  assert.equal(formatBytes(0), 'unbekannt');
});

// --- WebGPU-Erkennung (die Schwellen waren schon einmal falsch) ---

const UA_IOS = (v: string) =>
  `Mozilla/5.0 (iPhone; CPU iPhone OS ${v} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1`;

test('iOS-Version wird aus der Browserkennung gelesen', () => {
  assert.equal(iosMajor(UA_IOS('26_0')), 26);
  assert.equal(iosMajor(UA_IOS('18_5')), 18);
  assert.equal(iosMajor(UA_IOS('17_6_1')), 17);
  // "Mac OS X" im selben Text darf nicht fälschlich greifen.
  assert.equal(iosMajor('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), null);
  assert.equal(iosMajor('Mozilla/5.0 (Linux; Android 14)'), null);
});

test('Fremde Browser auf iOS werden erkannt', () => {
  assert.equal(isOtherBrowserOnIOS(`${UA_IOS('26_0')} CriOS/120.0`), true);
  assert.equal(isOtherBrowserOnIOS(`${UA_IOS('26_0')} FxiOS/121.0`), true);
  assert.equal(isOtherBrowserOnIOS(UA_IOS('26_0')), false);
});

test('Rat: iOS vor 18 kennt WebGPU gar nicht', () => {
  const text = webgpuAdvice({ hasGpu: false, ua: UA_IOS('17_6'), standalone: false });
  assert.match(text, /iOS 17/);
  assert.match(text, /gibt es dort noch gar nicht/);
});

test('Rat: iOS 18 bis 25 braucht das Funktionsmerkmal', () => {
  for (const version of ['18_0', '25_1']) {
    const text = webgpuAdvice({ hasGpu: false, ua: UA_IOS(version), standalone: false });
    assert.match(text, /ab Werk abgeschaltet/);
    assert.match(text, /Funktionsmerkmale/);
  }
});

test('Rat: ab iOS 26 wird nicht mehr zum Umschalten geraten', () => {
  const text = webgpuAdvice({ hasGpu: false, ua: UA_IOS('26_0'), standalone: false });
  assert.doesNotMatch(text, /ab Werk abgeschaltet/);
  assert.match(text, /sollte WebGPU eingeschaltet sein/);
});

test('Rat: ab iOS 26 im Homescreen-Betrieb zeigt auf Safari', () => {
  const text = webgpuAdvice({ hasGpu: false, ua: UA_IOS('26_0'), standalone: true });
  assert.match(text, /Homescreen/);
  assert.match(text, /direkt in Safari/);
});

test('Rat: fremder Browser schlägt die Versionsregel', () => {
  const text = webgpuAdvice({ hasGpu: false, ua: `${UA_IOS('26_0')} CriOS/120.0`, standalone: false });
  assert.match(text, /anderen Browser als Safari/);
});

test('Rat: mit WebGPU keine Fehlersuche vorschlagen', () => {
  const text = webgpuAdvice({ hasGpu: true, ua: UA_IOS('26_0'), standalone: true });
  assert.match(text, /vorhanden/);
  assert.doesNotMatch(text, /Funktionsmerkmale/);
});
