/**
 * Blocking inline script that resolves the theme BEFORE first paint, so there is
 * no flash of the wrong theme. It reads localStorage("oe-theme") and, when the
 * value is "light" or "dark", stamps <html data-theme>. "system" / missing =>
 * no attribute, and CSS `prefers-color-scheme` takes over.
 */
export function ThemeScript() {
  const js = `(function(){try{var t=localStorage.getItem('oe-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
