---
name: omr-web-clone
description: Clone a website from its URL, replicating visual appearance and core interactions. Uses Cursor's browser tools for extraction and iterative verification.
argument-hint: "<target URL>"
---

# Web Clone — URL to Working Replica

Clone a target website from its URL, replicating both visual appearance and core interactive functionality. Uses browser automation for live page extraction, code generation, and iterative visual/functional verification.

## When to use

- The user provides a target URL and wants the site replicated as working code.
- The user says "clone site", "clone website", "copy webpage", or "web-clone".
- Task requires both visual fidelity AND functional parity with the original.

## When NOT to use

- User only has screenshot references without a live URL — use standard implementation.
- User wants to redesign or improve the site — use normal implementation flow.
- Target requires authentication, payment flows, or backend API parity — out of scope.
- Multi-page deep cloning — v1 handles single-page scope only.

## Scope (v1)

**Included**:
- Layout structure (header, nav, content areas, sidebar, footer)
- Typography (font families, sizes, weights, line heights)
- Colors, spacing, borders, border-radius
- Core interactions: navigation links, buttons, forms, dropdowns, modals, toggles
- Responsive hints from extracted layout

**Excluded**:
- Backend API integration or data fetching
- Authentication flows or protected content
- Dynamic/personalized content
- Multi-page crawling or route graph cloning
- Third-party widget functionality (maps, embeds, chat widgets)
- Image/asset replication (use placeholders for external images)

**Legal**: Only clone sites you own or have explicit permission to replicate.

## Prerequisites

Browser automation must be available. Cursor's built-in browser tools (`cursor-ide-browser` MCP) or a Playwright MCP server will work.

Required capabilities:
- Navigate to URLs
- Take screenshots
- Execute JavaScript in the page
- Capture page snapshots (accessibility tree)

If no browser tools are available, stop and instruct the user to configure browser MCP.

## Execution protocol

### Pass 1: Extract

Capture the target page's structure, styles, interactions, and visual baseline.

1. **Navigate** to the target URL.
2. **Wait** for the page to fully render (network idle or 5s timeout).
3. **Accessibility snapshot** — captures the semantic tree (roles, names, values). Primary structural reference.
4. **Full-page screenshot** — save as baseline reference `target-full.png`.
5. **DOM + computed styles** — execute JavaScript to extract:
   ```javascript
   (() => {
     const walk = (el, depth = 0) => {
       if (depth > 8 || !el.tagName) return null;
       const cs = window.getComputedStyle(el);
       return {
         tag: el.tagName.toLowerCase(),
         id: el.id || undefined,
         classes: [...el.classList].slice(0, 5),
         styles: {
           display: cs.display, position: cs.position,
           width: cs.width, height: cs.height,
           padding: cs.padding, margin: cs.margin,
           fontSize: cs.fontSize, fontFamily: cs.fontFamily,
           fontWeight: cs.fontWeight, color: cs.color,
           backgroundColor: cs.backgroundColor,
           borderRadius: cs.borderRadius,
           flexDirection: cs.flexDirection, gap: cs.gap,
           gridTemplateColumns: cs.gridTemplateColumns,
         },
         text: el.childNodes.length === 1 && el.childNodes[0].nodeType === 3
           ? el.textContent?.trim().slice(0, 100) : undefined,
         children: [...el.children].map(c => walk(c, depth + 1)).filter(Boolean),
       };
     };
     return walk(document.body);
   })()
   ```
6. **Interactive elements** — catalog all interactable elements:
   ```javascript
   (() => {
     const results = [];
     document.querySelectorAll(
       'button, a[href], input, select, textarea, [role="button"], ' +
       '[onclick], [aria-haspopup], [aria-expanded], details, dialog'
     ).forEach(el => {
       results.push({
         tag: el.tagName.toLowerCase(),
         type: el.type || el.getAttribute('role') || 'interactive',
         text: (el.textContent || '').trim().slice(0, 80),
         href: el.href || undefined,
         isVisible: el.offsetParent !== null,
       });
     });
     return results;
   })()
   ```

### Pass 2: Build Plan

Analyze extraction results and decompose into a component plan.

1. **Identify page regions**: nav bar, hero/banner, main content, sidebar, footer, overlays.
2. **Map components**: For each region — name, key styles, content summary, children.
3. **Create interaction map**: links, forms, buttons, dropdowns, modals, accordions.
4. **Extract design tokens**: Color palette, font stack, spacing scale, border-radius values.
5. **Define file structure**:
   ```
   {output_dir}/
   ├── index.html
   ├── styles/
   │   ├── globals.css      (reset + tokens)
   │   └── components.css
   ├── scripts/
   │   └── interactions.js
   └── assets/              (placeholder images)
   ```
   Adapt to project's tech stack if specified (React, Vue, Svelte, etc.).

### Pass 3: Generate Clone

Implement the clone component-by-component.

1. **Scaffold**: Create directory structure and base files.
2. **Design tokens**: CSS custom properties from extracted tokens.
3. **Layout shell**: Page-level layout matching original's flexbox/grid.
4. **Components**: Each region top-down — match DOM structure, apply styles, use extracted text.
5. **Interactions**: Wire up detected behaviors — navigation, forms, toggles, hover states.
6. **Responsive**: Add basic responsive rules if original uses breakpoints.

### Pass 4: Verify

Compare the clone against the original.

1. **Serve the clone** locally (`npx serve` or `python3 -m http.server`).
2. **Visual verification**: Navigate to clone, take screenshot, compare with baseline.
   - Visual pass threshold: **score >= 85** (layout match, color accuracy, typography).
3. **Structural verification**: Compare landmark counts (`<nav>`, `<main>`, `<footer>`, `<form>`, `<button>`, `<a>`).
   - Structure passes when all major landmarks exist.
4. **Functional spot-check**: Test 2-3 detected interactions via browser tools.
   - Click navigation links, toggle dropdowns, interact with form fields.

Emit a composite verdict:
```json
{
  "visual": { "score": 85, "verdict": "pass", "differences": [], "suggestions": [] },
  "functional": { "tested": 3, "passed": 3, "failures": [] },
  "structure": { "landmark_match": true, "missing": [], "extra": [] },
  "overall_verdict": "pass",
  "priority_fixes": []
}
```

### Pass 5: Iterate

Fix issues and re-verify.

1. Prioritize fixes by impact: layout > interactions > spacing > typography > colors.
2. Apply targeted edits — only fix issues listed in `priority_fixes`.
3. Re-verify (Pass 4).
4. Loop until `overall_verdict` is `pass` OR max **5 iterations** reached.
5. Final report: what was cloned, remaining differences, elements that could not be replicated.

## State management

Write to `.omr/state/web-clone-state.json`:
```json
{
  "started_at": "ISO timestamp",
  "target_url": "https://example.com",
  "pass": "extract | plan | generate | verify | iterate | complete",
  "iteration": 0,
  "visual_score": null,
  "overall_verdict": null,
  "status": "active | complete | failed | cancelled",
  "completed_at": null
}
```

## Context budget

Pass 1 extraction can be large. Apply these limits:

- **DOM tree**: If JSON exceeds ~30KB, reduce depth from 8 to 4.
- **Interactive elements**: Cap at 50. Keep only visible ones.
- **Total extraction**: Aim for under 60KB combined.
- **Screenshots**: One baseline (Pass 1) + one comparison per verify pass. No screenshots between iterations.

## Thresholds

- **Visual pass**: score >= 85
- **Functional pass**: zero failures on tested interactions
- **Structure pass**: all major landmarks present
- **Overall pass**: all three dimensions pass
- **Max iterations**: 5

## Anti-patterns

- Do NOT attempt to clone without browser tools available.
- Do NOT replicate backend APIs or authentication flows.
- Do NOT take screenshots every iteration — only during verification.
- Do NOT refactor working code during fixes — make targeted edits only.
- Do NOT exceed 5 iterations — report best-effort result.
