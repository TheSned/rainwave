var Audio = function() {
	"use strict";

	var self = {};
	self.supported = false;
	self.type = null;
	self.changed_status_callback = null;
	var filetype;
	var stream_urls = [];
	var playing_status = false;

	var el;
	var volume_el;
	var volume_rect;
	var mute_el;
	var muted;
	var offset_width;
	var last_user_tunein_check = 0;

	var audio_el = document.createElement("audio");
	if ("canPlayType" in audio_el) {
		// circumvent Ogg here since it'll be far more battery draining than MP3 for mobile devices
		var can_vorbis = MOBILE ? false : audio_el.canPlayType("audio/ogg; codecs=\"vorbis\"");
		var can_mp3 = audio_el.canPlayType("audio/mpeg; codecs=\"mp3\"");
		// we have to check for Mozilla support specifically
		// because Webkit will choke on Vorbis and stop playing after
		// a single song switch, and thus, we have to forcefeed it MP3.
		if ((navigator.mozIsLocallyAvailable || navigator.mozApps || navigator.mozContacts) && ((can_vorbis == "maybe") || (can_vorbis == "probably"))) {
			filetype = "audio/ogg";
			self.type = "Vorbis";
			self.supported = true;
		}
		else if ((can_mp3 == "maybe") || (can_mp3 == "probably")) {
			filetype = "audio/mpeg";
			self.type = "MP3";
			self.supported = true;
		}
	}
	audio_el = null;

	BOOTSTRAP.on_init.push(function(root_template) {
		if (!self.supported) return;

		root_template.volume = document.getElementById("audio_volume");
		root_template.volume_indicator = document.getElementById("audio_volume_indicator");
		root_template.volume.style.display = null;
		root_template.mute.parentNode.appendChild(root_template.volume);

		root_template.volume.addEventListener("mousedown", volume_control_mousedown);
		root_template.mute.addEventListener("click", self.toggle_mute);
		root_template.play.addEventListener("click", self.play_stop);
		root_template.play2.addEventListener("click", self.play);
		root_template.stop.addEventListener("click", self.stop);

		el = root_template.player;
		volume_el = root_template.volume;
		volume_rect = root_template.volume_indicator;
		mute_el = root_template.mute;

		var stream_filename = BOOTSTRAP.stream_filename;
		if (self.type == "Vorbis") stream_filename += ".ogg";
		else if (self.type == "MP3") stream_filename += ".mp3";
		if (User && User.listen_key) {
			stream_filename += "?" + User.id + ":" + User.listen_key;
		}
		for (var i in BOOTSTRAP.relays) {
			stream_urls.push(BOOTSTRAP.relays[i].protocol + BOOTSTRAP.relays[i].hostname + ":" + BOOTSTRAP.relays[i].port + "/" + stream_filename);
		}

		API.add_callback("user", user_tunein_check);

		Prefs.define("audio_volume", [ 1.0 ]);
		draw_volume(Prefs.get("audio_volume"));
	});

	var user_tunein_check = function(json) {
		if (json.tuned_in) {
			document.body.classList.add("tuned_in");
		}
		else {
			document.body.classList.remove("tuned_in");
		}
		if (!playing_status) return;
		if (last_user_tunein_check < (Clock.now - 300)) {
			last_user_tunein_check = parseInt(Clock.now);
			if (!json.tuned_in) {
				ErrorHandler.remove_permanent_error("audio_connect_error_reattempting");
				self.stop();
				self.play();
			}
		}

		if (json.tuned_in) {
			ErrorHandler.remove_permanent_error("m3u_hijack_right_click");
		}
	};

	self.clear_audio_errors = function(e) {
		if (!ErrorHandler) return;
		ErrorHandler.remove_permanent_error("audio_error");
		ErrorHandler.remove_permanent_error("audio_connect_error");
	};

	self.play_stop = function(evt) {
		if (audio_el) self.stop(evt);
		else self.play(evt);
	};

	self.play = function(evt) {
		if (evt) {
			evt.preventDefault();
		}

		if (!self.supported) {
			if (!self.detect_hijack() || !ErrorHandler) return;
			ErrorHandler.permanent_error(ErrorHandler.make_error(400, "m3u_hijack_right_click"));
			return;
		}

		if (!audio_el) {
			audio_el = document.createElement("audio");
			audio_el.addEventListener("stop", self.stop);
			audio_el.addEventListener("play", self.on_play);
			audio_el.addEventListener("stall", self.on_stall);
			// doesn't work with streams
			// audio_el.addEventListener("loadstart", self.on_connecting);
			// volumechange doesn't work yet on most browsers
			// if (volume_el) {
			// 	audio_el.addEventListener("volumechange", draw_volume);
			// }

			if (!Prefs.get("audio_volume") || (Prefs.get("audio_volume") > 1) || (Prefs.get("audio_volume") < 0)) {
				Prefs.change("audio_volume", 1.0);
			}
			audio_el.volume = Prefs.get("audio_volume");
			draw_volume(Prefs.get("audio_volume"));

			var source;
			for (var i in stream_urls) {
				source = document.createElement("source");
				source.setAttribute("src", stream_urls[i]);
				source.setAttribute("type", filetype);
				source.addEventListener("playing", self.clear_audio_errors);
				audio_el.appendChild(source);
			}
			// TODO: add these for each source so we can say 'hey we're trying'?
			audio_el.lastChild.addEventListener("error", self.on_error);
		}

		if (!playing_status) {
			audio_el.play();
			playing_status = true;
			if (self.changed_status_callback) self.changed_status_callback(playing_status);
		}
	};

	self.stop = function(evt) {
		if (!self.supported) return;
		if (evt) evt.preventDefault();

		el.classList.remove("playing");
		playing_status = false;

		if (!audio_el) return;

		audio_el.pause(0);
		while (audio_el.firstChild) audio_el.removeChild(audio_el.firstChild);
		audio_el.src = "";
		audio_el.load();
		audio_el = null;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.toggle_mute = function() {
		if (muted) {
			el.classList.remove("muted");
			muted = false;
			if (audio_el) {
				audio_el.volume = Prefs.get("audio_volume") || 0.5;
			}
			draw_volume(Prefs.get("audio_volume") || 0.5);
		}
		else {
			el.classList.add("muted");
			muted = true;
			if (audio_el) {
				audio_el.volume = 0;
			}
			draw_volume(0);
		}
	};

	// self.on_connecting = function() {
	// 	// doesn't work anyway
	// };

	self.on_play = function() {
		el.classList.add("playing");
		self.clear_audio_errors();
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.on_stall = function() {
		el.classList.remove("playing");
		if (!ErrorHandler) return;
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.stop();
			self.clear_audio_errors();
		});
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_connect_error", 500), a);
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	self.on_error = function() {
		el.classList.remove("playing");
		if (!ErrorHandler) return;
		var a = $el("a", { "href": "/tune_in/" + User.sid + ".mp3", "textContent": $l("try_external_player") });
		a.addEventListener("click", function() {
			self.clear_audio_errors();
		});
		ErrorHandler.permanent_error(ErrorHandler.make_error("audio_error", 500), a);
		self.stop();
		self.supported = false;
		if (self.changed_status_callback) self.changed_status_callback(playing_status);
	};

	var volume_control_mousedown = function(evt) {
		if (evt.button !== 0) return;
		offset_width = parseInt(window.getComputedStyle(volume_el, null).getPropertyValue("width"));
		change_volume_from_mouse(evt);
		volume_el.addEventListener("mousemove", change_volume_from_mouse);
		document.addEventListener("mouseup", volume_control_mouseup);
	};

	var volume_control_mouseup = function(evt) {
		volume_el.removeEventListener("mousemove", change_volume_from_mouse);
		document.removeEventListener("mouseup", volume_control_mouseup);
	};

	var change_volume_from_mouse = function(evt) {
		var x = evt.layerX !== undefined ? evt.layerX : evt.offsetX;
		var v = Math.min(Math.max((x / offset_width), 0), 1);
		if (v < 0.05) v = 0;
		if (v > 0.95) v = 1;
		if (!v || isNaN(v)) v = 0;
		if (audio_el) {
			audio_el.volume = v;
		}
		draw_volume(v);
		if (v === 0) {
			if (!el.classList.contains("muted")) {
				el.classList.add("muted");
			}
			muted = true;
		}
		else if (el.classList.contains("muted")) {
			el.classList.remove("muted");
			muted = false;
		}
		else {
			muted = false;
		}
		if (Prefs) Prefs.change("audio_volume", v);
	};

	var draw_volume = function(v) {
		volume_rect.setAttribute("width", 100 * v);
	};

	self.detect_hijack = function() {
		if (navigator.plugins && (navigator.plugins.length > 0)) {
			for (var i = 0; i < navigator.plugins.length; i++ ) {
				if (navigator.plugins[i]) {
					for (var j = 0; j < navigator.plugins[i].length; j++) {
						if (navigator.plugins[i][j].type) {
							if (navigator.plugins[i][j].type == "audio/x-mpegurl") return navigator.plugins[i][j].enabledPlugin.name;
						}
					}
				}
			}
		}
		return false;
	};

	return self;
}();