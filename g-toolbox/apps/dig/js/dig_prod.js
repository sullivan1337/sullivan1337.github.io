/*

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
var l,m=function(a){var b=0;return function(){return b<a.length?{done:!1,value:a[b++]}:{done:!0}}},n="function"==typeof Object.defineProperties?Object.defineProperty:function(a,b,c){if(a==Array.prototype||a==Object.prototype)return a;a[b]=c.value;return a},aa=function(a){a=["object"==typeof globalThis&&globalThis,a,"object"==typeof window&&window,"object"==typeof self&&self,"object"==typeof global&&global];for(var b=0;b<a.length;++b){var c=a[b];if(c&&c.Math==Math)return c}throw Error("Cannot find global object");
},p=aa(this),t=function(a,b){if(b)a:{var c=p;a=a.split(".");for(var d=0;d<a.length-1;d++){var h=a[d];if(!(h in c))break a;c=c[h]}a=a[a.length-1];d=c[a];b=b(d);b!=d&&null!=b&&n(c,a,{configurable:!0,writable:!0,value:b})}};
t("Symbol",function(a){if(a)return a;var b=function(g,e){this.v=g;n(this,"description",{configurable:!0,writable:!0,value:e})};b.prototype.toString=function(){return this.v};var c="jscomp_symbol_"+(1E9*Math.random()>>>0)+"_",d=0,h=function(g){if(this instanceof h)throw new TypeError("Symbol is not a constructor");return new b(c+(g||"")+"_"+d++,g)};return h});
t("Symbol.iterator",function(a){if(a)return a;a=Symbol("Symbol.iterator");for(var b="Array Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array".split(" "),c=0;c<b.length;c++){var d=p[b[c]];"function"===typeof d&&"function"!=typeof d.prototype[a]&&n(d.prototype,a,{configurable:!0,writable:!0,value:function(){return ba(m(this))}})}return a});
var ba=function(a){a={next:a};a[Symbol.iterator]=function(){return this};return a},u=function(a){var b="undefined"!=typeof Symbol&&Symbol.iterator&&a[Symbol.iterator];return b?b.call(a):{next:m(a)}},v=function(a){if(!(a instanceof Array)){a=u(a);for(var b,c=[];!(b=a.next()).done;)c.push(b.value);a=c}return a},ca=function(a,b){a instanceof String&&(a+="");var c=0,d=!1,h={next:function(){if(!d&&c<a.length){var g=c++;return{value:b(g,a[g]),done:!1}}d=!0;return{done:!0,value:void 0}}};h[Symbol.iterator]=
function(){return h};return h};t("Array.prototype.entries",function(a){return a?a:function(){return ca(this,function(b,c){return[b,c]})}});t("Object.entries",function(a){return a?a:function(b){var c=[],d;for(d in b)Object.prototype.hasOwnProperty.call(b,d)&&c.push([d,b[d]]);return c}});
var w=this||self,da=function(a){var b=typeof a;b="object"!=b?b:a?Array.isArray(a)?"array":b:"null";return"array"==b||"object"==b&&"number"==typeof a.length},x=function(a){var b=typeof a;return"object"==b&&null!=a||"function"==b},ea=function(a,b){function c(){}c.prototype=b.prototype;a.H=b.prototype;a.prototype=new c;a.prototype.constructor=a;a.G=function(d,h,g){for(var e=Array(arguments.length-2),f=2;f<arguments.length;f++)e[f-2]=arguments[f];return b.prototype[h].apply(d,e)}},A=function(a){return a};var B;/*

 SPDX-License-Identifier: Apache-2.0
*/
var C;var fa=Array.prototype.forEach?function(a,b){Array.prototype.forEach.call(a,b,void 0)}:function(a,b){for(var c=a.length,d="string"===typeof a?a.split(""):a,h=0;h<c;h++)h in d&&b.call(void 0,d[h],h,a)};function ha(a){var b=a.length;if(0<b){for(var c=Array(b),d=0;d<b;d++)c[d]=a[d];return c}return[]};var ia=/&/g,ja=/</g,ka=/>/g,la=/"/g,ma=/'/g,na=/\x00/g,oa=/[\x00&<>"']/;var D={},E=function(a,b,c){this.l=c===D?a:"";this.m=b;this.C=this.B=!0};E.prototype.A=function(){return this.l.toString()};E.prototype.toString=function(){return this.l.toString()};
var F=function(a){return a instanceof E&&a.constructor===E?a.l:"type_error:SafeHtml"},H=function(a){if(a instanceof E)return a;var b="object"==typeof a,c=null;b&&a.B&&(c=a.m);a=b&&a.C?a.A():String(a);oa.test(a)&&(-1!=a.indexOf("&")&&(a=a.replace(ia,"&amp;")),-1!=a.indexOf("<")&&(a=a.replace(ja,"&lt;")),-1!=a.indexOf(">")&&(a=a.replace(ka,"&gt;")),-1!=a.indexOf('"')&&(a=a.replace(la,"&quot;")),-1!=a.indexOf("'")&&(a=a.replace(ma,"&#39;")),-1!=a.indexOf("\x00")&&(a=a.replace(na,"&#0;")));return G(a,
c)},G=function(a,b){if(void 0===C){var c=null;var d=w.trustedTypes;if(d&&d.createPolicy)try{c=d.createPolicy("goog#html",{createHTML:A,createScript:A,createScriptURL:A})}catch(h){w.console&&w.console.error(h.message)}C=c}a=(c=C)?c.createHTML(a):a;return new E(a,b,D)},pa=new E(w.trustedTypes&&w.trustedTypes.emptyHTML||"",0,D);var qa=function(a){var b=!1,c;return function(){b||(c=a(),b=!0);return c}}(function(){var a=document.createElement("div"),b=document.createElement("div");b.appendChild(document.createElement("div"));a.appendChild(b);b=a.firstChild.firstChild;a.innerHTML=F(pa);return!b.parentElement});var I={},J=function(){throw Error("Do not instantiate directly");};J.prototype.h=null;J.prototype.toString=function(){return this.content};var K=function(){J.call(this)};ea(K,J);K.prototype.g=I;var ra=function(a){if(null!=a)switch(a.h){case 1:return 1;case -1:return-1;case 0:return 0}return null},M=function(a){return null!=a&&a.g===I?a:a instanceof E?L(F(a).toString(),a.m):L(String(String(a)).replace(sa,ta),ra(a))},L=function(a){function b(c){this.content=c}b.prototype=a.prototype;return function(c,d){c=new b(String(c));void 0!==d&&(c.h=d);return c}}(K),N=function(a){if(null==a)throw Error("unexpected null value");return a},ua=function(a,b){return a&&b&&a.D&&b.D?a.g!==b.g?!1:a.toString()===
b.toString():a instanceof J&&b instanceof J?a.g!=b.g?!1:a.toString()==b.toString():a==b},wa=function(a){return null!=a&&a.g===I?a:L(va(a),ra(a))},xa=RegExp("^<(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)\\b"),va=function(a){var b=ya;if(!b)return String(a).replace(za,"").replace(Aa,"&lt;");a=String(a).replace(/\[/g,"&#91;");var c=[],d=[];a=a.replace(za,function(g,e){if(e&&(e=e.toLowerCase(),b.hasOwnProperty(e)&&b[e])){var f=c.length,k="</",r="";if("/"!=g.charAt(1)){k=
"<";for(var q;q=Ba.exec(g);)if(q[1]&&"dir"==q[1].toLowerCase()){if(g=q[2]){if("'"==g.charAt(0)||'"'==g.charAt(0))g=g.substr(1,g.length-2);g=g.toLowerCase();if("ltr"==g||"rtl"==g||"auto"==g)r=' dir="'+g+'"'}break}Ba.lastIndex=0}c[f]=k+e+">";d[f]=r;return"["+f+"]"}return""});a=String(a).replace(Ca,ta);var h=Da(c);a=a.replace(/\[(\d+)\]/g,function(g,e){return d[e]&&c[e]?c[e].substr(0,c[e].length-1)+d[e]+">":c[e]});return a+h},Da=function(a){for(var b=[],c=0,d=a.length;c<d;++c){var h=a[c];"/"==h.charAt(1)?
(h=b.lastIndexOf(h),0>h?a[c]="":(a[c]=b.slice(h).reverse().join(""),b.length=h)):"<li>"==h&&0>b.lastIndexOf("</ol>")&&0>b.lastIndexOf("</ul>")?a[c]="":xa.test(h)||b.push("</"+h.substring(1))}return b.reverse().join("")},Ea={"\x00":"&#0;","\t":"&#9;","\n":"&#10;","\v":"&#11;","\f":"&#12;","\r":"&#13;"," ":"&#32;",'"':"&quot;","&":"&amp;","'":"&#39;","-":"&#45;","/":"&#47;","<":"&lt;","=":"&#61;",">":"&gt;","`":"&#96;","\u0085":"&#133;","\u00a0":"&#160;","\u2028":"&#8232;","\u2029":"&#8233;"},ta=function(a){return Ea[a]},
sa=/[\x00\x22\x26\x27\x3c\x3e]/g,Ca=/[\x00\x22\x27\x3c\x3e]/g,za=/<(?:!|\/?([a-zA-Z][a-zA-Z0-9:\-]*))(?:[^>'"]|"[^"]*"|'[^']*')*>/g,Aa=/</g,ya={b:!0,br:!0,em:!0,i:!0,s:!0,strong:!0,sub:!0,sup:!0,u:!0},Ba=/([a-zA-Z][a-zA-Z0-9:\-]*)[\t\n\r\u0020]*=[\t\n\r\u0020]*("[^"]*"|'[^']*')/g;var Fa=function(a,b,c){function d(f){f&&b.appendChild("string"===typeof f?a.createTextNode(f):f)}for(var h=1;h<c.length;h++){var g=c[h];if(!da(g)||x(g)&&0<g.nodeType)d(g);else{a:{if(g&&"number"==typeof g.length){if(x(g)){var e="function"==typeof g.item||"string"==typeof g.item;break a}if("function"===typeof g){e="function"==typeof g.item;break a}}e=!1}fa(e?ha(g):g,d)}}},O=function(a){for(var b;b=a.firstChild;)a.removeChild(b)},Ga=function(){this.j=w.document||document};l=Ga.prototype;
l.getElementsByTagName=function(a,b){return(b||this.j).getElementsByTagName(String(a))};l.createElement=function(a){var b=this.j;a=String(a);"application/xhtml+xml"===b.contentType&&(a=a.toLowerCase());return b.createElement(a)};l.createTextNode=function(a){return this.j.createTextNode(String(a))};l.appendChild=function(a,b){a.appendChild(b)};l.append=function(a,b){Fa(9==a.nodeType?a:a.ownerDocument||a.document,a,arguments)};l.canHaveChildren=function(a){if(1!=a.nodeType)return!1;switch(a.tagName){case "APPLET":case "AREA":case "BASE":case "BR":case "COL":case "COMMAND":case "EMBED":case "FRAME":case "HR":case "IMG":case "INPUT":case "IFRAME":case "ISINDEX":case "KEYGEN":case "LINK":case "NOFRAMES":case "NOSCRIPT":case "META":case "OBJECT":case "PARAM":case "SCRIPT":case "SOURCE":case "STYLE":case "TRACK":case "WBR":return!1}return!0};
l.removeNode=function(a){return a&&a.parentNode?a.parentNode.removeChild(a):null};l.contains=function(a,b){if(!a||!b)return!1;if(a.contains&&1==b.nodeType)return a==b||a.contains(b);if("undefined"!=typeof a.compareDocumentPosition)return a==b||!!(a.compareDocumentPosition(b)&16);for(;b&&a!=b;)b=b.parentNode;return b==a};/*
 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/
function P(a,b){b=a(b||Ha,void 0);a=(B||(B=new Ga)).createElement("DIV");if(x(b))if(b instanceof J){if(b.g!==I)throw Error("Sanitized content was not of kind HTML.");b=G(b.toString(),b.h||null)}else b=H("zSoyz");else b=H(String(b));if(qa())for(;a.lastChild;)a.removeChild(a.lastChild);a.innerHTML=F(b);1==a.childNodes.length&&(b=a.firstChild,1==b.nodeType&&(a=b));return a}var Ha={};var Ia=function(a){a=a.F;return L(M(N(a).split("%%")[0])+"<b>"+M(N(a).split("%%")[1])+"</b>"+M(N(a).split("%%")[2]))},Ja=function(a){return L(M(wa(a.o)))},Ka=function(a){var b='<table class="mdl-data-table mdl-js-data-table mdl-shadow--3dp mh-table">';a=a.data.ANSWER;for(var c=a.length,d=0;d<c;d++){var h=a[d];b+='<tr><td class="mdl-data-table__cell--non-numeric"><b>'+M(h.type)+'</b></td><td class="mdl-data-table__cell--non-numeric">';for(var g=h.answer,e=g.length,f=0;f<e;f++){var k=g[f];b+='<div class="mdl-grid mdl-grid--nesting"><div class="mdl-cell mdl-cell--2-col">';
var r=void 0,q=[];for(r in k)q.push(r);r=q;q=r.length;for(var R=0;R<q;R++){var y=r[R];b+="<b>"+M(y)+": </b>";if(ua(h.type,"SOA")&&ua(y,"DATA")){y=N(""+k[y]).split("|");var z=y[1];b+=M(y[0])+"<ul><li><b>MNAME: </b>"+M(N(z).split(",")[0])+"</li><li><b>RNAME: </b>"+M(N(z).split(",")[1])+"</li><li><b>Serial: </b>"+M(N(z).split(",")[2])+"</li><li><b>Refresh: </b>"+M(N(z).split(",")[3])+"</li><li><b>Retry: </b>"+M(N(z).split(",")[4])+"</li><li><b>Expire: </b>"+M(N(z).split(",")[5])+"</li><li><b>TTL: </b>"+
M(N(z).split(",")[6])+"</li></ul>"}else b+='<pre class="pre_wrap">'+M(wa(k[y]))+"</pre>"}b+="</div></div>"}b+="</td></tr>"}return L(b+"</table>")};var Q=null,S=null,T=null;function La(a){"Enter"===a.code?U():(V(),Q=setTimeout(Ma,1E3),W(),X())}function U(){V();X();S=setTimeout(Na,400);W();Oa()}
function Pa(a){document.getElementById("d-real-typ").value=a.target.value;var b=document.getElementById("dig-type-buttons").querySelectorAll("input.dig-button"),c=["mdl-button--colored","mdl-button--raised"];b=u(b);for(var d=b.next();!d.done;d=b.next())d=d.value,d.classList.remove.apply(d.classList,v(c));a.target.classList.add.apply(a.target.classList,v(["mdl-button--colored","mdl-button--raised"]));U()}
function Qa(){var a="none"===document.getElementById("response-text").style.display;document.getElementById("response-text").style.display=a?"block":"none"}function Ma(){Q||Y("err1");Q=null;X()&&Y("err2");S=setTimeout(Na,400);W()&&Y("err3");Oa()}function Na(){S||Y("err4");S=null;T||Y("err5");document.getElementById("response-text").text="LOOKING_UP"}
function Ra(a){O(document.getElementById("response-text"));"abort"==a?(T||Y("err8"),T=null):"error"==a?(V()&&Y("err9"),X(),T?(Y("errB - server side error"),T=null):Y("errA")):Y("errOther")}function Y(a){document.getElementById("error-text").text="INTERNAL_ERROR";document.getElementById("error-form").querySelector("input[name=error]").value=(a||"")+"\n"+Error().stack;a=new FormData(document.getElementById("error-form"));fetch("error",{method:"POST",body:a})}
function V(){if(!Q)return!1;clearTimeout(Q);Q=null;return!0}
function Oa(){O(document.getElementById("error-text"));O(document.getElementById("response-text"));var a=document.getElementById("dig-form");a=new FormData(a);T=new AbortController;fetch("lookup",{method:"POST",signal:T.signal,body:a}).then(function(b){200!==b.status?Ra(b):b.json().then(function(c){V()&&Y("err6");X();T||Y("err7");T=null;""!==c.json_response&&Sa(c);document.getElementById("error-text").appendChild(P(Ja,{o:c.error_html}))})});Ta()}
function W(){if(!T)return!1;T.abort();T=null;return!0}function X(){if(!S)return!1;clearTimeout(S);S=null;return!0}
function Ta(){var a=encodeURIComponent(document.getElementById("dig-form").querySelector("input[name=typ]").getAttribute("value"))+"/"+encodeURIComponent(document.getElementById("dig-form").querySelector("input[name=domain]").getAttribute("value"));window.location.hash=a;document.getElementById("toolbox-external-link")&&document.getElementById("toolbox-external-link").setAttribute("href",document.getElementById("toolbox-external-link").getAttribute("data-href")+"#"+a)}
function Ua(){var a="",b=location.hash.split("/");2==b.length&&(a=decodeURIComponent(b[1]));for(var c=u(document.getElementById("dig-form").querySelectorAll("input[name=domain]")),d=c.next();!d.done;d=c.next())d.value.setAttribute("value",a);a=decodeURIComponent(b[0]);O(document.getElementById("response-text"));b=u(document.getElementById("dig-form").querySelectorAll("input[type=button]"));for(c=b.next();!c.done;c=b.next())c=c.value,"#"+c.value==a.toUpperCase()&&c.click()}
function Z(a){a=Number(a);var b=Math.floor(a/86400),c=Math.floor(a%86400/3600),d=Math.floor(a%3600/60);a=Math.floor(a%60);return(0<b?b+" day"+(1!==b?"s":"")+" ":"")+(0<c?c+" hour"+(1!==c?"s":"")+" ":"")+(0<d?d+" minute"+(1!==d?"s":"")+" ":"")+(0<a?a+" second"+(1!==a?"s":""):"")}var Va={0:"Reserved",1:"SHA-1",2:"SHA-256",3:"GOST",4:"SHA-384"};
function Sa(a){var b=a.response.split("\n").map(function(q){return decodeURI(encodeURI(q))}).join("\n");b=b.replace(RegExp("(;ANSWER.*)(?=;AUTHORITY)","gms"),"%%$1%%");document.getElementById("raw_switch").style.display="block";document.getElementById("response-text").appendChild(P(Ia,{F:b}));if(0<a.json_response.ANSWER.length){b=u(Object.entries(a.json_response.ANSWER));for(var c=b.next();!c.done;c=b.next()){var d=u(c.value);c=d.next().value;d=d.next().value;for(var h=u(Object.entries(d.answer)),
g=h.next();!g.done;g=h.next()){var e=u(g.value);g=e.next().value;e=e.next().value;for(var f in e){"[object Array]"===Object.prototype.toString.call(e[f])&&(e[f]=e[f].join('" "'),e[f]='"'+e[f]+'"');if("ttl"===f||"original_ttl"===f)e[f]=Z(e[f]);if("expiration"===f||"inception"===f)e[f]=new Date(e[f].replace(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)$/,"$4:$5:$6 $2/$3/$1"));"flags"===f&&(e[f]="256"===e[f]?"("+e[f]+") KSK":"("+e[f]+") ZSK");"digest_type"===f&&(e[f]=5>e[f]?"("+e[f]+") "+Va[e[f]]:"("+e[f]+
") Unassigned");if("SOA"===d.type&&"data"===f){var k=e[f].split(" ");7===k.length&&(e[f]=e[f]+"|"+k[0]+","+k[1]+","+k[2]+","+Z(k[3])+","+Z(k[4])+","+Z(k[5])+","+Z(k[6]))}k=f.replace("_"," ").toUpperCase();var r=e[f];delete e[f];e[k]=r}d.answer[g]=e}a.json_response.ANSWER[c]=d}O(document.getElementById("response-table"));document.getElementById("response-table").appendChild(P(Ka,{data:a.json_response}))}else O(document.getElementById("response-table")),document.getElementById("error-text").appendChild(P(Ja,
{o:"<b>Record not found!</b>"}))}
w.addEventListener("load",function(){document.getElementById("raw_switch").style.display="none";document.getElementById("dig-form").querySelector("input#domain").focus();document.getElementById("domain").addEventListener("keyup",La);document.getElementById("domain").addEventListener("paste",U);for(var a=u(document.getElementById("dig-type-buttons").querySelectorAll("input.dig-button")),b=a.next();!b.done;b=a.next())b.value.addEventListener("click",Pa);document.getElementById("response-text").style.display="none";
document.getElementById("toggle-raw").addEventListener("click",Qa);document.getElementById("dig-form").addEventListener("submit",function(c){c.preventDefault();return!1});Ua()});w.addEventListener("hashchange",Ua);