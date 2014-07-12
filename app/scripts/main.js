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
    // start in landscape
    var orientation = 'landscape';
    var circleRadius = windowHeight * 0.475;
    
    // check device orientation
    if (windowWidth < windowHeight) {
        // change stuff if portrait mode
        orientation = 'portrait';
        circleRadius = windowWidth * 0.475;
    }
    console.log('screen orientation: '+orientation);

	// logo min-width offset
    var logoSize = windowHeight * 0.16;
    if (logoSize < 100) {
        logoSize = 100;
    }
    
    // buttonSize min-width offset
    var buttonSize = windowHeight * 0.08;
    if (buttonSize < 50) {
        buttonSize = 50;
    }
    
    // center circle in portrait and set button degrees
	var startLeftLogo;
	var startTopLogo;
    var startLeft;
    var startRight;
    var startTop;
    var startBottom;
	var degLogo;
    var degZoomPlus;
    var degZoomMinus;
    var degFbLogin;
    var degTwitterLogin;
    var degFriendsMap;
    var degHelp;
    if (orientation == 'portrait') {
        $('#app-content').css('padding-top', ((windowHeight/2) - circleRadius)+'px');
		startLeftLogo = ((windowWidth / 2) - logoSize);
		startTopLogo = (windowHeight/2) - logoSize;
        startLeft = ((windowWidth / 2) - buttonSize);
        startRight = (windowWidth / 2);
        startTop = (windowHeight/2) - buttonSize;
        startBottom = (windowHeight/2);
		degLogo = 115;
        degZoomPlus = 225;
        degZoomMinus = 240;
        degFbLogin = 90;
        // degTwitterLogin = 75;
        degFriendsMap = 60;
        degHelp = 40;
    } else {
        $('#app-content').css('padding-top', '2.5vh');
		startLeftLogo = ((windowWidth / 2) - logoSize);
		startTopLogo = (windowHeight * 0.025) + circleRadius - logoSize;
        startLeft = ((windowWidth / 2) - buttonSize);
        startRight = (windowWidth / 2);
        startTop = (windowHeight * 0.025) + circleRadius - buttonSize;
        startBottom = (windowHeight * 0.025) + circleRadius;
		degLogo = 140;
        degZoomPlus = 200;
        degZoomMinus = 212;
        degFbLogin = 55;
        degFriendsMap = 43;
        // degTwitterLogin = 43;
        degHelp = 22;
    }
    
    // set all buttons to correct position
    // y = sin(a) * r
    // x = cos(a) * r

    $('#logo').css('top', (startTopLogo + ((Math.sin(degLogo * Math.PI / 180) * circleRadius) * -1)));
    $('#logo').css('left', (startLeftLogo - ((Math.cos(degLogo * Math.PI / 180) * circleRadius) * -1)));

    $('#button-zoom-plus').css('top', (startBottom + ((Math.sin(degZoomPlus * Math.PI / 180) * circleRadius) * -1)));
    $('#button-zoom-plus').css('left', (startLeft - ((Math.cos(degZoomPlus * Math.PI / 180) * circleRadius) * -1)));

    $('#button-zoom-minus').css('top', (startBottom + ((Math.sin(degZoomMinus * Math.PI / 180) * circleRadius) * -1)));
    $('#button-zoom-minus').css('left', (startLeft - ((Math.cos(degZoomMinus * Math.PI / 180) * circleRadius) * -1)));

    $('#button-fb-login').css('top', (startTop + ((Math.sin(degFbLogin * Math.PI / 180) * circleRadius) * -1)));
    $('#button-fb-login').css('left', (startRight - ((Math.cos(degFbLogin * Math.PI / 180) * circleRadius) * -1)));
    
    // $('#button-twitter-login').css('top', (startTop + ((Math.sin(degTwitterLogin * Math.PI / 180) * circleRadius) * -1)));
    // $('#button-twitter-login').css('left', (startRight - ((Math.cos(degTwitterLogin * Math.PI / 180) * circleRadius) * -1)));

    $('#button-friends').css('top', (startTop + ((Math.sin(degFriendsMap * Math.PI / 180) * circleRadius) * -1)));
    $('#button-friends').css('left', (startRight - ((Math.cos(degFriendsMap * Math.PI / 180) * circleRadius) * -1)));
    
    $('#button-map').css('top', (startTop + ((Math.sin(degFriendsMap * Math.PI / 180) * circleRadius) * -1)));
    $('#button-map').css('left', (startRight - ((Math.cos(degFriendsMap * Math.PI / 180) * circleRadius) * -1)));
    
    $('#button-help').css('top', (startTop + ((Math.sin(degHelp * Math.PI / 180) * circleRadius) * -1)));
    $('#button-help').css('left', (startRight - ((Math.cos(degHelp * Math.PI / 180) * circleRadius) * -1)));
}
