---
name: script
description: Use when writing or reviewing AMI Script code — variable declarations and the type system, null handling and safety checks, control flow, custom method definitions, string operations, or templating for dynamic SQL/HTML.
---

# AMI Script Basics

## When to Activate

Activate when writing or reviewing AMI Script code involving:
- Variable declarations and type system
- Null handling and safety checks
- Control flow (if/else, loops)
- Custom method definitions
- String operations
- Templating for dynamic SQL or HTML

---

## Knowledge

Full patterns, examples, and pitfalls: call `aidoc_getDocumentation("amiscript")` on the live instance.

Class and method reference: call `web_getAmiScriptClass(className)` (omit `className` to list all classes).

Built-in language method lookup by name or intent, no live session required: `aidoc_findMethodByName(method_name)`, `aidoc_findMethodByDesc(method_desc)`, or `aidoc_listMethodsInClass(class_name)`.
