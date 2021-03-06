var Menu = function() {
	var self = {};
	var template;
	var has_calendar;

	// BOOTSTRAP.station_list = {
	// 	1: { "id": 1, "name": "Game", "url": "hello" },
	// 	2: { "id": 2, "name": "OC ReMix", "url": "hello" },
	// 	3: { "id": 3, "name": "Covers", "url": "hello" },
	// 	4: { "id": 4, "name": "Chiptune", "url": "hello" },
	// 	5: { "id": 5, "name": "All", "url": "hello" }
	// };

	// Station order on the page is to be ordered like this, not by numeric sorting:
	var station_order = [ 5, 1, 4, 2, 3 ];
	var stations = [];
	for (var i = 0; i < station_order.length; i++) {
		if (BOOTSTRAP.station_list[station_order[i]]){
			stations.push(BOOTSTRAP.station_list[station_order[i]]);
			if (stations[stations.length - 1].id == BOOTSTRAP.user.sid) {
				stations[stations.length - 1].url = null;
			}
		}
	}
	self.stations = stations;

	// Make sure the /beta site links to itself
	if (window.location.href.indexOf("beta") !== -1) {
		for (i = 0; i < stations.length; i++) {
			if (stations[i].url) stations[i].url += "/beta";
		}
	}

	BOOTSTRAP.on_init.push(function(root_template) {
		//API.add_callback("user", update_tuned_in_status);
		//R4Audio.changed_status_callback = update_tuned_in_status_from_player;
		template = root_template;

		// must be done in JS, if you try to do it in the template you still get a clickable <a>
		for (var i = 0; i < stations.length; i++) {
			if (stations[i].url) {
				stations[i].$t.menu_link.setAttribute("href", stations[i].url);
			}
			else {
				stations[i].$t.menu_link.classList.add("selected_station");
				if (stations.length > 1) {
					template.station_select_header.addEventListener("click", toggle_station_select);
					template.station_select.classList.add("openable");
					stations[i].$t.menu_link.addEventListener("mousedown", open_station_select);
					stations[i].$t.menu_link.addEventListener("touchstart", open_station_select);
				}
			}
		}

		if (template.settings_link) {
			template.settings_link.addEventListener("click", SettingsWindow);
		}

		template.playlist_link.addEventListener("click", function() {
			if (document.body.classList.contains("playlist")) {
				Router.change();
			}
			else {
				Router.open_last();
			}
		});
	});

	BOOTSTRAP.on_draw.push(function() {
		var jstz_load = document.createElement("script");
		jstz_load.src = "//cdnjs.cloudflare.com/ajax/libs/jstimezonedetect/1.0.4/jstz.min.js";
		jstz_load.addEventListener("load", function() {
			template.calendar_menu_item.addEventListener("click", calendar_toggle);
			template.calendar_menu_item.addEventListener("mouseleave", calendar_hide);
		});
		document.body.appendChild(jstz_load);
	});

	// self.show_modal = function(modal_div) {
	// 	if (current_modal) return;

	// 	modal_div.style.display = "block";
	// 	modal_div.offsetWidth; // force redraw so transitions can happen

	// 	$add_class(modal_div, "active_modal");
	// 	$add_class(document.body, "modal_is_active");

	// 	var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
	// 	for (var i = 0; i < kmw.length; i++) {
	// 		$id(kmw[i]).addEventListener('click', self.remove_modal, true);
	// 	}

	// 	current_modal = modal_div;
	// };

	// self.remove_modal = function(e) {
	// 	if (e) {
	// 		e.stopPropagation();
	// 		e.preventDefault();
	// 	}

	// 	Fx.chain_transition(current_modal, function() {
	// 		current_modal.style.display = "none";
	// 		current_modal = null;
	// 	});

	// 	$remove_class(current_modal, "active_modal");
	// 	$remove_class(document.body, "modal_is_active");

	// 	var kmw = [ 'top_menu_wrapper', 'sizable_body', 'messages' ];
	// 	for (var i = 0; i < kmw.length; i++) {
	// 		$id(kmw[i]).removeEventListener('click', self.remove_modal, true);
	// 	}
	// };

	var calendar_toggle = function(e) {
		if (!has_calendar) {
			var tz_param;
			if (jstz) {
				tz_param = "&ctz=" + jstz.determine().name();
			}
			var iframe = document.createElement("iframe");
			iframe.setAttribute("src", "https://www.google.com/calendar/embed?showTitle=0&showNav=0&showDate=0&showPrint=0&showCalendars=0&mode=AGENDA&height=500&wkst=1&bgcolor=%23ffffff&src=rainwave.cc_9anf0lu3gsjmgb6k3fcoao894o@group.calendar.google.com&color=%232952A3" + tz_param);
			iframe.setAttribute("frameborder", 0);
			template.calendar_dropdown.appendChild(iframe);
			has_calendar = true;
		}
		if (template.calendar_dropdown.classList.contains("show_calendar")) {
			calendar_hide();
		}
		else {
			template.calendar_dropdown.classList.add("show_calendar");
		}
	};

	var calendar_hide = function(e) {
		template.calendar_dropdown.classList.remove("show_calendar");
	};

	var toggle_station_select = function(e) {
		if (template.station_select.classList.contains("open")) {
			close_station_select(e);
		}
		else {
			open_station_select(e);
		}
	};

	var open_station_select = function(e) {
		if (!template.station_select.classList.contains("open")) {
			template.station_select.classList.add("open");
			template.station_select.classList.remove("closed");
			template.station_select_header.addEventListener("click", close_station_select);
			template.header.addEventListener("mouseleave", close_station_select);
			e.stopPropagation();
		}
	};

	var close_station_select = function(e) {
		if (template.station_select.classList.contains("open")) {
			template.station_select.classList.remove("open");
			template.station_select.classList.add("closed");
			template.station_select_header.removeEventListener("click", close_station_select);
			template.header.removeEventListener("mouseleave", close_station_select);
			e.stopPropagation();
		}
	};

	// var update_station_info = function(json) {
	// 	var do_event_alert, event_desc, event_sid;
	// 	for (var key in json) {
	// 		if (json[key] && elements.stations[key]) {
	// 			if (!event_alert && json[key].event_name && (key != User.sid)) {
	// 				event_sid = key;
	// 				$add_class(elements.stations[key], "event_ongoing");

	// 				elements.stations[key]._desc.textContent = $l("special_event_on_now");
	// 				event_desc = Formatting.event_name(json[key].event_type, json[key].event_name);
	// 				elements.stations[key]._desc.textContent += event_desc;

	// 				if (event_alerts_closed.indexOf(json[key].event_name) == -1) {
	// 					do_event_alert = json[key];
	// 				}
	// 			}
	// 			else if (!json[key].event_name) {
	// 				remove_event_alert();
	// 				$remove_class(elements.stations[key], "event_ongoing");
	// 				elements.stations[key]._desc.textContent = $l("station_menu_description_id_" + key);
	// 			}

	// 			if (songs[key]) {
	// 				songs[key].el.parentNode.removeChild(songs[key].el);
	// 			}
	// 			json[key].albums = [ { "art": json[key].art, "name": json[key].album } ];
	// 			songs[key] = TimelineSong.create(json[key]);
	// 			elements.stations[key]._np_info.appendChild(songs[key].el);
	// 		}
	// 	}

	// 	if (do_event_alert) {
	// 		if (event_alert) {
	// 			remove_event_alert();
	// 		}
	// 		event_alert = $el("div", { "class": "event_ongoing_alert" });
	// 		event_alert.appendChild($el("div", { "textContent": $l("special_event_alert", { "station": $l("station_name_" + event_sid) }) }));
	// 		event_alert.appendChild($el("div", { "textContent": event_desc }));
	// 		$id("station_select_container").parentNode.insertBefore(event_alert, $id("station_select_container").nextSibling);
	// 	}
	// };

	// var audio_playing;
	// var update_tuned_in_status_from_player = function(playing) {
	// 	audio_playing = playing;
	// 	update_tuned_in_status(User);
	// };

	// var update_tuned_in_status = function(user_json) {
	// 	if (user_json.tuned_in) {
	// 		$add_class($id("top_menu"), "external_tuned_in");
	// 	}
	// 	else {
	// 		$remove_class($id("top_menu"), "external_tuned_in");
	// 	}
	// };

	return self;
}();
