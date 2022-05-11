const OT = require('@opentok/client');
const detection = require('./detection');
const axios = require("axios");


/**
 * Displays any error messages.
 * @param {*} error 
 */
function handleError(error) {
    if (error) console.error(error);
}


class Filter{

    patient;
    filter;
    gain;
    mediaRecorder;

    static AORTIC = "Aortic";
    static MITRAL = "Mitral";
    static PULMONARY = "Pulmonary";
    static TRICUSPID = "Tricuspid";

    constructor(patient){
        this.patient = patient;
        this.gain = 10; //default gain
    }

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone.
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone
     */
    async ModifyAudio(heartZone) {

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
                console.log("Recording started");
                this.mediaRecorder = new MediaRecorder(audioDestination.stream);
                this.mediaRecorder.start();

               this.mediaRecorder.addEventListener("dataavailable", (event) => {
                   var audio = document.createElement("audio");
                   // use the blob from the MediaRecorder as source for the audio tag
                   audio.src = URL.createObjectURL(event.data);
                    this.sendAudio(event.data);
                   document.body.appendChild(audio);
                   audio.play();
               });
            }


            if(heartZone === Filter.PULMONARY){ // les ondes entres 80 et 500 sont limitées

                biquadFilter.type = "peaking"; // peaking filter
                biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
                biquadFilter.Q.setValueAtTime(this.gain, audioCtx.currentTime);

                // connect the nodes together
                audioSource.connect(biquadFilter);
                biquadFilter.connect(audioDestination);
            }


            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT

            // Sets the OT.publisher Audio Source to be the modified stream.
            this.patient.setAudioSource(audioDestination.stream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
        }catch(error){
            handleError(error);
        }
    }

    async defaultAudio(){
        try{
            if(this.mediaRecorder !== undefined){
                this.mediaRecorder.stop();
            }
            let defaultAudio = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            let defStreamTrack = defaultAudio.getAudioTracks()[0];
            this.patient.setAudioSource(defStreamTrack);
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


    sendAudio(audioBlob) {
        console.log(audioBlob)
        let formData = new FormData();
        formData.append("file", audioBlob);
        axios.post('http://localhost:3000/blob', formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            }
        })
            .then(response => {
                console.log(response);
            })
            .catch(function (error) {
                if (error.response) { // get response with a status code not in range 2xx
                    console.log(error.response.data);
                    console.log(error.response.status);
                    console.log(error.response.headers);
                } else if (error.request) { // no response
                    console.log(error.request);
                } else { // Something wrong in setting up the request
                    console.log('Error', error.message);
                }
                console.log(error.config);
            });
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

    #publisher;

    /**
     * @type {Filter} The filter object.
     */
    #filter

    #skopDetected = false;


    constructor(apiKey, token, sessionId) {
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;

        this.#filter = new Filter(this);

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

        // When a user receive a signal with a heartZone, it modifies the audio input of the user.
        session.on("signal:heartZone", function(event) {

            self.#useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });

        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function(event) {
            self.#stopUsingSkop().then(
                console.log("Stopped using Skop")
            ).catch(e => {
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
        this.#filter.ModifyAudio(heartZone);
    }

    async #stopUsingSkop(){
        this.#setUsingSkop(false)
        this.#filter.defaultAudio(this.#publisher);
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