var app = $.sammy(function() {
	// make permissions available
	var ctxPermissions = new $.inheritedPermissions()

	var objectWithPermissionTemplate = {
		hasPermission: function(permission) {
			return ctxPermissions.available(permission)
		},
		updatePermissionContext: function() {
			// use unwrapObservable as we can access the data via knockout-mapping or a simple json result without further mapping
			ctxPermissions.update(ko.utils.unwrapObservable(this.meta.auth.permissions), 
				ko.utils.unwrapObservable(this.meta.auth.kontext), 
				ko.utils.unwrapObservable(this.meta.auth.parent)
			)
		}
	}

	// this handler will be always called by sammy.js before any route is triggered
	this.before(function() {
		$("#ajaxResponseContainer").hide()
	})


	this.get('#/start', function() {
		var self = this;

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
		$.get(appMeta.actions.list_benutzer, function(backendModel) {
			var modelActions = {
				navigateEdit: function() {
					app.navigate(data.meta.actions.entry_benutzer, this)
				}
			}

			var viewModel = $.extend(backendModel, modelActions, objectWithPermissionTemplate)
			viewModel.updatePermissionContext()
			ko.applyBindings(viewModel)
		}, "json")
	});

	this.get("#/benutzer/view_edit", function() {
		$.get(appMeta.actions.self, function(backendModel) {
			var modelActions = {
				save: function() {
					// create reference to current object
					var self = this
					// map current model to JSON model so we can transfer it to backend
					var requestModel = ko.toJSON(this.data)

					app.save(appMeta.actions.self, requestModel, {
						onSuccess: function(updateBackendModel) {
							ko.mapping.fromJS(updateBackendModel, {}, self)
							self.inEditMode(false)
						}
					})
				},

				inEditMode: ko.observable(false),

				edit: function() {
					this.inEditMode(true)
				},
				discard: function() {
				}
			}

			var viewModel = $.extend(ko.mapping.fromJS(backendModel), modelActions, objectWithPermissionTemplate)
			viewModel.updatePermissionContext()
			ko.applyBindings(viewModel, $("#page")[0])
		}, "json")
	});


	this.get("#/autos/list", function() {
	});
});

app.buildRoute = function(route, data) {
	var r = route
	var regex = /\{([^\}]*)\}/g
	var matches = null, routeNameMatch = null

	while(matches = regex.exec(route)) {
		routeNameMatch = /(\W*)(\w*)/.exec(matches[1])
		r = r.replace(matches[0], routeNameMatch[1] + data[routeNameMatch[2]])
	}

	return r
}

app.navigate = function(route, data) {
	var url = this.buildRoute(route, data)
	location.href = url
}

/**
 * Simple routine for saving data. Should be refactored for supporting DELETE HTTP method. 
 * Workflow: exec AJAX call, [wait for backend], handle repsonse, call interceptor, call custom user callback
 */
app.save = function(url, data, options) {
	// create options if not present
	if (typeof options === "undefined") {
		options = {}
	}

	// set default options
	options.onSuccess = options.onSuccess || function() {}
	options.onError = options.onError || function() {}
	options.containerSelector = options.containerSelector || "#ajaxResponseContainer"
	options.container = $(options.containerSelector)
	options.success = options.success || "Element wurde erfolgreich gespeichert"

	// will be called AFTER an error occured
	var errorHandlerInterceptor = function(data, textStatus) {
		var message = ""
		options.container.removeClass("alert-success")
		options.container.addClass("alert-error")
		ko.applyBindings(data, $("#ajaxResponseContainer")[0])

		for (var i = 0, m = data.errors.length; i < m; i++) {
			message = data.errors[i].message
			options.container.find(".error-messages").append("<li>" + message + "</li>")
			$("[error-key='" + data.errors[i].property + "']").append("<span class='alert alert-error error-on-element'>" + message + "</span>")
		}

		options.container.fadeIn()

		// execute user callback
		options.onError(data, textStatus)
	}

	// will be called after any successful request
	var successHandlerInterceptor = function(data) {
		options.container.removeClass("alert-error")
		options.container.addClass("alert-success")
		options.container.find(".success-message").html(options.success)
		options.container.fadeIn()

		// execute user callback
		options.onSuccess(data)
	}

	// will be called after any response from server or timeout or ...
	var handleResponse = function(data, textStatus, jqXHR, nextHandler) {
		// reset UI
		$("#indicator").activity(false);
		options.container.find(".success-message").html("")
		options.container.find(".error-messages").html("")
		$(".error-on-element").remove()

		nextHandler(data, textStatus, jqXHR)
	}

	$("#indicator").activity();

	$.ajax({
		type: "POST",
		url: url,
		data: data,
		dataType: "json",
	})
	.done(function(data, textStatus, jqXHR) {
		nextHandler = successHandlerInterceptor
		if (data["errors"]) {
			nextHandler = errorHandlerInterceptor
		}
		handleResponse(data, textStatus, jqXHR, nextHandler)
	})
	.fail(function(jqXHR, textStatus, errorThrown) {
		handleResponse({ errors: [{ property: "http", "message": "Could not complete request"}] }, textStatus, jqXHR, errorHandlerInterceptor)
	})
}

