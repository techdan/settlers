# TODO Comment Resolution

## core/validation/metropolis-validator.ts
- **Line:** validation of metropolis placement
- **Original TODOs:**
  - Check if player has required improvement level.
  - Check if metropolis of this type is available or can be stolen.
- **Decision:** Completed.
- **Details:** Validator now enforces `CK_CONSTANTS.METROPOLIS_REQUIREMENT` using player improvement levels, verifies metropolis state exists, and applies availability/steal rules (unclaimed allowed; cannot rebuild if already owner; can steal only with higher improvement level than current owner). Removes both TODOs.
