/*global define*/

define([
    'underscore',
    'backbone'
], function (_, Backbone) {
    'use strict';

    var FbFeedModel = Backbone.Model.extend({
		urlRoot: function() {
			// return '/fb';
		},
        defaults: {
        }
    });

    return FbFeedModel;
});