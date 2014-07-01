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
        markercluster: 'vendor/markercluster'
    }
});

require([
    'routers/router',
    'jquery',
    'backbone',
    'bootstrap'
], function (Router, $, Backbone) {
    // ajax settings (sent cors cookies)
    $.ajaxSetup({ xhrFields: { withCredentials: true }, dataType: 'json'});
    new Router();
    Backbone.history.start();
    window.onresize = function(event) {
		setItems();
	}
    setItems();
});

function setItems() {
    console.log('set navigation');
    var windowHeight = $(window).height();
	var windowWidth = $(window).width();
    var orientation = 'landscape';
    var circleSize = windowHeight * 0.475;
    
    // check device orientation
    if (windowWidth < windowHeight) {
        orientation = 'portrait';
        circleSize = windowWidth * 0.475;
    }
    
    // buttonSize min-width offset
    var buttonSize = windowHeight * 0.08;
    if (buttonSize < 50) {
        buttonSize = 50;
    }
    
    // calculate icon startpoint: screen center - circleSize
    var startPoint = (windowWidth / 2) - circleSize - buttonSize;
    
    // set all buttons to correct position
    $('#button-zoom-plus').css('left', (startPoint + (circleSize * 0.08)));
    $('#button-zoom-minus').css('left', (startPoint + (circleSize * 0.15)));
    $('#button-fb-login').css('right', (startPoint + (circleSize * 0.45)));
    $('#button-twitter-login').css('right', (startPoint + (circleSize * 0.28)));
    $('#button-friends').css('right', (startPoint + (circleSize * 0.15)));
    $('#button-map').css('right', (startPoint + (circleSize * 0.15)));
    $('#button-help').css('right', startPoint);
    
    // center circle in portrait
    if (orientation == 'portrait') {
        $('#app-content').css('padding-top', ((windowHeight/2) - circleSize)+'px');
    } else {
        $('#app-content').css('padding-top', '2.5vh');
    }
}