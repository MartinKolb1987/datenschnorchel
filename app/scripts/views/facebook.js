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
        // default
        el: 'body',
        appContent: $('#app-content'),
        collection: {},
        
        // facebook
        facebookData: [],
        facebookDataParsed: [],
        facebookDataSorted: [],
        minimumNumberOfSameEntries: 2, // -1 = never mind
        
        // gmap
        map: '',
        infowindow: '',
        changedZoomLevel: 0,
        allMarkers: [],

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

                // console.log('--------------------------------------------');
                // console.log('KEY: ' + index);
                // console.log(sortedList[index]);

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

                // console.log('--------------------------------------------');

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

            // set map eventlistener
            this.setMapEventlistener();

            // render direction icons
            this.renderDirectionIcons();

        },

        createMarker: function(lat, lng, markerData){

            var that = this;
            var position = new google.maps.LatLng(lat, lng);
            var icon = ''
            var markerIcon = '';

            // work
            if(markerData.hoursStart >= 8 && markerData.hoursEnd <= 19){
                markerData['type'] = 'work';
            
            // home
            } else if(markerData.hoursStart > 19){
                markerData['type'] = 'home';
            
            // no idea
            } else {
                markerData['type'] = 'noIdea';
            }
            
            icon = this.typeSwitcher(markerData.type);
            // set icon
            markerIcon = new google.maps.MarkerImage(icon['marker'], null, null, null, new google.maps.Size(40,40))


            var marker = new google.maps.Marker({
                position: position,
                map: that.map,
                markerData: markerData,
                icon: markerIcon
            });

            // add marker to map
            this.map.panTo(position);

            // add all marker to array
            // needed for shown or not shown
            this.allMarkers.push(marker);

            // add eventlistener to every single marker
            this.setMarkerEventlistener(marker);

            return marker;
        },

        setMarkerEventlistener: function(marker){
            var that = this;

            // open infowindow
            google.maps.event.addListener(marker, 'click', function(e) {
                that.displayInfoWindow(this.markerData, this);
            });

            // close infowindow
            $('#app-content').on('click', '#close-infowindow', function(){
                 if(that.infowindow){
                     that.infowindow.close();
                 }
            });

            // change icons on mouseover & mouseout
            // google.maps.event.addListener(marker, 'mouseover', function(e) {
            //     marker.setIcon(new google.maps.MarkerImage('images/' + this.markerData.type + '_active.svg', null, null, null, new google.maps.Size(40,40)));
            // });

            // google.maps.event.addListener(marker, 'mouseout', function(e) {
            //     marker.setIcon(new google.maps.MarkerImage('images/' + this.markerData.type + '.svg', null, null, null, new google.maps.Size(40,40)));
            // });

        },

        displayInfoWindow: function(markerData, marker){
            var that = this;
            var headline = '';
            headline = this.typeSwitcher(markerData.type);

            // content
            var content = '<div id="marker-infowindow">';
            content += '<div id="marker-infowindow-inner">';
            content += '<div id="close-infowindow">x</div>';
            content += '<div id="triangle"></div>';
            content += '<h1>' + headline['info'] + '</h1>';
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
                pixelOffset: new google.maps.Size(40, -20),
                zIndex: null,
                boxStyle: { 
                    opacity: 0.95,
                    width: '250px',
                },
                closeBoxMargin: '5px',
                infoBoxClearance: new google.maps.Size(1, 1),
                isHidden: false,
                pane: "floatPane",
                enableEventPropagation: true
            };

            this.infowindow = new InfoBox(myOptions);
            this.infowindow.open(that.map, marker);
            
        },

        setMapEventlistener: function(){
            var that = this;

            $('#app-content').on('click', '#zoom-plus', function(){
                that.map.setZoom(that.map.getZoom() + 1);
                that.renderDirectionIcons();
            });

            $('#app-content').on('click', '#zoom-minus', function(){
                that.map.setZoom(that.map.getZoom() - 1);
                that.renderDirectionIcons();
            });

            // detect if map dragged
            google.maps.event.addListener(that.map, 'dragend', function() { 
                that.renderDirectionIcons();
            });

            // detect if map zoomed
            google.maps.event.addListener(that.map, 'zoom_changed', function() {
                if (that.changedZoomLevel != that.map.getZoom()) {
                    // close info window
                    if(that.infowindow){
                        that.infowindow.close();
                    }
                    that.renderDirectionIcons();
                    that.changedZoomLevel = that.map.getZoom();
                }
            });

            // window is resized
            $(window).resize(function() {
                that.renderDirectionIcons();
            });

            $('#app-content').on('click', '.icon-direction-marker', function(){
                var index = $(this).attr('data-icon-direction-index');
                that.map.setCenter(that.allMarkers[index].getPosition());
                that.renderDirectionIcons();
            });

        },

        renderDirectionIcons: function(){
            var that = this;

            // check if map is ready and try it after 1 sec again
            if(this.map.getBounds() === undefined || this.map.getBounds() === 'undefined'){
                setTimeout(function(){
                    that.renderDirectionIcons();
                }, 1000);
                return true;
            }

            var centerPosition = that.map.getBounds().getCenter();
            var iconPositions = '';
            var mapCanvas = $('#map-canvas');
            var icon = '';

            // remove all direction marker
            $('.icon-direction-marker').remove();

            // get all visible markers
            for(var i = 0; i<that.allMarkers.length; i++){

                if(!that.map.getBounds().contains(that.allMarkers[i].getPosition())){
                    
                    icon = that.typeSwitcher(that.allMarkers[i].markerData.type);

                    // get coordinations (x,y) for the drawing points
                    iconPositions = this.calculateDrawingPoints(that.allMarkers[i].getPosition());
                    
                    // add direction icon marker
                    mapCanvas.after('<div class="icon-direction-marker ' + icon['direction'] + '" data-icon-direction-index="' + i + '" style="top: ' + (iconPositions[1] - 12.5 )+ 'px; left: ' + (iconPositions[0] - 12.5 ) + 'px;"></div>');

                }

            }

        },

        calculateDrawingPoints: function(markerPosition){
            var that = this;
            var centerPosition = that.map.getBounds().getCenter();
            var heading = '';
            var angularDegree = '';
            var normalizedHeading = '';
            var mapCanvas = $('#map-canvas');
            var offset = mapCanvas.offset();
            var width = mapCanvas.width();
            var height = mapCanvas.height();
            var centerX = offset.left + width / 2;
            var centerY = offset.top + height / 2;
            var x = '';
            var y = '';

            // calculate heading + normalization + angularDegree
            heading = google.maps.geometry.spherical.computeHeading(centerPosition, markerPosition);
            normalizedHeading = this.normalizeHeading(heading)
            angularDegree = this.convertHeadingToAngle(normalizedHeading);
            
            // get x and y coordinate of the icon marker
            var offsetBorder = 33;
            var radius = (mapCanvas.width() - offsetBorder) / 2;

            x = Math.cos(angularDegree) * radius + centerX; 
            y = Math.sin(angularDegree) * radius + centerY; 

            return [x, y];
        },

        normalizeHeading: function(heading){
            // heading into the range between 0 and 360
            if(heading > 360){
                heading -= 360;
            } else if (heading < 0){
                heading += 360;
            }
            return heading;
        },

        convertHeadingToAngle: function(heading){
            return this.convertToRadians(90 - heading) * -1;
        },

        convertToRadians: function(angle){
            return angle * Math.PI / 180;
        },

        typeSwitcher: function(markerType){
            var data = [];

            // work
            if(markerType === 'work'){
                data['info'] = 'Hier arbeitest du vermutlich';
                data['marker'] = 'images/work.svg';
                data['direction'] = 'icon-direction-work';
            // home
            } else if(markerType === 'home'){
                data['info'] = 'Hier wohnst du vermutlich';
                data['marker'] = 'images/home.svg';
                data['direction'] = 'icon-direction-home';

            // no idea
            } else {
                data['info'] = '???';
                data['marker'] = 'images/help.svg';
                data['direction'] = 'icon-direction-no';
            }

            return data;

        }


    });

    return AppView;
});
