/*global define*/

define([
    'underscore',
    'backbone',
    'facebook',
    'models/fb_feed',
], function (_, Backbone, FB, Model) {
    'use strict';

    var FbFeedCollection = Backbone.Collection.extend({
        model: Model,

        initialize: function(){
        },

        url: function() {
            // return  Config.nodeUrl + '/support-tickets';
        },

        parse: function(response){ // manipulate response data
            return response;
        }
    });

    return FbFeedCollection;
});