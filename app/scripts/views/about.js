/*global define*/

define([
    'jquery',
    'underscore',
    'backbone',
    'text!../templates/about.html'
], function ($, _, Backbone, AboutTemplate) {
    'use strict';

    var AppView = Backbone.View.extend({
		el: 'body',
		appContent: $('#app-content'),

		// -------------------------------
		// delegate events
		// -------------------------------
		events: {
			// 'click' : 'foobar'
		},

		// -------------------------------
		// init & render
		// -------------------------------
		initialize: function() {
		},

		render: function(target, value){
			$(target).html(value);
		},

		// -------------------------------
		// actions
		// -------------------------------

		overview: function(){
			var that = this;
			this.render(that.appContent, _.template(AboutTemplate, {name: 'creepy crawler'}));
		},


    });

    return AppView;
});