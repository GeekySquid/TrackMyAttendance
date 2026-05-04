# Change History Log

This log tracks all major modifications made to the **TrackMyAttendance** application to ensure transparency and easy reverts.

---

## [2026-05-03] - CSS Stabilisation & Tailwind v4 Migration
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/index.css`
*   **Change:** Migrated from a hybrid v3/v4 setup to a clean **Tailwind CSS v4** configuration.
*   **Key Modifications:**
    *   Added `@import url(...)` for the missing **Inter** font (primary UI font).
    *   Introduced a `@theme` block to define core variables: `--font-sans`, `--font-display`, `--color-black-force`, and custom animations.
    *   **CRITICAL:** Removed `cursor: none` from the `body` tag. This restores the native mouse pointer, preventing the "broken/frozen" feel.
    *   Sanitized `@layer` blocks (base, components, utilities) to prevent CSS syntax errors in Vite.
    *   Re-implemented the `table-responsive` mobile-card utility for better accessibility.

### 2. Branding & Identity
*   **Change:** Defined `black-force` color in the Tailwind theme.
*   **Rationale:** Ensures that components using `text-black-force` (like the Check-In Widget) have their styles correctly applied by the Tailwind engine.

### How to Revert
To revert these specific changes, you can replace the content of `src/index.css` with your previous backup or use git:
```bash
git checkout src/index.css
```

---

## [2026-05-03] - Global Scrollbar Visibility Update
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/index.css`
*   **Change:** Implemented aggressive global scrollbar hiding.
*   **Rationale:** The previous `:root` strategy was insufficient for some browsers/elements.
*   **Implementation:** Used the universal `*` selector with `!important` to force-hide all scrollbars across the entire application.

### How to Revert
Remove the global `::-webkit-scrollbar` and `*` scrollbar rules at the top of `src/index.css`.

---

## [2026-05-03] - Analytics Chart Layout Fixes
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/AnalyticsChart.tsx`
*   **Change:** Fixed overlapping labels and tooltip visibility issues.
*   **Key Adjustments:**
    *   **Increased Right Margin**: Expanded from `20px` to `80px` to ensure the "Target (75%)" label has breathing room and doesn't get cut off.
    *   **Repositioned Target Label**: Moved the label to `insideRight` with an additional `10px` offset for perfect alignment.
    *   **Tooltip Offset**: Added a `20px` offset to the tooltip to prevent it from covering the data points or the target line.
    *   **Z-Index**: Applied `z-50` to the custom tooltip container to ensure it always floats above other chart elements.

### How to Revert
Adjust the `margin`, `offset`, and `position` props in `AnalyticsChart.tsx` back to their previous values.

---

## [2026-05-03] - Analytics Chart Data Enrichment
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/AnalyticsChart.tsx`
*   **Change:** Added multiple informative layers to the attendance graph.
*   **Key Features:**
    *   **Target Line:** A dashed red line at 75% indicating the minimum attendance requirement.
    *   **Average Line:** A subtle grey dashed line representing the average attendance for the selected period (Week/Month).
    *   **Enhanced Tooltip:** Custom tooltip component that displays:
        *   Exact attendance percentage.
        *   A visual progress bar.
        *   A performance status badge (Optimal/Warning/Critical).
        *   The period average for comparison.
    *   **Persistent Data Points:** Added visible dots on the line for clearer data reading.

### How to Revert
Revert the `AnalyticsChart.tsx` to the previous version or remove the `ReferenceLine`, the second `Area` (average), and the custom `content` prop from `Tooltip`.

---

## [2026-05-03] - Dashboard Student Profile Integration
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Dashboard.tsx`
*   **Change:** Integrated the `StudentProfile` component directly into the Analytics view.
*   **Key Updates:**
    *   **Side-by-Side Layout**: Updated the analytics section to a 3-column grid (`lg:grid-cols-3`). The chart now occupies 2 columns, while the 3rd column is reserved for the student's profile card.
    *   **Contextual Linking**: The profile card now dynamically updates based on the student selected in the `AnalyticsChart` dropdown.
    *   **"No Selection" State**: Maintained a clean placeholder state when "All Students" is selected, providing guidance to the user.

### How to Revert
Change the `Dashboard.tsx` analytics grid back to `grid-cols-1` and remove the `StudentProfile` component call.

---

## [2026-05-03] - Sidebar Header Redesign (Horizontal Layout)
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Replaced the stacked vertical branding with a modern horizontal layout.
*   **Key Design Updates:**
    *   **Side-by-Side Arrangement**: The logo and institution name are now on the same line when expanded, creating a much more balanced and integrated look.
    *   **Compact Header**: Reduced the overall header height from `140px` to `100px`, reclaimng valuable vertical space for the navigation menu.
    *   **Smooth Slide-Out**: The branding text now glides in horizontally from the left, aligning perfectly with the logo's center line.
    *   **Typography Optimization**: Adjusted font sizes (`15px` for branding, `8px` for role) to better fit the new side-by-side orientation.

### How to Revert
Restore the vertical stack using `flex-col` and the previous height settings in `Sidebar.tsx`.

---

## [2026-05-03] - Sidebar Logo Visibility & Layout Anchoring
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Reconfigured the header layout to ensure the logo remains visible in both collapsed and expanded states.
*   **Key Fixes:**
    *   **Left-Anchored Header**: Switched from `items-center` to `items-start` for the header container. This ensures that when the sidebar is collapsed (80px), the logo stays anchored to the left rather than being centered within the 260px hidden area.
    *   **Fixed Icon Alignment**: Wrapped the logo in a 48px (`w-12`) container to match the navigation icon alignment perfectly.
    *   **Slide-In Text**: Updated the branding text to slide in from the left (`x: -10` to `x: 0`) instead of dropping down, creating a more cohesive horizontal expansion feel.
    *   **Whitespace Management**: Used `whitespace-nowrap` to prevent the institution name from wrapping during the expansion transition.

### How to Revert
Change `items-start` back to `items-center` and remove the `ml-1` offsets in `Sidebar.tsx`.

---

## [2026-05-03] - Sidebar Vertical Stability Fix
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Locked the branding header height to prevent navigation items from jumping vertically when text expands.
*   **Key Fixes:**
    *   **Fixed Header Height**: Set the branding container to a rigid `h-[160px]`. This reserves space for the institution name even when it's hidden, ensuring the navigation menu below stays in a fixed position.
    *   **Absolute Branding Overlay**: Used `absolute` positioning for the expanding text within its reserved slot, eliminating any "push" effect on the rest of the sidebar.
    *   **Layout Anchoring**: Switched to a relative container for branding text to ensure perfect vertical alignment while keeping the global layout static.

### How to Revert
Remove the `h-[160px]` and `absolute` positioning from the sidebar header section in `Sidebar.tsx`.

---

## [2026-05-03] - Sidebar Header Compaction & Spacing Optimization
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Reduced excessive vertical whitespace in the branding area for a tighter, more professional look.
*   **Adjustments:**
    *   **Logo Size**: Reduced from `w-14` to `w-12` to consume less vertical space.
    *   **Branding Margin**: Cut the bottom margin below the logo by 50% (from `mb-8` to `mb-4`).
    *   **Typography Scaling**: Slightly reduced the branding text size to `17px` and role text to `9px` with a `mt-0.5` offset for a pixel-perfect lockup.
    *   **Nav Spacing**: Tightened the spacing between navigation items (`space-y-1`) and reduced container padding (`py-2`) to maximize information density.

### How to Revert
Increase `mb`, `py`, and `mt` values in the `Sidebar.tsx` header section.

---

## [2026-05-03] - Detailed Student Analytics Profile
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/AnalyticsChart.tsx`
*   **Change:** Enriched the student spotlight/analysis header with personal identifiers.
*   **New Fields Displayed:**
    *   **Student ID / Roll No**: Provides immediate academic identification.
    *   **Email Address**: Quick contact reference within the analytics view.
    *   **Department/Role**: Shows the organizational context of the student.
*   **UI Polish**: Used dot separators and refined typography (`tracking-tighter`, `leading-tight`) to keep the dense information readable without cluttering the chart header.

### How to Revert
Remove the `div` containing `analysis.id`, `analysis.email`, and `analysis.department` from the `AnalyticsChart.tsx` header section.

---

## [2026-05-03] - Zero-Jerk Sidebar Motion Fix
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Eliminated all layout "jerking" by decoupling text labels from the icon layout.
*   **Key Fixes:**
    *   **Absolute Labeling**: Labels now use `absolute` positioning (`left-14`), ensuring they never push or shift the icons regardless of their width or entrance animation.
    *   **Fixed-Width Nav Containers**: Added a fixed-width (`260px`) inner wrapper to the nav and header areas. This prevents the flexbox from recalculating item positions as the sidebar width changes.
    *   **Refined Spring Transition**: Adjusted the `spring` animation constants (`damping: 30`, `stiffness: 300`) for a buttery-smooth "slide-in" feel that is perceptible but not disruptive.
    *   **Stable Icons**: Icons are locked in a consistent `w-14` container, keeping them perfectly vertically aligned through every state transition.

### How to Revert
Remove the `absolute` positioning from the `motion.span` and revert the `w-[260px]` inner wrappers in `Sidebar.tsx`.

---

## [2026-05-03] - Sidebar Glassmorphism & Icon Stability
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Implemented a high-end glassmorphism aesthetic and locked icon positions.
*   **Key Improvements:**
    *   **Glass Background**: Applied `bg-white/80 backdrop-blur-xl` to the sidebar and `backdrop-blur-md` to active items for a modern, transparent look.
    *   **Fixed Icon Alignment**: Icons are now wrapped in a fixed `w-12 h-12` container that stays in the exact same horizontal position regardless of whether the sidebar is collapsed or expanded.
    *   **Zero-Jerk Transition**: Removed all conditional padding and alignment logic that caused buttons to shift during hover.
    *   **Premium Active State**: Active items now use a semi-transparent blue background with a subtle ring and blur effect.
    *   **Visual Consistency**: Ensured the "Install" and "Logout" buttons follow the same alignment rules as the navigation items.

### How to Revert
Remove `backdrop-blur` classes and restore the previous width/padding logic in the navigation map within `Sidebar.tsx`.

---

## [2026-05-03] - Monthly Score Badge Enhancement
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/AnalyticsChart.tsx`
*   **Change:** Enriched the "Monthly Score" badge with secondary data.
*   **New Information:**
    *   **Attendance Count**: Now explicitly shows the number of "Days Present" alongside the percentage.
    *   **Achievement Label**: Added a "Perfect Record" emerald badge for scores of 90% or higher.
    *   **UI Polish**: Increased badge size and added a subtle glassmorphism border (`border-white/10`).

### How to Revert
Modify the `analysis.type === 'spotlight'` render block in `AnalyticsChart.tsx` to remove the extra info and revert padding/font sizes.

---

## [2026-05-03] - Sidebar Cleanup (Support Card Removal)
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Removed the "Need Help?" / "Support Portal" CTA card from the sidebar.
*   **Rationale:** User requested complete removal to clean up the UI and prioritize navigation items.

### How to Revert
Restore the `AnimatePresence` block containing the support card logic in `Sidebar.tsx`.

---

## [2026-05-03] - Sidebar Stabilization & Branding Update
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/components/Sidebar.tsx`
*   **Change:** Resolved layout "jerking" and smoothed sidebar transitions.
*   **Key Improvements:**
    *   **Fixed Layout**: Nav items now have a consistent height and icon alignment, preventing horizontal shifting when the sidebar expands or collapses.
    *   **Bolder Logo**: Increased logo font size to `text-lg` and applied `tracking-tighter` for a more premium, "bold" presence.
    *   **Smooth Motion**: Refined the hover animation using a `spring` transition (damping/stiffness) instead of a simple tween, making the motion feel more fluid and natural.
    *   **Active Indicator**: Added a subtle vertical blue bar for active items in the collapsed state.
    *   **Tooltips**: Enhanced collapsed tooltips with better padding and uppercase typography.

### How to Revert
Revert `Sidebar.tsx` to the previous version or restore the `tween` transition and standard padding logic in the nav item mapping.

---

## [2026-05-03] - Global Optimistic UI Implementation
**Author:** Antigravity AI
**Status:** Completed

### 1. Global Enhancement: Perceived Performance
*   **Change:** Implemented "Optimistic Updates" across all administrative and interactive interaction points.
*   **Key Feature:** The UI now reflects changes (deletions, status toggles, approvals) **instantly** (within milliseconds) rather than waiting for the Supabase server to respond. The backend sync happens in the background.
*   **Files Modified:**
    *   `src/pages/AccessControlPage.tsx`: Roles are removed from users instantly.
    *   `src/pages/StudentsPage.tsx`: Student deletions reflect immediately in the list.
    *   `src/pages/SubscriberManagementPage.tsx`: Node activation/deactivation is instantaneous.
    *   `src/pages/DocumentsPage.tsx`: File deletions are removed from the view upon confirmation.
    *   `src/pages/GeofencingPage.tsx`: Geofence zone toggles and deletions are immediate.
    *   `src/components/AttendanceTable.tsx`: Late appeal approvals reflect instantly in the table.
*   **Technical Implementation:** Used React state `set(...)` calls *before* the `await` keyword in event handlers. Realtime listeners handle eventual consistency if a server error occurs.

### How to Revert
Move the state update logic (e.g., `setStudents(...)`) to inside the `try` block, specifically *after* the `await` call.

---

## [2026-05-03] - Subscriber Management Removal & Dropdown Fixes
**Author:** Antigravity AI
**Status:** Completed

### 1. File: `src/pages/SubscriberManagementPage.tsx` & `src/services/dbService.ts`
*   **Change:** Implemented a full permanent removal (deletion) workflow for waitlist nodes.
*   **Key Features:**
    *   **Trash Icon**: Added a `Trash2` action button to each row in the subscriber table.
    *   **Optimistic UI**: Subscribers are removed from the view instantly upon deletion for zero perceived lag.
    *   **Confirmation Modal**: Added a high-fidelity, centered confirmation modal matching the app's premium aesthetic.
    *   **Backend Integration**: Added `deleteSubscriber` to `dbService.ts` to perform the actual Supabase `delete` operation.
*   **Stability Fix:** Restored missing `useState` and `useEffect` imports that were accidentally dropped during the UI update.

### 2. File: `src/components/CustomDropdown.tsx`
*   **Change:** Fixed a persistent issue where the dropdown menu would overlap the input/trigger field.
*   **Key Fixes:**
    *   **Explicit Positioning**: Replaced `top-full` and `mt-2` with `top-[calc(100%+6px)]` to guarantee a consistent gap.
    *   **Animation Stabilization**: Removed the `y` transform from the entry animation to prevent variable offsets in complex layouts.
    *   **Stacking Context**: Added `isolate` to the parent and explicit `z-index` (`z-20` for button, `z-10` for menu) to ensure correct layering.

### 3. Modal Overflow Stability (Clipping Fix)
*   **Change:** Enabled dropdown menus to overflow outside of modal boundaries in `AccessControlPage.tsx` and `StudentsPage.tsx`.
*   **Key Fixes:**
    *   **Removed `overflow-hidden`**: Stripped the overflow restriction from "Add User," "Add Role," and "Add Student" modal containers.
    *   **Rationale**: Previously, the `CustomDropdown` menu would get cut off or "trapped" inside the modal's scroll area. Removing this restriction allows the menu to float freely above the entire UI, ensuring 100% visibility for role and mentor assignments.

### How to Revert
To revert the subscriber removal, remove the `Trash2` button and `handleRemoveSubscriber` logic. For the dropdown and modal fixes, restore `overflow-hidden` to the modal containers and revert the `top` prop in `CustomDropdown.tsx`.

---

## [Future Entry Template]
### File: `path/to/file`
*   **Change:** Describe what was changed.
*   **Rationale:** Why was this change made?
*   **Revert:** Specific instructions.
