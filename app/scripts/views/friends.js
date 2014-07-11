/*global define*/

define([
    'jquery',
    'underscore',
    'backbone',
    'facebook',
    '../collections/fb_feeds',
    '../models/fb_feed',
    'text!../templates/friends/friends.html',
    'text!../templates/friends/friends_item.html',
    'text!../api/db_sarah_20140514_ALLES.json'
], function ($, _, Backbone, FB, Collection, Model, FriendsTemplate, FriendsItemTemplate, MockData) {
    'use strict';

    var AppView = Backbone.View.extend({
		el: 'body',
		appContent: $('#app-content'),
		collection: {},
		facebookData: '',

		// -------------------------------
		// delegate events
		// -------------------------------
		events: {
			// 'click #facebook-login' : 'loginFacebook'
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

			// render map wrapper
			this.render(that.appContent, _.template(FriendsTemplate));
			// hide loader & map navigation
			$(this.el).find('#loader-wrapper').hide();
			$(this.el).find('#map-navigation').hide();
			
			// facebook data
			console.log(this.facebookData);

		}

    });

    return AppView;
});
