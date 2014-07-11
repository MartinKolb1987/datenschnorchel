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

        initLoad: false,
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
            this.initLoad = true;
        },

		friends: function(){
            if(this.initLoad){
                this.friendsView.facebookData = this.facebookView.facebookData;
                this.friendsView.overview();
            } else {
                Backbone.history.navigate('facebook', true);
            }
        },

        defaultAction: function(){
            Backbone.history.navigate('', true);
        }

    });

    return Router;
});