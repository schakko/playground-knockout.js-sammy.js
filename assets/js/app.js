var app = Sammy(function() {
	var ctxPermissions = new $.inheritedPermissions()

	var objectWithPermissionTemplate = {
		hasPermission: function(permission) {
				console.log(ctxPermissions)
			return ctxPermissions.available(permission)
		},
		updatePermissionContext: function() {
			console.log(this.meta.auth)
			ctxPermissions.update(this.meta.auth.permissions, this.meta.auth.kontext, this.meta.auth.parent)
		}
	}

	this.get('#/start', function() {
		var self = this;

		$("#indicator").activity();
		$.get('start', function(data) {
			self.appMeta = data.meta
		});

		$.get('start', function(data) {
			function MainViewModel(data) {
				var self = this
				self.meta = data.meta

				self.navigate = function(url) {
					console.log(url)
				}
			}

			ko.applyBindings(new MainViewModel(data))
		});

	});

	this.get("#/benutzer/list", function() {
		$("#container").load(appMeta.actions.list_benutzer, function() {
			$.get(appMeta.actions.list_benutzer, function(data) {
				var newData = $.extend(data, objectWithPermissionTemplate)
				newData.updatePermissionContext()

				ko.applyBindings(newData)
			}, "json")
		});
	});


	this.get("#/autos/list", function() {
	});
});
