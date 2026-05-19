# vDU Best Practice Analysis Report Generator

This prompt generates a comprehensive analysis report comparing two vDU (Virtual Distributed Unit) claim files from Red Hat Best Practices Test Suite for Kubernetes.

## Context

You are a telco engineer working for Red Hat. You need to analyze partner workloads and assess their compliance with best practices using the Red Hat Best Practices Test Suite for Kubernetes catalog.

## Input Files

**Input A (Primary Analysis)**: First claim JSON file - this will be the main focus of the analysis
**Input B (Comparison)**: Second claim JSON file - used for comparison against Input A

- Each claim file contains test results with states: passed, failed, skipped, error
- Test results include failure details, catalog information, and compliance data
- Extract CNF version from filename (e.g., `claim-vDUCNF00_0.300.32219.json` → `vDUCNF00_0.300.32219`)
- Best practices catalog: [CATALOG.md](https://raw.githubusercontent.com/redhat-best-practices-for-k8s/certsuite/main/CATALOG.md)

## Required Outputs

### Excel File (`vdu-claim-comparison.xlsx`)

Multiple sheets:

- `comparison`: Side-by-side comparison of all tests (Input A vs Input B)
- `state_differences`: Tests that changed state between Input A and Input B
- `new_tests_in_newer`: Tests present only in Input A (excluding renames)
- `removed_tests_in_newer`: Tests present only in Input B (excluding renames)
- `category_summary`: Summary by test suite/category for Input A

### HTML Report (`vDU-best-practice-analysis.html`)

Two-part structure:

#### Part 1: Detailed Analysis (Input A Only)

- Summary metrics (total, passed, failed, skipped) - clickable for filtering
- **Treat `error` tests as `failed` in Part 1 totals and tables**
- Category breakdown by test suite
- Interactive filters:
  - Scenario dropdown (All Categories, Telco Mandatory, Telco Optional only)
  - Multi-select status checkboxes (passed, failed, skipped)
- Per-category tables with full test details including:
  - Test ID, description, status
  - Failure details from `checkDetails.NonCompliantObjectsOut`
  - Impact statement, remediation, best practice reference
  - Exception process information

#### Part 2: Version Comparison (Input A vs Input B)

- State differences table (tests that changed pass/fail/skip between versions)
- New tests in Input A (excluding renamed tests)  
- Removed tests in Input A (excluding renamed tests)
- **Simplified comparison tables**: Show only test_id, suite, tags, and states (no description, comparison_type, failure details, remediation, or impact)

## Data Processing Rules

### Test Result Extraction

- Parse `claim.results` from both Input A and Input B
- Extract test states, failure details from `checkDetails.NonCompliantObjectsOut`
- Map test IDs to catalog information for impact/remediation data

### Rename Detection

- Known mappings: `access-control-requests-and-limits` → `access-control-requests`
- Auto-detect renames by matching identical descriptions between versions
- Exclude renamed tests from new/removed sections

### Scenario Classification

- Parse catalog markdown to extract scenario requirements (Telco/Non-Telco/Far-Edge/Extended)
- Map each test to Mandatory/Optional per scenario
- Use for filtering in Part 1 analysis

## UI/Style Requirements

### Visual Design

- Modern card-based layout with shadows and rounded corners
- Gradient headers and appealing color scheme
- Responsive grid layout for summary metrics
- Hover effects on interactive elements

### Filter Controls

- Scenario dropdown (single selection)
- Status checkboxes (multi-select with chip styling)
- Clear visual feedback for active filters

### Table Styling

- Sticky headers for long tables
- Status badges with appropriate colors
- Hover effects on table rows
- Failure details and remediation in styled boxes

## Key Features

- **Dynamic Category Summary**: Updates to reflect current filters with totals row
- **Simplified Scenario Filter**: Only All, Telco Mandatory, Telco Optional
- **Multi-select Status Filter**: Checkboxes for passed/failed/skipped combinations
- **Clickable Summary Metrics**: Apply filters to analysis tables
- **Rename-aware Comparison**: Excludes renamed tests from new/removed sections

## Implementation Notes

- Input A becomes the primary analysis focus
- Input B is used only for comparison in Part 2
- Error status treated as failed in Part 1 (to include all tests)
- Category summary shows totals for current filter selection (e.g., "Telco Mandatory: 71 total, 24 passed, 19 failed, 28 skipped")
