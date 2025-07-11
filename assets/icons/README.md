# Icons and Logo Assets

This directory should contain SVG icons and the Bricks Attendance System logo for crisp display at all sizes.

## Required Assets:

### Logo:
- **bricks-logo.svg** - Main Bricks Attendance System logo
- **bricks-logo-dark.svg** - Dark theme variant (optional)
- **bricks-icon.svg** - Icon-only version for small spaces

### Navigation Icons:
- **dashboard.svg** - Dashboard/home icon
- **analytics.svg** - Analytics/charts icon  
- **settings.svg** - Settings/gear icon
- **calendar.svg** - Calendar icon
- **users.svg** - Users/employees icon
- **clock.svg** - Time/attendance icon
- **payroll.svg** - Money/payroll icon

### UI Icons:
- **menu.svg** - Hamburger menu icon
- **close.svg** - Close/X icon
- **search.svg** - Search/magnifying glass icon
- **filter.svg** - Filter icon
- **export.svg** - Export/download icon
- **edit.svg** - Edit/pencil icon
- **delete.svg** - Delete/trash icon
- **add.svg** - Add/plus icon
- **chevron-down.svg** - Dropdown arrow
- **chevron-left.svg** - Back arrow
- **chevron-right.svg** - Forward arrow

### Status Icons:
- **check.svg** - Success/checkmark icon
- **warning.svg** - Warning/alert icon
- **error.svg** - Error/X icon
- **info.svg** - Information icon
- **time-in.svg** - Clock in icon
- **time-out.svg** - Clock out icon

### Theme Icons:
- **sun.svg** - Light theme icon
- **moon.svg** - Dark theme icon
- **theme-auto.svg** - Auto theme icon

## Icon Specifications:

- **Format**: SVG
- **Size**: 24x24px viewBox (scalable)
- **Style**: Outline style with 1.5px stroke width
- **Colors**: Use currentColor for automatic theme adaptation

## Sample SVG Structure:

```svg
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="..." stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
```

## Usage in HTML:

Icons can be embedded directly or referenced:

```html
<!-- Direct embed -->
<svg class="icon">
  <use href="assets/icons/dashboard.svg#icon"></use>
</svg>

<!-- Or with img tag -->
<img src="assets/icons/dashboard.svg" alt="Dashboard" class="icon">
```

## CSS Classes:

Common icon classes should be defined:

```css
.icon {
  width: 24px;
  height: 24px;
  color: currentColor;
}

.icon-sm {
  width: 16px;
  height: 16px;
}

.icon-lg {
  width: 32px;
  height: 32px;
}
```

## Icon Sources:

Recommended icon libraries:
- Heroicons (https://heroicons.com/)
- Lucide (https://lucide.dev/)
- Feather Icons (https://feathericons.com/)
- Tabler Icons (https://tabler-icons.io/)
