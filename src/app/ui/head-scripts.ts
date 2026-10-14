/**
 * Tiny scripts that run in <head> before the page paints.
 * Kept in a plain (not "use client") module: a string exported from a client file
 * reaches a Server Component as a client reference, not as the text.
 */

/** localStorage key for the Light / Dark choice (absent = follow the device). */
export const THEME_KEY = "theme";

/** Apply a saved theme before first paint so dark mode never flashes white. */
const themeScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/**
 * Browsers fire "beforeinstallprompt" early, often before React loads.
 * Keep the event on window and announce it, for the Install app button.
 */
const installScript = `window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__hkInstall=e;window.dispatchEvent(new Event("hk-installable"))});window.addEventListener("appinstalled",function(){window.__hkInstall=null;window.dispatchEvent(new Event("hk-installable"))});`;

export const headScript = themeScript + installScript;
