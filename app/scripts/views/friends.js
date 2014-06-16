/*global define*/

define([
    'jquery',
    'underscore',
    'backbone',
    'facebook',
    '../collections/fb_feeds',
    '../models/fb_feed',
    'text!../templates/friends/friends.html',
    'text!../templates/friends/friends_item.html',
    'text!../api/db_sarah_20140514_ALLES.json'
], function ($, _, Backbone, FB, Collection, Model, FriendsTemplate, FriendsItemTemplate, MockData) {
    'use strict';

    var AppView = Backbone.View.extend({
		el: 'body',
		appContent: $('#app-content'),
		collection: {},
		facebookData: [],
		facebookDataParsed: [],
		facebookDataSorted: [],
		minimumNumberOfSameEntries: -1, // -1 = never mind

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
			this.render(that.appContent, _.template(FriendsTemplate));

			// init facebook & show login if needed
			// this.initFacebook();
			// this.loginFacebook();

			/*this.facebookData = $.parseJSON(MockData);
			this.parseData();*/

		},

		// -------------------------------
		// init 
		// -------------------------------

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
						outerArr[ownKey] = innerArr;
						innerArr.push(value);
					}
				});

				that.facebookDataSorted = outerArr;

				that.setMarker();
			
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
			var infowindow = '';
			var content = '';
			var sortedList = that.facebookDataSorted;
			var dayPeriod = '';
			var hoursStart = '';
			var hoursEnd = '';
			var hoursSwitch = '';

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
			    hoursStart =  new Date(sortedList[index][0].created).getHours();
				hoursEnd = new Date(sortedList[index][sortedList[index].length - 1].created).getHours();
			    
			    // switch if start and end point not in the right order
			    // e.g. start point 15 and end point 10 --> switch it
			    if(hoursStart > hoursEnd){
			    	hoursSwitch = hoursStart;
			    	hoursStart = hoursEnd;
			    	hoursEnd = hoursSwitch;
			    }

			    content = '<b>' + sortedList[index].length + ' facebook posts</b><br>';
			    content += 'in den letzten ' + dayPeriod + ' Tagen zwischen <br>';
			    content += hoursStart + ' Uhr und ' + hoursEnd + ' Uhr';
				
				// google info window
				infowindow = new google.maps.InfoWindow();
				infowindow.setContent(that.cleanStreet(sortedList[index][0].locationStreet) + ', ' + sortedList[index][0].locationCity + '<br><br>' + content);


				// check if the minimum number of significance data is reached
				if(this.minimumNumberOfSameEntries === -1){
					console.log('never mind, print all data on the map');
				} else if(this.minimumNumberOfSameEntries <= sortedList[index].length){
					console.log('minimum number of entries reached, print it on the map: ' + this.minimumNumberOfSameEntries);
				} else {
					console.log('too little data, don´t print it on the map');
					content = '';
					continue;
				}

			    console.log('--------------------------------------------');

				if(sortedList[index][0].locationLat){
					infowindow.open(that.map, that.createMarker(sortedList[index][0].locationLat, sortedList[index][0].locationLng));
				} else {
					// wait until data exists
					$.when(that.getLatLng(sortedList[index][0].locationZip + ' ' + sortedList[index][0].locationCity + ' , ' + sortedList[index][0].locationStreet)).then(function(response){
						console.log(response);
						infowindow.open(that.map, that.createMarker(response[0].k, response[0].A));
					});
				}

				content = '';

			}

		},

		createMarker: function(lat, lng){
			var that = this;
			var position = new google.maps.LatLng(lat, lng);
			var marker = new google.maps.Marker({
				position: position,
				map: that.map
				// icon: ownIcon
			});
			that.map.panTo(position);
			return marker;
		}


    });

    return AppView;
});
