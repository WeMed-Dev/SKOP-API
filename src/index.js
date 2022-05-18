const OT = require('@opentok/client');
const detection = require('./detection');
const visualisation = require('./visualisation');
const axios = require("axios");
const Swal = require('sweetalert2');


/**
 * Displays any error messages.
 * @param {*} error 
 */
function handleError(error) {
    if (error) console.error(error);
}


class Filter{
    filter;
    gain;
    mediaRecorder;

    static AORTIC = "Aortic";
    static MITRAL = "Mitral";
    static PULMONARY = "Pulmonary";
    static TRICUSPID = "Tricuspid";

    constructor(){
        this.gain = 10; //default gain
    }

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone
     */
    async ModifyAudio(heartZone, patient) {

        try{

            // define variables
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let stream = await navigator.mediaDevices.getUserMedia ({audio: true,video: false})
            let audioSource = audioCtx.createMediaStreamSource(stream);
            let audioDestination = audioCtx.createMediaStreamDestination();

            //Create the biquad filter
            let biquadFilter = audioCtx.createBiquadFilter();
            this.filter = biquadFilter;

            if(heartZone === Filter.AORTIC || heartZone === Filter.MITRAL || heartZone === Filter.TRICUSPID){
                biquadFilter.type = "lowshelf"; // low shelf filter
                biquadFilter.frequency.setValueAtTime(250, audioCtx.currentTime); // 250Hz
                biquadFilter.gain.setValueAtTime(10, audioCtx.currentTime);

                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);

            }


            if(heartZone === Filter.PULMONARY){ // les ondes entres 80 et 500 sont limitées

                biquadFilter.type = "peaking"; // peaking filter
                biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
                biquadFilter.Q.setValueAtTime(this.gain, audioCtx.currentTime);

                // connect the nodes together
                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);
            }

            console.log("Recording started");
            this.mediaRecorder = new MediaRecorder(audioDestination.stream);
            this.mediaRecorder.start();
            this.mediaRecorder.addEventListener("dataavailable", (event) => {
                var audio = document.createElement("audio");
                // use the blob from the MediaRecorder as source for the audio tag
                audio.src = URL.createObjectURL(event.data);
                this.sendAudio(event.data, heartZone, patient);
                document.body.appendChild(audio);
                audio.play();
            });

           visualisation(audioDestination.stream, document.getElementById("canvas"));



            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT

            // Sets the OT.publisher Audio Source to be the modified stream.
            patient.setAudioSource(audioDestination.stream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
        }catch(error){
            handleError(error);
        }
    }

    async defaultAudio(patient){
        try{
            if(this.mediaRecorder !== undefined){
                this.mediaRecorder.stop();
            }
            let defaultAudio = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            let defStreamTrack = defaultAudio.getAudioTracks()[0];
            patient.setAudioSource(defStreamTrack);
            console.log("SKOP : Audio input set to default - No modifications")
        }catch(err){
            handleError(err)
        }
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    setGain(gain){
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.filter.gain.setValueAtTime(gain, audioCtx.currentTime);
        this.gain = gain;
    }


    sendAudio(audioBlob, heartZone, patient) {
        /*
        //Create a FormData object
        let formData = new FormData();
        // Append the audio file to the form data
        formData.append("file", audioBlob);
        // Append the session id to the form data
        formData.append("sessionId", patient.getSessionId());
        // Append the zone to the form data
        formData.append("zone", heartZone);
        console.log(Array.from(formData))

        // Send the form data to the server
        axios.post('http://localhost:3000/audio', formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            }
        })
            .catch(err => {
                console.log(err);
            })



        // TESTING
        axios.get('http://localhost:3000/last')
            .then(res =>{
                console.log("res.data.data : ", res.data.data);

                let array = new Uint8Array(res.data.data.data);

                // create audio element and set its source to the blob
                //convert res to blob
                let blob = new Blob([array], {type: 'audio/ogg; codecs=opus'});
                console.log(blob);

                //create URL + audio element
                let url = window.URL.createObjectURL(blob);
                let audio = document.createElement('audio');
                audio.src = url;
                audio.controls = true;

                //append audio element to the page
                document.body.appendChild(audio);
            })
    }
    */


        var reader = new FileReader();
        reader.onload = function() {
           console.log(reader.result);
            axios.post("http://localhost:3000/audioJson", {
                sessionId: patient.getSessionId(),
                zone: heartZone,
                //TODO : change to base64
                binary: reader.result
            }, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .catch(err => {
                    console.log(err);
                })
                .then(res => {
                    console.log(res);
                })
                .catch(err => {
                    console.log(err);
                });
        }
        reader.readAsArrayBuffer(audioBlob);
    }
}


class Patient {

    /**
     * @type {boolean} Indicates the current mode between conversation and gain.
     */
    #usingSkop;

    /**
     * @type {OT.Session} The session object.
     */
    #session

    #sessionId;

    #publisher;

    /**
     * @type {Filter} The filter object.
     */
    #filter

    #skopDetected = false;


    //TODO : constructor(API_KEY_WEMED, ROOM_ID)
    constructor(apiKey, token, sessionId) {

        if(navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
            Swal.fire({
                title: 'Warning',
                text: 'This app is not compatible with iOS devices. Please use an Android device or a computer.',
                icon: 'warning',
                confirmButtonText: 'OK'
            });
        }
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;

        this.#filter = new Filter();

        /**
         * @@type {OT.Session} The session object.
         */
        const session = OT.initSession(apiKey, sessionId);
        this.#session = session;
        this.#sessionId = sessionId;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            var subscriberOptions = {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        });

        // When a user receive a signal with a heartZone, it modifies the audio input of the user.
        session.on("signal:heartZone", function(event) {
            self.#useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });

        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function(event) {
            self.#stopUsingSkop()
                .catch(e => {
                console.log("Error stopping using Skop" + e);
            });
        });

        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event) {
            //console.log("Signal data: " + event.data);
            self.#setGain(event.data)
        });

        // initialize the publisher
        var publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };
        var publisher = OT.initPublisher('publisher', publisherOptions, handleError)
        this.#publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.

        // Connect to the session
        session.connect(token, function callback(error) {
            if (error) {
                handleError(error);
            } else {
                // If the connection is successful, publish the publisher to the session
                session.publish(publisher , handleError);
            }
        });
    }


    //--------- SKOP MANIPULATION METHODS ---------//
    #init(){
        OT.getUserMedia({audio:true}).then( res =>{detection(res);});
    }

    async #useSkop(heartZone){
        if(!this.#skopDetected){
            this.#init();
            this.#skopDetected = true;
        }
        this.#setUsingSkop(true);
        this.#filter.ModifyAudio(heartZone, this);
    }

    async #stopUsingSkop(){
        this.#setUsingSkop(false)
        this.#filter.defaultAudio(this.#publisher, this);
    }

    //--------- SIGNALING ---------//

    #signalVisualisationData(visualisationData){
        this.#session.signal({
            type: 'visualisationData',
            data: visualisationData
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    //--------- GETTER AND SETTER  ---------//

    /**
     *  Returns the audio source of the user, if it is available.
     * @returns The current MediaStreamTrack of the user.
     */
    getAudioSource() {
        return this.#publisher.getAudioSource();
    }

    /**
     * Sets the users current's Audio source.
     * @param {MediaStreamTrack} audioSource
     */
    setAudioSource(audioSource) {
        this.#publisher.setAudioSource(audioSource);
    }

    /**
     * Sets the current level of gain of the patient's Skop audio output.
     */
    #setGain(gain){
        //let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        //this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);

        this.#filter.setGain(gain);
    }

    #setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

    getSessionId(){
        return this.#sessionId;
    }
}

class Doctor {
    /**
     * @type {OT.Session} The session object.
     */
    #session
    /**
     * @type {OT.Publisher} The publisher object.
     */
    #publisher;

    constructor(apiKey, token, sessionId) {

        /**
         * @@type {OT.Session} The session object.
         */
        const session = OT.initSession(apiKey, sessionId);
        this.#session = session;

        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            var subscriberOptions = {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        });

        // initialize the publisher
        var publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        };
        var publisher = OT.initPublisher('publisher', publisherOptions, handleError)
        this.#publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.

        // Connect to the session
        session.connect(token, function callback(error) {
            if (error) {
                handleError(error);
            } else {
                // If the connection is successful, publish the publisher to the session
                session.publish(publisher , handleError);
            }
        });
    }

    //---- USING SKOP -------//
    skop(heartZone){
        if(heartZone === null || heartZone === undefined || heartZone === ""){
            this.#signalStopUsingSkop();
        }
        else{
            this.#signalHeartZone(heartZone);
        }
    }

    changeGainLevel(gain){
        this.#signalGain(gain);
    }

    //------ SIGNALING ------//

    #signalHeartZone(signal) {
        this.#session.signal({
            type: 'heartZone',
            data: signal
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    #signalStopUsingSkop() {
        this.#session.signal({
            type: 'stop',
            data: 'stop'
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }

    #signalGain(gain){
        this.#session.signal({
            type: 'gain',
            data: gain
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }


}

module.exports = {
    Patient: Patient,
    Doctor: Doctor
}