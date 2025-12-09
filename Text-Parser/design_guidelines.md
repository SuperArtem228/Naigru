# Design Guidelines for "Наигру" Financial Module

## Design Approach
**System**: Custom minimalist design inspired by modern productivity tools (Linear, Notion)
**Principle**: Maximum clarity, minimum visual noise. Every element serves a clear purpose.

## Core Visual Language

### Typography
- **Headers**: Large, bold sans-serif (text-2xl to text-3xl font-semibold)
- **Body**: Medium-weight sans-serif (text-base to text-lg)
- **Labels**: Smaller, subtle (text-sm text-gray-600)
- **Numbers (balances)**: Mono font for financial figures (font-mono text-lg)

### Layout System
**Spacing**: Use Tailwind units of 2, 4, 6, 8 for consistent rhythm
- Section padding: p-6 to p-8
- Card padding: p-6
- Form field gaps: space-y-4
- Table cell padding: px-4 py-3

### Component Design

**Cards/Panels**:
- Light background with subtle border (border border-gray-200 rounded-lg)
- Generous internal padding (p-6)
- No drop shadows - rely on borders for separation

**Forms**:
- Large, clear input fields (h-10 to h-12)
- Visible borders (border-gray-300)
- Focus states with subtle accent
- Labels above inputs (text-sm font-medium mb-2)

**Tables**:
- Clean borders between rows (border-b border-gray-200)
- Generous cell padding (px-4 py-3)
- Header row slightly emphasized (bg-gray-50 font-medium)
- Hover states on rows (hover:bg-gray-50)

**Buttons**:
- Primary: Solid fill, medium-large size (px-6 py-2.5)
- Secondary: Outlined style
- Disabled state: Reduced opacity (opacity-50)

## Screen-Specific Layouts

### Ввод оплат (Payment Entry)
**Layout**: Two-column split (60/40 on desktop)
- Left: Payment form card with white background
- Right: Payments list for selected date
- Top header: Title left, date picker right

**Form elements**:
- Player search with autocomplete dropdown
- Balance/subscription info block beneath player field (bg-gray-50 p-3 rounded text-sm)
- Numeric input for amount with ₽ symbol
- Subscription dropdown
- Large primary button "Сохранить и следующий"

**Payments table**: Time | Player | Amount | Subscription
- Summary row above table showing total count and sum

### Абонементы (Subscriptions)
**Layout**: Single column, centered (max-w-3xl)
- Explanatory text beneath title (text-gray-600 text-sm mb-6)
- Editable table/list of subscriptions
- Each row: Name input | Coefficient input (0.00 format)
- "Добавить абонемент" button below list
- "Сохранить изменения" primary button at bottom

**Demo subscriptions**: Pre-populate with 5 starter subscriptions as specified

### Игроки (Players)
**Layout**: Full-width table with filters above
- Search bar left, filter dropdowns right
- Table columns: Player (name + phone) | Groups | Balance | Subscription | Last Payment
- Balance styling: Negative (text-red-600), Positive (text-green-600), Zero (text-gray-900)

**Player card** (modal or side panel):
- Large player name header
- Phone and groups beneath
- Prominent balance display (text-3xl font-mono)
- Subscription dropdown with save button
- History section: Simple list of transactions

### Настройки (Settings)
**Layout**: Single column, centered (max-w-2xl)
- Simple form with "Базовая цена тренировки" numeric input
- Save button below

## Interactive States

**Form validation**:
- Invalid: Red border (border-red-500)
- Valid: Default state
- Disabled buttons: opacity-50 cursor-not-allowed

**Table interactions**:
- Row hover: bg-gray-50
- Clickable rows: cursor-pointer
- Inline dropdowns in cells for subscription changes

**Toasts**: Simple notification (top-right, 3s duration, subtle slide-in)

## Responsive Behavior
- Desktop: Two-column layouts as specified
- Tablet: Stack to single column
- Mobile: Full-width cards, simplified table to cards

## Accessibility
- All form fields with clear labels
- Sufficient contrast ratios
- Focus indicators on all interactive elements
- Semantic HTML structure

## No Images Required
This is a data-focused admin interface - no hero images or decorative photography needed. Focus on clean forms, tables, and data visualization.