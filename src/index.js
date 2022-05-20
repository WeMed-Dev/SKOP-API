const OT = require('@opentok/client');
const detection = require('./detection');
const visualisation = require('./visualisation');
const axios = require("axios");
const Swal = require('sweetalert2');
const Filter = require('./Filter')

/**
 * Displays any error messages.
 * @param {*} error 
 */
function handleError(error) {
    if (error) console.error(error);
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

    #stream;

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

    setGain(gain){
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

    #stream





    constructor(apiKey, token, sessionId) {
        //TODO : constructor(API_KEY_WEMED, ROOM_ID)
        //TODO faire un fetch dans la BDD WeMed afin de vérifier que la clé API_WEMED
        // Si la clé est valide alors on fait un fetch pour récupérer les infos de la session
        // Sinon on affiche un message d'erreur

        // Ensuite on fait le traitement normal du constructeur


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

        navigator.mediaDevices.getUserMedia({audio: true,video: false}).then(stream =>{
            this.#stream = stream;
            console.log(this.#stream);
        })
    }

    //--------- SKOP MANIPULATION METHODS ---------//
    async #init(){
            await detection(this.#stream);
    }

    async #useSkop(heartZone){
        if(!this.#skopDetected){
            await this.#init()
            this.#skopDetected = true;
        }
        this.#setUsingSkop(true);
        await this.#filter.ModifyAudio(heartZone, this, this.#stream);
    }

    async #stopUsingSkop(){
        this.#setUsingSkop(false)
        await this.#filter.defaultAudio(this.#publisher, this);
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


module.exports = {
    Patient: Patient,
    Doctor: Doctor
}