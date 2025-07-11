# SF Pro Font Files

This directory should contain the SF Pro font files for the Bricks Attendance System.

## Required Files:

- **SFPro-Light.woff2** - SF Pro Light weight
- **SFPro-Regular.woff2** - SF Pro Regular weight  
- **SFPro-Medium.woff2** - SF Pro Medium weight
- **SFPro-Semibold.woff2** - SF Pro Semibold weight
- **SFPro-Bold.woff2** - SF Pro Bold weight

## Download Instructions:

1. Visit the Apple Developer website
2. Download the SF Pro font family
3. Convert TTF/OTF files to WOFF2 format for web use
4. Place the WOFF2 files in this directory

## Alternative:

If SF Pro fonts are not available, the system will fallback to:
- Inter (loaded from Google Fonts)
- System fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif

## Font Declaration in CSS:

The fonts should be declared in `css/styles.css` as:

```css
@font-face {
  font-family: 'SF Pro';
  src: url('../assets/fonts/SFPro-Light.woff2') format('woff2');
  font-weight: 300;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'SF Pro';
  src: url('../assets/fonts/SFPro-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

/* Continue for other weights... */
```

## Usage:

Once the fonts are added, update the CSS custom property:
```css
--font-family: 'SF Pro', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```
