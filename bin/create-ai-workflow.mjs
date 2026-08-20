#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, basename, relative } from 'node:path';
import { existsSync, cpSync, mkdirSync, symlinkSync, readFileSync, appendFileSync, lstatSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const cwd = process.cwd();

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('-')));
const positional = args.filter((a) => !a.startsWith('-'));
const force = flags.has('--force');
const noSkills = flags.has('--no-skills');
const noGit = flags.has('--no-git');
const yes = flags.has('-y') || flags.has('--yes');
const targetDir = positional[0] ? resolve(cwd, positional[0]) : cwd;

const PLANNING_DIRS = ['tickets', 'spec', 'pull-requests', 'review-replies', 'blog'];

const FILES = ['AGENTS.md', 'skills-lock.json'];
const DIRS = ['examples', '.github'];
const SKIPPED_FILES = ['workflows/publish.yml'];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function copyScaffold(target) {
  for (const file of FILES) {
    const src = join(pkgRoot, file);
    const dest = join(target, file);
    if (!existsSync(src)) continue;
    if (existsSync(dest) && !force) {
      log(`  skip  ${file} (exists, use --force to overwrite)`);
      continue;
    }
    cpSync(src, dest, { force: true });
    log(`  copy  ${file}`);
  }
  for (const dir of DIRS) {
    const src = join(pkgRoot, dir);
    const dest = join(target, dir);
    if (!existsSync(src)) continue;
    if (existsSync(dest) && !force) {
      log(`  skip  ${dir}/ (exists, use --force to overwrite)`);
      continue;
    }
    copyDirFiltered(src, dest, SKIPPED_FILES);
    log(`  copy  ${dir}/`);
  }
}

function copyDirFiltered(src, dest, skipped) {
  copyDirFilteredRec(src, dest, skipped, src);
}

function copyDirFilteredRec(src, dest, skipped, root) {
  const rel = (p) => relative(root, p);
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const r = rel(s);
    if (skipped.includes(r)) continue;
    const d = join(dest, entry);
    if (lstatSync(s).isDirectory()) {
      copyDirFilteredRec(s, d, skipped, root);
    } else {
      cpSync(s, d, { force: true });
    }
  }
}

function createPlanningDirs(target) {
  mkdirSync(join(target, '.plan'), { recursive: true });
  for (const dir of PLANNING_DIRS) {
    mkdirSync(join(target, '.plan', dir), { recursive: true });
  }
  log('  make  .plan/{tickets,spec,pull-requests,review-replies,blog}/');
}

function gitRoot(target) {
  let dir = target;
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function excludePlan(target) {
  const root = gitRoot(target);
  if (!root) {
    log('  note  no git repo found; .plan/ not excluded. Init git and run again, or add ".plan/" to your ignore rules.');
    return;
  }
  if (noGit) {
    log('  note  skipped git exclude (--no-git)');
    return;
  }
  const exclude = join(root, '.git', 'info', 'exclude');
  const existing = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
  const entry = '.plan/';
  if (existing.includes(entry)) {
    log('  ok    .plan/ already excluded from git');
    return;
  }
  appendFileSync(exclude, `\n# Local-only planning artifacts (see AGENTS.md)\n${entry}\n`);
  log('  edit  .git/info/exclude -> .plan/');
}

function groupSkillsBySource() {
  const lock = JSON.parse(readFileSync(join(pkgRoot, 'skills-lock.json'), 'utf8'));
  const groups = new Map();
  for (const [name, entry] of Object.entries(lock.skills)) {
    const list = groups.get(entry.source) ?? [];
    list.push(name);
    groups.set(entry.source, list);
  }
  return groups;
}

function installSkills(target) {
  if (noSkills) {
    log('  note  skipped skills install (--no-skills)');
    return;
  }
  if (!existsSync(join(target, 'skills-lock.json'))) {
    log('  note  no skills-lock.json; skipping skills install');
    return;
  }
  const lock = JSON.parse(readFileSync(join(target, 'skills-lock.json'), 'utf8'));
  const installed = Object.keys(lock.skills).every((name) => existsSync(join(target, '.agents', 'skills', name)));
  if (installed) {
    log('  ok    skills already installed in .agents/skills/');
    ensureClaudeLinks(target);
    return;
  }
  const groups = groupSkillsBySource();
  for (const [source, skills] of groups) {
    const cmd = ['--yes', 'skills', 'add', source, '--skill', ...skills, '--agent', 'universal', '--agent', 'claude-code', '-y'];
    log(`  run   npx skills add ${source} (${skills.length} skills)`);
    const res = spawnSync('npx', cmd, { cwd: target, stdio: 'inherit' });
    if (res.status !== 0) {
      log(`  warn  skills install for ${source} exited ${res.status}`);
    }
  }
  ensureClaudeLinks(target);
}

function ensureClaudeLinks(target) {
  const lock = JSON.parse(readFileSync(join(target, 'skills-lock.json'), 'utf8'));
  const agentsSkills = join(target, '.agents', 'skills');
  const claudeSkills = join(target, '.claude', 'skills');
  for (const name of Object.keys(lock.skills)) {
    const srcDir = join(agentsSkills, name);
    const link = join(claudeSkills, name);
    if (!existsSync(srcDir)) continue;
    mkdirSync(claudeSkills, { recursive: true });
    if (existsSync(link)) continue;
    try {
      symlinkSync(join('..', '.agents', 'skills', name), link);
      log(`  link  .claude/skills/${name}`);
    } catch (err) {
      log(`  warn  could not link .claude/skills/${name}: ${err.message}`);
    }
  }
}

function printNextSteps(target) {
  log('');
  log('Scaffolded. Next:');
  log('  1. Open the project in your agent tool and start with /to-spec');
  log('  2. Turn the spec into tickets with /to-tickets');
  log('  3. Create a branch named after a ticket and implement it');
  log(`  4. Run "npx skills update" in ${target} to refresh skills later`);
}

function main() {
  mkdirSync(targetDir, { recursive: true });
  log(`Scaffolding the AI workflow into ${targetDir}`);
  log('');
  copyScaffold(targetDir);
  createPlanningDirs(targetDir);
  excludePlan(targetDir);
  installSkills(targetDir);
  printNextSteps(targetDir);
}

main();
