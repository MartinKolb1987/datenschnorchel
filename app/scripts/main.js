/*global require*/
'use strict';

require.config({
    shim: {
        underscore: {
            exports: '_'
        },
        backbone: {
            deps: [
                'underscore',
                'jquery'
            ],
            exports: 'Backbone'
        },
        bootstrap: {
            deps: ['jquery'],
            exports: 'jquery'
        },
        facebook : {
            exports: 'FB'
        }
    },
    paths: {
        jquery: '../bower_components/jquery/jquery',
        backbone: '../bower_components/backbone/backbone',
        underscore: '../bower_components/underscore/underscore',
        text: '../bower_components/requirejs-text/text',
        bootstrap: 'vendor/bootstrap',
        facebook: '//connect.facebook.net/en_US/all',
        async: '../bower_components/requirejs-plugins/src/async'
    }
});

require([
    'routers/router',
    'jquery',
    'backbone'
], function (Router, $, Backbone) {
    // ajax settings (sent cors cookies)
    $.ajaxSetup({ xhrFields: { withCredentials: true }, dataType: 'json'});
    new Router();
    Backbone.history.start();
});
