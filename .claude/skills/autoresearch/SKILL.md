---
name: autoresearch
description: Autonomously optimize any Claude Code skill by running it repeatedly, scoring outputs against evals (binary for rules + comparative for quality), mutating the skill's prompt and reference assets, and keeping improvements. Based on Karpathy's autoresearch methodology. Use this skill whenever the user mentions optimizing a skill, improving a skill, running autoresearch, making a skill better, self-improving a skill, benchmarking a skill, evaluating a skill, running evals on a skill, or any request to iteratively test and refine a skill — even if they don't use the word "autoresearch" explicitly. Also trigger on 스킬 개선, 스킬 최적화, 스킬 벤치마크, 스킬 평가. Outputs an improved target skill file, a results log, a changelog, and a research log of meaningful direction shifts.
---

# Autoresearch for Skills

Most skills work about 70% of the time. The other 30% you get garbage. The fix isn't to rewrite the skill from scratch. It's to let an agent run it dozens of times, score every output, and tighten the prompt until that 30% disappears.

This skill adapts Andrej Karpathy's autoresearch methodology (autonomous experimentation loops) to Claude Code skills. Instead of optimizing ML training code, we optimize skill prompts.

---

## the core job

Run a loop: generate outputs → score against evals → mutate the skill → keep improvements → repeat.

**Output:** An improved target skill file + `results.json` + `results.tsv` + `changelog.md` + `research-log.json` + live HTML dashboard.

---

## project setup (required)

autoresearch modifies the target skill file on every experiment. To prevent Claude Code from prompting for approval each time, add the following permissions to `.claude/settings.json` at the project root.

```json
{
  "permissions": {
    "allow": [
      "Edit(.claude/skills/**)",
      "Write(.claude/skills/**)",
      "Edit(~/.claude/skills/**)",
      "Write(~/.claude/skills/**)"
    ]
  }
}
```

If `.claude/settings.json` already exists, add only the entries you need to the `permissions.allow` array.

---

## step 0: gather context

**STOP. Do not run any experiments until all fields below are confirmed with the user.**

1. **Target skill(s)** — Which skill to optimize? (exact path to the target `SKILL.md`)
2. **Pipeline mode** — Single skill or multi-skill pipeline? Default: single. See `references/pipeline-guide.md`.
3. **Test inputs** — 3-5 different prompts/scenarios covering different use cases. See `references/eval-guide.md`.
4. **Eval criteria** — Binary checks for rules (3-6) + comparative checks for quality dimensions (0-5).
5. **Runs per experiment** — How many times to run the skill per mutation? Default: 5.
6. **Budget cap** — Optional. Max experiment cycles before stopping. Default: no cap.
7. **Termination conditions** — Default: 95%+ binary pass rate for 3 consecutive experiments.
8. **Human review mode** — Review the first few experiments before full auto? Default: yes (first 3).

If the user provides an `evals.json` file, use that instead of asking for items 3-4.

---

## step 1: read the skill

Before changing anything, read and understand the target skill completely.

1. Read the full target skill file
2. Read any files in `references/` that the target skill links to
3. Identify the skill's core job, process steps, and output format
4. Note any existing quality checks or anti-patterns already in the skill

Do NOT skip this.

---

## step 2: build the eval suite

Convert the user's eval criteria into a structured test. See `references/eval-guide.md` for full templates.

**Three eval types:**
- **Binary evals** — objective rule compliance (yes/no)
- **Comparative evals** — subjective quality improvement (win=1, tie=0.5, loss=0)
- **Fidelity evals** — pipeline stage consistency (pipeline mode only)

**Scoring — two axes, reported separately:**
- **Binary pass rate** = `binary_passes / (binary_evals × runs)`
- **Comparative win rate** = `comparative_wins / (comparative_evals × runs)`

### Eval type hierarchy (ordered by determinism)

**Tier 1 — Deterministic checks (first choice)**
grep, regex, file existence, JSON parse success, required section presence, etc.

**Tier 2 — Structural validation**
Heading hierarchy, table column counts, code block language specifiers.

**Tier 3 — LLM-as-judge (last resort)**
Content quality, tone, accuracy. Use only when Tier 1-2 can't verify.

**Goal: at least 50% of all evals should be Tier 1-2.**

### Rules for all evals

- Specific enough to be consistent
- Not so narrow that the skill games the eval
- Each eval tests something distinct

**Before finalizing, run the 3-question test on each eval:**
1. Could two different agents score the same output and agree?
2. Could a skill game this eval without actually improving?
3. Does this eval test something the user actually cares about?

---

## step 3: define the live dashboard

Read `references/dashboard-guide.md` for the full dashboard spec.

**Key rule:** Never use `fetch()` or XHR to load data. Inline latest data directly into `<script>const RESULTS_DATA = ...;</script>` inside dashboard.html. This lets the file open with `file://` protocol without a server.

---

## step 4: define the run harness

Define the exact repeatable procedure for running the target skill. Write harness content here; file saved to `autoresearch-[skill-name]/run-harness.md` in step 5.

**A trustworthy harness specifies:**
1. **Input** — which test prompt, in what format
2. **Execution** — which command or agent invocation runs the skill
3. **Output capture** — where artifacts land and how they're saved to `runs/exp-N/<prompt-id>/`

If you cannot define a trustworthy harness, do not proceed. Switch to "skill rewrite + manual review" mode instead.

---

## step 5: establish baseline (or resume)

**First, check if `autoresearch-[skill-name]/` already exists.**

### If the folder already exists → RESUME

1. Read `changelog.md` and `research-log.json` to understand what was already tried
2. Load `results.json` to find the current best score and next experiment number
3. Read `<target-skill-filename>.baseline` to understand the original starting point
4. Tell the user the path to `dashboard.html` — open it with `file://` in a browser
5. Resume the experiment loop — skip directly to step 6 or step 7 as appropriate

### If the folder does NOT exist → NEW BASELINE

Run the skill AS-IS before changing anything. This is experiment #0.

1. Create `autoresearch-[skill-name]/` with `runs/baseline/`
2. Create `results.json`, `changelog.md`, `research-log.json`, `dashboard.html`, `run-harness.md`
3. Back up the original skill as `<target-skill-filename>.baseline`
4. Run the skill with test inputs, copy all outputs into `runs/baseline/<prompt-id>/`
5. Score every output against every eval, record baseline score
6. `git checkout -b autoresearch/[skill-name]`
7. Add `autoresearch-[skill-name]/` to `.gitignore`
8. `git add <target-skill-path> .gitignore && git commit -m "autoresearch: baseline ([score]/[max])"`

**IMPORTANT:** If baseline is 90%+, confirm with the user whether further optimization is worthwhile.

---

## step 6: human review phase (optional)

> Skip if user set human review mode to `skip`.

The first 3 experiments run with human review. This is where subjective judgment — tone, brand fit, personal preference — gets baked into the optimization direction.

**For each human-reviewed experiment:**
1. Analyze failures and form a hypothesis
2. Make ONE change to the target skill file
3. `git add <mutated-files> && git commit -m "autoresearch: [description]"`
4. Run the experiment and score it
5. Present results: change + why, before/after score, 2-3 sample outputs, keep/discard recommendation
6. Ask: "Does this direction feel right?"
7. If subjective feedback given, note in changelog.md as `[HUMAN INSIGHT]`
8. Keep or discard (same rules as step 7)
9. Log with status `human-reviewed`

**After 3 human-reviewed experiments:** Switch to auto mode.

---

## step 7: run the autonomous experiment loop

**NEVER STOP.** Once the loop starts, never pause to ask for confirmation. Keep running until the user manually stops you or a stop condition is reached.

**LOOP:**

1. **Analyze failures.** Look at which evals fail most. Read the actual failing outputs.

2. **Form a hypothesis.** Pick a mutation at the right level. See `references/mutation-guide.md`.

3. **Make the change.** Edit the target file(s).

4. **Commit:** `git add <mutated-files> && git commit -m "autoresearch: [description]"`

5. **Run the experiment.** Save all outputs into `runs/exp-N/<prompt-id>/`.

6. **Score it.** Run every output through every eval. Measure `skill_lines` with `wc -l <target-skill-path>`.

7. **Decide: keep or discard.**

   | Score change | Line count change | Decision |
   |-----------|-----------|------|
   | Improved (+2 or more) | Increased | **KEEP** |
   | Marginal improvement (+1) | Increased by 10+ lines | **DISCARD** |
   | Same (±0) | Decreased | **KEEP** — shorter is better |
   | Same (±0) | Increased | **DISCARD** |
   | Worse | Any | **DISCARD** |

   DISCARD procedure: check `git status --porcelain` for unrelated changes, stash if needed, `git reset --soft HEAD~1`, restore only mutated files, `git stash pop`.

8. **Log the result** and update results.json / dashboard.

9. **If direction-level change**, log it in research-log.json.

10. **Repeat.**

### Periodic deletion experiments

Every 5th experiment, intentionally attempt a "deletion mutation." Remove recently added rules that aren't contributing. If the score holds, that's the best possible result.

### stop conditions

- User manually stops
- Budget cap reached
- 95%+ pass rate for 3 consecutive experiments
- System-level timeout

### when stuck — strategies

After 3 consecutive discards:
1. **Reorder instructions**: Move failing-eval-related instruction to the top
2. **Negative → positive framing**: "do not X" → "always do Y"
3. **Replace examples**: Don't add — replace with failure-pattern examples
4. **Deletion experiment**: Remove one instruction and measure
5. **Increase specificity**: "write concisely" → "limit each section to 3-5 sentences"
6. **Adjust persona**: Change the role description
7. **Combine near-misses**: Apply two near-miss mutations simultaneously (exception to one-change rule)

---

## step 8: maintain the logs

- **changelog.md** — every experiment, kept or discarded
- **research-log.json** — direction shifts only (max 30 entries, keep recent + pattern summary)
- **results.json** — machine-readable score file, one object per experiment
- **results.tsv** — columns: `experiment  score  max_score  pass_rate  skill_lines  status  description`

See `references/logging-guide.md` for templates and schemas.

---

## step 9: deliver results

When the user returns or the loop stops, present:

1. **Score:** Baseline → Final (binary pass rate + comparative win rate)
2. **Experiments:** total tried, keep rate
3. **Top 3 changes** that helped most (from changelog)
4. **Human insights** incorporated (if any)
5. **Remaining failures** (if any)
6. **Prompt size:** baseline → final line count
7. **Git log:** `git log --oneline autoresearch/[skill-name]`
8. **File locations** for all output files

---

## output format

```
autoresearch-[skill-name]/
├── dashboard.html
├── results.json
├── results.tsv
├── changelog.md
├── research-log.json
├── <target-skill-filename>.baseline
├── run-harness.md
└── runs/
    ├── baseline/
    ├── exp-1/
    └── exp-N/
```

---

## references

- **`references/eval-guide.md`**: Binary/comparative evaluation writing method
- **`references/execution-guide.md`**: Execution loop behavior and harness patterns
- **`references/logging-guide.md`**: results.json / results.tsv schema
- **`references/mutation-guide.md`**: Prompt mutation strategies (L1/L2/L3)
- **`references/pipeline-guide.md`**: Multi-skill pipeline optimization
- **`references/dashboard-guide.md`**: Live HTML dashboard spec
- **`references/worked-example.md`**: Annotated end-to-end example
