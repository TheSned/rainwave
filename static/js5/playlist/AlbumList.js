var AlbumList = function(el) {
	"use strict";
	var self = SearchList(el);

	var loading = false;
	Prefs.define("faves_first");
	var sort_faves_first = Prefs.get("faves_first");
	Prefs.define("cool_last", [ true, false ]);
	var sort_available_first = Prefs.get("cool_last");

	var prefs_update = function(unused_arg, unused_arg2, no_redraw) {
		sort_faves_first = Prefs.get("faves_first");
		sort_available_first = Prefs.get("cool_last");

		var nv = Prefs.get("playlist_sort");
		if ([ "alpha", "rating_user" ].indexOf(nv) == -1) {
			Prefs.change("sort", "alpha");
		}
		if (nv == "rating_user") self.sort_function = self.sort_by_rating_user;
		else self.sort_function = self.sort_by_alpha;

		if (!no_redraw) {
			self.update_view([]);
			self.redraw_current_position();
		}
	};
	Prefs.add_callback("playlist_sort", prefs_update, [ "alpha", "rating_user" ]);
	Prefs.add_callback("faves_first", prefs_update);
	Prefs.add_callback("cool_last", prefs_update);

	API.add_callback("all_albums", self.update);
	API.add_callback("album_diff", function(json) { if (self.loaded) self.update(json); });

	self.load = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("all_albums");
		}
	};

	var update_rating = function(json) {
		var album_id;
		for (var i = 0; i < json.length; i++) {
			album_id = json[i].id;
			if (album_id in self.data) {
				if (json[i].rating) self.data[album_id].rating = json[i].rating;
				if (json[i].rating_user) self.data[album_id].rating_user = json[i].rating_user;
				if (json[i].rating_complete !== null) self.data[album_id].rating_complete = json[i].rating_complete;
				self.update_item_element(self.data[album_id]);
			}
		}
	};
	Rating.album_callback = update_rating;

	var update_fave = function(json) {
		if (json.id in self.data) {
			self.data[json.id].fave = json.fave;
			self.update_item_element(self.data[json.id]);
		}
	};
	Fave.album_callback = update_fave;

	self.open_id = function(id) {
		Router.change("album", id);
	};

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el._id = item.id;

		// could do this using RWTemplates.fave but... speed.  want to inline here as much as possible.
		item._el_fave = document.createElement("div");
		item._el_fave.className = "fave";
		item._el.appendChild(item._el_fave);
		var fave_lined = document.createElement("img");
		fave_lined.className = "fave_lined";
		fave_lined.src = "/static/images4/heart_lined.png";
		item._el_fave.appendChild(fave_lined);
		var fave_solid = document.createElement("img");
		fave_solid.className = "fave_solid";
		fave_solid.src = "/static/images4/heart_solid_gold.png";
		item._el_fave.appendChild(fave_solid);
		item._el_fave._fave_id = item.id;
		item._el_fave.addEventListener("click", Fave.do_fave);

		var span = document.createElement("span");
		span.className = "name";
		span.textContent = item.name;
		item._el.appendChild(span);
		
		self.update_cool(item);
		self.update_item_element(item);
	};

	self.update_cool = function(item) {
		if (item.cool && (item.cool_lowest > Clock.now)) {
			item._el.classList.add("cool");
		}
		else {
			item._el.classList.remove("cool");
		}
	};

	self.update_item_element = function(item) {
		if (item.fave) {
			item._el.classList.add("album_fave_highlight");
			item._el_fave.classList.add("is_fave");
		}
		else {
			item._el.classList.remove("album_fave_highlight");
			item._el_fave.classList.remove("is_fave");
		}

		if (item.rating_complete) {
			item._el.classList.add("rating_incomplete");
		}
		else {
			item._el.classList.remove("rating_incomplete");
		}

		if (item.rating_user) {
			item._el.classList.add("rating_user");
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round(item.rating_user * 10) / 2)) * 30) + 6) + "px";
		}
		else {
			item._el.classList.remove("rating_user");
			item._el.style.backgroundPosition = "right " + (-(Math.round((Math.round((item.rating || 0) * 10) / 2)) * 30) + 6) + "px";
		}
	};

	self.sort_by_alpha = function(a, b) {
		if (sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a].name_searchable < self.data[b].name_searchable) return -1;
		else if (self.data[a].name_searchable > self.data[b].name_searchable) return 1;
		return 0;
	};

	self.sort_by_rating_user = function(a, b) {
		if (sort_faves_first && (self.data[a].fave !== self.data[b].fave)) {
			if (self.data[a].fave) return -1;
			else return 1;
		}

		if (sort_available_first && (self.data[a].cool !== self.data[b].cool)) {
			if (self.data[a].cool === false) return -1;
			else return 1;
		}

		if (self.data[a].rating_user < self.data[b].rating_user) return 1;
		if (self.data[a].rating_user > self.data[b].rating_user) return -1;

		if (self.data[a].name_searchable < self.data[b].name_searchable) return -1;
		else if (self.data[a].name_searchable > self.data[b].name_searchable) return 1;
		return 0;
	};

	prefs_update(null, null, true);

	return self;
};