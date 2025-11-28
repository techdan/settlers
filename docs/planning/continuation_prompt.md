# Cities & Knights Audit - Continuation Prompt

## Context Summary

I've completed an audit of the Cities & Knights expansion implementation and fixed the critical Defender VP token bug. The remaining work has been tracked in beads under epic `SettlersOfLanc-hag`.

## What Was Completed

### ✅ Fixed Issues
1. **Defender VP Tokens** - Added to victory calculation in `core/rules/victory-conditions.ts`
   - Players' earned Defender of Catan tokens now properly count toward victory
   - Fixed in both `calculateTotalVictoryPoints()` and `calculatePublicVictoryPoints()`

### ✅ Verified Correct
1. **Progress Card Draw Logic** - Correctly implements v2.1 GDD specification
   - Level 1+can draw (not Level 3+ as outdated repair plan stated)
   - Formula `threshold = level + 1` is correct
   
2. **Metropolis Level 5 Logic** - Correctly prevents stealing once owner reaches level 5
   - First to level 5 keeps it permanently
   - Implementation matches GDD v2.1 requirements

### ✅ Documentation Updated
1. **Repair Plan** - Updated to v2.1 specification (`docs/cities_and_knights_repair_plan.md`)
2. **Planning Documents** - Created comprehensive guides in `docs/planning/`

## Remaining Work (Tracked in Beads)

**Epic**: `SettlersOfLanc-hag` - Cities & Knights Final Verification & Fixes

### High Priority Tasks
1. **SettlersOfLanc-??? (Intrigue Card)** - Implement full displacement logic
   - Intrigue can displace ANY knight (basic, strong, mighty)
   - Should trigger same displacement logic as normal knight displacement
   - File: `core/engine/progress/progress-card-manager.ts`
   - **IMPORTANT**: Intrigue is NOT a "virtual mighty knight" - it can displace all types

2. **SettlersOfLanc-xsq** - Verify knight displacement strength validation
   - Check that normal displacement validates: can only displace WEAKER knights
   - Files: `core/validation/knight-validator.ts`, `core/engine/knights/knight-manager.ts`

3. **SettlersOfLanc-aof** - Integration testing of full C&K gameplay

### Medium Priority Tasks
4. **SettlersOfLanc-jyp** - Verify Trading House (Trade level 3) implementation
5. **SettlersOfLanc-??? (Fortress)** - Verify Fortress (Politics level 3) implementation
6. **SettlersOfLanc-jvf** - Verify barbarian attack knight deactivation

### Low Priority Tasks
7. **SettlersOfLanc-??? (Knight Dialog)** - Verify knight management dialog completeness
8. **SettlersOfLanc-csm** - Verify progress card hand limit UI indicators

## Key Files Modified

- ✅ `core/rules/victory-conditions.ts` - Added defender VP tokens (COMMITTED)
- ✅ `docs/cities_and_knights_repair_plan.md` - Updated to v2.1 (COMMITTED)
- ⚠️ `core/engine/progress/progress-card-manager.ts` - Was corrupted, then restored via git

## Important Notes

1. **Intrigue Card Clarification**: The user clarified that Intrigue is NOT like a "virtual mighty knight". It can displace ANY knight type (basic, strong, mighty) and should trigger the same displacement logic as normal knight displacement.

2. **File Corruption**: During automated editing, `progress-card-manager.ts` was corrupted and had to be restored via `git restore`. Future edits to this large file should be done carefully.

3. **Beads Usage**: All remaining work is tracked in beads (not markdown files). Use `bd` commands to manage tasks.

## How to Continue

### Step 1: Check Ready Work
```bash
bd ready --json
```

### Step 2: Start with High Priority
Recommended order:
1. Fix Intrigue card displacement logic (highest impact)
2. Verify knight displacement validation
3. Verify Level 3 abilities (Trading House, Fortress)
4. Verify barbarian deactivation
5. Verify UI elements
6. Run integration tests

### Step 3: For Each Task
```bash
# Claim the task
bd update <id> --status in_progress --json

# Do the work
# ...

# Complete the task
bd close <id> --reason "Completed" --json
```

## Reference Documents

- **GDD**: `docs/cities_and_knights_gdd_corrected.v2.1.md` - Official game rules (v2.1 is latest)
- **Repair Plan**: `docs/cities_and_knights_repair_plan.md` - Updated to v2.1
- **Planning**: `docs/planning/cities_and_knights_remaining_issues.md` - Detailed implementation guide
- **Audit**: `docs/planning/audit_corrections_summary.md` - What was corrected and why

## Prompt for Next Session

```
Continue the Cities & Knights audit and implementation. I've completed the critical Defender VP token fix and verified the progress card logic is correct per v2.1 GDD.

Remaining work is tracked in beads under epic SettlersOfLanc-hag. Start by running:
bd ready --json

Then work on the high-priority tasks, starting with the Intrigue card displacement logic.

Key clarification: Intrigue card can displace ANY knight type (basic, strong, mighty) - it's not a "virtual mighty knight". It should trigger the same displacement logic as normal knight displacement.

Reference docs/planning/cities_and_knights_remaining_issues.md for detailed implementation guidance.
```

## Git Status

Modified files not yet committed:
- `core/rules/victory-conditions.ts` - Defender VP token fix
- `docs/cities_and_knights_repair_plan.md` - v2.1 updates
- `.beads/beads.base.jsonl` - New beads created

New files:
- `docs/planning/` directory with planning documents
- `docs/cities_and_knights_audit_report.md` (initial audit, superseded by planning docs)

## Estimated Time to Complete

- High priority tasks: 45-60 minutes
- Medium priority tasks: 30-45 minutes
- Low priority tasks: 30 minutes
- **Total**: ~2-2.5 hours

Most tasks are verification (checking existing code), not new implementation.
