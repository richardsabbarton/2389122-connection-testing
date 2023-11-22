let test = {}
test.sessionConnected = false
test.publishing = false

log("Page Loaded...")

navigator.getUserMedia(
    {audio: true, video: true}
    ,()=>{
        initialiseMediaDevices()
    }, (error)=>{
        log(error)
    })



function initialiseMediaDevices(){

    log("Detecting Media Devices")

    let deviceSelection = document.getElementById("deviceselection")
    let cameraSelect = document.createElement("select")
    let micSelect = document.createElement("select")
    let audioOutSelect = document.createElement("select")
    

    cameraSelect.classList.add("deviceselect")
    micSelect.classList.add("deviceselect")
    audioOutSelect.classList.add("deviceselect")
    
    cameraSelect.onchange = ()=>{
        if(test.publishing)
            log("selecting video device: " + cameraSelect.value)
            test.publisher.setVideoSource(cameraSelect.value)
    }

    micSelect.onchange = ()=>{
        if(test.publishing)
            log("selecting audio device: " + micSelect.value)
            test.publisher.setAudioSource(micSelect.value)
    }

    audioOutSelect.onchange = ()=>{
        if(test.publishing)
            log("selecting audio output device: " + audioOutSelect.value)
            test.outputDeviceId = audioOutSelect.value
            OT.subscribers.map(e=>e).forEach(s=>{s.element.childNodes[0].childNodes[2].setSinkId(test.outputDeviceId)})
    }

    navigator.mediaDevices.enumerateDevices()
    .then(d=>{
        d.map(o=>o).forEach(i=>{
            if(i.kind == "videoinput" && i.deviceId != "default"){
                log("VIDEO IN: " + i.label)
                let o = document.createElement("option")
                o.value = i.deviceId
                o.innerHTML = "Camera: " + i.label
                cameraSelect.appendChild(o)
            }
            if(i.kind == "audioinput" && i.deviceId != "default"){
                log("AUDIO IN: " + i.label)
                let o = document.createElement("option")
                o.value = i.deviceId
                o.innerHTML = "Audio In: " + i.label
                micSelect.appendChild(o)
            }
            if(i.kind == "audiooutput") {
                log("AUDIO OUT: " + i.label)
                let o = document.createElement("option")
                o.value = i.deviceId
                o.innerHTML = "Audio Out: " + i.label
                audioOutSelect.appendChild(o)
            }
        })
        deviceSelection.appendChild(cameraSelect)
        deviceSelection.appendChild(micSelect)
        deviceSelection.appendChild(audioOutSelect)
    })

}

function getSessionCredentials(){
    log("Get Credentials Clicked")
    test.apiKey = document.getElementById("selectapikey").value
    test.roomName = document.getElementById("textroomname").value

    log("Using API Key: " + test.apiKey)
    log("Using Room: " + test.roomName)

    fetch(`/session/${test.apiKey}/${test.roomName}`).then(function fetch(res) {
        return res.json()
    }).then(function fetchJson(json) {
        test.apiKey = json.apiKey
        test.sessionId = json.sessionId
        test.token = json.token
        log(JSON.stringify(test))
        log("Credentials collected")
    }).catch(function catchErr(error) {
        log(error);
        log('Failed to get opentok sessionId and token. Make sure you have updated the config.js file.');
    })
}

function handleError(error) {
  if (error) {
    log(error)
    console.error(error);
  }
}

function initializeSession() {
    log("Session Connect Clicked")
    
    if(test.sessionConnected){
        log("Session Already Connected - Aborting")
        return
    }

    test.session = OT.initSession(test.apiKey, test.sessionId);

    // Subscribe to a newly created stream
    test.session.on('streamCreated', (event) => {
        const subscriberOptions = {
        insertMode: 'append',
        width: '100%',
        height: '100%'
        };
        log('Session Event: streamCreated - ' + event.stream.id)
        test.session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
    });

    test.session.on('sessionDisconnected', (event) => {
        log('Session Event: sessionDisconnected ' + event.reason);
    });
  
    test.session.on("streamDestroyed", (event)=>{

        log("Session Event: streamDestroyed " + event.reason);
        
        
    });

    test.session.connect(test.token, (error) => {
        if (error) {
        handleError(error);
        } else {
        // If the connection is successful, publish the publisher to the session
        log("Session Connected OK")
        test.sessionConnected = true
        }
    });

}



function publishStream(){
    // initialize the publisher
    if(!test.sessionConnected){
        log("Session Not Connected - Aborted Publishing")
        return
    }
  
    if(test.publishing){
        if(test.publisher.stream.id.length > 0){
            log("already publishing - aborted")
            return
        }
    }
  
    test.publisherOptions = {
        insertMode: 'append',
        width: '100%',
        height: '100%'
    }
    log(test.publisherOptions)

    test.publisher = OT.initPublisher('publisher', test.publisherOptions, handleError)
    
    test.publisher.on("mediaStopped",(e)=>{
        log("Publisher Event: mediaStopped - " + e.reason)
    })

    log("Publisher Initialised")
    test.session.publish(test.publisher, handleError)
    test.publishing = true
}

function getRTCStatsReport(){
    if(!test.publishing){
        log("Not publishing - Aborted")
        return
    }

    test.publisher.getRtcStatsReport()
    .then((r)=>{

        console.log(r[0].entries())

    })
    .catch((e)=>{
        log("Failed to get report")
        log(e)
    })
}


function log(){
    for(let i = 0; i < arguments.length; i++){
        logSingle(arguments[i])
    }
}

function logSingle(l){
    let out
    if(typeof(l) === 'object'){
        out = JSON.stringify(l)
    } else {
        out = l
    }

    let entry = document.createElement('div')
    entry.class = "logentry"
    let t = new Date()
    let time = t.toLocaleDateString() + " " + t.toLocaleTimeString() + "." + t.getMilliseconds()
    entry.innerHTML = time + " - " + out

    document.getElementById('logs').firstElementChild.prepend(entry)

}