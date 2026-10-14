import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  CHANGELOG_HEADER,
  addChangelogSection,
  changelogSection,
  compareSemver,
  incrementVersion,
  satisfiesRange,
} from './plugins.mjs';

test('satisfiesRange', () => {
  assert.equal(satisfiesRange('1.0.0', '^1.0.0'), true);
  assert.equal(satisfiesRange('1.9.3', '^1.0.0'), true);
  assert.equal(satisfiesRange('2.0.0', '^1.0.0'), false);
  assert.equal(satisfiesRange('0.9.0', '^1.0.0'), false);
  assert.equal(satisfiesRange('0.2.5', '^0.2.0'), true);
  assert.equal(satisfiesRange('0.3.0', '^0.2.0'), false);
  assert.equal(satisfiesRange('2.1.9', '~2.1.0'), true);
  assert.equal(satisfiesRange('2.2.0', '~2.1'), false);
  assert.equal(satisfiesRange('1.4.0', '>=1.4 <2'), true);
  assert.equal(satisfiesRange('2.1.0', '=2.1.0'), true);
  assert.equal(satisfiesRange('2.1.0', '2.1.1'), false);
  assert.equal(satisfiesRange('5.0.0', '*'), true);
  assert.throws(() => satisfiesRange('1.0.0', '1.x || 2.x'), /unsupported/);
});

test('compareSemver orders releases and pre-releases', () => {
  assert.equal(compareSemver('1.2.3', '1.2.3'), 0);
  assert.equal(compareSemver('1.10.0', '1.9.9'), 1);
  assert.equal(compareSemver('1.0.0-beta.2', '1.0.0-beta.10'), -1);
  assert.equal(compareSemver('1.0.0', '1.0.0-rc.1'), 1);
  assert.equal(compareSemver('1.0.0-alpha', '1.0.0-1'), 1);
});

test('incrementVersion', () => {
  assert.equal(incrementVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(incrementVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(incrementVersion('1.2.3', 'major'), '2.0.0');
  assert.equal(incrementVersion('1.2.3-beta.1', 'patch'), '1.2.3');
  assert.equal(incrementVersion('1.2.3', '1.5.0'), '1.5.0');
  assert.throws(() => incrementVersion('1.2.3', '1.2.3'), /not greater/);
  assert.throws(() => incrementVersion('1.2.3', 'huge'), /unknown bump/);
});

test('addChangelogSection creates a changelog and puts new sections on top', () => {
  const first = addChangelogSection('', '0.1.0', ['Initial release'], '2026-01-01');
  assert.ok(first.startsWith(CHANGELOG_HEADER));
  assert.match(first, /## \[0\.1\.0\] - 2026-01-01\n\n- Initial release\n$/);

  const second = addChangelogSection(first, '0.2.0', ['Add a skill', 'Fix a typo'], '2026-02-01');
  assert.ok(second.indexOf('## [0.2.0]') < second.indexOf('## [0.1.0]'));
  assert.throws(() => addChangelogSection(second, '0.2.0', []), /already has a section/);
  assert.match(addChangelogSection(second, '0.3.0', []), /- TODO: describe the change/);
});

test('changelogSection returns one section body', () => {
  const text = addChangelogSection(addChangelogSection('', '0.1.0', ['One']), '0.2.0', ['Two']);
  assert.equal(changelogSection(text, '0.2.0'), '- Two');
  assert.equal(changelogSection(text, '0.1.0'), '- One');
  assert.equal(changelogSection(text, '9.9.9'), null);
  assert.equal(changelogSection(text, '0.1'), null);
});
