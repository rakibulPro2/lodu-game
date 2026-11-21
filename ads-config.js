/* ==========================================================
   LUDO - ads-config.js
   ----------------------------------------------------------
   EASY AD SETTINGS FOR BUYERS
   You only need to edit the ADS_CONFIG block below.

   1. Set  enabled: true  for the ad type you want.
   2. Paste your ad code between the two backticks ` ` in "code".
      (Adsterra, Google AdSense or any other network works.)
   3. Save the file and upload it. That's it.

   With enabled: false (the default) no ads are shown and the
   banner space is hidden automatically.
   ========================================================== */

var ADS_CONFIG = {

  /* Master switch. false = every ad below is turned off. */
  enabled: true,

  /* ---------------- BANNER AD ----------------
     Shown in the banner space at the bottom of the game.

     mode:
       'iframe' -> best for Adsterra and most networks (isolated, safest)
       'inline' -> use this for Google AdSense

     width / height: size of your banner, e.g. 320x50, 728x90, 300x250.
     (Only used in 'iframe' mode.)

     mobile (optional): a different banner for small screens (under 740px).
     Leave "code" empty to use the main banner on phones too.
  */
  banner: {
    enabled: false,
    mode: 'iframe',
    width: 728,
    height: 90,
    code: ``,

    mobile: {
      width: 320,
      height: 50,
      code: ``
    },

    /* Reload the banner every time a game ends (more impressions). */
    refreshOnGameEnd: false,

    /* true = hide this banner inside the Android app (Play Store build).
       NOTE: Google AdSense does NOT allow use inside apps. Read README.txt. */
    disableInApp: false
  },

  /* ---------------- POPUNDER AD ----------------
     Paste the single <script src="..."></script> line your network gives you.

     loadOn:
       'gameStart' -> loads when the player taps Start game (recommended)
       'gameEnd'   -> loads when a game finishes
       'pageLoad'  -> loads as soon as the page opens
  */
  popunder: {
    enabled: false,
    loadOn: 'gameStart',
    code: ``,

    /* true (recommended) = never run popunders inside the Android app.
       Google Play can reject apps that open pop-up pages. */
    disableInApp: true
  }
};

/* ==========================================================
   ENGINE - buyers do not need to edit anything below this line
   ========================================================== */
(function () {
  'use strict';

  var popunderLoaded = false;
  var bannerEl = null;

  function isInApp() {
    try {
      return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
    } catch (e) { return false; }
  }

  function hasCode(str) {
    return typeof str === 'string' && str.replace(/\s+/g, '').length > 0;
  }

  /* Insert HTML and make sure <script> tags really run, in order. */
  function injectHTML(container, html) {
    var tpl = document.createElement('template');
    tpl.innerHTML = html;
    var nodes = Array.prototype.slice.call(tpl.content.childNodes);
    nodes.forEach(function (node) {
      if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
        var s = document.createElement('script');
        Array.prototype.slice.call(node.attributes).forEach(function (a) {
          s.setAttribute(a.name, a.value);
        });
        if (node.src) s.async = false;
        else s.text = node.textContent;
        container.appendChild(s);
      } else {
        container.appendChild(document.importNode(node, true));
      }
    });
  }

  /* ---------- banner ---------- */
  function renderBanner() {
    try {
      var cfg = ADS_CONFIG.banner;
      var slot = document.getElementById('ad-banner');
      if (!ADS_CONFIG.enabled || !cfg || !cfg.enabled || !slot) return;
      if (cfg.disableInApp && isInApp()) return;

      var width = cfg.width, height = cfg.height, code = cfg.code;
      var m = cfg.mobile;
      if (m && hasCode(m.code) && window.innerWidth < 740) {
        width = m.width; height = m.height; code = m.code;
      }
      if (!hasCode(code)) return;

      slot.innerHTML = '';

      if (cfg.mode === 'inline') {
        injectHTML(slot, code);
        return;
      }

      var frame = document.createElement('iframe');
      frame.title = 'Advertisement';
      frame.width = width;
      frame.height = height;
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('scrolling', 'no');
      frame.style.cssText = 'border:0;max-width:100%;display:block;margin:0 auto;overflow:hidden;background:transparent;';
      frame.srcdoc =
        '<!DOCTYPE html><html><head><meta charset="utf-8">' +
        '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}' +
        'body{display:flex;justify-content:center;align-items:center}</style>' +
        '</head><body>' + code + '</body></html>';
      slot.appendChild(frame);
      bannerEl = frame;
    } catch (e) { /* ads must never break the game */ }
  }

  /* ---------- popunder ---------- */
  function loadPopunder() {
    try {
      var cfg = ADS_CONFIG.popunder;
      if (popunderLoaded || !ADS_CONFIG.enabled || !cfg || !cfg.enabled || !hasCode(cfg.code)) return;
      if (cfg.disableInApp && isInApp()) return;
      popunderLoaded = true;
      injectHTML(document.body, cfg.code);
    } catch (e) { /* ads must never break the game */ }
  }

  /* ---------- hooks called by game.js ---------- */
  function trigger(name) {
    try {
      var pop = ADS_CONFIG.popunder;
      if (name === 'gameStart' && pop && pop.loadOn === 'gameStart') loadPopunder();
      if (name === 'gameEnd') {
        if (pop && pop.loadOn === 'gameEnd') loadPopunder();
        if (ADS_CONFIG.banner && ADS_CONFIG.banner.refreshOnGameEnd && bannerEl) renderBanner();
      }
    } catch (e) { /* ignore */ }
  }

  window.LudoAds = { trigger: trigger, reload: renderBanner };

  function init() {
    renderBanner();
    var pop = ADS_CONFIG.popunder;
    if (pop && pop.loadOn === 'pageLoad') loadPopunder();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
