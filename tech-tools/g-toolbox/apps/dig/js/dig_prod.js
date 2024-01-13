var l, aa = function(a) {
    var b = 0;
    return function() {
        return b < a.length ? {
            done: !1,
            value: a[b++]
        } : {
            done: !0
        }
    }
}, n = "function" == typeof Object.defineProperties ? Object.defineProperty : function(a, b, c) {
    if (a == Array.prototype || a == Object.prototype)
        return a;
    a[b] = c.value;
    return a
}
, ba = function(a) {
    a = ["object" == typeof globalThis && globalThis, a, "object" == typeof window && window, "object" == typeof self && self, "object" == typeof global && global];
    for (var b = 0; b < a.length; ++b) {
        var c = a[b];
        if (c && c.Math == Math)
            return c
    }
    throw Error("Cannot find global object");
}, ca = ba(this), p = function(a, b) {
    if (b)
        a: {
            var c = ca;
            a = a.split(".");
            for (var d = 0; d < a.length - 1; d++) {
                var h = a[d];
                if (!(h in c))
                    break a;
                c = c[h]
            }
            a = a[a.length - 1];
            d = c[a];
            b = b(d);
            b != d && null != b && n(c, a, {
                configurable: !0,
                writable: !0,
                value: b
            })
        }
};
p("Symbol", function(a) {
    if (a)
        return a;
    var b = function(g, e) {
        this.v = g;
        n(this, "description", {
            configurable: !0,
            writable: !0,
            value: e
        })
    };
    b.prototype.toString = function() {
        return this.v
    }
    ;
    var c = "jscomp_symbol_" + (1E9 * Math.random() >>> 0) + "_"
      , d = 0
      , h = function(g) {
        if (this instanceof h)
            throw new TypeError("Symbol is not a constructor");
        return new b(c + (g || "") + "_" + d++,g)
    };
    return h
});
p("Symbol.iterator", function(a) {
    if (a)
        return a;
    a = Symbol("Symbol.iterator");
    for (var b = "Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "), c = 0; c < b.length; c++) {
        var d = ca[b[c]];
        "function" === typeof d && "function" != typeof d.prototype[a] && n(d.prototype, a, {
            configurable: !0,
            writable: !0,
            value: function() {
                return da(aa(this))
            }
        })
    }
    return a
});
var da = function(a) {
    a = {
        next: a
    };
    a[Symbol.iterator] = function() {
        return this
    }
    ;
    return a
}
  , q = function(a) {
    var b = "undefined" != typeof Symbol && Symbol.iterator && a[Symbol.iterator];
    if (b)
        return b.call(a);
    if ("number" == typeof a.length)
        return {
            next: aa(a)
        };
    throw Error(String(a) + " is not an iterable or ArrayLike");
}
  , ea = function(a) {
    if (!(a instanceof Array)) {
        a = q(a);
        for (var b, c = []; !(b = a.next()).done; )
            c.push(b.value);
        a = c
    }
    return a
}
  , fa = function(a, b) {
    a instanceof String && (a += "");
    var c = 0
      , d = !1
      , h = {
        next: function() {
            if (!d && c < a.length) {
                var g = c++;
                return {
                    value: b(g, a[g]),
                    done: !1
                }
            }
            d = !0;
            return {
                done: !0,
                value: void 0
            }
        }
    };
    h[Symbol.iterator] = function() {
        return h
    }
    ;
    return h
};
p("Array.prototype.entries", function(a) {
    return a ? a : function() {
        return fa(this, function(b, c) {
            return [b, c]
        })
    }
});
p("Object.entries", function(a) {
    return a ? a : function(b) {
        var c = [], d;
        for (d in b)
            Object.prototype.hasOwnProperty.call(b, d) && c.push([d, b[d]]);
        return c
    }
});
/*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
var t = this || self
  , ha = function(a) {
    var b = typeof a;
    b = "object" != b ? b : a ? Array.isArray(a) ? "array" : b : "null";
    return "array" == b || "object" == b && "number" == typeof a.length
}
  , v = function(a) {
    var b = typeof a;
    return "object" == b && null != a || "function" == b
}
  , ia = function(a, b) {
    function c() {}
    c.prototype = b.prototype;
    a.F = b.prototype;
    a.prototype = new c;
    a.prototype.constructor = a;
    a.D = function(d, h, g) {
        for (var e = Array(arguments.length - 2), f = 2; f < arguments.length; f++)
            e[f - 2] = arguments[f];
        return b.prototype[h].apply(d, e)
    }
}
  , w = function(a) {
    return a
};
var ja;
var ka = /&/g
  , la = /</g
  , ma = />/g
  , na = /"/g
  , oa = /'/g
  , pa = /\x00/g
  , qa = /[\x00&<>"']/;
var x, y;
a: {
    for (var ra = ["CLOSURE_FLAGS"], z = t, A = 0; A < ra.length; A++)
        if (z = z[ra[A]],
        null == z) {
            y = null;
            break a
        }
    y = z
}
var sa = y && y[610401301];
x = null != sa ? sa : !1;
var B, ta = t.navigator;
B = ta ? ta.userAgentData || null : null;
function C(a) {
    return x ? B ? B.brands.some(function(b) {
        return (b = b.brand) && -1 != b.indexOf(a)
    }) : !1 : !1
}
function D(a) {
    var b;
    a: {
        if (b = t.navigator)
            if (b = b.userAgent)
                break a;
        b = ""
    }
    return -1 != b.indexOf(a)
}
;function E() {
    return x ? !!B && 0 < B.brands.length : !1
}
function F() {
    return E() ? C("Chromium") : (D("Chrome") || D("CriOS")) && !(E() ? 0 : D("Edge")) || D("Silk")
}
;var ua = Array.prototype.forEach ? function(a, b) {
    Array.prototype.forEach.call(a, b, void 0)
}
: function(a, b) {
    for (var c = a.length, d = "string" === typeof a ? a.split("") : a, h = 0; h < c; h++)
        h in d && b.call(void 0, d[h], h, a)
}
;
function va(a) {
    var b = a.length;
    if (0 < b) {
        for (var c = Array(b), d = 0; d < b; d++)
            c[d] = a[d];
        return c
    }
    return []
}
;!D("Android") || F();
F();
D("Safari") && (F() || (E() ? 0 : D("Coast")) || (E() ? 0 : D("Opera")) || (E() ? 0 : D("Edge")) || (E() ? C("Microsoft Edge") : D("Edg/")) || E() && C("Opera"));
Object.freeze(new function() {}
);
Object.freeze(new function() {}
);
var G;
var wa = {}
  , H = function(a) {
    this.m = a
};
H.prototype.toString = function() {
    return this.m.toString()
}
;
var I = function(a) {
    return a instanceof H && a.constructor === H ? a.m : "type_error:SafeHtml"
}
  , ya = function(a) {
    a instanceof H || (a = String(a),
    qa.test(a) && (-1 != a.indexOf("&") && (a = a.replace(ka, "&amp;")),
    -1 != a.indexOf("<") && (a = a.replace(la, "&lt;")),
    -1 != a.indexOf(">") && (a = a.replace(ma, "&gt;")),
    -1 != a.indexOf('"') && (a = a.replace(na, "&quot;")),
    -1 != a.indexOf("'") && (a = a.replace(oa, "&#39;")),
    -1 != a.indexOf("\x00") && (a = a.replace(pa, "&#0;"))),
    a = xa(a));
    return a
}
  , xa = function(a) {
    if (void 0 === G) {
        var b = null;
        var c = t.trustedTypes;
        if (c && c.createPolicy)
            try {
                b = c.createPolicy("goog#html", {
                    createHTML: w,
                    createScript: w,
                    createScriptURL: w
                })
            } catch (d) {
                t.console && t.console.error(d.message)
            }
        G = b
    }
    a = (b = G) ? b.createHTML(a) : a;
    return new H(a,wa)
}
  , za = new H(t.trustedTypes && t.trustedTypes.emptyHTML || "",wa);
var Aa = function(a) {
    var b = !1, c;
    return function() {
        b || (c = a(),
        b = !0);
        return c
    }
}(function() {
    var a = document.createElement("div")
      , b = document.createElement("div");
    b.appendChild(document.createElement("div"));
    a.appendChild(b);
    b = a.firstChild.firstChild;
    a.innerHTML = I(za);
    return !b.parentElement
});
/*

 SPDX-License-Identifier: Apache-2.0
*/
var J = {}
  , K = function() {
    throw Error("Do not instantiate directly");
};
K.prototype.j = null;
K.prototype.toString = function() {
    return this.content
}
;
K.prototype.o = function() {
    if (this.g !== J)
        throw Error("Sanitized content was not of kind HTML.");
    return xa(this.toString())
}
;
var L = function() {
    K.call(this)
};
ia(L, K);
L.prototype.g = J;
var Ba = function(a) {
    if (null != a)
        switch (a.j) {
        case 1:
            return 1;
        case -1:
            return -1;
        case 0:
            return 0
        }
    return null
}
  , N = function(a) {
    return null != a && a.g === J ? a : a instanceof H ? M(I(a).toString()) : M(String(String(a)).replace(Ca, Da), Ba(a))
}
  , M = function(a) {
    function b(c) {
        this.content = c
    }
    b.prototype = a.prototype;
    return function(c, d) {
        c = new b(String(c));
        void 0 !== d && (c.j = d);
        return c
    }
}(L)
  , Ea = function(a, b) {
    return a && b && a.A && b.A ? a.g !== b.g ? !1 : a.toString() === b.toString() : a instanceof K && b instanceof K ? a.g != b.g ? !1 : a.toString() == b.toString() : a == b
}
  , Ga = function(a) {
    return null != a && a.g === J ? a : M(Fa(a), Ba(a))
}
  , Ha = RegExp("^<(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)\\b")
  , Fa = function(a) {
    var b = Ia;
    if (!b)
        return String(a).replace(Ja, "").replace(Ka, "&lt;");
    a = String(a).replace(/\[/g, "&#91;");
    var c = []
      , d = [];
    a = a.replace(Ja, function(g, e) {
        if (e && (e = e.toLowerCase(),
        b.hasOwnProperty(e) && b[e])) {
            var f = c.length
              , k = "</"
              , u = "";
            if ("/" != g.charAt(1)) {
                k = "<";
                for (var r; r = La.exec(g); )
                    if (r[1] && "dir" == r[1].toLowerCase()) {
                        if (g = r[2]) {
                            if ("'" == g.charAt(0) || '"' == g.charAt(0))
                                g = g.substr(1, g.length - 2);
                            g = g.toLowerCase();
                            if ("ltr" == g || "rtl" == g || "auto" == g)
                                u = ' dir="' + g + '"'
                        }
                        break
                    }
                La.lastIndex = 0
            }
            c[f] = k + e + ">";
            d[f] = u;
            return "[" + f + "]"
        }
        return ""
    });
    a = String(a).replace(Ma, Da);
    var h = Na(c);
    a = a.replace(/\[(\d+)\]/g, function(g, e) {
        return d[e] && c[e] ? c[e].substr(0, c[e].length - 1) + d[e] + ">" : c[e]
    });
    return a + h
}
  , Na = function(a) {
    for (var b = [], c = 0, d = a.length; c < d; ++c) {
        var h = a[c];
        "/" == h.charAt(1) ? (h = b.lastIndexOf(h),
        0 > h ? a[c] = "" : (a[c] = b.slice(h).reverse().join(""),
        b.length = h)) : "<li>" == h && 0 > b.lastIndexOf("</ol>") && 0 > b.lastIndexOf("</ul>") ? a[c] = "" : Ha.test(h) || b.push("</" + h.substring(1))
    }
    return b.reverse().join("")
}
  , Oa = {
    "\x00": "&#0;",
    "\t": "&#9;",
    "\n": "&#10;",
    "\v": "&#11;",
    "\f": "&#12;",
    "\r": "&#13;",
    " ": "&#32;",
    '"': "&quot;",
    "&": "&amp;",
    "'": "&#39;",
    "-": "&#45;",
    "/": "&#47;",
    "<": "&lt;",
    "=": "&#61;",
    ">": "&gt;",
    "`": "&#96;",
    "\u0085": "&#133;",
    "\u00a0": "&#160;",
    "\u2028": "&#8232;",
    "\u2029": "&#8233;"
}
  , Da = function(a) {
    return Oa[a]
}
  , Ca = /[\x00\x22\x26\x27\x3c\x3e]/g
  , Ma = /[\x00\x22\x27\x3c\x3e]/g
  , Ja = /<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g
  , Ka = /</g
  , Ia = {
    b: !0,
    br: !0,
    em: !0,
    i: !0,
    s: !0,
    strong: !0,
    sub: !0,
    sup: !0,
    u: !0
}
  , La = /([a-zA-Z][a-zA-Z0-9:\-]*)[\t\n\r\u0020]*=[\t\n\r\u0020]*("[^"]*"|'[^']*')/g;
var Pa = function(a, b, c) {
    function d(f) {
        f && b.appendChild("string" === typeof f ? a.createTextNode(f) : f)
    }
    for (var h = 1; h < c.length; h++) {
        var g = c[h];
        if (!ha(g) || v(g) && 0 < g.nodeType)
            d(g);
        else {
            a: {
                if (g && "number" == typeof g.length) {
                    if (v(g)) {
                        var e = "function" == typeof g.item || "string" == typeof g.item;
                        break a
                    }
                    if ("function" === typeof g) {
                        e = "function" == typeof g.item;
                        break a
                    }
                }
                e = !1
            }
            ua(e ? va(g) : g, d)
        }
    }
}
  , O = function(a) {
    for (var b; b = a.firstChild; )
        a.removeChild(b)
}
  , Qa = function() {
    this.h = t.document || document
};
l = Qa.prototype;
l.getElementsByTagName = function(a, b) {
    return (b || this.h).getElementsByTagName(String(a))
}
;
l.createElement = function(a) {
    var b = this.h;
    a = String(a);
    "application/xhtml+xml" === b.contentType && (a = a.toLowerCase());
    return b.createElement(a)
}
;
l.createTextNode = function(a) {
    return this.h.createTextNode(String(a))
}
;
l.appendChild = function(a, b) {
    a.appendChild(b)
}
;
l.append = function(a, b) {
    Pa(9 == a.nodeType ? a : a.ownerDocument || a.document, a, arguments)
}
;
l.canHaveChildren = function(a) {
    if (1 != a.nodeType)
        return !1;
    switch (a.tagName) {
    case "APPLET":
    case "AREA":
    case "BASE":
    case "BR":
    case "COL":
    case "COMMAND":
    case "EMBED":
    case "FRAME":
    case "HR":
    case "IMG":
    case "INPUT":
    case "IFRAME":
    case "ISINDEX":
    case "KEYGEN":
    case "LINK":
    case "NOFRAMES":
    case "NOSCRIPT":
    case "META":
    case "OBJECT":
    case "PARAM":
    case "SCRIPT":
    case "SOURCE":
    case "STYLE":
    case "TRACK":
    case "WBR":
        return !1
    }
    return !0
}
;
l.removeNode = function(a) {
    return a && a.parentNode ? a.parentNode.removeChild(a) : null
}
;
l.contains = function(a, b) {
    if (!a || !b)
        return !1;
    if (a.contains && 1 == b.nodeType)
        return a == b || a.contains(b);
    if ("undefined" != typeof a.compareDocumentPosition)
        return a == b || !!(a.compareDocumentPosition(b) & 16);
    for (; b && a != b; )
        b = b.parentNode;
    return b == a
}
;
/*
 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
function P(a, b) {
    b = a(b || Ra, void 0);
    a = ja || (ja = new Qa);
    if (b && b.B)
        a = b.B();
    else {
        a = a.createElement("DIV");
        b: if (v(b)) {
            if (b.o && (b = b.o(),
            b instanceof H))
                break b;
            b = ya("zSoyz")
        } else
            b = ya(String(b));
        var c = a;
        if (Aa())
            for (; c.lastChild; )
                c.removeChild(c.lastChild);
        c.innerHTML = I(b)
    }
    1 == a.childNodes.length && (b = a.firstChild,
    1 == b.nodeType && (a = b));
    return a
}
var Ra = {};
var Sa = function(a) {
    a = a.C;
    return M(N(a.split("%%")[0]) + "<b>" + N(a.split("%%")[1]) + "</b>" + N(a.split("%%")[2]))
}
  , Ta = function(a) {
    return M(N(Ga(a.l)))
}
  , Ua = function(a) {
    var b = '<table class="mdl-data-table mdl-js-data-table mdl-shadow--3dp mh-table">';
    a = a.data.ANSWER;
    for (var c = a.length, d = 0; d < c; d++) {
        var h = a[d];
        b += '<tr><td class="mdl-data-table__cell--non-numeric"><b>' + N(h.type) + '</b></td><td class="mdl-data-table__cell--non-numeric">';
        for (var g = h.answer, e = g.length, f = 0; f < e; f++) {
            var k = g[f];
            b += '<div class="mdl-grid mdl-grid--nesting"><div class="mdl-cell mdl-cell--2-col">';
            var u = void 0
              , r = [];
            for (u in k)
                r.push(u);
            u = r;
            r = u.length;
            for (var X = 0; X < r; X++) {
                var m = u[X];
                b += "<b>" + N(m) + ": </b>";
                Ea(h.type, "SOA") && Ea(m, "DATA") ? (m = ("" + k[m]).split("|"),
                b += N(m[0]) + "<ul><li><b>MNAME: </b>",
                m = m[1],
                b += N(m.split(",")[0]) + "</li><li><b>RNAME: </b>" + N(m.split(",")[1]) + "</li><li><b>Serial: </b>" + N(m.split(",")[2]) + "</li><li><b>Refresh: </b>" + N(m.split(",")[3]) + "</li><li><b>Retry: </b>" + N(m.split(",")[4]) + "</li><li><b>Expire: </b>" + N(m.split(",")[5]) + "</li><li><b>TTL: </b>" + N(m.split(",")[6]) + "</li></ul>") : b += '<pre class="pre_wrap">' + N(Ga(k[m])) + "</pre>"
            }
            b += "</div></div>"
        }
        b += "</td></tr>"
    }
    return M(b + "</table>")
};
var Q = null
  , R = null
  , S = null;
function Va(a) {
    "Enter" === a.code ? T() : (U(),
    Q = setTimeout(Wa, 1E3),
    V(),
    W())
}
function T() {
    U();
    W();
    R = setTimeout(Xa, 400);
    V();
    Ya()
}
function Za(a) {
    document.getElementById("d-real-typ").value = a.target.value;
    var b = document.getElementById("dig-type-buttons").querySelectorAll("input.dig-button")
      , c = ["mdl-button--colored", "mdl-button--raised"];
    b = q(b);
    for (var d = b.next(); !d.done; d = b.next())
        d = d.value,
        d.classList.remove.apply(d.classList, ea(c));
    a.target.classList.add.apply(a.target.classList, ea(["mdl-button--colored", "mdl-button--raised"]));
    T()
}
function $a() {
    var a = "none" === document.getElementById("response-text").style.display;
    document.getElementById("response-text").style.display = a ? "block" : "none"
}
function Wa() {
    Q || Y("err1");
    Q = null;
    W() && Y("err2");
    R = setTimeout(Xa, 400);
    V() && Y("err3");
    Ya()
}
function Xa() {
    R || Y("err4");
    R = null;
    S || Y("err5");
    document.getElementById("response-text").text = "LOOKING_UP"
}
function ab(a) {
    O(document.getElementById("response-text"));
    "abort" == a ? (S || Y("err8"),
    S = null) : "error" == a ? (U() && Y("err9"),
    W(),
    S ? (Y("errB - server side error"),
    S = null) : Y("errA")) : Y("errOther")
}
function Y(a) {
    document.getElementById("error-text").text = "INTERNAL_ERROR";
    document.getElementById("error-form").querySelector("input[name=error]").value = (a || "") + "\n" + Error().stack;
    a = new FormData(document.getElementById("error-form"));
    fetch("error", {
        method: "POST",
        body: a
    })
}
function U() {
    if (!Q)
        return !1;
    clearTimeout(Q);
    Q = null;
    return !0
}
function Ya() {
    O(document.getElementById("error-text"));
    O(document.getElementById("response-text"));
    var a = document.getElementById("dig-form");
    a = new FormData(a);
    S = new AbortController;
    fetch("lookup", {
        method: "POST",
        signal: S.signal,
        body: a
    }).then(function(b) {
        200 !== b.status ? ab(b) : b.json().then(function(c) {
            U() && Y("err6");
            W();
            S || Y("err7");
            S = null;
            "" !== c.json_response && bb(c);
            document.getElementById("error-text").appendChild(P(Ta, {
                l: c.error_html
            }))
        })
    });
    cb()
}
function V() {
    if (!S)
        return !1;
    S.abort();
    S = null;
    return !0
}
function W() {
    if (!R)
        return !1;
    clearTimeout(R);
    R = null;
    return !0
}
function cb() {
    var a = encodeURIComponent(document.getElementById("dig-form").querySelector("input[name=typ]").getAttribute("value")) + "/" + encodeURIComponent(document.getElementById("dig-form").querySelector("input[name=domain]").getAttribute("value"));
    window.location.hash = a;
    document.getElementById("toolbox-external-link") && document.getElementById("toolbox-external-link").setAttribute("href", document.getElementById("toolbox-external-link").getAttribute("data-href") + "#" + a)
}
function db() {
    var a = ""
      , b = location.hash.split("/");
    2 == b.length && (a = decodeURIComponent(b[1]));
    for (var c = q(document.getElementById("dig-form").querySelectorAll("input[name=domain]")), d = c.next(); !d.done; d = c.next())
        d.value.setAttribute("value", a);
    a = decodeURIComponent(b[0]);
    O(document.getElementById("response-text"));
    b = q(document.getElementById("dig-form").querySelectorAll("input[type=button]"));
    for (c = b.next(); !c.done; c = b.next())
        c = c.value,
        "#" + c.value == a.toUpperCase() && c.click()
}
function Z(a) {
    a = Number(a);
    var b = Math.floor(a / 86400)
      , c = Math.floor(a % 86400 / 3600)
      , d = Math.floor(a % 3600 / 60);
    a = Math.floor(a % 60);
    return (0 < b ? b + " day" + (1 !== b ? "s" : "") + " " : "") + (0 < c ? c + " hour" + (1 !== c ? "s" : "") + " " : "") + (0 < d ? d + " minute" + (1 !== d ? "s" : "") + " " : "") + (0 < a ? a + " second" + (1 !== a ? "s" : "") : "")
}
var eb = {
    0: "Reserved",
    1: "SHA-1",
    2: "SHA-256",
    3: "GOST",
    4: "SHA-384"
};
function bb(a) {
    var b = a.response.split("\n").map(function(r) {
        return decodeURI(encodeURI(r))
    }).join("\n");
    b = b.replace(RegExp("(;ANSWER.*)(?=;AUTHORITY)", "gms"), "%%$1%%");
    document.getElementById("raw_switch").style.display = "block";
    document.getElementById("response-text").appendChild(P(Sa, {
        C: b
    }));
    if (0 < a.json_response.ANSWER.length) {
        b = q(Object.entries(a.json_response.ANSWER));
        for (var c = b.next(); !c.done; c = b.next()) {
            var d = q(c.value);
            c = d.next().value;
            d = d.next().value;
            for (var h = q(Object.entries(d.answer)), g = h.next(); !g.done; g = h.next()) {
                var e = q(g.value);
                g = e.next().value;
                e = e.next().value;
                for (var f in e) {
                    "[object Array]" === Object.prototype.toString.call(e[f]) && (e[f] = e[f].join('" "'),
                    e[f] = '"' + e[f] + '"');
                    if ("ttl" === f || "original_ttl" === f)
                        e[f] = Z(e[f]);
                    if ("expiration" === f || "inception" === f)
                        e[f] = new Date(e[f].replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/, "$4:$5:$6 $2/$3/$1"));
                    "flags" === f && (e[f] = "256" === e[f] ? "(" + e[f] + ") KSK" : "(" + e[f] + ") ZSK");
                    "digest_type" === f && (e[f] = 5 > e[f] ? "(" + e[f] + ") " + eb[e[f]] : "(" + e[f] + ") Unassigned");
                    if ("SOA" === d.type && "data" === f) {
                        var k = e[f].split(" ");
                        7 === k.length && (e[f] = e[f] + "|" + k[0] + "," + k[1] + "," + k[2] + "," + Z(k[3]) + "," + Z(k[4]) + "," + Z(k[5]) + "," + Z(k[6]))
                    }
                    k = f.replace("_", " ").toUpperCase();
                    var u = e[f];
                    delete e[f];
                    e[k] = u
                }
                d.answer[g] = e
            }
            a.json_response.ANSWER[c] = d
        }
        O(document.getElementById("response-table"));
        document.getElementById("response-table").appendChild(P(Ua, {
            data: a.json_response
        }))
    } else
        O(document.getElementById("response-table")),
        document.getElementById("error-text").appendChild(P(Ta, {
            l: "<b>Record not found!</b>"
        }))
}
t.addEventListener("load", function() {
    document.getElementById("raw_switch").style.display = "none";
    document.getElementById("dig-form").querySelector("input#domain").focus();
    document.getElementById("domain").addEventListener("keyup", Va);
    document.getElementById("domain").addEventListener("paste", T);
    for (var a = q(document.getElementById("dig-type-buttons").querySelectorAll("input.dig-button")), b = a.next(); !b.done; b = a.next())
        b.value.addEventListener("click", Za);
    document.getElementById("response-text").style.display = "none";
    document.getElementById("toggle-raw").addEventListener("click", $a);
    document.getElementById("dig-form").addEventListener("submit", function(c) {
        c.preventDefault();
        return !1
    });
    db()
});
t.addEventListener("hashchange", db);
