/*global define*/

define([
    'jquery',
    'backbone',
    '../views/about',
    '../views/facebook'
], function ($, Backbone, AboutView, FacebookView) {
    'use strict';

    var Router = Backbone.Router.extend({

        aboutView: new AboutView(),
        facebookView: new FacebookView(),

        routes: {
            '' : 'about',
            'facebook' : 'facebook',
			'*actions': 'defaultAction'
        },

        about: function(){
        	this.aboutView.overview();
        },

        facebook: function(){
            this.facebookView.overview();
        },

        defaultAction: function(){
            Backbone.history.navigate('', true);
        }

    });

    return Router;
});