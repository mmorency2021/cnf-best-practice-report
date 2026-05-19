# Process Flow

## Architecture Overview

```mermaid
graph TD
    A[User opens browser] --> B[Upload Screen]
    B --> C{Upload Files}
    C -->|claim.json required| D[POST /api/upload]
    C -->|.log optional| D
    C -->|cluster YAML/JSON optional| D
    C -->|skip rules JSON optional| D

    D --> E[Claim Parser]
    E -->|Normalized results| F[Catalog Mapper]
    F -->|Enriched with catalog| G[Skip Analyzer]
    G -->|Classified skips| H{Log file?}

    H -->|Yes| I[Log Validator]
    H -->|No| J{Cluster file?}
    I --> J

    J -->|Yes| K[Cluster Parser]
    J -->|No| L[Store Session]
    K --> L

    L --> M[Return Dashboard JSON]
    M --> N[Render Dashboard]

    N --> O[Summary Cards]
    N --> P[Filter Bar]
    N --> Q[Category Tables]
    N --> R[Cluster Panel]

    N --> S{Export?}
    S -->|PPTX| T[GET /api/export/pptx/:id]
    S -->|XLSX| U[GET /api/export/xlsx/:id]
    T --> V[PPTX Generator]
    U --> W[XLSX Generator]
    V --> X[Download .pptx]
    W --> Y[Download .xlsx]
```

## Server Processing Pipeline

```mermaid
sequenceDiagram
    participant U as Browser
    participant S as Express Server
    participant CP as Claim Parser
    participant CM as Catalog Mapper
    participant SA as Skip Analyzer
    participant LV as Log Validator
    participant CL as Cluster Parser

    U->>S: POST /api/upload (multipart)
    S->>CP: parse(claimFile)
    CP-->>S: {metadata, results, totals}

    S->>CM: enrich(results)
    CM-->>S: results + catalog data + priority

    S->>SA: analyze(results, metadata, skipRulesPath)
    SA-->>S: skip classifications

    alt Log file provided
        S->>LV: validate(logFile)
        LV-->>S: {healthy, warnings, stats}
    end

    alt Cluster file provided
        S->>CL: parse(clusterFile)
        CL-->>S: {topology, nodes, podsByNamespace}
    end

    S->>S: Store session (30-min TTL)
    S-->>U: Dashboard JSON

    U->>S: GET /api/export/pptx/:sessionId
    S-->>U: .pptx file

    U->>S: GET /api/export/xlsx/:sessionId
    S-->>U: .xlsx file
```

## Dashboard Layout

```
+------------------------------------------------------------------+
|  Header: CNF version | OCP version | Certsuite | Run timestamp   |
+------------------------------------------------------------------+
|  [!] Log Health Warning Banner (if issues detected)              |
+------------------------------------------------------------------+
|  [Download PPTX]  [Download Excel]                               |
+----------+-------------------------------------------------------+
|          |  [Total: 119] [Passed: 82] [Failed: 21] [Skipped: 16] |
| Cluster  |-------------------------------------------------------|
| Panel    |  Category: [All v]  Scenario: [All v]  Status: [x][x]  |
|          |-------------------------------------------------------|
| Topology |  Category Summary Table                                |
| 3CP + 3W |  Suite | Total | Passed | Failed | Skipped            |
|          |-------------------------------------------------------|
| Pods:    |  Access Control (collapsible)                          |
| ns/pod   |    Test ID | Status | Description | Details | Priority |
| [YAML]   |  Lifecycle (collapsible)                               |
|          |    ...                                                 |
+----------+-------------------------------------------------------+
```

## Skip Analysis Decision Tree

```mermaid
graph TD
    A[Skipped Test] --> B{Match built-in rule?}
    B -->|Yes| C[valid-skip + reason]
    B -->|No| D{Match custom rule?}
    D -->|Yes| C
    D -->|No| E{Skip reason text analysis}
    E -->|IPv6 not configured| C
    E -->|SNO / single node| C
    E -->|No operators| C
    E -->|No performance profile| C
    E -->|DaemonSet| C
    E -->|Not applicable| C
    E -->|No match| F[needs-review]
```
