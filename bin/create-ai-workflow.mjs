#!/usr/bin/env node

import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';
import { existsSync, cpSync, mkdirSync, symlinkSync, readFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const cwd = process.cwd();

const args = process.argv.slice(2);

let force = false;
let noSkills = false;
let noGit = false;
let noExamples = false;
let yes = false;
let agent = 'both';
let targetDirArg = null;

const VALID_AGENTS = ['universal', 'claude', 'both'];

function validateAgent(val) {
  if (!VALID_AGENTS.includes(val)) {
    process.stderr.write(`error: --agent must be one of universal|claude|both (got "${val}")\n`);
    process.exit(1);
  }
}

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--force') {
    force = true;
  } else if (a === '--no-skills') {
    noSkills = true;
  } else if (a === '--no-git') {
    noGit = true;
  } else if (a === '--no-examples' || a === '--without-examples') {
    noExamples = true;
  } else if (a === '-y' || a === '--yes') {
    yes = true;
  } else if (a === '--agent') {
    const val = args[i + 1];
    if (!val || val.startsWith('-')) {
      process.stderr.write(`error: --agent requires a value (universal|claude|both)\n`);
      process.exit(1);
    }
    validateAgent(val);
    agent = val;
    i++;
  } else if (a.startsWith('--agent=')) {
    const val = a.slice('--agent='.length);
    validateAgent(val);
    agent = val;
  } else if (a.startsWith('-')) {
    process.stderr.write(`error: unknown flag "${a}"\n`);
    process.exit(1);
  } else {
    if (!targetDirArg) targetDirArg = a;
  }
}

const targetDir = targetDirArg ? resolve(cwd, targetDirArg) : cwd;

const AGENT_ARGS = {
  universal: ['--agent', 'universal'],
  claude: ['--agent', 'claude-code'],
  both: ['--agent', 'universal', '--agent', 'claude-code'],
};

function getSkillAgentArgs(chosen) {
  return AGENT_ARGS[chosen] ?? AGENT_ARGS.both;
}

const AGENT_CHECK = {
  universal: { dir: '.agents/skills', label: '.agents/skills/' },
  claude: { dir: '.claude/skills', label: '.claude/skills/' },
  both: { dir: '.agents/skills', label: '.agents/skills/' },
};

const PLANNING_DIRS = ['tickets','spec','pull-requests','review-replies','incoming-prs','outgoing-reviews','blog','other'];

const FILES = ['AGENTS.md', 'CONTEXT.md', 'skills-lock.json'];
const DIRS = ['examples'];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function copyScaffold(target) {
  for (const file of FILES) {
    if (noSkills && file === 'skills-lock.json') {
      log('  skip  skills-lock.json (--no-skills)');
      continue;
    }
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
    if (noExamples && dir === 'examples') continue;
    const src = join(pkgRoot, dir);
    const dest = join(target, dir);
    if (!existsSync(src)) continue;
    if (existsSync(dest) && !force) {
      log(`  skip  ${dir}/ (exists, use --force to overwrite)`);
      continue;
    }
    cpSync(src, dest, { recursive: true, force: true });
    log(`  copy  ${dir}/`);
  }
  if (noExamples) {
    log('  skip  examples/ (--no-examples)');
  }
}

function createPlanningDirs(target) {
  mkdirSync(join(target, '.plan'), { recursive: true });
  for (const dir of PLANNING_DIRS) {
    mkdirSync(join(target, '.plan', dir), { recursive: true });
  }
  // logs  make  .plan/{tickets,spec,pull-requests,review-replies,incoming-prs,outgoing-reviews}/ — derived from PLANNING_DIRS to keep single source
  log(`  make  .plan/{${PLANNING_DIRS.join(',')}}/`);
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

function excludePlanningArtifacts(target) {
  if (noGit) {
    log('  note  skipped git exclude (--no-git)');
    return;
  }
  const root = gitRoot(target);
  if (!root) {
    log('  note  no git repo found; .plan/ not excluded. Init git and run again, or add ".plan/" to your ignore rules.');
    return;
  }
  const exclude = join(root, '.git', 'info', 'exclude');
  mkdirSync(join(root, '.git', 'info'), { recursive: true });
  const existing = existsSync(exclude) ? readFileSync(exclude, 'utf8') : '';
  const trimmed = new Set(existing.split('\n').map((l) => l.trim()));
  const HEADER = '# Local-only planning artifacts (see AGENTS.md)';
  const ENTRIES = ['/.plan/', '/AGENTS.md', '/CONTEXT.md'];
  const missing = ENTRIES.filter((e) => !trimmed.has(e));
  const hasHeader = trimmed.has(HEADER);
  if (missing.length === 0) {
    log('  ok    planning artifacts already excluded from git');
    return;
  }
  let toAppend = '';
  if (!hasHeader) {
    const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : existing.length > 0 ? '\n' : '';
    // For empty existing, still prefix a newline for consistency with prior behavior
    toAppend += `${prefix}${HEADER}\n`;
  } else if (existing.length > 0 && !existing.endsWith('\n')) {
    toAppend += '\n';
  }
  for (const e of missing) {
    toAppend += `${e}\n`;
  }
  // When file was empty and header was missing, ensure leading newline handling matches spec's single-header layout
  // If existing is empty, toAppend currently is "HEADER\n...\n" — prepend newline to match prior single-header style
  if (existing === '' && !hasHeader) {
    toAppend = `\n${toAppend}`;
  }
  appendFileSync(exclude, toAppend);
  for (const e of missing) {
    log(`  edit  .git/info/exclude -> ${e}`);
  }
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
  const skillNames = Object.keys(lock.skills);
  const agentArgs = getSkillAgentArgs(agent);

  const check = AGENT_CHECK[agent];
  const installed = skillNames.every((name) => existsSync(join(target, check.dir, name)));
  if (installed) {
    log(`  ok    skills already installed in ${check.label}`);
    if (agent === 'both') ensureClaudeLinks(target);
    return;
  }

  const groups = groupSkillsBySource();
  for (const [source, skills] of groups) {
    const cmd = ['--yes', 'skills', 'add', source, '--skill', ...skills, ...agentArgs, '-y'];
    const agentLabel = agentArgs.join(' ');
    log(`  run   npx skills add ${source} (${skills.length} skills) ${agentLabel}`);
    const res = spawnSync('npx', cmd, { cwd: target, stdio: 'inherit' });
    if (res.status !== 0) {
      log(`  warn  skills install for ${source} exited ${res.status}`);
    }
  }
  if (agent !== 'universal') {
    ensureClaudeLinks(target);
  }
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
  excludePlanningArtifacts(targetDir);
  installSkills(targetDir);
  printNextSteps(targetDir);
}

main();
