angular.module('aurora.services', [])

//Local storage services
.factory('$localstorage', ['$window', function($window) {
    return {
        set: function(key, value) {
            $window.localStorage[key] = JSON.stringify(value);
        },
        get: function(key, defaultValue) {
            var temp = $window.localStorage[key];
            if(typeof temp != 'undefined')
                return JSON.parse(temp);
            else return defaultValue;
        },
        setObject: function(key, value) {
            $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function(key) {
            return JSON.parse($window.localStorage[key] || '{}');
        },
        remove : function(key) {
            localStorage.removeItem(key);
        }
    };
}])

//Push notification services
.factory('$push', function($http, $location, $localstorage, $kpAPI, $geolocation) {
    var push      = false;
    var gcmID     = '638344930515';
    var apnsId    = ''; //Apple iTunes App ID
    var windowsId = ''; //Windows Store ID
    
    var initData  = {
        'android' : {
            'senderID' : gcmID
        },
        'ios' : {
            'senderID' : apnsId
        },
        'windows' : {
            'senderID' : windowsId
        }
    };

    var postToPushServer = function(params, onSuccess, onFailure) {
        $http.post("http://aurora.cs.uaf.edu/notification_service", params)
        .then(onSuccess, onFailure);
    };

    var update = function(info) {
        info.token = $localstorage.get('pushToken');
        info.mode  = 'update';

        postToPushServer(info, function() {
            console.log("AURORA: Info changed.");
        }, function() {
            console.log("AURORA: Could not change info.");
        });
    };

    var receivedNotification = function(data) {
        var message   = JSON.parse(data.message);
        var kpTrigger = message.kpTrigger;
        $kpAPI.setNow(kpTrigger);

        console.log("AURORA: " + kpTrigger);
        console.log("AURORA: " + data.title);
        console.log("AURORA: " + data.count);
        console.log("AURORA: " + data.sound);
        console.log("AURORA: " + data.image);
        console.log("AURORA: " + data.additionalData);
    };

    var receivedError = function(data) {
        console.log("AURORA: " + e.message);
    };

    var notificationServiceRegistered = function(data) {
        var postData  = {};
        var kpTrigger = $localstorage.get('kpTrigger', 6);
        var info      = {};

        var getGeolocation = function() {
            $geolocation.getInfo(info, function() {
                console.log('AURORA: Setting geolocation information.');
                update(info);
            });
        };

        if(ionic.Platform.isAndroid()) {
            postData.mode      = "register";
            postData.service   = "gcm";
            postData.token     = data.registrationId;
            postData.kpTrigger = kpTrigger;
        }
        else if(ionic.Platform.isIOS()) {
            postData.mode      = "register";
            postData.service   = "apns";
            postData.token     = data.registrationId;
            postData.kpTrigger = kpTrigger;
        }

        console.log('AURORA: ' + postData);
        console.log('AURORA: ' + JSON.stringify(postData));

        postToPushServer(postData, function(response) {
            if(response.status == 200) {
                console.log("AURORA: " + "Key has been added to push server!");
                $localstorage.set('pushToken', data.registrationId);
                console.log("AURORA: Your token: " + data.registrationId);
                getGeolocation();
            }
        }, function(response) {
            console.log("AURORA: " + "Key has not been added to the push server!");
            console.log("AURORA: Failure status: " + response.status);
        });
    };

    return {
        requestTestPushNotification : function() {
            if(ionic.Platform.isAndroid())
            {
                postData = {
                    "test_push": true,
                    "kpTrigger": "",
                    "service"  : "gcm",
                    "method"   : "all",
                    "token"    : ""
                };
            }
            else if(ionic.Platform.isIOS())
            {
                postData = {
                    "test_push": true,
                    "kpTrigger": "",
                    "service"  : "apns",
                    "method"   : "all",
                    "token"    : ""
                };
            }

            postToPushServer(postData, function(response) {
                if(response.status == 200) {
                    console.log("AURORA: " + "You should receive a notification momentarily.");
                }
            }, function(response) {
                console.log("AURORA: " + "Request was denied.");
                console.log("AURORA: Failure status: " + response.status);
            });
        },
        initPushNotifications : function(callback) {
            push = PushNotification.init(initData);

            if (push) {
                console.log("AURORA: " + "Push notification service successfully initialized.");
            }
            else {
                console.log("AURORA: " + "Push notification service NOT initialized.");
            }

            push.on('registration', notificationServiceRegistered);

            PushNotification.hasPermission(function(data) {
                if (data.isEnabled) {
                    console.log("AURORA: " + "Push notifications enabled.");
                }
                else {
                    console.log("AURORA: " + "Push notifications disabled.");
                }
            });

            push.on('notification', receivedNotification);

            push.on('error', receivedError);

            if(callback)
                callback();
        },
        register : function() {
            var token = $localstorage.get('pushToken');
            notificationServiceRegistered({registrationId:token});
        },
        unregister : function() {
            var info   = {};
            info.token = $localstorage.get('pushToken');
            info.mode  = 'remove';

            postToPushServer(info, function() {
                console.log("AURORA: Push notifications disabled.");
            }, function() {
                console.log("AURORA: Could not disable push notifications.");
            });
        },
        updateInfo : update
    };
})

//Geolocation services
.factory('$geolocation', function($localstorage, $http) {
    var getCountry = function(info) {
        var apiURL = 'http://maps.googleapis.com/maps/api/geocode/json?latlng=';
        apiURL += info.latitude + ',' + info.longitude + '&sensor=false';

        console.log('AURORA: Getting country from: ' + apiURL);

        $http.get('http://maps.googleapis.com/maps/api/geocode/json?latlng=64.84883,-147.6782167&sensor=false')
        .success(function(data) {
            console.log('AURORA: Country: ' + data.results[0].address_components[5].short_name);
        }).error(function(error) {
            //Finish writing
            console.log('Error: ' + error);
        });
    };

    //Literally a table index of geomagnetic coordinates
    var getIdealKP = function(gmagcoords) {
        var idealKp = 'N/A';
        //using chart found here: https://www.spaceweatherlive.com/en/help/the-kp-index
        idealKp     = '9';
        if(Math.abs(gmagcoords.latitude)>50.1)
            idealKp = '8';
        if(Math.abs(gmagcoords.latitude)>52.2)
            idealKp = '7';
        if(Math.abs(gmagcoords.latitude)>54.2)
            idealKp = '6';
        if(Math.abs(gmagcoords.latitude)>56.3)
            idealKp = '5';
        if(Math.abs(gmagcoords.latitude)>58.3)
            idealKp = '4';
        if(Math.abs(gmagcoords.latitude)>60.4)
            idealKp = '3';
        if(Math.abs(gmagcoords.latitude)>62.4)
            idealKp = '2';
        if(Math.abs(gmagcoords.latitude)>64.5)
            idealKp = '1';                
        
        return idealKp;
    };

    //This could actually call some API in the future, or a call to this could be replaced with an API call
    var getMagneticPole = function() {
        //geographic location geomagnetic pole as of 2015 coords are east positive
        var pole = { 
            latitude : 80.375*Math.PI/180,
            longitude : -72.625*Math.PI/180
        };
        return pole;
    };

    //Contemplated having the pole be passed into the function
    convertGeographicToGeomagnetic = function(geographicCoord) {
        //Set the magnetic pole
        var pole   = getMagneticPole();
        var mslat  = pole.latitude;
        var mslong = pole.longitude;
        
        //geographic coordinates (To radians)
        var glat   = geographicCoord.latitude*Math.PI/180;
        var glong  = geographicCoord.longitude*Math.PI/180;
        var galt   = geographicCoord.altitude;
        
        //set alt to radius of earth if no good data
        /*if(galt<1000)
            galt = 6371000;*/
        
        //rectangular coordinates
        var x    = /*galt**/Math.cos(glat)*Math.cos(glong);
        var y    = /*galt**/Math.cos(glat)*Math.sin(glong);
        var z    = /*galt**/Math.sin(glat);
        
        var matrix;
        var rotation;		
		rotation = mslong;
		var rotation2 = Math.PI/2-mslat;
		matrix        = [0,0,0, 0,0,0, 0,0,0];
		
		matrix[0*3+0] = Math.cos(rotation)*Math.cos(rotation2);
        matrix[1*3+0] = -1*Math.sin(rotation);
        matrix[2*3+0] = Math.cos(rotation)*Math.sin(rotation2);
        
        matrix[0*3+1] = Math.sin(rotation)*Math.cos(rotation2);
        matrix[1*3+1] = Math.cos(rotation);
        matrix[2*3+1] = Math.sin(rotation)*Math.sin(rotation2);
        
        matrix[0*3+2] = -1*Math.sin(rotation2);
        matrix[1*3+2] = 0;
        matrix[2*3+2] = Math.cos(rotation2);
		
        
        //apply matrix
        xt  = x*matrix[0]+y*matrix[1]+z*matrix[2];
        yt  = x*matrix[3]+y*matrix[4]+z*matrix[5];
        zt  = x*matrix[6]+y*matrix[7]+z*matrix[8];
		x=xt;
		y=yt;
		z=zt;
        
        //convert back
        var mlat  = Math.atan(z/Math.sqrt(Math.pow(x,2)+Math.pow(y,2)))*180/Math.PI;
        var mlong = Math.atan(y/x)*180/Math.PI;
        //var malt  = Math.sqrt(Math.pow(x,2)+Math.pow(y,2)+Math.pow(z,2)); //not needed
        //Method is imperfect but close enough
        
        var magCoords = {
            latitude : mlat,
            longitude : mlong
            //altitude : malt
        };
        
        return magCoords;
    };

    return {
        showGeoLocationInfo : function() {
            var gps = $localstorage.get('gps', false);
            if(gps) {
                var options = {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 1000 * 60 * 5 //Five minutes
                };

                navigator.geolocation.getCurrentPosition(function(position) {
                    alert('Latitude: ' + position.coords.latitude + '\n' +
                        'Longitude: ' + position.coords.longitude + '\n' +
                        'Altitude: ' + position.coords.altitude + '\n' +
                        'Accuracy: ' + position.coords.accuracy + '\n' +
                        'Altitude Accuracy: ' + position.coords.altitudeAccuracy + '\n' +
                        'Heading: ' + position.coords.heading + '\n' +
                        'Speed: ' + position.coords.speed + '\n' +
                        'Timestamp: ' + position.timestamp + '\n');
                    
                }, function(error) {
                    alert('Code: ' + error.code + '\n' +
                        'Message: ' + error.message + '\n');
                }, options);
            }
        },
        showGeoMagLocation : function() {
            var gps = $localstorage.get('gps', false);
            if(gps) {
                var options = {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 1000 * 60 * 5 //Five minutes
                };

                navigator.geolocation.getCurrentPosition(function(position) {
                    var geoCoords = { 
                        latitude : position.coords.latitude,
                        longitude : position.coords.longitude,
                        altitude : position.coords.altitude
                    };  
                    
                    var magCoords = convertGeographicToGeomagnetic(geoCoords);
                    
                    alert('Geomagnetic Latitude: ' + magCoords.latitude + '\n' +
                        'Geomagnetic Longitude: ' + magCoords.longitude + '\n' +
                        'Altitude: ' + magCoords.altitude);
                    
                }, function(error) {
                    alert('Code: ' + error.code + '\n' +
                        'Message: ' + error.message + '\n');
                }, options);
            }
        },
        getMagCoord : function(geoCoords) {
            var output = convertGeographicToGeomagnetic(geoCoords);
            return output;
        },
        showIdealKP : function(magCoord) {
            var output = getIdealKP(magCoord);
            return output;
        },
        getInfo: function(params, callback) {
            var gps = $localstorage.get('gps', false);
            
            if(gps) {
                var options = {
                    enableHighAccuracy: true,
                    timeout: 15000,
                    maximumAge: 1000 * 60 * 5 //Five minutes
                };

                navigator.geolocation.getCurrentPosition(function(position) {
                    params.latitude  = position.coords.latitude;
                    params.longitude = position.coords.longitude;

                    console.log('AURORA: Set lat and long.');

                    if(callback) {
                        console.log('Calling callback.');
                        callback();
                    }

                    getCountry(params);
                    console.log('AURORA: Called getCountry.');
                });
            }
        }
    };
})

//GI API service
.factory('$kpAPI', function($http, $localstorage) {
    var latestForecast;
    var apiURL = 'http://cs472.gi.alaska.edu/kp.php?';

    loadForecastFromStorage = function() {
        latestForecast = $localstorage.getObject('forecast');

        if(typeof latestForecast == 'undefined' || Object.keys(latestForecast).length === 0)
            updateForecast();
    };

    saveForecast = function(forecast) {
        $localstorage.remove('forecast');
        $localstorage.setObject('forecast', forecast);
    };

    formatTime = function(timeStr) {
        // source: http://stackoverflow.com/questions/14638018/current-time-formatting-with-javascript

        var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var days   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        // timeStr is in format:
        //      2016-04-17T21:01:00.0+00:00
        // which is UTC
        var apiDate   = new Date(timeStr);
        var localDate = new Date();

        // getTimezoneOffset gives: UTC - timeobject
        // (480 minutes for Alaska, which is GMT-8)
        // so, adding 480 minutes to the Alaska time gives UTC
        var localOffset = localDate.getTimezoneOffset();

        // this fixes the Date constructor always using the local device offset
        // basically setting the apiDate to actual UTC
        apiDate.setMinutes(apiDate.getMinutes() + localOffset);

        var theDate  = apiDate.getDate();
        var theMonth = months[apiDate.getMonth()];
        var theDay   = days[apiDate.getDay()];
        var theHour  = apiDate.getHours();

        var ampm = theHour < 12 ? "am" : "pm";
        if(theHour > 12) { theHour -= 12; }
        else if(theHour < 12) { theHour[0] = ""; }

        if(theHour == '0') { theHour = "12"; }

        var theMin = apiDate.getMinutes();
        if(theMin < 10) { theMin = "00"; }

        var time = theHour + ":" + theMin + ampm;
        var date = theDay + "," + theMonth + " " + theDate;

        return {'time':time, 'date':date};
    };

    updateForecast = function() {
        $http.get(apiURL + 'd=d&f=t').success(function(data) {
            if(data.data[0] != 'undefined') {
                var jsonData = {};

                for (var i = 0; i < data.data.length; i++) {
                    jsonData['kp' + i]      = {};
                    jsonData['kp' + i].kp   = data.data[i].kp;

                    var time = formatTime(data.data[i].predicted_time);

                    jsonData['kp' + i].time = time.time;
                    jsonData['kp' + i].date = time.date;
                }

                latestForecast = jsonData;
            }
        }).error(function(error) {
            //Finish writing
            console.log(error);
        });

        $http.get(apiURL + 'd=n&f=t').success(function(data) {
            if(data.data[0] != 'undefined') {
                latestForecast.now = Math.ceil(data.data[0].kp);
                saveForecast(latestForecast);
            }
        }).error(function(error) {
            //Finish writing
            console.log(error);
        });
        
        console.log('Updated KP data.');
    };

    return {
        getForecast : function() {
            updateForecast();
            if(typeof latestForecast == 'undefined')
                loadForecastFromStorage();

            return latestForecast;
        },
        setNow : function(kpNow) {
            if(typeof latestForecast == 'undefined')
                loadForecastFromStorage();

            latestForecast.now = kpNow;
            saveForecast(latestForecast);
        }
    };
})

.factory('$background', function($kpAPI) {
	backgroundlist = [
		{
			id: 1,
			url: "img/background-none.jpg"
		},
		{
			id: 2,
			url: "img/background-low.jpg"
		},
		{
			id: 3,
			url: "img/background-moderate.jpg"
		},
		{
			id: 4,
			url: "img/background-high.jpg"
		}
	];

	return {
		getBackground : function() {
            forecast     = $kpAPI.getForecast();
            var url      = null;
			switch(forecast.now)
			{
				case 1:
				case 2:
				case 3:
					url = backgroundlist[0].url;
					break;
				case 4:
				case 5:
					url = backgroundlist[1].url;
					break;
				case 6:
				case 7:
					url = backgroundlist[2].url;
					break;
				case 8:
				case 9:
					url = backgroundlist[3].url;
					break;
				default:
					url = backgroundlist[0].url;
					break;
			}
			return url;
		}
	};
});