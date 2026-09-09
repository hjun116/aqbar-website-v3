/* ==========================================================================
   AQbar 프로모션 팝업 — 동작 로직
   --------------------------------------------------------------------------
   내용을 바꾸려면 이 파일이 아니라 promo-config.js 를 수정하세요.

   뜨는 조건 (하나라도 안 맞으면 안 뜹니다)
     1. promo-config.js 의 enabled 가 true
     2. 오늘 날짜가 startDate ~ endDate 사이
     3. '오늘 하루 안 보기' 로 숨긴 기간이 지났음

   단, 주소에 ?promo=preview 가 붙어 있으면 위 조건을 전부 무시하고 항상 뜹니다.
   (로컬에서 확인할 때 쓰는 미리보기 모드)
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.AQBAR_PROMO_CONFIG || {};
  var STORAGE_KEY = 'aqbar_promo_hide_until';
  var STYLE_ID = 'aqbar-promo-style';
  var PREVIEW = /[?&]promo=preview(?:&|$)/.test(window.location.search);

  var overlayEl = null;
  var lastFocusedEl = null;
  var savedOverflow = '';
  var savedPaddingRight = '';

  /* ---------------------------------------------------------------- 유틸 */

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function toDateString(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  function today() { return toDateString(new Date()); }

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }

  function writeStore(key, value) {
    try { window.localStorage.setItem(key, value); } catch (e) { /* 사생활 보호 모드 등 */ }
  }

  function track(eventName, params) {
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', eventName, params || {});
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 설정값에 쓴 줄바꿈(\n)만 <br> 로 바꿔 줍니다. 그 외 태그는 글자로 표시됩니다.
  function toHtml(value) {
    return escapeHtml(value).replace(/\n/g, '<br>');
  }

  // 제목에서 특정 단어만 강조색으로 감쌉니다.
  function titleHtml() {
    var full = toHtml(CFG.title);
    var word = CFG.titleHighlight;
    if (!word) return full;
    var escaped = escapeHtml(word);
    if (full.indexOf(escaped) === -1) return full;
    return full.replace(escaped, '<span class="aqp-accent">' + escaped + '</span>');
  }

  /* ------------------------------------------------------------ 노출 판단 */

  function shouldShow() {
    if (PREVIEW) return true;
    if (CFG.enabled !== true) return false;

    var t = today();
    if (CFG.startDate && t < CFG.startDate) return false;
    if (CFG.endDate && t > CFG.endDate) return false;

    var hideUntil = readStore(STORAGE_KEY);
    if (hideUntil && t <= hideUntil) return false;

    return true;
  }

  function hideForConfiguredDays() {
    var days = typeof CFG.hideDays === 'number' && CFG.hideDays > 0 ? CFG.hideDays : 1;
    var until = new Date();
    // 1 이면 오늘 자정까지, 7 이면 오늘부터 일주일
    until.setDate(until.getDate() + (days - 1));
    writeStore(STORAGE_KEY, toDateString(until));
  }

  /* -------------------------------------------------------- 스크롤 잠그기 */

  // 주의: body 에 overflow 를 주면 body 가 스크롤 컨테이너가 되어
  // 헤더의 position:sticky 가 깨집니다. 그래서 html 에만 겁니다.
  function lockScroll() {
    var html = document.documentElement;
    var scrollbarWidth = window.innerWidth - html.clientWidth;
    savedOverflow = html.style.overflow;
    savedPaddingRight = html.style.paddingRight;
    html.style.overflow = 'hidden';
    // 스크롤바가 사라지면서 화면이 옆으로 밀리는 것을 막습니다.
    if (scrollbarWidth > 0) html.style.paddingRight = scrollbarWidth + 'px';
  }

  function unlockScroll() {
    var html = document.documentElement;
    html.style.overflow = savedOverflow;
    html.style.paddingRight = savedPaddingRight;
  }

  /* ------------------------------------------------------------ 스타일 */

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.aqp-overlay{position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;',
      'padding:20px;background:rgba(13,35,66,.55);overflow-y:auto;',
      "font-family:'Pretendard','Pretendard Variable',-apple-system,system-ui,sans-serif;",
      'animation:aqp-fade .18s ease-out;}',

      '.aqp-dialog{position:relative;width:100%;max-width:520px;box-sizing:border-box;',
      'background:#0d2342;border:1px solid rgba(255,255,255,.12);border-radius:12px;',
      'box-shadow:0 32px 74px -16px rgba(0,0,0,.62);padding:30px 34px 14px;',
      'display:flex;flex-direction:column;gap:15px;text-align:center;word-break:keep-all;',
      'animation:aqp-pop .22s cubic-bezier(.2,.8,.3,1);}',

      '@keyframes aqp-fade{from{opacity:0}to{opacity:1}}',
      '@keyframes aqp-pop{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}',
      '@media(prefers-reduced-motion:reduce){.aqp-overlay,.aqp-dialog{animation:none}}',

      /* 닫기(X) */
      '.aqp-x{position:absolute;top:12px;right:12px;width:32px;height:32px;padding:0;',
      'display:flex;align-items:center;justify-content:center;background:transparent;border:0;',
      'border-radius:6px;cursor:pointer;color:rgba(255,255,255,.55);}',
      '.aqp-x:hover{color:#fff;background:rgba(255,255,255,.08);}',

      /* 머리 */
      '.aqp-head{display:flex;flex-direction:column;align-items:center;gap:17px;}',
      '.aqp-logo{height:40px;width:auto;display:block;}',
      '.aqp-headtext{display:flex;flex-direction:column;align-items:center;gap:11px;}',
      '.aqp-titlewrap{display:flex;flex-direction:column;align-items:center;gap:10px;}',
      '.aqp-label{font-size:12px;font-weight:600;letter-spacing:.12em;color:#7f9fe0;}',
      // text-wrap:balance — 제목이 두 줄이 될 때 마지막 줄에 한 단어만 남는 것을 막아 줍니다.
      '.aqp-title{margin:0;font-size:24px;line-height:1.32;letter-spacing:-.025em;font-weight:700;color:#fff;',
      'text-wrap:balance;}',
      '.aqp-accent{color:#818cf8;}',
      '.aqp-body{font-size:14px;line-height:1.68;color:#aebfd6;}',

      /* 혜택 */
      '.aqp-benefits{display:flex;flex-direction:column;gap:9px;padding:15px 18px;text-align:left;',
      'background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:10px;}',
      '.aqp-benefit{display:flex;align-items:flex-start;gap:9px;}',
      '.aqp-benefit>svg{flex:none;margin-top:3px;}',
      '.aqp-benefit-text{display:flex;align-items:center;flex-wrap:wrap;gap:7px;',
      'font-size:14px;line-height:1.55;color:#aebfd6;}',
      '.aqp-strong{font-weight:700;color:#fff;}',

      /* 마감 */
      '.aqp-deadline{display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;color:#aebfd6;}',
      '.aqp-dot{color:#2f5286;}',

      /* CTA */
      '.aqp-cta{display:block;padding:15px 24px;font-size:15px;font-weight:700;letter-spacing:-.01em;',
      'color:#13345e;background:#fff;border-radius:6px;text-decoration:none;text-align:center;',
      'transition:background .15s;}',
      '.aqp-cta:hover{background:#e8edf6;}',

      '.aqp-footnote{font-size:11.5px;line-height:1.6;color:#7089ad;}',

      /* 하단 버튼 */
      '.aqp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;',
      'margin-top:1px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);}',
      '.aqp-textbtn{padding:7px 4px;font:inherit;font-size:12.5px;background:transparent;border:0;',
      'color:#7f9fe0;cursor:pointer;border-radius:4px;}',
      '.aqp-textbtn:hover{color:#fff;text-decoration:underline;}',
      '.aqp-textbtn--close{color:#aebfd6;font-weight:600;}',

      /* 키보드 접근성 — 버튼·링크에만 초점 테두리를 보이고,
         팝업 자체(프로그램으로 초점을 주는 곳)에는 보이지 않게 합니다. */
      '.aqp-overlay :focus-visible{outline:2px solid #818cf8;outline-offset:3px;}',
      '.aqp-dialog:focus,.aqp-dialog:focus-visible{outline:none;}',

      /* 모바일 */
      '@media(max-width:768px){',
      '.aqp-overlay{padding:20px;}',
      '.aqp-dialog{max-width:350px;padding:34px 24px 18px;gap:18px;border-radius:14px;}',
      '.aqp-x{top:10px;right:10px;}',
      '.aqp-head{gap:24px;}',
      '.aqp-logo{height:48px;}',
      '.aqp-headtext{gap:14px;}',
      '.aqp-titlewrap{gap:11px;}',
      '.aqp-label{font-size:12px;}',
      '.aqp-title{font-size:25px;line-height:1.34;}',
      '.aqp-body{font-size:14px;line-height:1.65;}',
      '.aqp-benefits{gap:12px;padding:18px 16px;}',
      '.aqp-benefit{gap:9px;}',
      '.aqp-benefit-text{font-size:14px;gap:7px;}',
      '.aqp-deadline{font-size:15px;gap:7px;}',
      '.aqp-cta{padding:17px 20px;font-size:16.5px;}',
      '.aqp-footnote{font-size:12px;}',
      '.aqp-textbtn{font-size:13px;}',
      '}'
    ].join('');
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------ 아이콘 */

  function checkIcon() {
    return '<svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#818cf8" ' +
      'stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M3.5 9.5 L7 13 L14.5 5"></path></svg>';
  }

  function arrowIcon() {
    return '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#5c7cb0" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'style="flex:none" aria-hidden="true">' +
      '<path d="M2.5 7 H11 M7.5 3.5 L11 7 L7.5 10.5"></path></svg>';
  }

  function calendarIcon() {
    return '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#aebfd6" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="2" y="3.2" width="12" height="10.8" rx="1.6"></rect>' +
      '<path d="M2 6.4 H14 M5.2 1.6 V3.2 M10.8 1.6 V3.2"></path></svg>';
  }

  function closeIcon() {
    return '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M3 3 L13 13 M13 3 L3 13"></path></svg>';
  }

  /* ------------------------------------------------------------ 마크업 */

  function benefitsHtml() {
    var rows = CFG.benefits;
    if (!rows || !rows.length) return '';

    var html = '<div class="aqp-benefits">';
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i] || {};
      var leadClass = row.emphasis === 'lead' ? 'aqp-strong' : '';
      var tailClass = row.emphasis === 'tail' ? 'aqp-strong' : '';

      html += '<div class="aqp-benefit">' + checkIcon() + '<div class="aqp-benefit-text">';
      if (row.lead) {
        html += '<span class="' + leadClass + '">' + toHtml(row.lead) + '</span>';
        if (row.tail) html += arrowIcon();
      }
      if (row.tail) html += '<span class="' + tailClass + '">' + toHtml(row.tail) + '</span>';
      html += '</div></div>';
    }
    return html + '</div>';
  }

  function dialogHtml() {
    var html = '';

    html += '<button type="button" class="aqp-x" data-aqp-close="x" aria-label="팝업 닫기">' +
            closeIcon() + '</button>';

    html += '<div class="aqp-head">';
    if (CFG.logoSrc) {
      html += '<img class="aqp-logo" src="' + escapeHtml(CFG.logoSrc) + '" alt="' +
              escapeHtml(CFG.logoAlt || '') + '">';
    }
    html += '<div class="aqp-headtext"><div class="aqp-titlewrap">';
    if (CFG.label) html += '<div class="aqp-label">' + toHtml(CFG.label) + '</div>';
    html += '<h2 class="aqp-title" id="aqp-title">' + titleHtml() + '</h2>';
    html += '</div>';
    if (CFG.body) html += '<div class="aqp-body">' + toHtml(CFG.body) + '</div>';
    html += '</div></div>';

    html += benefitsHtml();

    if (CFG.deadlineText) {
      html += '<div class="aqp-deadline">' + calendarIcon() +
              '<span>' + toHtml(CFG.deadlineLabel || '신청 마감') + '</span>' +
              '<span class="aqp-dot">·</span>' +
              '<span class="aqp-strong">' + toHtml(CFG.deadlineText) + '</span></div>';
    }

    html += '<a class="aqp-cta" data-aqp-cta href="' + escapeHtml(CFG.ctaHref || '#contact') + '">' +
            toHtml(CFG.ctaText || '자세히 보기') + '</a>';

    if (CFG.footnote) html += '<div class="aqp-footnote">' + toHtml(CFG.footnote) + '</div>';

    html += '<div class="aqp-foot">' +
            '<button type="button" class="aqp-textbtn" data-aqp-close="hide">' +
            toHtml(CFG.hideText || '오늘 하루 안 보기') + '</button>' +
            '<button type="button" class="aqp-textbtn aqp-textbtn--close" data-aqp-close="close">' +
            toHtml(CFG.closeText || '닫기') + '</button>' +
            '</div>';

    return html;
  }

  /* ------------------------------------------------------------ 열고 닫기 */

  function close(reason) {
    if (!overlayEl) return;

    if (reason === 'hide') hideForConfiguredDays();

    track('promo_close', { promo_id: CFG.title || '', close_reason: reason });

    document.removeEventListener('keydown', onKeydown, true);
    overlayEl.parentNode.removeChild(overlayEl);
    overlayEl = null;
    unlockScroll();

    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') lastFocusedEl.focus();
  }

  function focusableEls() {
    if (!overlayEl) return [];
    return Array.prototype.slice.call(
      overlayEl.querySelectorAll('a[href], button:not([disabled])')
    );
  }

  function onKeydown(e) {
    if (!overlayEl) return;

    if (e.key === 'Escape' || e.keyCode === 27) {
      e.preventDefault();
      close('esc');
      return;
    }

    // Tab 이 팝업 밖으로 빠져나가지 않도록 가둡니다.
    if (e.key === 'Tab' || e.keyCode === 9) {
      var items = focusableEls();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      var dialog = overlayEl.firstChild;

      // 팝업 자체에 초점이 있는 상태에서 Shift+Tab 을 누르면 뒤로 빠져나가므로 막습니다.
      if (e.shiftKey && document.activeElement === dialog) {
        e.preventDefault();
        last.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  function open() {
    if (overlayEl) return;

    injectStyle();
    lastFocusedEl = document.activeElement;

    overlayEl = document.createElement('div');
    overlayEl.className = 'aqp-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'aqp-dialog';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'aqp-title');
    dialog.setAttribute('tabindex', '-1');
    dialog.innerHTML = dialogHtml();

    overlayEl.appendChild(dialog);
    document.body.appendChild(overlayEl);
    lockScroll();

    // 바깥(어두운 영역) 클릭으로 닫기
    overlayEl.addEventListener('click', function (e) {
      if (e.target === overlayEl) close('backdrop');
    });

    // 닫기 계열 버튼
    var closers = dialog.querySelectorAll('[data-aqp-close]');
    for (var i = 0; i < closers.length; i++) {
      closers[i].addEventListener('click', function () {
        close(this.getAttribute('data-aqp-close'));
      });
    }

    // CTA — 성과 기록 후 팝업을 닫고 링크는 그대로 동작시킵니다.
    var cta = dialog.querySelector('[data-aqp-cta]');
    if (cta) {
      cta.addEventListener('click', function () {
        track('promo_click', { promo_id: CFG.title || '', link_url: CFG.ctaHref || '' });
        close('cta');
      });
    }

    document.addEventListener('keydown', onKeydown, true);

    // 팝업 자체에 초점을 둡니다. (버튼에 두면 파란 포커스 테두리가 보여 어색합니다)
    // 스크린리더는 이때 팝업 제목부터 읽어 줍니다.
    dialog.focus();

    track('promo_view', { promo_id: CFG.title || '' });
  }

  /* ------------------------------------------------------------ 시작 */

  function init() {
    if (!shouldShow()) return;

    var delay = typeof CFG.delaySeconds === 'number' ? CFG.delaySeconds : 3;
    if (PREVIEW) delay = 0;

    if (delay > 0) {
      window.setTimeout(open, delay * 1000);
    } else {
      open();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
