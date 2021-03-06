// docCookies, by Mozilla.
var docCookies = {
  getItem: function (sKey) {
    return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
  },
  setItem: function (sKey, sValue, vEnd, sPath, sDomain, bSecure) {
    if (!sKey || /^(?:expires|max\-age|path|domain|secure)$/i.test(sKey)) { return false; }
    var sExpires = "";
    if (vEnd) {
      switch (vEnd.constructor) {
        case Number:
          sExpires = vEnd === Infinity ? "; expires=Fri, 31 Dec 9999 23:59:59 GMT" : "; max-age=" + vEnd;
          break;
        case String:
          sExpires = "; expires=" + vEnd;
          break;
        case Date:
          sExpires = "; expires=" + vEnd.toUTCString();
          break;
      }
    }
    document.cookie = encodeURIComponent(sKey) + "=" + encodeURIComponent(sValue) + sExpires + (sDomain ? "; domain=" + sDomain : "") + (sPath ? "; path=" + sPath : "") + (bSecure ? "; secure" : "");
    return true;
  },
  removeItem: function (sKey, sPath, sDomain) {
    if (!sKey || !this.hasItem(sKey)) { return false; }
    document.cookie = encodeURIComponent(sKey) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT" + ( sDomain ? "; domain=" + sDomain : "") + ( sPath ? "; path=" + sPath : "");
    return true;
  },
  hasItem: function (sKey) {
    return (new RegExp("(?:^|;\\s*)" + encodeURIComponent(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
  },
  keys: /* optional method: you can safely remove it! */ function () {
    var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
    for (var nIdx = 0; nIdx < aKeys.length; nIdx++) { aKeys[nIdx] = decodeURIComponent(aKeys[nIdx]); }
    return aKeys;
  }
};

// Remove legacy settings
docCookies.removeItem("r3sid", "/", BOOTSTRAP.cookie_domain);
docCookies.removeItem("r3prefs", "/", BOOTSTRAP.cookie_domain);
docCookies.removeItem("edilayouts", "/", BOOTSTRAP.cookie_domain);

var Prefs = function() {
	"use strict";
	var self = {};
	var meta = {};
	var callbacks = {};
	var cookie_domain = BOOTSTRAP.cookie_domain;
	var values;
	try {
		values = JSON.parse(docCookies.getItem("r5_prefs")) || {};
	}
	catch(err) {
		values = {};
	}

	self.save = function() {
		docCookies.setItem("r5_prefs", JSON.stringify(values), Infinity, "/", cookie_domain);
	};

	self.get = function(name) {
		if (!(name in values)) {
			if (name in meta) {
				return meta[name].legal_values[0];
			}
			return false;
		}
		return values[name];
	};

	self.change = function(name, value, skip_callbacks) {
		if (!(name in meta)) {
			return false;
		}
		if (value === self.get(name)) return;
		var old_value = values[name];
		values[name] = value;
		if (!skip_callbacks) {
			for (var i in callbacks[name]) {
				callbacks[name][i](value, old_value);
			}
		}
		// do this AFTER callbacks in case a callback triggers a JS error
		self.save();
		return true;
	};

	self.define = function(name, legal_values) {
		if (meta[name]) return;
		meta[name] = {};
		meta[name].legal_values = legal_values || [ false, true ];
		if (!(name in values)) {
			values[name] = legal_values ? legal_values[0] : false;
		}
		if (!callbacks[name]) callbacks[name] = [];
	};

	self.add_callback = function(name, method) {
		if (!callbacks[name]) callbacks[name] = [];
		callbacks[name].push(method);
	};

	return self;
}();
