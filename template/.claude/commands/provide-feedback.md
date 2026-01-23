# /provide-feedback

Generate a detailed report on Claude's experience building the game to improve the autonomous Unity development toolkit.

**Additional context:** $ARGUMENTS

## What This Command Does

Creates a structured retrospective report that captures:
- What worked well in the toolkit
- What caused friction or failures
- Specific tooling gaps discovered
- Whether autonomous systems functioned correctly
- Concrete, prioritized suggestions for improvement

This feedback directly improves future autonomous game development sessions.

## Report Structure

Write the report to `REPORT.md` in the project root with the following sections:

---

### Section 1: Session Overview

```markdown
## Session Overview

**Game Built:** [Name/description of the game]
**Complexity:** [Simple / Medium / Complex]
**Session Duration:** [Approximate time if known]
**Outcome:** [Completed / Partially Completed / Blocked]

### What Was Built
- [List major features/systems implemented]

### Final State
- [Working / Has Issues / Broken]
- [Brief description of current state]
```

---

### Section 2: Autonomous Systems Assessment

Rate each system and explain:

```markdown
## Autonomous Systems Assessment

### scene-awareness (State Capture)
**Used:** Yes / No / Partially
**Worked as expected:** Yes / No
**Issues encountered:**
- [Any problems with state capture or rollback]
**Suggestions:**
- [How to improve]

### verify-changes (Auto Test-Fix Loop)
**Used:** Yes / No / Partially
**Worked as expected:** Yes / No
**Issues encountered:**
- [Any problems with automatic testing/fixing]
**Suggestions:**
- [How to improve]

### quality-gate (Quality Checklist)
**Used:** Yes / No / Partially
**Worked as expected:** Yes / No
**Issues encountered:**
- [Any problems running quality checks]
**Suggestions:**
- [How to improve]

### screenshot (Visual Verification)
**Used:** Yes / No / Partially
**Worked as expected:** Yes / No
**Issues encountered:**
- [Could Claude actually see/analyze screenshots?]
- [Did visual verification help catch issues?]
**Suggestions:**
- [How to improve]

### iterator (Build-Test-Fix Cycles)
**Used:** Yes / No / Partially
**Worked as expected:** Yes / No
**Issues encountered:**
- [Any problems with iteration loops]
**Suggestions:**
- [How to improve]
```

---

### Section 3: Toolkit Effectiveness

```markdown
## Toolkit Effectiveness

### Skills That Helped
| Skill | How It Helped | Rating (1-5) |
|-------|---------------|--------------|
| [skill-name] | [specific way it helped] | [1-5] |

### Skills That Were Missing
| Situation | What Was Needed | Suggested Skill |
|-----------|-----------------|-----------------|
| [what Claude was trying to do] | [what capability was missing] | [proposed skill name + description] |

### Commands Used
| Command | Useful? | Issues |
|---------|---------|--------|
| [command] | Yes/No/Partially | [any problems] |

### Commands That Would Have Helped
| Situation | Proposed Command | What It Would Do |
|-----------|------------------|------------------|
| [situation] | /[command-name] | [description] |

### Agents Used
| Agent | Task Delegated | Result |
|-------|----------------|--------|
| [agent] | [what it did] | [success/failure] |

### Agents That Would Have Helped
| Situation | Proposed Agent | What It Would Do |
|-----------|----------------|------------------|
| [situation] | [agent-name] | [description] |
```

---

### Section 4: Friction Points

```markdown
## Friction Points

### Times Claude Had to Ask User for Help
| What Was Needed | Why Claude Couldn't Do It Alone | Suggested Fix |
|-----------------|--------------------------------|---------------|
| [description] | [missing capability] | [tooling suggestion] |

### Times Claude Had to Use Workarounds
| Original Goal | Workaround Used | Proper Solution Would Be |
|---------------|-----------------|--------------------------|
| [what Claude wanted to do] | [how Claude got around it] | [ideal tooling] |

### Errors That Were Hard to Debug
| Error | Why It Was Hard | What Would Have Helped |
|-------|-----------------|------------------------|
| [error description] | [missing info/capability] | [suggestion] |

### Things That Took Multiple Attempts
| Task | Attempts | Why It Was Difficult |
|------|----------|----------------------|
| [task] | [number] | [explanation] |
```

---

### Section 5: Unity MCP Assessment

```markdown
## Unity MCP Assessment

### MCP Actions That Worked Well
- [list actions that functioned correctly]

### MCP Actions That Had Issues
| Action | Issue | Workaround |
|--------|-------|------------|
| [action name] | [what went wrong] | [how Claude worked around it] |

### MCP Capabilities That Are Missing
| What Claude Needed | Current State | Suggested MCP Feature |
|--------------------|---------------|----------------------|
| [capability] | [not available / partially available] | [feature request] |
```

---

### Section 6: Prioritized Recommendations

```markdown
## Prioritized Recommendations

### High Priority (Would significantly improve autonomous operation)
1. **[Recommendation]**
   - Type: skill / command / agent / hook / mcp-feature
   - Effort: low / medium / high
   - Impact: [why this matters]

2. **[Recommendation]**
   - Type: ...
   - Effort: ...
   - Impact: ...

### Medium Priority (Would help but not critical)
1. **[Recommendation]**
   ...

### Low Priority (Nice to have)
1. **[Recommendation]**
   ...
```

---

### Section 7: Raw Notes

```markdown
## Raw Notes

### Things That Surprised Claude (Good or Bad)
- [unexpected behaviors, discoveries, etc.]

### Patterns Worth Documenting
- [any reusable patterns discovered during this session]

### Questions for Toolkit Maintainer
- [any clarifying questions about how things should work]

### Other Observations
- [anything else relevant]
```

---

## How to Write This Report

1. **Be specific** - Don't say "screenshots didn't work", say "manage_editor action=screenshot returned an error: [error message]"

2. **Be honest** - If something was frustrating, say so. If Claude couldn't do something, explain why.

3. **Be constructive** - For every problem, suggest a solution

4. **Prioritize** - Not all improvements are equal. Rank by impact on autonomous operation.

5. **Include examples** - When suggesting new tools, give concrete examples of how they'd be used

## Output

Write the complete report to `REPORT.md` in the project root.

After writing, summarize the top 3 recommendations to the user.
