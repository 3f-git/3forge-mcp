# WORKFLOW: Excel Workbook Decomposition

Use this workflow to systematically reverse-engineer an Excel workbook into its constituent logic, data flows, and business rules. Executing these steps in order produces a structured, software-engineering-focused report suitable for further agent consumption or developer handoff.

## Step 1: Structural Discovery

1. **Enumerate Sheets:** List all visible and hidden sheets.
2. **Categorize Sheets:** Heuristically classify each sheet into one of three categories:
   * **Input/Data:** Contains flat, tabular data with few formulas.
   * **Calculation:** Contains complex matrices, intermediate steps, and heavy formula or VBA usage.
   * **Output/Dashboard:** Contains charts, aggregated summaries, and heavy formatting.
3. **Identify Named Ranges:** Extract all named ranges and their targets. These often represent key business variables.

## Step 2: UI/UX and Workflow Analysis

1. **Identify Entry Points:** Look for unlocked cells, color-coded input fields, or data validation dropdowns to determine where the user interacts with the file.
2. **Assess Look and Feel:** Note the presence of conditional formatting, frozen panes, grouped rows/columns, and macro buttons.
3. **Synthesize Usage:** Combine entry points and outputs to write a 2-3 sentence summary of the user's expected journey through the file.

## Step 3: Dependency Mapping

1. **Trace Cell References:** For key output cells, trace the precedents (cells it depends on) backward to the source data.
2. **Trace Dependents:** Identify which downstream cells rely on the core data inputs.
3. **Construct Lineage:** Build a textual graph showing the flow.
   * *Example:* `Raw Sales Data (Sheet1) -> Aggregation Matrix (Sheet2) -> Monthly Revenue Chart (Dashboard)`

## Step 4: Formula Translation and Logic Extraction

1. **Isolate Core Formulas:** Identify the most frequently used or most complex formulas (e.g., nested `IF` statements, `INDEX/MATCH`, `SUMIFS`).
2. **De-obfuscate:** Replace cell references with their conceptual names based on headers or named ranges.
   * *Raw:* `=IF(C2>1000, C2*0.1, C2*0.05)`
   * *Cleaned:* `IF(TransactionAmount > 1000, TransactionAmount * 10%, TransactionAmount * 5%)`
3. **Business Rule Translation:** Convert the cleaned formula into a plain-text business rule.
   * *Translated:* "Apply a 10% discount for transactions over $1,000, otherwise apply a 5% discount."

## Step 5: Report Generation

Compile the findings from Steps 1-4. Ensure the tone is objective, architectural, and software-engineering focused.

---

## Next Step: Implement in AMI

Use the report from Steps 1-5 to drive an AMI dashboard build:

- **Data model** — map source sheets to Center tables (`aidoc_getDocumentation("schema_design")`) and DataModels (`aidoc_getDocumentation("datamodel")`)
- **Layout** — translate Output/Dashboard sheets to panels (`aidoc_getDocumentation("layout_structure")`)
- **Business logic** — implement extracted formulas as AmiScript triggers or DataModel `onProcess` callbacks (`aidoc_getDocumentation("center")`)
- **Starting point** — call `aidoc_search_patterns(query)` → `aidoc_getPattern(name)` for copy-paste scaffolding of common patterns (table panel, form panel, form-to-center write, row selection)
