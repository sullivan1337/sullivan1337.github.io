/**
 * @fileoverview JS module with simple/random js functions used by toolbox.
 */

/**
 * Used to switch visibility of any html element.
 * @param {string} id of the element which needs to be toggled.
 */
function toggle_visibility(id) {
  try {
    const element = document.getElementById(id);
    if (element.style.display == 'none') {
      element.style.display = 'block';
    }
    else {
      element.style.display = 'none';
    }
  } catch (e) {}
}

/**
 * Used to switch language of Toolbox by adding lang=xxx to current url.
 * Discards all other URL parameters.
 * @param {!object} list the dropdown element which holds language codes.
 */
function switch_language(list) {
  const code = list[list.selectedIndex].value;
  window.location.href = '?lang=' + code;
}

/**
 * Used to setup the visibility and business logic of the cookie notice.
 */
function setup_cookie_notice() {
  const okButtonId = 'cookie-notice-ack-button';
  const divId = 'cookie-notice';
  const okButton = document.getElementById(okButtonId);
  const noticeDiv = document.getElementById(divId);

  if (okButton && noticeDiv) {
    okButton.addEventListener("click", ack_cookie_notice_ack, false);
    try {
      const storage = window.localStorage;
      if (!storage.getItem('cookie-notice-acked')) {
        toggle_visibility(divId);
      }
    } catch(e) {
      // If the div is present, then show it!
      toggle_visibility(divId);
    }
  }
}

/**
 * Event listener for the click of the cookie notice ACL button.
 */
function ack_cookie_notice_ack() {
  const divId = 'cookie-notice';
  toggle_visibility(divId);

  try {
    const storage = window.localStorage;
    storage.setItem('cookie-notice-acked', '1');
  } catch(e) {
    // No localstorage: use a cookie instead.
   document.cookie = 'COOKIE_NOTIFICATION_ACKED=1' +
       ';path=/;max-age=31536000;secure;samesite';
  }
}

window.addEventListener('load', setup_cookie_notice, {
  capture: false,
  once: true
});

