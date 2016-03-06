angular.module('aurora.controllers', [])

.controller('DashCtrl', function($scope, $http, $push) {
	$scope.push = $push;

	$scope.requestPush = function() {
		$push.requestTestPushNotification();
	}

	$scope.initPush = function() {
		$push.initPushNotifications();
	}

	/*$scope.postToPushServer = function(params, onSuccess, onFailure) {
		alert("The post begins!");
		try {
			$http.post("http://aurora.cs.uaf.edu/push_notification/,",params)
			.then(onSuccess,onFailure);
		}
		catch (error)
		{
			alert(error.message +"The error that happened");
		}
		alert("The post ends!");
	}

	$scope.requestTestPushNotification = function() {
		postData = {
			"test_push":true,
			"kpTrigger":"",
			"service":"gcm",
			"method":"all",
			"token":""
		}

		$scope.postToPushServer(postData, function() {
			alert("You should receive a notification momentarily.");
		}, function() {
			alert("Request was denied.");
		});
	}

	$scope.initPushNotifications = function() {
		alert("Initializing push notification service...");
		var gcmID = "209803454821" // this is static for GCM
		var apnsId = ""; //Apple iTunes App ID
			// need to figure out APNS...

		var push = PushNotification.init({
			"android": {
				"senderID": gcmID
			}
			//"ios": {"alert":"true", "badge":"true", "sound":"true"},
			//"windows": {}

		});

		if (push) {
			alert("Push notification service successfully initialized.");
		}
		else {
			alert("It doesn't work!");
			console.log("Push notification service failure.");
		}

		push.on('registration', function(data) {
			alert("Registration: " + JSON.stringify(data));

			postData = {
				"service": "gcm",
				"token": data.registrationId,
				"kpTrigger": 1
			}

			alert(JSON.stringify(postData));

			$scope.postToPushServer(postData, function() {
				alert("Key has been added to push server!");
			}, function() {
				alert("Key has not been added to the push server!");
			});
		});

		PushNotification.hasPermission(function(data) {
			if(data.isEnabled) {
			  alert("Push notifications enabled.");
			}
			else {
			  alert("Push notifications disabled.");
			}
		});

		push.on('notification', function(data) {
			alert("Notification: " + JSON.stringify(data["message"]));
		});
	}*/
})

.controller('SettingsCtrl', function($scope, $localstorage, $ionicPopover) {
	//Initialize values
	$scope.settingblock = {
		locAlertOn: true,
		locKPAlert: 9,
		locDayNot: true,
		locWeatherNot: false,
		aSAlertOn: false,
		aSKPAlert: 7,
		aSDayNot: false,
		aSWeatherNot: false,
		gpsUse: true,
		locationZip: 99701
	};
	
	$ionicPopover.fromTemplateUrl('popover-lkpa.html', {
		scope: $scope,
	}).then(function(popover) {
		$scope.poplkpa = popover;
	});
	
	$ionicPopover.fromTemplateUrl('popover-lDay.html', {
		scope: $scope,
	}).then(function(popover) {
		$scope.poplDay = popover;
	});
	
	$ionicPopover.fromTemplateUrl('popover-lAlert.html', {
		scope: $scope,
	}).then(function(popover) {
		$scope.poplAlert = popover;
	});
	
	function isEmpty(obj) {
		for(var prop in obj) {
			if(obj.hasOwnProperty(prop))
				return false;
		}
		return true && JSON.stringify(obj) === JSON.stringify({});
	}
		
	//Load existing settings
	var test = $localstorage.getObject('settings');
	console.log("The empty value of test:" + isEmpty(test));
	if(!isEmpty(test))
		$scope.settingblock = $localstorage.getObject('settings');
	
	//Happens at program close. Goes elsewhere probably
	$scope.saveSettings = function()
	{
		$localstorage.setObject('settings', $scope.settingblock);
	}
})

.controller('AboutCtrl', function($scope) {})

.controller('AllskyCtrl', function($scope) {});