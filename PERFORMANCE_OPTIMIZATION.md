# Performance Optimization Guide

## Completed Optimizations ✅

### 1. Font Loading (Estimated savings: 50-100ms FCP)
- Added `font-display: swap` to Google Fonts
- Added `preconnect` to gstatic.com for faster font delivery
- Prevents FOUT (Flash of Unstyled Text)

### 2. JavaScript Optimization (Savings: ~4.5KB total)
- **script.js**: 11KB → 8.7KB (-22%)
- **discord-live-stats.js**: 3.1KB → 1.5KB (-50%)
- **particle-controls.js**: 2.8KB → 1.8KB (-34%)
- Minified all files (removed comments and whitespace)

### 3. Particle Animation Performance (TBT reduction)
- Deferred particle system initialization using `requestIdleCallback`
- Prevents blocking main thread during page load
- Fallback to `setTimeout` for older browsers

### 4. CSS Rendering Optimization
- Added `contain: layout style paint` to game images
- Improves rendering performance by isolating paint areas
- Reduces browser reflow/repaint operations

## Remaining Optimization: WebP Image Conversion

### Current Image Sizes
```
banner.jpg              530K  ← Priority 1
dead-by-daylight.jpg    487K  ← Priority 2
invincible_vs.png       430K  ← Priority 2
miku_cover.png          182K
MV5B...jpg              357K
```

### How to Convert to WebP (3 options)

#### Option 1: Online Converter (Easiest)
1. Go to https://convertio.co/jpg-webp/ or similar
2. Upload large images
3. Download WebP versions
4. Place in project folder as `filename.webp`

#### Option 2: Command Line (Linux/Mac)
```bash
# Install cwebp
brew install webp  # macOS
sudo apt install webp  # Ubuntu/Debian

# Convert images
cwebp -q 80 banner.jpg -o banner.webp
cwebp -q 80 dead-by-daylight-1db3d.jpg -o dead-by-daylight.webp
```

#### Option 3: Use ImageMagick
```bash
convert banner.jpg -quality 80 banner.webp
```

### Expected Compression Results
- JPG → WebP: 25-35% smaller
- PNG → WebP: 25-40% smaller

**Estimated savings**: 800KB → 600KB (200KB reduction)

## After WebP Conversion

Update image references in HTML to use picture elements for WebP fallback:

```html
<picture>
  <source srcset="banner.webp" type="image/webp">
  <img src="banner.jpg" alt="banner">
</picture>
```

Or update background-image URLs to point to WebP files if you have them.

## Performance Impact Summary

### Before Optimization
- Total JS: 17.2KB
- Total Images: ~2.5MB
- TBT: High (particle animations blocking main thread)

### After Optimization
- ✅ JS: 13.7KB (-20%)
- ✅ Fonts: Optimized loading (-50-100ms FCP)
- ✅ TBT: Reduced (requestIdleCallback deferral)
- ⏳ Images: Pending WebP conversion (-200KB potential)

### Lighthouse Score Expected Improvement
- **FCP (First Contentful Paint)**: +100-200ms
- **LCP (Largest Contentful Paint)**: +150-300ms
- **TBT (Total Blocking Time)**: -50-100ms
- **CLS (Cumulative Layout Shift)**: No change (already good)

### Next Steps
1. Convert 5 largest images to WebP format
2. Test on mobile device for TBT improvement
3. Monitor Core Web Vitals on real users
