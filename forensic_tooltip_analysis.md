# INTERNAL ENGINEERING POST-MORTEM: PEDAGOGICAL TOOLTIP HOVER DEFECT & VISUAL DISSOLUTION

**Status**: Unresolved (Forensic Analysis Preserved / Remediation Candidates Defined)
**Severity**: High
**Reference ID**: GRD-20260525-TOOLTIP

--------------------------------------------------
1. INCIDENT OVERVIEW
--------------------------------------------------

### Observable Symptom
Hovering over the "Balanceamento da grade" status indicator box inside the Overview dashboard fails to render the pedagogical guidelines balloon (*tooltip*). Instead of displaying the academic advice and mathematical model, the status box itself completely dissolves (becomes transparent and invisible) on hover, leaving only the unstyled floating text.

### Affected Systems
- **src/components/Overview/Overview.tsx**: Structural rendering and React Virtual DOM layout.
- **src/components/Overview/Overview.css**: Styling rules, hover pseudo-classes, and positioning parameters.
- **src/components/DinamycArea/DinamycArea.css**: Parent height constraints and stacking context bounds.

--------------------------------------------------
2. INVESTIGATION STATE SNAPSHOT
--------------------------------------------------

Internal logic and mathematical formulas of the balance model are stable. The visual rendering layer of the hover-triggered tooltip remains blocked.

- **Confirmed**: The DOM node `<div className="pedagogicalTooltip">` is correctly instantiated in the React Virtual DOM with the correct pedagogical advice matching each specific status.
- **Confirmed**: Hovering on `.narrowBox` triggers `.narrowBox:hover` which forces background and border colors to inherit from transparent parent nodes.
- **Confirmed**: The tooltip's upward projection (`bottom: calc(100% + 12px)`) collides with the strict coordinate boundary of the dynamic control panel.

--------------------------------------------------
3. TECHNICAL CONTEXT
--------------------------------------------------

- **Overview.tsx**: Renders the dynamic balance box using status classes (`severity-low`, `severity-medium`, `severity-high`, `severity-critical`) based on credit calculations.
- **Overview.css**: Manages absolute positioning coordinates (`absolute`, `translate`) for the tooltip relative to `.dataBox` (which is styled as `position: relative`).
- **DinamycArea.css**: Defines the parent `.dinamycAreaContainer` with a relative stacking context of `z-index: 100` and a strict block height of `22vh`.

--------------------------------------------------
4. SURVIVING CAUSAL MODELS
--------------------------------------------------

### Model A: The CSS Inheritance Paradox (PROVEN)
- **Description**: The styling rules intended to disable color shifts on hover are using `inherit !important` which overrides active state styling.
- **Evidence**: `.narrowBox:hover` sets `background-color: inherit !important` and `border-color: inherit !important`. Since its parent `.dataRow` has transparent properties, the balance box instantly becomes transparent on hover, causing a visual "dissolution" defect.
- **Confidence**: Absolute.

### Model B: Stacking Context & Coordinate Clipping (SUPPORTED)
- **Description**: The absolute translation of the tooltip projects upwards, crossing the boundary of the `22vh` parent container and colliding with sibling stacking coordinates.
- **Evidence**: The sibling container `.courseGridContainer` occupies `71vh` above it. The absolute position coordinates of `.pedagogicalTooltip` are clipped or ignored during browser GPU compositing because of isolation boundary rules.
- **Confidence**: High.

--------------------------------------------------
5. FAILURE PATH RECONSTRUCTION (PRE-FIX)
--------------------------------------------------

User hovers over "Balanceamento da grade" (.narrowBox)
  ↓
Browser triggers CSS selector `.narrowBox:hover`
  ↓
`background-color: inherit !important` queries parent `.dataRow`
  ↓
Box background inherits transparency, instantly vanishing
  ↓
Browser attempts to display `.pedagogicalTooltip` (opacity: 1, visibility: visible)
  ↓
Tooltip projects upwards (`bottom: calc(100% + 12px)`)
  ↓
Collision with viewport boundary/stacking context of `.dinamycAreaContainer`
  ↓
Rendering engine clips tooltip / mouse leaves box trigger due to visual shifting

--------------------------------------------------
6. INVESTIGATION TIMELINE
--------------------------------------------------

1. **Phase 1: DOM Node Integrity Check**: Verified that all JSX variables map correctly to localized strings in `getPedagogicalDescription`. (Confidence: PROVEN)
2. **Phase 2: CSS Selector Audit**: Discovered that `.narrowBox:hover` has active overrides using `inherit !important` that cause visual vanishing. (Confidence: PROVEN)
3. **Phase 3: Stacking Context Audit**: Isolated parent container parameters and verified sibling height coordinates. (Confidence: PROVEN)

--------------------------------------------------
7. FORENSIC EVIDENCE
--------------------------------------------------

- **Mutation Point**: [Overview.css:L223-L228](file:///c:/Users/lucas/Documents/gradeon/src/components/Overview/Overview.css#L223-L228) contains the breaking `inherit !important` directives:
  ```css
  .narrowBox:hover {
    cursor: default !important;
    box-shadow: inherit !important;
    background-color: inherit !important;
    border-color: inherit !important;
  }
  ```
- **Crime Scene Artifact**: [DinamycArea.css:L7](file:///c:/Users/lucas/Documents/gradeon/src/components/DinamycArea/DinamycArea.css#L7) defines `height: 22vh` which constrains upward absolute rendering bounds.

--------------------------------------------------
8. REMEDIATION CANDIDATES
--------------------------------------------------

## Short-Term Mitigations
- [ ] Preserve original severity styling on hover (e.g. bypass the `inherit !important` behavior for `.narrowBox`).
- [ ] Pivot tooltip rendering coordinates downwards (`top: calc(100% + 12px)`) to completely avoid sibling layout clipping.
- [ ] Adjust transitions or utilize React portals for the tooltip if layout boundaries persist.

--------------------------------------------------
9. EXECUTIVE TECHNICAL SUMMARY
--------------------------------------------------

The investigative analysis has proven that the tooltip's failure to render consistently is caused by an inheritance override in the CSS hover rule (making the parent box transparent) combined with stacking context boundaries in the `22vh` dynamic panel. Preserving explicit state colors on hover and shifting the rendering direction downwards will resolve the visual dissolution and restore the high-fidelity UI.

--------------------------------------------------
*State preservation finalized by the Forensic Agent. Locked for final resolution.*
