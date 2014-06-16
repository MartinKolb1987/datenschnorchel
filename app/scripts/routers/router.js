/*global define*/

define([
    'jquery',
    'backbone',
    '../views/about',
    '../views/facebook',
	'../views/friends'
], function ($, Backbone, AboutView, FacebookView, FriendsView) {
    'use strict';

    var Router = Backbone.Router.extend({

        aboutView: new AboutView(),
        facebookView: new FacebookView(),
		friendsView: new FriendsView(),

        routes: {
            '' : 'about',
            'facebook' : 'facebook',
			'friends' : 'friends',
			'*actions': 'defaultAction'
        },

        about: function(){
        	this.aboutView.overview();
        },

        facebook: function(){
            this.facebookView.overview();
        },

		friends: function(){
            this.friendsView.overview();
        },

        defaultAction: function(){
            Backbone.history.navigate('', true);
        }

    });

    return Router;
});