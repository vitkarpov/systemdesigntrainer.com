# Button Components

Sentry-inspired button system with loading states, semantic variants, and button grouping.

> **View in Storybook**: Run `npm run storybook` and navigate to "UI Components/Button" to see all variants and examples.

## Button Component

Enhanced button with loading states, icons, and semantic variants.

### Basic Usage

```tsx
import { Button } from '@/components/ui/button';

<Button>Click me</Button>
<Button variant="primary">Primary Action</Button>
<Button variant="danger">Delete</Button>
<Button variant="ghost">Cancel</Button>
```

### Props

#### Variants

- `default` / `primary` - Primary action button (blue, prominent)
- `danger` / `destructive` - Destructive action (red, for delete/remove)
- `secondary` - Secondary action (muted)
- `outline` - Outlined button
- `ghost` - Transparent button with hover effect
- `link` - Link-styled button
- `borderless` - No border, subtle hover
- `transparent` - Minimal button

#### Sizes

- `zero` - No padding (use for custom sizing)
- `xs` - Extra small (h-7)
- `sm` - Small (h-8)
- `default` / `md` - Default size (h-9)
- `lg` - Large (h-10)
- `icon` - Square icon button (h-9 w-9)

#### Special Props

- `busy?: boolean` - Shows loading spinner, disables button
- `icon?: ReactNode` - Renders icon before text
- `disabled?: boolean` - Disables button interaction
- `asChild?: boolean` - Use Radix Slot for composition

### Loading State

```tsx
<Button busy={isLoading}>
  Save Changes
</Button>
```

When `busy={true}`:
- Shows animated spinner
- Button is automatically disabled
- `aria-busy` attribute set for accessibility

### With Icons

```tsx
import { Plus, Trash2 } from 'lucide-react';

<Button icon={<Plus />}>Add Item</Button>
<Button variant="danger" icon={<Trash2 />}>Delete</Button>
```

### Examples

```tsx
// Primary action
<Button variant="primary" size="lg">
  Start Interview
</Button>

// Destructive action with loading
<Button variant="danger" busy={isDeleting}>
  {isDeleting ? 'Deleting...' : 'Delete Account'}
</Button>

// Ghost button with icon
<Button variant="ghost" size="sm" icon={<ArrowLeft />}>
  Back
</Button>

// Link-styled button
<Button variant="link">Learn More</Button>

// Borderless for subtle actions
<Button variant="borderless" size="xs">
  View Details
</Button>
```

---

## ButtonBar Component

Groups related buttons horizontally with consistent spacing.

### Basic Usage

```tsx
import { Button } from '@/components/ui/button';
import { ButtonBar } from '@/components/ui/button-bar';

<ButtonBar gap="md">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary">Save</Button>
</ButtonBar>
```

### Props

- `gap?: 'none' | 'sm' | 'md' | 'lg'` - Spacing between buttons (default: 'md')
- `merged?: boolean` - Merge buttons into unified group (default: false)

### Merged Button Groups

Create connected button groups where buttons appear as a single unit:

```tsx
<ButtonBar merged>
  <Button variant="outline">Day</Button>
  <Button variant="outline">Week</Button>
  <Button variant="outline">Month</Button>
</ButtonBar>
```

When `merged={true}`:
- Removes borders between adjacent buttons
- First button: rounded left, square right
- Middle buttons: square on both sides
- Last button: square left, rounded right

### Examples

```tsx
// Action buttons with spacing
<ButtonBar gap="md">
  <Button variant="ghost">Cancel</Button>
  <Button variant="primary" busy={isSaving}>
    Save Changes
  </Button>
</ButtonBar>

// Merged segmented control
<ButtonBar merged>
  <Button variant={view === 'grid' ? 'primary' : 'outline'}>
    Grid
  </Button>
  <Button variant={view === 'list' ? 'primary' : 'outline'}>
    List
  </Button>
</ButtonBar>

// Toolbar actions
<ButtonBar gap="sm">
  <Button size="xs" variant="ghost" icon={<Bold />} />
  <Button size="xs" variant="ghost" icon={<Italic />} />
  <Button size="xs" variant="ghost" icon={<Underline />} />
</ButtonBar>
```

---

## Migration Guide

### Before (shadcn/ui default)

```tsx
<Button variant="destructive" disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Delete'}
</Button>

<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button>Confirm</Button>
</div>
```

### After (Sentry-inspired)

```tsx
<Button variant="danger" busy={isLoading}>
  Delete
</Button>

<ButtonBar gap="md">
  <Button variant="outline">Cancel</Button>
  <Button variant="primary">Confirm</Button>
</ButtonBar>
```

### Benefits

1. **Semantic variants** - `primary` and `danger` are clearer than `default` and `destructive`
2. **Built-in loading** - `busy` prop handles spinner and disabled state automatically
3. **Icon support** - No need to manually add icons with spacing
4. **Button grouping** - `ButtonBar` provides consistent spacing and merged button patterns
5. **More sizes** - Added `xs` and `zero` for more flexibility
6. **New variants** - `borderless` and `transparent` for subtle actions
