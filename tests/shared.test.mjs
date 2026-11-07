// Run with: node --test tests/shared.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBackup, buildUrl, callingCode, detectCountry, filterTemplates, mergeTemplates, parseBackup, extractPhone, filterContacts, flagEmoji, formatPhone, guessCountry, isValidPhone, mergeContacts, normalizeSettings, parsePhone, splitLegacyPrefix } from '../WhatsApp_Sender_Pro/shared.js';

const parse = (input, country = 'AR', area = '') => parsePhone(input, country, area);

test('Argentine numbers get the WhatsApp 9 in every local format', () => {
  for (const input of ['11 2345 6789', '011 15 2345-6789', '9 11 2345 6789', '5491123456789', '+54 11 2345 6789', '+54 9 11 2345-6789']) {
    const r = parse(input);
    assert.equal(r.phone, '5491123456789', input);
    assert.equal(r.status, 'ok', input);
  }
  assert.equal(parse('351 15 234 5678').phone, '5493512345678');
});

test('the optional area code completes short local numbers', () => {
  assert.equal(parse('2345 6789').status, 'bad');
  const r = parse('2345 6789', 'AR', '11');
  assert.equal(r.phone, '5491123456789');
  assert.equal(r.status, 'ok');
});

test('international numbers are detected with +, 00 or a pasted country code', () => {
  for (const input of ['+34 612 34 56 78', '0034 612 345 678', '34612345678']) {
    const r = parse(input);
    assert.equal(r.phone, '34612345678', input);
    assert.equal(r.country, 'ES', input);
  }
});

test('local numbers work for other countries', () => {
  assert.equal(parse('612 34 56 78', 'ES').phone, '34612345678');
  assert.equal(parse('07911 123456', 'GB').phone, '447911123456');
  assert.equal(parse('07911 123456', 'GB').country, 'GB');
  assert.equal(parse('312 345 6789', 'IT').phone, '393123456789');
  assert.equal(parse('11 91234-5678', 'BR').phone, '5511912345678');
  assert.equal(parse('(212) 555-0123', 'US').phone, '12125550123');
  assert.equal(parse('8 912 345-67-89', 'RU').phone, '79123456789');
});

test('old Mexican numbers lose the 1', () => {
  assert.equal(parse('+52 1 55 1234 5678').phone, '525512345678');
});

test('parsePhone reports empty and bad input', () => {
  assert.equal(parse('').status, 'empty');
  assert.equal(parse('abc').status, 'empty');
  assert.equal(parse('123').status, 'bad');
});

test('the national display parses back to the same number', () => {
  for (const [input, country] of [['011 15 2345-6789','AR'], ['612345678','ES'], ['07911 123456','GB']]) {
    const r = parse(input, country);
    assert.equal(parse(r.national, r.country).phone, r.phone, input);
    assert.ok(r.display.startsWith('+'));
  }
});

test('formatPhone shows stored numbers readably', () => {
  assert.equal(formatPhone('5491123456789'), '+54 9 11 2345 6789');
});

test('old prefixes split into country and area', () => {
  assert.deepEqual(splitLegacyPrefix('54911'), { country: 'AR', area: '11' });
  assert.deepEqual(splitLegacyPrefix('1212'), { country: 'US', area: '212' });
  assert.deepEqual(splitLegacyPrefix('34'), { country: 'ES', area: '' });
  assert.equal(splitLegacyPrefix(''), null);
});

test('guessCountry uses the browser region', () => {
  assert.equal(guessCountry(['es-MX']), 'MX');
  assert.equal(guessCountry(['es', 'en-GB']), 'GB');
  assert.equal(guessCountry(['es']), 'AR');
});

test('flagEmoji builds the flag', () => {
  assert.equal(flagEmoji('AR'), '🇦🇷');
});

test('callingCode tolerates unknown countries', () => {
  assert.equal(callingCode('AR'), '54');
  assert.equal(callingCode('XX'), '');
});

test('isValidPhone follows E.164', () => {
  assert.ok(isValidPhone('5491112345678'));
  assert.ok(!isValidPhone('123456'));
  assert.ok(!isValidPhone('1234567890123456'));
  assert.ok(!isValidPhone('0123456789'));
});

test('extractPhone finds the number inside a selection', () => {
  assert.equal(extractPhone('Llamá al +54 9 11 2345-6789 mañana'), '+54 9 11 2345-6789');
  assert.equal(extractPhone('sin numero, piso 3'), '');
});

test('buildUrl targets the chosen platform and encodes the text', () => {
  assert.equal(buildUrl('web', '549', 'Hola & chau 👋'), `https://web.whatsapp.com/send?phone=549&text=Hola%20%26%20chau%20${encodeURIComponent('👋')}`);
  assert.equal(buildUrl('app', '549', ''), 'https://api.whatsapp.com/send?phone=549');
  assert.equal(buildUrl('app', '549', 'a\nb'), 'https://api.whatsapp.com/send?phone=549&text=a%0Ab');
});

test('mergeContacts adds, updates and skips', () => {
  const existing = [{ id: '1', phone: '5491112345678', name: 'Ana', notes: 'vieja', tags: [] }];
  const { contacts, added, updated, skipped } = mergeContacts(existing, [
    { phone: '+54 9 11 1234-5678', notes: 'nueva' },
    { phone: '34612345678', name: 'Bob' },
    { phone: 'x' },
    null
  ], 1000);
  assert.deepEqual({ added, updated, skipped }, { added: 1, updated: 1, skipped: 2 });
  assert.equal(contacts[0].name, 'Ana');
  assert.equal(contacts[0].notes, 'nueva');
  assert.equal(contacts[1].createdAt, 1000);
  assert.equal(existing[0].notes, 'vieja');
});

test('filterContacts searches every field and sorts by last use', () => {
  const list = [
    { phone: '111', name: 'Ana', notes: '', tags: ['cliente'], lastUsedAt: 1 },
    { phone: '222', name: 'Bob', notes: 'proveedor', tags: [], lastUsedAt: 5 }
  ];
  assert.equal(filterContacts(list, '')[0].name, 'Bob');
  assert.equal(filterContacts(list, 'CLIENTE')[0].name, 'Ana');
  assert.equal(filterContacts(list, 'provee').length, 1);
  assert.equal(filterContacts(list, '222')[0].name, 'Bob');
  assert.equal(filterContacts(list, 'zzz').length, 0);
});

test('normalizeSettings replaces the old defaults', () => {
  const settings = normalizeSettings({ accent: '#6c5ce7', theme: 'custom', bg: 'data:x', lang: 'en' });
  assert.equal(settings.accent, '#128c5e');
  assert.equal(settings.theme, 'auto');
  assert.equal(settings.lang, 'en');
  assert.ok(!('bg' in settings));
});

test('pasted numbers with the country code, with or without +, switch the country', () => {
  const cases = [
    ['+34 612 34 56 78', 'ES', '34612345678'],
    ['34 612 34 56 78', 'ES', '34612345678'],
    ['0039 333 123 4567', 'IT', '393331234567'],
    ['393331234567', 'IT', '393331234567'],
    ['55 11 99999-8888', 'BR', '5511999998888'],
    ['447400123456', 'GB', '447400123456'],
    ['+1 (416) 555-0199', 'CA', '14165550199'],
    ['5491123456789', 'AR', '5491123456789'],
    ['‪+54 9 11 2345-6789‬', 'AR', '5491123456789']
  ];
  for (const from of ['AR', 'ES', 'US', 'MX']) {
    for (const [text, country, phone] of cases) {
      const r = parsePhone(extractPhone(text), from, '');
      assert.equal(r.phone, phone, `${text} from ${from}`);
      assert.equal(r.country, country, `${text} from ${from}`);
    }
  }
});

test('the calling code is detected while it is typed', () => {
  assert.equal(detectCountry('+5', 'AR'), null);
  assert.equal(detectCountry('+54', 'ES'), 'AR');
  assert.equal(detectCountry('+34 6', 'AR'), 'ES');
  assert.equal(detectCountry('0055', 'AR'), 'BR');
  assert.equal(detectCountry('+1', 'AR'), 'US');
  assert.equal(detectCountry('+1', 'CA'), 'CA');
  assert.equal(detectCountry('+44', 'GG'), 'GG');
  assert.equal(detectCountry('+212', 'AR'), 'MA');
  assert.equal(detectCountry('11 2345', 'ES'), null);
});

test('backups carry contacts, templates or both', () => {
  const contacts = [{ id: 'x', phone: '5491123456789', name: 'Ana', notes: '', tags: [], createdAt: 1, lastUsedAt: 2 }];
  const templates = [{ id: 'y', title: 'Hola', text: 'Hola!', selected: true }];
  const both = buildBackup({ contacts, templates }, { contacts: true, templates: true }, '1.8.0', new Date(0));
  assert.equal(both.version, '1.8.0');
  assert.deepEqual(both.templates, [{ title: 'Hola', text: 'Hola!' }]);
  assert.equal(both.contacts[0].id, undefined);
  assert.equal('templates' in buildBackup({ contacts, templates }, { contacts: true, templates: false }), false);
  assert.deepEqual(parseBackup(both), { contacts: both.contacts, templates: both.templates });
  assert.deepEqual(parseBackup([{ phone: '1' }]), { contacts: [{ phone: '1' }], templates: [] });
  assert.equal(parseBackup({ foo: 1 }), null);
  assert.equal(parseBackup('x'), null);
});

test('templates merge without duplicates and filter without accents', () => {
  const r = mergeTemplates([{ id: 'a', title: 'Hola', text: 'Hola!' }], [{ title: 'Hola', text: 'Hola!' }, { title: 'Envío', text: 'Tu envío salió' }, { title: 'vacía', text: '  ' }]);
  assert.equal(r.added, 1);
  assert.equal(r.skipped, 2);
  assert.equal(r.templates.length, 2);
  assert.deepEqual(filterTemplates(r.templates, 'envio').map(x => x.title), ['Envío']);
  assert.equal(filterTemplates(r.templates, '').length, 2);
});

test('versions compare numerically and releases are read safely', async () => {
  const { compareVersions, readRelease } = await import('../WhatsApp_Sender_Pro/updater.js');
  assert.equal(compareVersions('1.10.0', '1.9.0'), 1);
  assert.equal(compareVersions('v1.9.0', '1.9'), 0);
  assert.equal(compareVersions('1.8.9', '1.9.0'), -1);
  const base = 'https://github.com/EXECRISTIAN/whatsapp-sender-pro/releases/download/v1.9.1/';
  const ok = readRelease({ tag_name: 'v1.9.1', body: 'Notas', assets: [{ name: 'notes.txt', browser_download_url: base + 'notes.txt' }, { name: 'WhatsApp_Sender_Pro_v1.9.1.zip', browser_download_url: base + 'WhatsApp_Sender_Pro_v1.9.1.zip' }] });
  assert.equal(ok.version, '1.9.1');
  assert.equal(ok.url, base + 'WhatsApp_Sender_Pro_v1.9.1.zip');
  assert.equal(readRelease({ tag_name: 'v2.0.0', assets: [{ name: 'x.zip', browser_download_url: 'https://evil.example/x.zip' }] }).url, '');
  assert.equal(readRelease({ tag_name: 'v2.0.0', prerelease: true, assets: [] }), null);
  assert.equal(readRelease({ tag_name: 'latest', assets: [] }), null);
});
