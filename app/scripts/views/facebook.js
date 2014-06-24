/*global define*/

define([
    'jquery',
    'underscore',
    'backbone',
    'facebook',
    'markercluster',
    '../collections/fb_feeds',
    '../models/fb_feed',
    'text!../templates/map/google_map.html',
    'text!../templates/facebook/facebook_item.html',
    'text!../api/db_sarah_20140514_ALLES.json'
], function ($, _, Backbone, FB, Markercluster, Collection, Model, MapTemplate, FacebookItemTemplate, MockData) {
    'use strict';

    var AppView = Backbone.View.extend({
        el: 'body',
        appContent: $('#app-content'),
        collection: {},
        facebookData: [],
        facebookDataParsed: [],
        facebookDataSorted: [],
        minimumNumberOfSameEntries: 2, // -1 = never mind
        map: '',
        infowindow: '',
        changedZoomLevel: 0,

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
            this.render(that.appContent, _.template(MapTemplate));

            // init map
            this.initMap();

            // init facebook & show login if needed
            this.initFacebook();
            this.loginFacebook();
            // this.facebookData = '';
            // this.facebookDataSorted = '';
            // this.facebookData = $.parseJSON(MockData);
            // this.parseData();

        },

        // -------------------------------
        // init 
        // -------------------------------
        initMap: function(){
            var mapCanvas = document.getElementById('map-canvas');
            var mapOptions = {
                zoom: 9,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                disableDefaultUI: true,
            };
            this.map = new google.maps.Map(mapCanvas, mapOptions);

            // https://developers.google.com/maps/documentation/javascript/styling#style_array_example
            this.map.set('styles', [
                {
                    featureType: 'all',
                    elementType: 'all',
                    stylers: [{
                        saturation: -100
                    }]
                }
            ]);

        },

        initFacebook: function(){
            FB.init({
                appId      : '485128734947315',
                status     : true, // check login status
                cookie     : true, // enable cookies to allow the server to access the session
                xfbml      : true  // parse XFBML
            });
        },


        // -------------------------------
        // login 
        // -------------------------------
        loginFacebook: function(){
            var that = this;

            // FB permissons
            // https://developers.facebook.com/docs/facebook-login/permissions#reference-extended-profile
            // https://developers.facebook.com/docs/facebook-login/permissions#reference-extended

            // check if user is already logged in
            FB.getLoginStatus(function(response) {
                if (response.status === 'connected') {
                    that.fetchData();
                    var uid = response.authResponse.userID;
                    var accessToken = response.authResponse.accessToken;
                } else if (response.status === 'not_authorized') {
                    // the user is alreday logged in to Facebook, 
                    // but has not authenticated the app
                    that.checkLogin();
                } else {
                    that.checkLogin();
                }
            });
        },

        checkLogin: function(){
            var that = this;
            var fb = FB.login(function (response) {
                if (response.authResponse) {
                    that.fetchData();
                } else {
                    console.log('error');
                }
            }, {scope: 'basic_info, read_stream, email, user_activities, user_hometown, friends_hometown, user_interests, friends_interests, user_relationships, friends_relationships, user_status, friends_status, user_about_me, friends_about_me, user_birthday, user_checkins, user_location, friends_checkins, user_online_presence, read_friendlists, read_insights, read_mailbox'});
            return fb;
        },

        // -------------------------------
        // get and parse data 
        // -------------------------------
        fetchData: function() {
            this.collection = '';
            this.collection = new Collection();
            var that = this;
            that.facebookData = [];
            that.facebookDataParsed = [];
            that.facebookDataSorted = [];

            FB.api('/me/feed?limit=300', {}, function(response) {
                that.fetchBatch(response);
            });
        },

        fetchBatch: function(response){
            var that = this;

            $.each(response.data, function(key, value){
                that.facebookData.push(value);  
            });
                  
            if(typeof(response.paging) !== 'undefined' ) {
                $(this.el).find('#loader').append(' -');
                FB.api(response.paging.next, function(response){ 
                    that.fetchBatch(response); 
                });
            } else {
                console.log('Counted Posts: ' + that.facebookData.length);
                $(this.el).find('#loader').text( ' hat ' + that.facebookData.length + ' Posts abgeschnorchelt!');
                that.parseData();
            }

        },

        parseData: function(){
            var that = this;
            var data = {};

            // $.ajax({
            //     type: 'POST',
            //     url: 'http://condime.de/hsa/schnorchel/datasave/save.php',
            //     data: JSON.stringify(that.facebookData),
            //     dataType: 'json'
            // });

            $.each(that.facebookData, function(key, value){

                if('place' in value){
                    if(value.place.location.city !== undefined) {
                        data = '';
                        data = {};
                        data.userId = value.from.id;
                        data.userName = value.from.name;
                        data.messageId = value.id;
                        data.messageUri = 'http://facebook.com/' + value.id;
                        data.message = value.message;
                        data.locationName = value.place.name;
                        data.locationZip = value.place.location.zip;
                        data.locationCity = value.place.location.city;
                        data.locationCountry = value.place.location.country;
                        data.locationStreet = (value.place.location.street == undefined) ? value.place.name : value.place.location.street;
                        data.locationLat = value.place.location.latitude;
                        data.locationLng = value.place.location.longitude;
                        data.created = value.created_time;
                        data.createdHour = new Date(value.created_time).getHours();
                        that.facebookDataParsed.push(data);
                        console.log();
                    }
                }
            });

            this.sortData();
        },

        // -------------------------------
        // sort data 
        // -------------------------------
        sortData: function(){
            var that = this;
            var outerArr = [];
            var innerArr = [];
            that.facebookDataSorted = '';

            $.when(that.sortAllDataByStreet()).then(function(){

                var currentValue = '';

                $.each(that.facebookDataParsed, function(key, value){
                    if(currentValue !== value.locationStreet){
                        innerArr = [];
                        innerArr.push(value);
                        currentValue = value.locationStreet;
                    } else {
                        // unique key name
                        var ownKey = that.cleanAddress(that.cleanStreet(value.locationStreet) + '-' + value.locationCity);
                        // var ownKey = that.cleanAddress(value.locationCity);
                        outerArr[ownKey] = innerArr;
                        innerArr.push(value);
                    }
                });

                that.facebookDataSorted = outerArr;
                that.setMarker();
                // that.sortAllDataByCity(outerArr);
            
            });


        },

        sortAllDataByCity: function(blubb){
            var that = this;
            var cityKey = '';
            console.log(blubb);
            $.each(blubb, function(key, value){
                console.log(key, value);
                // cityKey = key.split('-');
                // console.log(cityKey[cityKey.length-1]);
            });
        },

        sortAllDataByStreet: function(){
            var that = this;
            var defer = new jQuery.Deferred();
            
            // INFO: the same city, street,... 
            // has to exists at least two times,
            // otherwise we doesn´t need them
            var sorting = this.facebookDataParsed.sort(function(a, b){
                var valueA = that.cleanStreet(a.locationStreet);
                var valueB = that.cleanStreet(b.locationStreet);
                 
                // sort asc
                if(valueA < valueB){
                    return -1;
                }

                // sort desc
                if(valueA > valueB){
                    return 1;
                }

                // do nothing, because a and b are equal
                return 0;
            });

            defer.resolve(sorting);
            return defer.promise();
        },

        sortSubSetArray: function(sortedList, index, sortType){
            
            sortedList[index].sort(function(a, b) {
                var valueA = new Date(a[sortType]);
                var valueB = new Date(b[sortType]);
                // sort asc
                if(valueA < valueB){
                    return -1;
                }

                // sort desc
                if(valueA > valueB){
                    return 1;
                }

                // do nothing, because a and b are equal
                return 0;
            });

        },

        cleanStreet: function(street){
            // we doesn´t need street number
            street = street.split(' ');
            return street[0];
        },

        cleanAddress: function(address){
            address = address.replace(' ', '-').replace(',', '-').replace('.', '-').toLowerCase();
            return address;
        },

        // -------------------------------
        // map
        // -------------------------------
        getLatLng: function(address){

            var defer = new jQuery.Deferred();

            var geo = new google.maps.Geocoder();
            geo.geocode({'address':address},function(results, status){
                if (status === google.maps.GeocoderStatus.OK) {
                    defer.resolve(results[0].geometry.location);
                } else {
                    console.log('google map geocoder (lat, lng) doesn´t work: ' + status);
                }
            });
            
            return defer.promise();

        },

        getDayPeriod: function(date1, date2){
            var dayPeriod = '';
            var timeDifference = '';

            timeDifference = Math.abs(date2.getTime() - date1.getTime());
            dayPeriod = Math.ceil(timeDifference / (1000 * 3600 * 24)); 
            
            return dayPeriod;
        },

        setMarker: function(){
            var that = this;
            var content = '';
            var sortedList = that.facebookDataSorted;
            var dayPeriod = '';
            var hoursStart = '';
            var hoursEnd = '';
            var hoursSwitch = '';
            var markers = [];
            var markerData = {};

            for(var index in sortedList) {

                console.log('--------------------------------------------');
                console.log('KEY: ' + index);
                console.log(sortedList[index]);

                // sort subset array by days
                that.sortSubSetArray(sortedList, index, 'created');
                // some time info stuff
                dayPeriod = that.getDayPeriod(new Date(sortedList[index][0].created), new Date(sortedList[index][sortedList[index].length - 1].created));
                
                // sort subset array by hours
                that.sortSubSetArray(sortedList, index, 'createdHour');
                hoursStart = new Date(sortedList[index][0].created).getHours();
                hoursEnd = new Date(sortedList[index][sortedList[index].length - 1].created).getHours();
                
                // switch if start and end point not in the right order
                // e.g. start point 15 and end point 10 --> switch it
                if(hoursStart > hoursEnd){
                    hoursSwitch = hoursStart;
                    hoursStart = hoursEnd;
                    hoursEnd = hoursSwitch;
                }

                // prepare data for markerData
                markerData = {};
                markerData['countedPosts'] = sortedList[index].length;
                markerData['dayPeriod'] = dayPeriod;
                markerData['hoursStart'] = hoursStart;
                markerData['hoursEnd'] = hoursEnd;
                markerData['street'] = this.cleanStreet(sortedList[index][0].locationStreet);
                markerData['locationCity'] = sortedList[index][0].locationCity;

                // check if the minimum number of significance data is reached
                if(this.minimumNumberOfSameEntries === -1){
                    // console.log('never mind, print all data on the map');
                } else if(this.minimumNumberOfSameEntries <= sortedList[index].length){
                    // console.log('minimum number of entries reached, print it on the map: ' + this.minimumNumberOfSameEntries);
                } else {
                    console.log('too little data, don´t print it on the map');
                    content = '';
                    continue;
                }

                console.log('--------------------------------------------');

                if(sortedList[index][0].locationLat){
                    markers.push(that.createMarker(sortedList[index][0].locationLat, sortedList[index][0].locationLng, markerData));
                } else {
                    // wait until data exists
                    $.when(that.getLatLng(sortedList[index][0].locationZip + ' ' + sortedList[index][0].locationCity + ' , ' + sortedList[index][0].locationStreet)).then(function(response){
                        markers.push(that.createMarker(response[0].k, response[0].A, markerData));
                    });
                }

                content = '';

            }

            // init cluster
            var markerCluster = new MarkerClusterer(that.map, markers, {zoomOnClick: true});

            // set cluster eventlistener
            this.setClusterEventlistener(markerCluster);

            // set map eventlistener
            this.setMapEventlistener();

        },

        setClusterEventlistener: function(cluster){
            var that = this;

            // google.maps.event.addListener(cluster, 'clusterclick', function(cluster) {
            //     var markers = cluster.getMarkers();
            //     var content = '';
                
            //  $.each(markers, function(key, value){
            //      console.log(value.markerData);
            //      content += '<b>Anzahl Posts: ' + value.markerData.countedPosts + '</b><br/>';
            //      content += 'Anzahl Tage: ' + value.markerData.dayPeriod + '<br/>';
            //      content += 'Uhrzeit Start: ' + value.markerData.hoursStart + '<br/>';
            //      content += 'Uhrzeit Ende: ' + value.markerData.hoursEnd + '<br/>';
            //      content += 'Strasse: ' + value.markerData.street + '<br/>';
            //      content += '----------------------------------------<br/>';
            //  });

            //  // close info window
            //  if(that.infowindow){
            //      that.infowindow.close();
            //  }
                
            //  // info window
            //  var center = cluster.getCenter();
            //  var size = cluster.getSize();
            //  that.infowindow = new google.maps.InfoWindow();
            //  that.infowindow.setContent(content);
            //  that.infowindow.setPosition(center);
            //  that.infowindow.open(that.map); 

            // });

            // check if zoom level change --> close all infow windows
            google.maps.event.addListener(that.map, 'idle', function() { 
                if(that.changedZoomLevel != this.getZoom()){

                    // close info window
                    if(that.infowindow){
                        that.infowindow.close();
                    }

                    that.changedZoomLevel = this.getZoom();
                }
            });

        },

        createMarker: function(lat, lng, markerData){

            var that = this;
            var position = new google.maps.LatLng(lat, lng);
            var markerIcon = '';

            // work
            if(markerData.hoursStart >= 8 && markerData.hoursEnd <= 19){
                markerIcon = new google.maps.MarkerImage('images/work.svg', null, null, null, new google.maps.Size(40,40))
                markerData['type'] = 'work';
            // home
            } else if(markerData.hoursStart > 19){
                markerIcon = new google.maps.MarkerImage('images/home.svg', null, null, null, new google.maps.Size(40,40))
                markerData['type'] = 'home';

            }

            var marker = new google.maps.Marker({
                position: position,
                map: that.map,
                markerData: markerData,
                icon: markerIcon
            });
            that.map.panTo(position);

            // add eventlistener to every single marker
            this.setMarkerEventlistener(marker);

            return marker;
        },

        setMarkerEventlistener: function(marker){
            var that = this;

            google.maps.event.addListener(marker, 'click', function(e) {
                that.displayInfoWindow(this.markerData, this);
            });

            // google.maps.event.addListener(marker, 'mouseout', function() {
            //  if(that.infowindow){
            //      that.infowindow.close();
            //  }
            // });
        },

        displayInfoWindow: function(markerData, marker){
            var that = this;
            var headline = '';

            // work
            if(markerData.type === 'work'){
                headline = 'Hier arbeitest du vermutlich';
            // home
            } else if(markerData.type === 'home'){
                headline = 'Hier wohnst du vermutlich';

            }

            // content
            var content = '<div id="marker-infowindow">';
            content += '<div id="triangle"></div>';
            content += '<div id="marker-infowindow-inner">';
            content += '<h1>' + headline + '</h1>';
            content += '<h2>' + markerData.street + ', ' + markerData.locationCity + '</h2>';
            content += '<div id="social-icon"></div>';
            content += '<div id="social-content">';
            content += '<b>' + markerData.countedPosts + ' facebook posts</b><br>';
            content += 'in den letzten ' + markerData.dayPeriod + ' Tagen zwischen <br>';
            content += markerData.hoursStart + ' Uhr und ' + markerData.hoursEnd + ' Uhr';
            content += '</div>';
            content += '</div>'
            content += '</div>';
            
            // close info window
            if(that.infowindow){
                that.infowindow.close();
            }

            // set info window settings
            var myOptions = {
                content: content,
                pixelOffset: new google.maps.Size(20, -30),
                zIndex: null,
                boxStyle: { 
                    opacity: 0.95,
                    width: '250px',
                },
                closeBoxMargin: '5px',
                closeBoxURL: '',
                infoBoxClearance: new google.maps.Size(1, 1),
                isHidden: false,
                pane: "floatPane"
            };

            this.infowindow = new InfoBox(myOptions);
            this.infowindow.open(that.map, marker);
            
        },

        setMapEventlistener: function(){
            var that = this;
            $('#app-content').on('click', '#zoom-plus', function(){
                that.map.setZoom(that.map.getZoom() + 1);
            });

            $('#app-content').on('click', '#zoom-minus', function(){
                that.map.setZoom(that.map.getZoom() - 1);
            });
        }

    });

    return AppView;
});
