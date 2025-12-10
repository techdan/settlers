import React, { useState, useEffect } from 'react';

interface ColoredSvgIconProps {
  src: string;
  color: string;
  size: number;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  backgroundColor?: string;
  fallbackSrc?: string; // Fallback URL if primary src returns 404
}

/**
 * ColoredSvgIcon Component
 *
 * Loads SVG files and applies color by replacing fill/stroke attributes.
 * This allows us to use game-icons.net SVGs with custom colors.
 *
 * Performance: SVGs are cached after first load
 */
export const ColoredSvgIcon: React.FC<ColoredSvgIconProps> = ({
  src,
  color,
  size,
  className = '',
  style = {},
  alt = '',
  backgroundColor,
  fallbackSrc,
}) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [currentSrc, setCurrentSrc] = useState<string>(src);

  const resolveCssVar = (value?: string) => {
    if (!value) return value;
    const match = value.match(/var\\((--[^)]+)\\)/);
    if (!match || typeof window === 'undefined') return value;
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1])?.trim();
    return resolved || value;
  };

  useEffect(() => {
    // Reset to primary src when src prop changes
    setCurrentSrc(src);
  }, [src]);

  useEffect(() => {
    // Fetch SVG
    fetch(currentSrc)
      .then((res) => {
        if (!res.ok) {
          // If 404 and we have a fallback, try the fallback
          if (res.status === 404 && fallbackSrc && currentSrc !== fallbackSrc) {
            setCurrentSrc(fallbackSrc);
            return null; // Skip processing, the useEffect will re-run with fallback
          }
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.text();
      })
      .then((svgText) => {
        if (!svgText) return; // null from fallback redirect

        // Validate that we actually got SVG content, not HTML
        if (!svgText.trim().startsWith('<svg')) {
          throw new Error(`Invalid SVG content received from ${currentSrc}`);
        }

        // SVGs with '-colored' suffix already have proper colors set - don't process them
        const skipProcessing = currentSrc.includes('-colored.svg');

        if (skipProcessing) {
          // Only modify the opening <svg> tag
          let processedSvg = svgText;

          // Remove style attribute and add width/height only on the <svg> tag
          processedSvg = processedSvg.replace(
            /<svg([^>]*?)>/,
            (match, attrs) => {
              // Remove style, width, height attributes
              let newAttrs = attrs
                .replace(/\s*style="[^"]*"/g, '')
                .replace(/\s*width="[^"]*"/g, '')
                .replace(/\s*height="[^"]*"/g, '');

              // Add back width and height as 100%
              return `<svg${newAttrs} width="100%" height="100%">`;
            }
          );

          setSvgContent(processedSvg);
        } else {
          const resolvedColor = resolveCssVar(color) || color;
          const resolvedBackground = resolveCssVar(backgroundColor) || backgroundColor;
          setSvgContent(applyColorToSvg(svgText, resolvedColor, resolvedBackground));
        }
      })
      .catch((err) => {
        console.error(`Failed to load SVG: ${currentSrc}`, err);
        // Set empty content to prevent showing error HTML
        setSvgContent('');
      });
  }, [currentSrc, color, backgroundColor, fallbackSrc]);

  if (!svgContent) {
    // Loading placeholder
    return (
      <div
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size, ...style }}
      >
        <div className="w-full h-full bg-slate-700 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
      role="img"
      aria-label={alt}
    />
  );
};

/**
 * SVG Cache - Stores fetched SVG strings to avoid re-fetching
 */
const svgCache = new Map<string, string>();

/**
 * Apply color to SVG by replacing fill and stroke attributes
 * The first path element typically represents the background/border, subsequent paths are the icon
 */
function applyColorToSvg(svgText: string, color: string, backgroundColor?: string): string {
  // Parse SVG and set width/height to 100%
  let coloredSvg = svgText
    .replace(/width="[^"]*"/g, 'width="100%"')
    .replace(/height="[^"]*"/g, 'height="100%"');

  // If backgroundColor is provided, apply it to the first path (background)
  // and the foreground color to subsequent paths
  if (backgroundColor) {
    let shapeCount = 0;
    const shapeRegex = /<(path|circle|rect|polygon|ellipse)([^>]*?)(\/?)>/g;
    coloredSvg = coloredSvg.replace(shapeRegex, (match, _tag, attrs, selfClosing) => {
      shapeCount++;
      // First shape gets background color, rest get foreground color
      const fillColor = shapeCount === 1 ? backgroundColor : color;

      // Remove existing fill attribute if present
      let newAttrs = attrs.replace(/\s*fill="[^"]*"/g, '');

      // Ensure there's a space at the start if attrs is not empty
      if (newAttrs && !newAttrs.startsWith(' ')) {
        newAttrs = ' ' + newAttrs;
      }

      // Add the new fill color and preserve self-closing if needed
      return `<${_tag}${newAttrs} fill="${fillColor}"${selfClosing}>`;
    });
  } else {
    // No background color - apply foreground color to all fills/strokes
    coloredSvg = coloredSvg
      .replace(/fill="[^"]*"/g, `fill="${color}"`)
      .replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  }

  return coloredSvg;
}

export default ColoredSvgIcon;
