(function () {
	
	
	async function fetchWithTimeout(URL, timeout=8000){ // ref: https://dmitripavlutin.com/timeout-fetch-request/
		try {
			const controller = new AbortController();
			const timeout_id = setTimeout(() => controller.abort(), timeout);
			const response = await fetch(URL, {...{timeout:timeout}, signal: controller.signal});
			clearTimeout(timeout_id);
			return response;
		} catch(e){
			errorlog(e);
			return await fetch(URL); // iOS 11.x/12.0
		}
	}


	function getTwitchAvatarImage(username){
		fetchWithTimeout("https://api.socialstream.ninja/twitch/avatar?username="+encodeURIComponent(username)).then(response => {
			response.text().then(function (text) {
				if (text.startsWith("https://")){
					brandedImageURL = text;
				} 
			});
		}).catch(error => {
			//console.log("Couldn't get avatar image URL. API service down?");
		});
	}
	
	var brandedImageURL = "";
	var xx = window.location.pathname.split("/");
	var index = xx.indexOf("chat");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	index = xx.indexOf("u");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	index = xx.indexOf("moderator");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	index = xx.indexOf("dashboard");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	index = xx.indexOf("");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	index = xx.indexOf("popout");
	if (index > -1) {
	  xx.splice(index, 1); // 2nd parameter means remove one item only
	}
	if (xx[0]){
		getTwitchAvatarImage(xx[0]);
	}
	
	function getAllContentNodes(element) {
		var resp = "";
		element.childNodes.forEach(node=>{
			if (node.childNodes.length){
				resp += getAllContentNodes(node)
			} else if ((node.nodeType === 3) && (node.textContent.trim().length > 0)){
				resp += node.textContent;
			} else if (node.nodeType === 1){
				resp += node.outerHTML;
			}
		});
		return resp;
	}
	
	function processMessage(ele){	// twitch
	  var chatsticker = false;
	  var chatmessage = "";
	  var nameColor = "";
	  
	  //console.log(ele);
	  
	  try {
		var nameEle = ele.querySelector(".chat-author__display-name");
		var chatname = nameEle.innerText;
		try {
			nameColor = nameEle.style.color;
		} catch(e){}
	  } catch(e){return;}
	  
	  var chatbadges = [];
	  
	  ele.querySelectorAll("img.chat-badge[src]").forEach(badge=>{
		chatbadges.push(badge.src);
	  });
	  
	  try {
		var BTT = ele.querySelectorAll('.bttv-tooltip');
		for (var i=0;i<BTT.length;i++){
			BTT[i].outerHTML = "";
		}
	  } catch(e){}
	  
	  if (!textOnlyMode){
		  try {
			var eleContent = ele.querySelector(".seventv-message-context") || ele.querySelector('*[data-test-selector="chat-line-message-body"]');
			chatmessage = getAllContentNodes(eleContent);
		  } catch(e){}
		 
		  if (!chatmessage){
			  try {
				var eleContent = ele.querySelector('span.message');
				
				chatmessage = getAllContentNodes(eleContent);
			  } catch(e){}
		  }
		  
		  if (!chatmessage){
			  try {
				var eleContent = ele.querySelector(".chat-line__message-container").querySelector('span[data-test-selector="chat-message-separator"]');
				chatmessage = getAllContentNodes(eleContent);
				
				eleContent = eleContent.nextElementSibling;
				var count = 0;
				while (eleContent){
					count++;
					chatmessage += getAllContentNodes(eleContent);
					eleContent = eleContent.nextElementSibling;
					if (count>20){
						break
					}
				}
			  } catch(e){}
		  }
		  
	  } else if (ele.querySelector(".seventv-message-context")){
		    var cloned = ele.querySelector(".seventv-message-context").cloneNode(true);
			var children = cloned.querySelectorAll("[alt]");
			for (var i =0;i<children.length;i++){
				children[i].outerHTML = children[i].alt;
			}
			/* var children = cloned.querySelectorAll('[role="tooltip"]');
			for (var i =0;i<children.length;i++){
				children[i].outerHTML = "";
			} */
			chatmessage = cloned.innerText;
	  } else {
		  try{
			var cloned = ele.querySelector('*[data-test-selector="chat-line-message-body"]').cloneNode(true);
			var children = cloned.querySelectorAll("[alt]");
			for (var i =0;i<children.length;i++){
				children[i].outerHTML = children[i].alt;
			}
			/* var children = cloned.querySelectorAll('[role="tooltip"]');
			for (var i =0;i<children.length;i++){
				children[i].outerHTML = "";
			} */
			chatmessage = cloned.innerText;
		  } catch(e){}
	  }
	  
	  
	  var donations = 0;
	  try {
		var elements = ele.querySelectorAll('.chat-line__message--cheer-amount'); // FFZ support
		
		for (var i=0;i<elements.length;i++){
			donations += parseInt(elements[i].innerText);
		}
		if (donations==1){
			donations += " bit";
		} else if (donations>1){
			donations += " bits";
		}
	  } catch(e){}

	  var hasDonation = '';
	  if (donations) {
		hasDonation = donations;
	  }
	  
	  if (!chatmessage && !hasDonation){
		return;
	  }

	  var data = {};
	  data.chatname = chatname;
	  data.chatbadges = chatbadges;
	  data.nameColor = nameColor;
	  data.chatmessage = chatmessage;
	  data.chatimg = "";
	  data.hasDonation = hasDonation;
	  data.hasMembership = "";
	  data.type = "twitch";
	  
	 // console.log(data);
	  
	  if (brandedImageURL){
		data.sourceImg = brandedImageURL;
	  }
	  try {
		chrome.runtime.sendMessage(chrome.runtime.id, { "message": data }, function(e){});
	  } catch(e){
		  //
	  }
	}

	chrome.runtime.onMessage.addListener(
		function (request, sender, sendResponse) {
			try{
				if ("focusChat" == request){
					document.querySelector('[data-a-target="chat-input"]').focus();
					sendResponse(true);
					return;
				}
				if ("textOnlyMode" == request){
					textOnlyMode = true;
					sendResponse(true);
					return;
				} else if ("richTextMode" == request){
					textOnlyMode = false;
					sendResponse(true);
					return;
				}
				// twitch doesn't capture avatars already.
			} catch(e){}
			sendResponse(false);
		}
	);
	
	var lastMessage = "";
	var textOnlyMode = false;
	chrome.runtime.sendMessage(chrome.runtime.id, { "getSettings": true }, function(response){  // {"state":isExtensionOn,"streamID":channel, "settings":settings}
		if ("settings" in response){
			if ("textonlymode" in response.settings){
				textOnlyMode = response.settings.textonlymode;
			}
		}
	});  /////

	function onElementInsertedTwitch(containerSelector, className, callback) {
		var onMutationsObserved = function(mutations) {
			mutations.forEach(function(mutation) {
				if (mutation.addedNodes.length) {
					for (var i = 0, len = mutation.addedNodes.length; i < len; i++) {
						var textBody = mutation.addedNodes[i].innerText;
						mutation.addedNodes[i].querySelectorAll("img[alt]").forEach(ttt=>{
							textBody += ttt.getAttribute("alt");
						});
						
						//console.log(textBody);
						
						if (textBody && (textBody === lastMessage)){
							mutation.addedNodes[i].ignore = true;
							continue;
						} else if (!textBody){
							continue;
						}
						
						lastMessage = textBody;
						
						if (mutation.addedNodes[i].ignore){continue;}
						
						if (mutation.addedNodes[i].className && mutation.addedNodes[i].classList.contains(className)) {
							callback(mutation.addedNodes[i]);
							mutation.addedNodes[i].ignore=true;
						} else {
							try{
								var childEle = mutation.addedNodes[i].querySelector("."+className);
								if (childEle){
									callback(childEle);
									mutation.addedNodes[i].ignore=true;
									childEle.ignore=true;
								}
							} catch(e){}
						}
					}
				}
			});
		};
		var target = document.querySelectorAll(containerSelector)[0];
		var config = { childList: true, subtree: true };
		var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		var observer = new MutationObserver(onMutationsObserved);
		observer.observe(target, config);
	}
	
	setTimeout(function(){
		
		var clear = document.querySelectorAll(".chat-line__message");
		for (var i = 0;i<clear.length;i++){
			clear[i].ignore = true; // don't let already loaded messages to re-load.
		}
		onElementInsertedTwitch(".chat-scrollable-area__message-container", "chat-line__message", function(element){
		  setTimeout(function(element){processMessage(element);},10, element);
		});
	},2000);
	
	///////// the following is a loopback webrtc trick to get chrome to not throttle this twitch tab when not visible.
	try {
		var receiveChannelCallback = function(e){
			remoteConnection.datachannel = event.channel;
			remoteConnection.datachannel.onmessage = function(e){};;
			remoteConnection.datachannel.onopen = function(e){};;
			remoteConnection.datachannel.onclose = function(e){};;
			setInterval(function(){
				if (document.hidden){ // only poke ourselves if tab is hidden, to reduce cpu a tiny bit.
					remoteConnection.datachannel.send("KEEPALIVE")
				}
			}, 800);
		}
		var errorHandle = function(e){}
		var localConnection = new RTCPeerConnection();
		var remoteConnection = new RTCPeerConnection();
		localConnection.onicecandidate = (e) => !e.candidate ||	remoteConnection.addIceCandidate(e.candidate).catch(errorHandle);
		remoteConnection.onicecandidate = (e) => !e.candidate || localConnection.addIceCandidate(e.candidate).catch(errorHandle);
		remoteConnection.ondatachannel = receiveChannelCallback;
		localConnection.sendChannel = localConnection.createDataChannel("sendChannel");
		localConnection.sendChannel.onopen = function(e){localConnection.sendChannel.send("CONNECTED");};
		localConnection.sendChannel.onclose =  function(e){};
		localConnection.sendChannel.onmessage = function(e){};
		localConnection.createOffer()
			.then((offer) => localConnection.setLocalDescription(offer))
			.then(() => remoteConnection.setRemoteDescription(localConnection.localDescription))
			.then(() => remoteConnection.createAnswer())
			.then((answer) => remoteConnection.setLocalDescription(answer))
			.then(() =>	{
				localConnection.setRemoteDescription(remoteConnection.localDescription);
				console.log("KEEP ALIVE TRICk ENABLED");
			})
			.catch(errorHandle);
	} catch(e){
		console.log(e);
	}

})();