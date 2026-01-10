# Layout Components

Sentry-inspired layout primitives for consistent, semantic page layouts.

## Components

### Page

Root wrapper for all page components. Provides consistent full-height layout with background options.

```tsx
<Page background="gradient">
  {/* Page content */}
</Page>
```

**Props:**
- `background?: 'default' | 'gradient' | 'card'` - Background style
- `className?: string` - Additional CSS classes

---

### Container

Content container with max-width constraints and responsive spacing.

```tsx
<Container maxWidth="6xl" gap="6" paddingY="8">
  {/* Content */}
</Container>
```

**Props:**
- `maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full'` - Maximum width (default: '6xl')
- `padding?: Spacing` - Padding on all sides
- `paddingX?: Spacing` - Horizontal padding
- `paddingY?: Spacing` - Vertical padding
- `gap?: Spacing` - Vertical spacing between children
- `width?: 'full' | 'auto'` - Width behavior
- `as?: ElementType` - Render as different HTML element
- `className?: string` - Additional CSS classes

---

### Flex

Flexbox layout with semantic props.

```tsx
<Flex align="center" justify="between" gap="4">
  <h1>Title</h1>
  <Button>Action</Button>
</Flex>
```

**Props:**
- `direction?: 'row' | 'row-reverse' | 'col' | 'col-reverse'` - Flex direction (default: 'row')
- `align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch'` - Align items
- `justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly'` - Justify content
- `wrap?: 'wrap' | 'wrap-reverse' | 'nowrap'` - Flex wrap
- `gap?: Spacing` - Gap between items
- `inline?: boolean` - Use inline-flex
- `as?: ElementType` - Render as different HTML element
- `className?: string` - Additional CSS classes

---

### Stack

Vertical or horizontal stack with consistent spacing. Wraps Flex with sensible defaults.

```tsx
<Stack gap="4">
  <Card />
  <Card />
  <Card />
</Stack>
```

**Props:**
- `direction?: 'vertical' | 'horizontal'` - Stack direction (default: 'vertical')
- All other Flex props except `direction`

**Spacing values:** `'0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16' | '20'`

---

## Example Usage

### Before (Inline Tailwind)

```tsx
<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
  <PageHeader title="Dashboard" />
  <div className="max-w-6xl mx-auto space-y-6 pb-8">
    <div className="flex items-center justify-between">
      <h2>Title</h2>
      <Button>Action</Button>
    </div>
    <div className="space-y-4">
      <Card />
      <Card />
    </div>
  </div>
</div>
```

### After (Layout Primitives)

```tsx
<Page background="gradient">
  <Stack gap="6">
    <PageHeader title="Dashboard" />
    <Container maxWidth="6xl" gap="6" paddingY="8">
      <Flex align="center" justify="between">
        <h2>Title</h2>
        <Button>Action</Button>
      </Flex>
      <Stack gap="4">
        <Card />
        <Card />
      </Stack>
    </Container>
  </Stack>
</Page>
```

## Benefits

- **Cleaner code** - Semantic component names vs long className strings
- **Consistent spacing** - Centralized spacing system
- **Type safety** - TypeScript props with autocomplete
- **Responsive** - Built-in responsive behavior
- **Maintainable** - Update design system in one place
