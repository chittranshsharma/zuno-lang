# Lingua 🚀

> **A programming language designed, parsed, and interpreted from scratch — wrapped in an end-to-end full-stack execution platform.**

[![Language](https://img.shields.io/badge/Language-Lingua-blue.svg)](https://github.com/chittranshsharma/lingua)
[![Runtime](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Backend](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com)
[![Database](https://img.shields.io/badge/MongoDB-Mongoose-forestgreen.svg)](https://mongoosejs.com)
[![UI](https://img.shields.io/badge/UI-Vanilla_CSS_&_Modern_HTML5-orange.svg)](#)

---

## 📌 Overview

**Lingua** is a lightweight, custom-built programming language paired with a web-based playground and sandboxed execution environment. 

While the core interpreter can run in memory, **Lingua is built as a complete software product**. It bridges a handcrafted compilation pipeline (Tokenizer → Parser → AST → Interpreter) with a scalable 4-layer full-stack architecture that supports persistent workspaces, tamper-proof execution timeouts, AI-assisted code explanation, immutable version history, and server-rendered sharing.

---

## 🏗️ The 4-Layer Architecture

Lingua is structured around four distinct, decoupled layers:

```
┌────────────────────────────────────────────────────────┐
│  1. UI Layer (HTML5, Modern CSS3, Playground UI)       │
│     • Code Editor with Line Numbers & Syntax Styling   │
│     • Real-time Pipeline Visualizer (Tokens/AST/Run)   │
│     • Interactive Console & Output Terminal            │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│  2. Logic Layer (Lingua Core Engine)                   │
│     • Lexer / Tokenizer: Lexical Analysis              │
│     • Parser: Recursive Descent / AST Construction     │
│     • Tree-Walk Interpreter: Scoping, Control Flow     │
└───────────────────────────┬────────────────────────────┘
                            │ Worker Threads
┌───────────────────────────▼────────────────────────────┐
│  3. Backend Layer (Node.js & Express)                  │
│     • Sandboxed Execution Engine (Worker Threads)      │
│     • Secure LLM Proxy for Code Explanations           │
│     • SSR Public Share Links (/p/:slug via Handlebars) │
└───────────────────────────┬────────────────────────────┘
                            │ Mongoose ODM
┌───────────────────────────▼────────────────────────────┐
│  4. Data Layer (MongoDB)                               │
│     • Users, Programs, Versions & Run Logs Collections │
│     • Execution Analytics & Telemetry Aggregations     │
└────────────────────────────────────────────────────────┘
```

| Layer | Responsibility | Key Technologies |
|---|---|---|
| **1. UI Layer** | Interactive playground, code editor, multi-tab inspection (Tokens, AST, Diagnostics), responsive layout | Semantic HTML5, Vanilla CSS3, Google Fonts (Inter, Fira Code) |
| **2. Logic Layer** | Lexical tokenization, syntax analysis, AST evaluation, step caps | Core JavaScript Interpreter Engine |
| **3. Backend Layer** | Isolated execution runner, API rate limiting, LLM proxying, static files & template rendering | Node.js, Express, Handlebars (SSR) |
| **4. Data Layer** | Persistence, user accounts, immutable program snapshots, execution audit logs | MongoDB, Mongoose ODM |

---

## 🎯 Architecture Deep Dive: Why Does an Interpreter Need a Backend?

An interpreter can execute purely inside a client's browser. However, **an interpreter alone is not a product**. The entire architecture of Lingua is designed around five core capabilities that **cannot** live in the client:

### 1. Persistent Storage & Cross-Device Workspaces
A client-side playground loses all code when the user clears cache, switches browsers, or opens a new device. Lingua provides authenticated accounts with saved programs backed by MongoDB `User` and `Program` collections, accessible anywhere via structured REST endpoints.

### 2. Secure LLM "Explain This Code" Proxy
Lingua offers an automated AI explanation engine for programs. Shipping an AI provider API key to the client browser exposes it to immediate theft via browser DevTools. The Express backend serves as a secure proxy, validating requests, attaching secret keys server-side, and streaming explanations back safely.

### 3. Tamper-Proof Limits & Sandboxed Execution
In a client-side environment, loop limits and step counters can be easily bypassed by modifying variables in the browser console. For true security:
- Code runs inside an isolated Node.js **Worker Thread**.
- A hard, tamper-proof execution timeout kills runaway infinite loops (`while(true)`) and memory leaks.
- Prevents client browser freeze and denial-of-service conditions.

### 4. Immutable Version History & Observability Run Logs
Every save creates a new immutable `Version` document, allowing users to diff changes and revert back to any prior state. Every single program execution is logged into a `Run` collection with timing metrics, node counts, and exit statuses. Mongoose aggregation pipelines enable queries such as:
> *"This program ran 47 times: 35 succeeded, 12 halted with runtime errors."*

### 5. Server-Rendered Public Share Links (`/p/:slug`)
When users share a code snippet via a public URL, they shouldn't force recipients to download a heavy JavaScript bundle or wait for client-side hydration just to preview the code. Public snippets are server-rendered with **Handlebars**, delivering lightning-fast previews with full OpenGraph/SEO meta tags.

---

## 🔄 The Unified Data Flow

A core architectural strength of Lingua is **zero translation overhead across layers**:

> *"The same result object is produced by the interpreter, stored in MongoDB, returned by Express, and rendered by the frontend — one consistent shape across every layer."*

```json
{
  "status": "success",
  "output": [
    "Hello, World!",
    "Hello, world! Lingua",
    "Hello, world! Lingua",
    "Hello, world! Lingua",
    "3"
  ],
  "stats": {
    "tokens": 18,
    "astNodes": 7,
    "executionTimeMs": 4.2
  },
  "diagnostics": []
}
```

---

## ⚡ Lingua Language Syntax

Lingua features a clean, expressive C-family syntax designed for readability:

```rust
// Variables & Data Types
let name = "World";
let count = 3;

// Functions
fn greet(n) {
  print("Hello, " + n + "!");
}

// Function Calls
greet(name);

// Control Flow (Loops)
for (let i = 0; i < count; i = i + 1) {
  print("Hello, world! Lingua");
}
```

### Features Supported:
- Variable declarations (`let`)
- Primitive types: Strings, Numbers, Booleans
- First-class function declarations (`fn`) & scope bindings
- Iteration constructs (`for`, `while`)
- Standard I/O output (`print`)
- Multi-phase pipeline diagnostics (Syntax errors, token anomalies, runtime step caps)

---

## 🔌 API Route Blueprint

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/run` | Dispatches source code to an isolated worker thread; returns tokens, AST node count, output, and execution time. |
| `POST` | `/api/explain` | Proxies program AST/code to LLM with protected server credentials. |
| `GET` | `/api/programs` | Fetches saved programs for the authenticated user. |
| `POST` | `/api/programs` | Saves current program and pushes a new snapshot to the `Version` history. |
| `GET` | `/api/programs/:id/runs` | Aggregates execution telemetry and logs for a specific program. |
| `GET` | `/p/:slug` | Server-rendered public share page powered by Handlebars. |

---

## 📊 Database Collections (MongoDB)

```
┌─────────────────┐       ┌────────────────────┐
│   User          │       │   Program          │
├─────────────────┤       ├────────────────────┤
│ _id             │◄──────│ userId             │
│ email           │       │ _id                │
│ passwordHash    │       │ title              │
│ createdAt       │       │ slug (unique)      │
└─────────────────┘       │ currentVersionId   │
                          └─────────┬──────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────┐                         ┌──────────────────────┐
│   Version             │                         │   Run                │
├───────────────────────┤                         ├──────────────────────┤
│ _id                   │                         │ _id                  │
│ programId             │                         │ programId            │
│ sourceCode            │                         │ output [String]      │
│ versionNumber         │                         │ executionTimeMs      │
│ createdAt             │                         │ error (null/String)  │
└───────────────────────┘                         │ createdAt            │
                                                  └──────────────────────┘
```

---

## 🚀 Quick Start & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or later)
- [MongoDB](https://www.mongodb.com/) (running locally or MongoDB Atlas connection string)

### 1. Clone the repository
```bash
git clone https://github.com/chittranshsharma/lingua.git
cd lingua
```

### 2. View the Playground UI
You can open `index.html` directly in your browser or run a lightweight local static server:
```bash
npx serve .
```

---

## 🎓 Viva & Defense Reference Cheatsheet

When defending the design and architecture of Lingua:

- **Point to explicit routes**: Every UI action maps directly to a defined server-side contract (e.g., *Run button triggers `POST /api/run` → Express spawns an isolated execution context → output telemetry is saved to `Run` collection → normalized JSON returned*).
- **Emphasize security**: Execution limits (step caps, timeouts) must live behind the backend layer so they cannot be disabled in browser developer tools.
- **Maintain layer vocabulary**: Frame discussions around the course hierarchy:
  - **UI Layer** (Semantic HTML & CSS design system)
  - **Logic Layer** (Handwritten Lexer, Parser, & Tree-Walk Interpreter)
  - **Backend Layer** (Node.js & Express REST endpoints, sandboxing worker, SSR templates)
  - **Data Layer** (MongoDB schemas, versioning & aggregation pipelines)

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
