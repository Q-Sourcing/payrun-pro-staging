

## Refactor Settings Page to Full Screen

The Settings page currently renders inside the MainLayout's content area (with sidebar + header + padding), constraining it within `max-w-7xl` and `px-4 lg:px-8 py-6`. To make it full screen, I'll make the Settings page take over the entire viewport — hiding the main sidebar and header — similar to how `isAdvancedSettingsOpen` already works in MainLayout.

### Approach

**Use the existing `SettingsModal` pattern**: MainLayout already supports an "advanced settings" mode that hides the sidebar and header and gives the content `100vw`. Instead of rendering Settings as a routed page inside the layout, I'll convert the Settings page itself into a full-screen overlay that:

1. Hides the MainLayout sidebar and header (using the existing `isAdvancedSettingsOpen` mechanism or a similar approach)
2. Has its own top bar with a back/close button to return to the previous page
3. Uses the full viewport width with its own internal sidebar nav + content area

### Changes

**`src/pages/Settings.tsx`**:
- Remove the `max-w-7xl` container constraint
- Make the root div `fixed inset-0 z-40` to overlay the entire screen
- Add a slim top bar: back arrow + "Settings" title + close button
- Settings sidebar nav becomes a fixed left column (`w-56`) with full height
- Content area fills the remaining space with its own scroll
- Back/close button navigates to the previous route via `useNavigate(-1)`

**`src/layouts/MainLayout.tsx`**:
- Detect when the current route is `/settings` (or use a context/state) and hide the sidebar + header automatically, similar to the `isAdvancedSettingsOpen` flag
- OR: simply let the Settings page render as a fixed overlay on top, which is simpler and requires no MainLayout changes

I'll go with the **fixed overlay approach** — it's self-contained and doesn't require MainLayout modifications.

### Layout Structure

```text
┌─────────────────────────────────────────────────┐
│ ← Back    Settings                          ✕   │  ← slim top bar
├────────────┬────────────────────────────────────┤
│ About      │                                    │
│ Attendance │   [Active section content]         │
│ Company    │                                    │
│ Contracts  │                                    │
│ Data Mgmt  │                                    │
│ Display    │                                    │
│ Email      │                                    │
│ Employees  │                                    │
│ ...        │                                    │
│            │                                    │
└────────────┴────────────────────────────────────┘
```

### Files
| Action | File |
|--------|------|
| Rewrite | `src/pages/Settings.tsx` |

