/*
---
name: ART.Widget
description: ART Widget Class
requires: [UI.Widget, Core/Class, Core/Element.Style, Core/Element.Event, ART/ART.Base, Core/Selectors]
provides: ART.Widget
...
*/

(function(){
	
var Widget = ART.Widget = new Class({
	Extends: UI.Widget,
	options: {
		makeCanvas: true,
		className: 'art',
		tabIndex: -1,
		blurOnElementBlur: false,
		onHide: function(){
			document.id(this).setStyle('display', 'none');
		},
		onShow: function(){
			document.id(this).setStyle('display', 'inline-block');
		}
	},

	initialize: function(options){
		this._createElement(options);
		if (this.options.makeCanvas) this.canvas = new ART;
		if (this.canvas) document.id(this.canvas).setStyles({position: 'absolute', top: 0, left: 0}).inject(this.element);
		
		this.currentSheet = {};
		
		this.parent(options);
		
		if (this.options.useFocus !== false) this._setFocusEvents(this.element);

	},
	
	_setFocusEvents: function(element){
		this.inputElement = element;
		this.setTabIndex(this.options.tabIndex);
		
		var self = this;
		
		element.addEvent('focus', function(){
			if (!self.getState('focused')) self.focus();
		});

		if (this.options.blurOnElementBlur) {
			element.addEvent('blur', function(){
				if (self.getState('focused')) self.blur();
			});
		}
	},
	
	_createElement: function(options){
		this.element = (options && options.element) || new Element('div').setStyles({display: 'inline-block', position: 'relative', outline: 'none'});
		this.element.store('widget', this);
	},
	
	setState: function(name, state, nodraw){
		var element = this.element;
		var nameCap = name.capitalize();
		if (element) {
			element.removeClass((this.getState(name) ? 'is' : 'not') + nameCap)
			  .addClass((state ? 'is' : 'not') + nameCap);
		}
		this.parent(name, state);
		if (!nodraw) this.deferDraw();
		return this;
	},
	
	setStyles: function(){
		this.parent.apply(this, arguments);
		this.deferDraw();
		return this;
	},
	
	/* tab indices */
	
	setTabIndex: function(index){
		if (this.inputElement) this.inputElement.tabindex = this.tabIndex = index;
	},
	
	getTabIndex: function(){
		return this.tabIndex;
	},
	
	/* ARTSY Stuff */
	
	resize: function(width, height){
		this.element.setStyles({width: width, height: height});
		if (this.canvas) this.canvas.resize(width, height);
		return this;
	},

	setSheet: function(newSheet) {
		var sheet = $merge(this.diffSheet(), newSheet || {});
		for (var property in sheet) this.currentSheet[property] = sheet[property];
		return sheet;
	},
	
	draw: function(newSheet){
		clearTimeout(this.drawTimer);
		for (var i = 0; i < this._childWidgets.length; i++) this._childWidgets[i].draw();
		return this.setSheet(newSheet);
	},
	
	deferDraw: function(){
		if (this.isDestroyed()) return;
		var self = this;
		clearTimeout(this.drawTimer);
		var args = arguments;
		this.drawTimer = setTimeout(function(){
			self.draw.apply(self, arguments);
		}, 1);
	},
	
	/* ID */
	
	setID: function(id){
		this.parent(id);
		this.element.set('id', id);
		this.deferDraw();
		return this;
	},
	
	/* classNames */
	
	addClass: function(className){
		className.split(' ').each(function(kls){
			this.parent(kls);
			this.element.addClass(kls);
		}, this);
		this.deferDraw();
		return this;
	},
	
	removeClass: function(className){
		this.parent(className);
		this.element.removeClass(className);
		this.deferDraw();
		return this;
	},
	
	setStyles: function(){
		this.parent.apply(this, arguments);
		this.deferDraw();
		return this;
	},
	
	/* states */
	
	_states: {
		hidden: false
	},
	
	enable: function(){
		if (!this.parent()) return false;
		this.setTabIndex(this.oldTabIndex);
		if (this.inputElement) this.inputElement.disabled = false;
		return true;
	},
	
	disable: function(){
		if (!this.parent()) return false;
		this.oldTabIndex = this.tabIndex;
		this.setTabIndex(-1);
		if (this.inputElement) this.inputElement.disabled = true;
		return true;
	},
	
	focus: function(){
		if (!this.parent() || (!this.element.offsetWidth && !this.element.offsetHeight)) return false;
		if (this.inputElement) this.inputElement.focus();
		return true;
	},
	
	blur: function(){
		if (!this.parent()) return false;
		if (this.inputElement) this.inputElement.blur();
		return true;
	},
	
	activate: function(){
		if (!this.parent()) return false;
		return true;
	},
	
	deactivate: function(){
		if (!this.parent()) return false;
		return true;
	},
	
	hide: function(){
		if (!this.getState('hidden')){
			this.setState('hidden', true);
			this.fireEvent('hide');
		}
		return this;
	},

	show: function(){
		if (this.getState('hidden')){
			this.setState('hidden', false);
			this.fireEvent('hide');
		}
		return this;
	},
	
	/* DOM + Registration */
	
	inject: function(widget, element, where){
		element = (element) ? document.id(element) : document.id(widget);

		if (element && this.element.parentNode !== element){
			this.element.inject(element, where);
			this.register(widget);
			if (this._disabledByParent) this.enable();
		}

		return this;
	},

	register: function(widget) {
		this.parent(widget);
		this.deferDraw();
	},
	
	eject: function(){
		if (this.element.parentNode){ // continue only if the element is in the dom
			this.element.dispose();
			this.unregister();
			if (!this.getState('disabled')){
				this._disabledByParent = true;
				this.disable();
			}
			// even though deferDraw will not fire when the element is not in the dom, this will cancel any pre-existing draw request.
			clearTimeout(this.drawTimer);
		}
		return this;
	},
	
	/* $ */
	
	toElement: function(){
		return this.element;
	}
	
});

Element.Properties.widget = {

	get: function(){
		return this.retrieve('widget');
	}

};

Element.Properties.parentWidget = {

	get: function(){
		var parentWidget;
		var widget = this.get('widget');
		if (widget) parentWidget = widget.parentWidget;
		if (!parentWidget) {
			var parent = this.getParent(':widget');
			if (parent) parentWidget = parent.get('widget');
		}
		return parentWidget;
	}

};


	
})();

//Checking if this.get is present for IE traversals of element trees.
//If an element hasn't been touched by Mootools, this.get doesn't exist.
//Ergo, the element doesn't have a widget assigned to it.
Selectors.Pseudo.widget = function() {
	return this.get ? !! this.get("widget")  : false;
};
