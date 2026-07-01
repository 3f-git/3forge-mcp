# AMI Layout — Format (v5) and Design Patterns

## When to Activate

Activate when:
- Generating or modifying `.ami` layout files (default unless v4 explicitly requested)
- Designing multi-panel dashboards or modularizing large applications
- Working with included layouts or cross-layout method sharing
- Implementing layout startup, access control, or lifecycle callbacks
- Building filter bar + table patterns, FormPanel → DataModel wiring, or row-select → detail patterns

---

## Knowledge

Full patterns, examples, and pitfalls: call `aidoc_getDocumentation("layout_structure")` on the live instance.

Full syntax reference: the live DOM schema via `web_showDomSchema(null)` (or `web_showDomSchema(typeName)` for a single panel/object type).

Common deployment patterns (filter bar, form-to-table, row select, cascading dropdowns): call `aidoc_searchPatterns(query)` → `aidoc_getPattern(name)` for prebuilt skeletons.
