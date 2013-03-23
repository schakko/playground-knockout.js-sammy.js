/**
 * A small jQuery plug-in for storing a permission hierarchy. Inheritance of permissions is supported, roles are not supported.
 * @author Christopher Klein <ckl[at]neos-it[dot]de>
 * @license BSD license
 */
jQuery.inheritedPermissions = function () {
	var self = this

	// top context is "root"
	self.contextHierarchy = {
		root: {
			permissions: [],
			childs: {},
			parent: null
		}
	}

	self.contexts = {
		"root": self.contextHierarchy.root
	}

	self._currentContext = self.contexts["root"];
	self._currentContextName = "root";

	/**
	 * Checks if the permission in the current context or one of the top contexts are available
	 * @param string|array permission name
	 * @param string optional; context to check, if not defined: current context
	 * @returns true if permission is in context available.
	 */
	self.available = function (permissions, context) {
		var allPerms = self.all(context)
		
		if (!jQuery.isArray(permissions)) {
			permissions = [permissions]
		}
		
		for (var i = 0, m = permissions.length; i < m; i++) {
			if (-1 === jQuery.inArray(permissions[i], allPerms)) {
				return false
			}
		}
		
		return true;
	};

	/**
	 * Returns all permissions
	 * @param string optional; name of context; if not given, current context is chosen
	 * @return array of strings
	 */
	self.all = function (context) {
		var _context = (typeof context === "undefined") ? self.currentContext() : self.get(context)
		
		var perms = []

		do {
			$.merge(perms, _context.permissions)
			_context = _context.parent
		} while (_context !== null)

		return perms
	}

	/**
	 * Updates an existing context or creates a new context
	 * @param string permissions for this context; any existing permissions in this context are revoked
	 * @param string optional name of context to be updated or added
	 * @param string optional parent context name; if the context already exists, this parameter has no effect
	 */
	self.update = function(permissions, contextName, parentContext) {
		var contextName = (typeof contextName === "undefined") ? _currentContextName : contextName

		if (self.exists(contextName)) {
			self.clear(contextName)
			self.grant(permissions, contextName)
		}
		else {
			self.addContext(contextName, permissions, parentContext)
		}

		self.setCurrentContext(contextName)
	}

	/**
	 * Removes every permission from the given context
	 * @param string optional name of context or current context
	 */
	self.clear = function(contextName) {
		var _context = (!contextName) ? self.currentContext() : self.get(contextName)
		_context.permissions = []
	}

	/**
	 * Grants permission
	 * @param string|[array of strings] permission name(s)
	 * @param string optional; name of context to check or optional
	 */
	self.grant = function (permissions, contextName) {
		var _context = (!contextName) ? self.currentContext() : self.get(contextName)
		var _permissions  = permissions

		if (!jQuery.isArray(permissions)) {
			_permissions = [permissions]
		}

		jQuery.merge(_context.permissions, _permissions)
	}

	/**
	 * Revoke permission
	 * @param string|[array of strings] permission name(s)
	 * @param string  optional; name of context which contains the permission; if missing the current context is used
	 */
	self.revoke = function (permissions, contextName) {
		var _context = (!contextName) ? self.currentContext() : self.get(contextName)
		var _permissions = permissions

		if (!jQuery.isArray(permissions)) {
			_permissions = [permissions]
		}

		var _newPerms = jQuery.grep(_context.permissions, function (key) {
			return jQuery.inArray(_permissions, key) !== -1
		});

		_context.permissions = _newPerms
	}

	/**
	 * Returns the given context
	 * @param string name of context
	 * @throws exception, of context name does not exist
	 * @return object
	 */
	self.get = function (contextName) {
		if (!self.exists(contextName)) {
			throw "Context " + contextName + " does not exist"
		}

		return self.contexts[contextName]
	}

	/**
	 * Returns whether the context name exists or not
	 * @param string name of context to check
	 * @return boolean
	 */
	self.exists = function(contextName) {
		return (typeof self.contexts[contextName] !== "undefined")
	}

	/**
	 * Returns the current context
	 * @return object
	 */
	self.currentContext = function () {
		return self._currentContext;
	}

	/**
	 * Removes the given context; if current context is somewhere inside the deleted hierarchy of the context, it will set to the top context
	 * @param string name of context to delete
	 * @throws exception if root context should be removed
	 */
	self.removeContext = function (contextName, parentName /** internal, must be provided for recursive deletion */) {
		if (contextName == "root") {
			throw "Root context can not be removed"
		}

		var _context = self.get(contextName)
		
		// remove all child elements recursively
		for (var _contextName in _context.childs) {
			self.removeContext(_contextName, contextName)
		}

		delete _context.childs[contextName]
		delete self.contexts[contextName]

		// delete parent
		if (_context.parent !== null) {
			delete _context.parent.childs[contextName]
		}
		
		// reset current context
		if (contextName == self._currentContextName) {
			// we have no information about the parent context name
			if ((_context.parent !== null) && (typeof parentName !== "undefined")) {
				self.setCurrentContext(parentName)
			}
			// context was one of the top level beneath root
			else{
				self.setCurrentContext("root")
			}
		}
	}

	/**
	 * Adds a new context to a given context
	 * @param string name of context
	 * @param string|array permission(s) for this context
	 * @param string optional; parent context. If none is specified, this results in more than one root context
	 */
	self.addContext = function (name, permissions, parent) {
		var _parent = null
		
		if (typeof parent !== "undefined") {
			if (!self.contexts[parent]) {
				throw "Parent context " + parent + " does not exist"
			}
			
			_parent = self.get(parent)
		}

		var _permissions = permissions || []
		
		if (!jQuery.isArray(permissions)) {
			_permissions = [permissions];
		}

		self.contexts[name] = {
			permissions: _permissions,
			childs: {},
			parent: _parent
		}
		
		if (_parent !== null) {
			_parent.childs[name] = self.contexts[name]
		}
	}

	/**
	 * Sets the the pointer for the current context
	 * @param string name of context
	 */
	self.setCurrentContext = function (name) {
		var _context = self.get(name)

		self._currentContext = _context
		self._currentContextName = name
	}
	
	return self
};
