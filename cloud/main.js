var Constants = require('./constants.js');
Parse.serverURL = 'http://lmuecunicorn.herokuapp.com/parse';

// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

/*
// update global counter of startups/students for randomize
//Parse.Cloud.afterSave(Parse.User, function(request)) {
Parse.Cloud.define("updateGlobalCounters", function(request, response) {
	var myBool = request.user.get(Constants.UNICORN_USER_IS_STUDENT);
	if (myBool) {
		query = new Parse.Query("NumberOfStudents");
		query.first({
			success: function(object) {
				object.increment("overallNumber");
				object.save();
				response.success("successfully updated students counter");
			},
			error: function(error) {
				//alert("Error: "+ error.code + " " + error.message);
				throw "Got an error " + error.code + " : " + error.message;
				response.error("updating students counter failed!");
			}
		}); 
	} else {
		query = new Parse.Query("NumberOfStartups");
		query.first({
			success: function(object) {
				object.increment("overallNumber");
				object.save();
				response.success("successfully updated startups counter");
			},
			error: function(error) {
				//alert:("Error: " + error.code + " " + error.message);
				throw "Got an error " + error.code + " : " + error.message;
				response.error("updating startups counter failed!");
			}
		});
	}
});
*/

// sending out a push notification to all users only after the user has chosen skills and a startup/university
Parse.Cloud.define("newUser", function(request, response) {
	
	var username = request.user.get("fullname");
	var isStudent = request.user.get("isStudent");
	var user;
	if (isStudent) {
		user = "neuer Student";
	} else {
		user = "neues Startup";
	}

	var pushQuery = new Parse.Query(Parse.Installation);
	// ios-only push
	//pushQuery.equalTo("deviceType", "ios");
	pushQuery.notEqualTo("user", request.user);

	Parse.Push.send({
		where: pushQuery,
		data: {
			alert: "Ein neuer User hat sich registriert: " + username
		}
	}, {
		success: function() {	
			// Push was successful
			response.success("success! : " + username);
		},
		error: function(error) {
			throw "Got an error " + error.code + " : " + error.message;
			response.error("push failed!");
		}
	});
});

// sending out a push notification when someone sent a message
Parse.Cloud.define("sendMessagePush", function(request, response) {
	
	console.log("send message push called");
	
	//var username = request.user.get("fullname");
	var username = request.user.get(Constants.UNICORN_USER_FULL_NAME);
	var roomID = request.params.roomID;
	var message = request.params.message;
	var pushMessage = username + ": " + message;
	
	/*
	var userQuery = new Parse.Query("Messages");
	userQuery.equalTo("roomId", roomID);
	// doesnt seem to work
	//userQuery.notEqualTo('user', request.user);
	
	// push query
	var pushQuery = new Parse.Query(Parse.Installation);
	pushQuery.matchesKeyInQuery("user", "user", userQuery);
	// new try to exclude the user registering
	pushQuery.notEqualTo("user", request.user);
	*/

	var user1 = roomID.substr(0, 10);
    var user2 = roomID.substr(10);
    var receiverID;

    if (user1 == request.user.id) {
        receiverID = user2;
    } else {
        receiverID = user1;
    }

    var pushQuery = new Parse.Query(Parse.Installation);
    //pushQuery.equalTo("newMessages", true);
    pushQuery.equalTo(Constants.UNICORN_INSTALLATION_USER_POINTER, {__type: "Pointer",className: "_User",objectId: receiverID});
	
	Parse.Push.send({
		where: pushQuery,
		data: {
			alert: pushMessage,
			badge: "Increment",
			sound: "Push_allert.caf",
			otherUser: username,
			roomId: roomID
		}
	}, {
		success: function() {
			// Push was successful
			response.success("success! : " + username + ", " + pushMessage);
		},
		error: function(error) {
			
			console.log("push failed!"+ error.code + " : " + error.message+" "+data);
			
			throw "Got an error " + error.code + " : " + error.message;
			response.error("push failed!" + error.code + " : " + error.message+" "+data);
		}
	});
});

// sending out a push notification to startups only that a new user has signed up
Parse.Cloud.define("studentPushNotificationToStartups", function(request, response) {
	
	// get the name and the university of the user having called this function after onboarding/signup
	//var username = request.user.get("fullname");
	var username = request.user.get(Constants.UNICORN_USER_FULL_NAME);
	//var university = request.user.get("universityName");
	var university = request.user.get(Constants.UNICORN_USER_UNIVERSITY_NAME);
	// get the skills the user selected during signup to match them with skills searched by startups
	//var skills = request.user.get("skills");
	var skills = request.user.get(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY);
	/*
	var userSkillsArray;

	var skillsQuery = new Parse.Query(Parse.User);
	skillsQuery.equalTo("isStudent", false);
	skillsQuery.notEqualTo("objectId", request.user.get("objectId"));
	skillsQuery.include("skills");
	skillsQuery.find({
		success: function(results) {
			userSkillsArray = results;
		},
		error: function() {
			response.error("finding skills failed");
		}
	});

	for (var i = 0; i < skills.length; i++) {
		for (var j = 0; j < userSkillsArray[j].get("skills").length; j++) {
			
		};
	};
	*/

	var pushMessage = username + " von der " + university + " hat sich gerade mit deinen gesuchten Skills registriert!";
	
	// query only for users who are part of a startup
	var startupUsersQuery = new Parse.Query(Parse.User);
	//startupUsersQuery.equalTo("isStudent", false);
	startupUsersQuery.equalTo(Constants.UNICORN_USER_IS_STUDENT, false);
	//startupUsersQuery.equalTo("pushOption", true);
	startupUsersQuery.equalTo(Constants.UNICORN_USER_PUSH_OPTION, true);
	//startupUsersQuery.include("skills");
	startupUsersQuery.include(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY);
	//startupUsersQuery.containedIn("skills", skills);
	startupUsersQuery.containedIn(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY, skills);
	
	var startupPushQuery = new Parse.Query(Parse.Installation);
	startupPushQuery.matchesQuery(Constants.UNICORN_INSTALLATION_USER_POINTER, startupUsersQuery);
	
	// check if it is Apple's Fly Flyerson - no pushes then!
	if (request.user.id != "gbmxmnTyyQ") {
		// push to startups
		Parse.Push.send({
			where: startupPushQuery,
			data: {
				alert: pushMessage,
				badge: "Increment",
				sound: "Push_allert.caf",
				otherUser: username
			}
		}, {
			success: function() {
				// push was successful
				response.success("success! : " + username + ", " + pushMessage);
			},
			error: function(error) {
				throw "Got an error " + error.code + " : " + error.message;
				response.error("startup push failed!");
			}
		});
		
	} else {
		response.succes("studentPushNotificationsToStartups - Fly was here...");
	}
});

Parse.Cloud.define("studentPushNotificationToStudents", function(request, response) {
	
	// get the name and the university of the user having called this function after onboarding/signup
	//var username = request.user.get("fullname");
	var username = request.user.get(Constants.UNICORN_USER_FULL_NAME);
	//var university = request.user.get("universityName");
	var university = request.user.get(Constants.UNICORN_USER_UNIVERSITY_NAME);
	var pushMessage = username + " studiert auch an der " + university + " und hat sich gerade registriert!";
	
	// now query for students at the same uni
	var studentsQuery = new Parse.Query(Parse.User);
	//studentsQuery.equalTo("isStudent", true);
	studentsQuery.equalTo(Constants.UNICORN_USER_IS_STUDENT, true);
	//studentsQuery.equalTo("universityName", university);
	studentsQuery.equalTo(Constants.UNICORN_USER_UNIVERSITY_NAME, university);
	studentsQuery.notEqualTo("objectId", request.user.id);

	var studentPushQuery = new Parse.Query(Parse.Installation);
	//studentPushQuery.matchesQuery("user", studentsQuery);
	studentPushQuery.matchesQuery(Constants.UNICORN_INSTALLATION_USER_POINTER, studentsQuery);
	//studentPushQuery.notEqualTo("user", request.user);
	studentPushQuery.notEqualTo(Constants.UNICORN_INSTALLATION_USER_POINTER, request.user);

	/*** DISABlED PUSH BECAUSE OF MARKETING
	
	// check if it is Apple's Fly Flyerson - no pushes then!
	if (request.user.id != "gbmxmnTyyQ") {
		// push to students
		Parse.Push.send({
			where: studentPushQuery,
			data: {
				alert: pushMessage,
				badge: "Increment",
				sound: "Push_allert.caf",
				otherUser: username
			}
		}, {
			success: function() {
				// push was successful
				response.success("success! : " + username + ", " + pushMessage);
			},
			error: function(error) {
				throw "Got an error" + error.code + " : " + error.message;
				response.error("push failed!");
			}
		});
	
	} else {
		response.success("studentPushNotificationsToStudents - Fly was here...");
	}
	*/
	
	// COMMENT OR DELETE FOLLOWING LINE IF STUDENT-TO-STUDENT PUSH SHALL BE ACTIVE AGAIN
	response.success();
});

// sending out a push notification to startups only that a new user has signed up
Parse.Cloud.define("profileUpdatedPushToStartups", function(request, response) {
	
	var isAllowed;
	var didEnablePushAgain = request.params.enabled;
	var currentDate = new Date();
	//var lastUpdateDate = request.user.get("profileUpdateDate");
	var lastUpdateDate = request.user.get(Constants.UNICORN_USER_PROFILE_UPDATE_DATE);
	var diff = Math.abs(currentDate.getTime() - lastUpdateDate.getTime());	// in milliseconds
	if (diff > 30*24*60*60*1000) {
		isAllowed = true;
	} else {
		isAllowed = false;
	}

	if (isAllowed) {
		//request.user.set("profileUpdateDate", currentDate);
		request.user.set(Constants.UNICORN_USER_PROFILE_UPDATE_DATE, currentDate);
		request.user.save();
		
		// get the name and the university of the user having called this function after onboarding/signup
		//var username = request.user.get("fullname");
		var username = request.user.get(Constants.UNICORN_USER_FULL_NAME);
		//var university = request.user.get("universityName");
		var university = request.user.get(Constants.UNICORN_USER_UNIVERSITY_NAME);
		
		// get the skills the user selected during signup to match them with skills searched by startups
		//var skills = request.user.get("skills");
		var skills = request.user.get(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY);
		
		var pushMessage;
		if (didEnablePushAgain) {
			pushMessage = username + " von der " + university + " mit deinen gesuchten Skills ist wieder auf Jobsuche!";
		} else {
			pushMessage = username + " von der " + university + " hat deine gesuchten Skills!";
		}
		
		// query only for users who are part of a startup
		var startupUsersQuery = new Parse.Query(Parse.User);
		//startupUsersQuery.equalTo("isStudent", false);
		startupUsersQuery.equalTo(Constants.UNICORN_USER_IS_STUDENT, false);
		//startupUsersQuery.equalTo("pushOption", true);
		startupUsersQuery.equalTo(Constants.UNICORN_USER_PUSH_OPTION, true);
		//startupUsersQuery.include("skills");
		startupUsersQuery.include(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY);
		//startupUsersQuery.containedIn("skills", skills);
		startupUsersQuery.containedIn(Constants.UNICORN_USER_SKILLS_POINTER_ARRAY, skills);

		var startupPushQuery = new Parse.Query(Parse.Installation);
		//startupPushQuery.matchesQuery("user", startupUsersQuery);
		startupPushQuery.matchesQuery(Constants.UNICORN_INSTALLATION_USER_POINTER, startupUsersQuery);
		
		// check if it is Apple's Fly Flyerson - no pushes then!
		if (request.user.id != "gbmxmnTyyQ") {
			// push to startups
			Parse.Push.send({
				where: startupPushQuery,
				data: {
					alert: pushMessage,
					badge: "Increment",
					sound: "Push_allert.caf",
					otherUser: username
				}
			}, {
				success: function() {
					// push was successful
					response.success("success! : " + username + ", " + pushMessage);
				},
				error: function(error) {
					throw "Got an error " + error.code + " : " + error.message;
					response.error("startup push failed!");
				}
			});
		
		} else {
			response.success("profileUpdatedPushToStartups - Fly was here...");
		}
		
	} else {
		response.success("may only send out pushes via profile-save once a month");
	}
	
});


/*
Parse.Cloud.beforeSave(Parse.Installation, function(request) {
	
	if (!request.object.get(Constants.UNICORN_INSTALLATION_USER_POINTER)) {
		console.warn("Parse.Installation - afterSave - WARNING user pointer of installation object not set: " + JSON.stringify(request.object));
		request.object.set(Constants.UNICORN_INSTALLATION_USER_POINTER, request.user);
	}
	
	var theACL = request.object.getACL();
	if (theACL.getPublicWriteAccess()) {
		var newACL = new Parse.ACL(request.user);
		newACL.setPublicWriteAccess(false);
		
		request.object.setACL(newACL);
	}
});
*/


/*
Parse.Cloud.afterSave(Parse.Installation, function(request) {
	//Parse.Cloud.useMasterKey();
	
	var one = false;
	var two = false;
	
	if (!request.object.get(Constants.UNICORN_INSTALLATION_USER_POINTER)) {
		console.warn("Parse.Installation - afterSave - WARNING user pointer of installation object not set: " + JSON.stringify(request.object));
		request.object.set(Constants.UNICORN_INSTALLATION_USER_POINTER, request.user);
		var one = true;
	}
	
	var theACL = request.object.getACL();
	if (theACL.getPublicWriteAccess()) {
		var newACL = new Parse.ACL(request.user);
		newACL.setPublicWriteAccess(false);
		
		request.object.setACL(newACL);
		var two = true;
	}

	if (one || two) {
		request.object.save();
	}
});
*/


Parse.Cloud.beforeSave("_User", function(request, response) {
	
	if (request.object.dirty(Constants.UNICORN_USER_TRACKS_POINTER_ARRAY) && request.object.dirty(Constants.UNICORN_USER_EVENTS_POINTER_ARRAY)) {
		// user has registered for a (new) track (and therefore event)
		console.log(request);
		console.log("Parse.User - beforeSave - tracks array dirty");
		
		//Parse.Cloud.useMasterKey();
		
		var tracksArray = request.object.get(Constants.UNICORN_USER_TRACKS_POINTER_ARRAY);
		// last object of the array is always the new object, in our case a pointer to a track object
		if (undefined == tracksArray)
		{
				console.error("Parse.User - beforeSave - ERROR tracksarray is undefined ");
				response.success();
			
		}
		var newTrack = tracksArray[tracksArray.length-1];
		
		newTrack.fetch({useMasterKey: true}).then(function(newTrack){
			
			console.log("Parse.User - beforeSave - fetched new track object and ready to increment numberAttendants-field");
			
			newTrack.increment(Constants.UNICORN_TRACK_ATTENDANTS_NUMBER);
			
			console.log("Parse.User - beforeSave - incremented numberAttendants-field of fetched new track object");
			
			var newEvent = newTrack.get(Constants.UNICORN_TRACK_EVENT_POINTER);
			
			newEvent.fetch().then(function(newEvent) {
				
				console.log("Parse.User - beforeSave - fetched new event object and ready to increment numberAttendants-field");
				
				newEvent.increment(Constants.UNICORN_EVENT_ATTENDANTS_NUMBER);
				
				console.log("Parse.User - beforeSave - incremented numberAttendants-field of fetched new event object");
				
				Parse.Object.saveAll([newEvent, newTrack]).then(response.success());
				
			}, function(eventError) {
				console.error("Parse.User - beforeSave - ERROR fetching new event object " + eventError.code + ": " + eventError.message);
				response.error("Parse.User - beforeSave - ERROR fetching new event object " + eventError.code + ": " + eventError.message);
			});
			
		}, function(trackError){
			console.error("Parse.User - beforeSave - ERROR fetching new track object " + trackError.code + ": " + trackError.message);
			response.error("Parse.User - beforeSave - ERROR fetching new track object " + trackError.code + ": " + trackError.message);
		});
	

	} else {
		response.success();
	}
});



/*
Parse.Cloud.afterSave(Parse.User, function(request) {
	var isStudent = request.object.get("isStudent");
	if (isStudent == true) {
		// user is a student
		if (!request.object.get("startup")) {
			response.success("success! valid user : " request.object);
		} else {
			request.object.destroy({
				success: function(request.object) {
					// the user was deleted from Parse
					response.error("there was an error with this user, we're sorry we have to delete him/her");
				},
				error: function(request.object, error) {
					// the delete faild
					response.error("there was an error with this user, we wanted to delete him/her, but the delete failed");
				}
			});
		}
	} else if (isStudent == false) {
		// user is from a startup
		if (!request.object.get("university") && !request.object.get("universityName")) {
			// check if the user has set fields he must not have as an user from a startup
			response.success("success! valid user: " + request.object);
		} else {
			request.object.destroy({
				success: function(request.object) {
					// the user was deleted from Parse
					//response.error("there was an error with this user, we're sorry we have to delete him/her");
				},
				error: function(request.object, error) {
					// the delete faild
					response.error("there was an error with this user, we wanted to delete him/her, but the delete failed");
				}
			});
		}
	} else {
		// do nothing since student/startup property not yet set
		response.success("success! university/startup 'property' of user not yet set");
	}
});
*/


// incrementing/decrementing the number of attendants of an event if the user joins/unjoins it
Parse.Cloud.define("joinEvent", function (request, response) {
	
	var joinedEvent = request.params.joinedEvent;
	
	var eventQuery = new Parse.Query(Constants.UNICORN_EVENT_CLASS_NAME);
	eventQuery.equalTo("objectId", request.params.eventId);
	
	eventQuery.first().then(function(theEvent) {
		if (joinedEvent) {
			theEvent.increment(Constants.UNICORN_EVENT_ATTENDANTS_NUMBER);
			console.log("joinEvent - joined event, so incremented attendants number");
		} else {
			theEvent.increment(Constants.UNICORN_EVENT_ATTENDANTS_NUMBER, -1);
			console.log("joinEvent - unjoined event, so decremented attendants number");
		}
		
		theEvent.save().then(response.success());
		
	}, function(eventError) {
		console.error("joinEvent - ERROR getting first event object " + eventError.code + ": " + eventError.message);
		response.error("joinEvent - ERROR getting first event object " + eventError.code + ": " + eventError.message);
	});
});


// delete related data when deleting an user
Parse.Cloud.afterDelete(Parse.User, function(request) {
	Parse.Cloud.useMasterKey();

	// delete the users installation object
	var installationQuery = new Parse.Query(Parse.Installation);
	//installationQuery.equalTo("user", request.object);
	installationQuery.equalTo(Constants.UNICORN_INSTALLATION_USER_POINTER, request.object);

	installationQuery.find().then(function(installations) {
		Parse.Object.destroyAll(installations);
	}).then(function(success) {
		// the users installation(s) were deleted
		console.log("Parse.User - afterDelete - the users installation(s) were deleted successfully");
	}, function(error) {
		console.error("Parse.User - afterDelete - ERROR deleting related installation(s) " + error.code + ": " + error.message);
	});


	// delete the users private data object
	//var privateQuery = new Parse.Query("PrivateUserData");
	var privateQuery = new Parse.Query(Constants.UNICORN_PRIVATE_USER_DATA_CLASS_NAME);
	//if (request.object.get("privateData") != undefined) {	
	if (request.object.get(Constants.UNICORN_USER_PRIVATE_USER_DATA_POINTER) != undefined) {
		//privateQuery.equalTo("objectId", request.object.get("privateData").id);
		privateQuery.equalTo("objectId", request.object.get(Constants.UNICORN_USER_PRIVATE_USER_DATA_POINTER).id);

		privateQuery.find().then(function(privateDatas) {
			Parse.Object.destroyAll(privateDatas);
		}).then(function(success) {
			// the users private data(s) were deleted
			console.log("Parse.User - afterDelete - the users private data(s) were deleted successfully");
		}, function(error) {
			console.error("Parse.User - afterDelete - ERROR deleting users private data(s) " + error.code + ": " + error.message);
		});
	}


	// delete the users "chatrooms"
	//var messagesQuery1 = new Parse.Query("Messages");
	var messagesQuery1 = new Parse.Query(Constants.UNICORN_MESSAGES_CLASS_NAME);
	//messagesQuery1.equalTo("toUser", request.object);
	messagesQuery1.equalTo(Constants.UNICORN_MESSAGES_TO_USER_POINTER, request.object);

	//var messagesQuery2 = new Parse.Query("Messages");
	var messagesQuery2 = new Parse.Query(Constants.UNICORN_MESSAGES_CLASS_NAME);
	//messagesQuery2.equalTo("user", request.object);
	messagesQuery2.equalTo(Constants.UNICORN_MESSAGES_USER_POINTER, request.object);

	var messagesQuery = Parse.Query.or(messagesQuery1, messagesQuery2);

	//messagesQuery.each(function(theMessages) {
	messagesQuery.find().then(function(theMessages) {
		Parse.Object.destroyAll(theMessages);
	}).then(function(success) {
		// all of the users "chatrooms" were deleted
		console.log("Parse.User - afterDelete - the users 'chatrooms' were deleted successfully");
	}, function(error) {
		console.error("Parse.User - afterDelete - ERROR deleting users 'chatrooms' " + error.code + ": " + error.message);
	});


	// delete user from event, if attending one or more
	//if (request.object.get("events") != undefined) {
	if (request.object.get(Constants.UNICORN_USER_EVENTS_POINTER_ARRAY) != undefined) {
		//if (request.object.get("events").length > 0) {
		if (request.object.get(Constants.UNICORN_USER_EVENTS_POINTER_ARRAY).length > 0) {
			var usersEvents = [];
			//var eventsArray = request.object.get("events");
			var eventsArray = request.object.get(Constants.UNICORN_USER_EVENTS_POINTER_ARRAY);
			for (var i in eventsArray) {
				usersEvents.push(eventsArray[i].id);
				//console.log("Parse.User - afterDelete - events - event " + i + " with id: " + request.object.get("events")[i].id);
				//console.log("Parse.User - afterDelete - events - event " + i + " with id: " + request.object.get(Constants.UNICORN_USER_EVENTS_POINTER_ARRAY)[i].id);
			}
			// all the events the user was attending are now in the array 'usersEvents'
			//console.log("Parse.User - afterDelete - events - usersEvents: " + JSON.stringify(usersEvents));

			//var eventQuery = new Parse.Query("Event");
			var eventQuery = new Parse.Query(Constants.UNICORN_EVENT_CLASS_NAME);
			eventQuery.containedIn("objectId", usersEvents);
			// only future events
			var currentDate = new Date();
			//eventQuery.greaterThanOrEqualTo("eventDate", currentDate);
			eventQuery.greaterThanOrEqualTo(Constants.UNICORN_EVENT_EVENT_DATE, currentDate);

			eventQuery.find().then(function(events) {
				for (var i in events) {

					//var EventClass = Parse.Object.extend("Event");
					var EventClass = Parse.Object.extend(Constants.UNICORN_EVENT_CLASS_NAME);
					var theEvent = new EventClass();
					theEvent = events[i];

					// recude the number of attendants by one
					//theEvent.increment("numberAttendants", -1);
					theEvent.increment(Constants.UNICORN_EVENT_ATTENDANTS_NUMBER, -1);

					// remove the user from the array of attending users
					//var userArray = theEvent.get("userAttendants");
					var userArray = theEvent.get(Constants.UNICORN_EVENT_ATTENDANTS_POINTER_ARRAY);
					for (var j in userArray) {
						if (userArray[j].id == request.object.id) {
							userArray.splice(j, 1);
							//console.log("Parse.User - afterDelete - events - splicing events[i].get(userAttendants)");
							break;
						}
					}

					//theEvent.set("userAttendants", userArray);
					theEvent.set(Constants.UNICORN_EVENT_ATTENDANTS_POINTER_ARRAY, userArray);
					theEvent.save();
				}
			}).then(function(success) {
				// the user was deleted from events
				console.log("Parse.User - afterDelete - the user was successfully deleted from his events");
			}, function(error) {
				console.error("Parse.User - afterDelete - ERROR deleting user from events " + error.code + ": " + error.message);
			});
		}
	}
});

// delete the chat items of a 'chatroom' when it is deleted itself
Parse.Cloud.afterDelete("Messages", function(request) {
	Parse.Cloud.useMasterKey();

	//var chatItemsQuery = new Parse.Query("Chat");
	var chatItemsQuery = new Parse.Query(Constants.UNICORN_CHAT_CLASS_NAME);
	//chatItemsQuery.equalTo("roomId", request.object.get("roomId"));
	chatItemsQuery.equalTo(Constants.UNICORN_CHAT_ROOM_ID, request.object.get(Constants.UNICORN_MESSAGES_ROOM_ID));

	//chatItemsQuery.each(function(chatItem) {
	chatItemsQuery.find().then(function(chatItems) {
		Parse.Object.destroyAll(chatItems);
	}).then(function(success) {
		// all chat items of the 'chatroom' were deleted (as well)
		console.log("Messages - afterDelete - chat items of 'chatroom' were deleted successfully");
	}, function(error) {
		console.error("Messages - afterDelete - ERROR deleting chat items of 'chatroom' " + error.code + ": " + error.message);
	});
});


//has to be replaced by some kind of cron job

// background job for deleting invalid installations
/*
Parse.Cloud.job("deleteInstallations", function(request, status) {
	Parse.Cloud.useMasterKey();

	var installationQuery = new Parse.Query(Parse.Installation);

	installationQuery.each(function(theInstallation) {
		//if (theInstallation.get("user") != undefined) {
		if (theInstallation.get(Constants.UNICORN_INSTALLATION_USER_POINTER) != undefined) {
			//var theUser = theInstallation.get("user");
			var theUser = theInstallation.get(Constants.UNICORN_INSTALLATION_USER_POINTER);
			theUser.fetch().then(function(theFetchedUser) {
				if (theFetchedUser.isValid) {
					// do nothing
				} else {
					Parse.Object.destroyAll(theInstallation);
				}
			});
		} else {
			// delete installation object as well? I think so...
			Parse.Object.destroyAll(theInstallation);
		}
	}).then(function() {
        // set the job's success status
        status.success("deleteInstallations - invalid installation objects were deleted successfully");
    }, function(error) {
        // set the job's error status
        status.error("deleteInstallations - ERROR trying to delete invalid installation objects " + error.code + ": " + error.message);
    });
});
*/
