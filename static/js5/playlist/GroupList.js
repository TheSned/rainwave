var GroupList = function(el) {
	"use strict";
	var self = SearchList(el);
	var loading = false;

	self.load = function() {
		if (!self.loaded && !loading) {
			loading = true;
			API.async_get("all_groups");
		}
	};

	API.add_callback("all_groups", self.update);

	self.draw_entry = function(item) {
		item._el = document.createElement("div");
		item._el.className = "item";
		item._el.textContent = item.name;
	};

	self.update_item_element = function(item) {
		// this has no need
	};

	self.open_id = function(id) {
		Router.change("group", id);
	};

	return self;
};