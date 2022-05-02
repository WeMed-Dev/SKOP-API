const OT = require('@opentok/client');


/**
 * Displays any error messages.
 * @param {*} error 
 */
function handleError(error) {
    if (error) console.error(error);
}

/**
 * Name : Skop
 * Description : It represents an instance of a session using the SKOP.
 **/
class Skop {

    /**
    * @type {boolean} Indicates the current mode between conversation and gain.
    */
    #usingSkop;

    /**
     * @type {string} Indicates the role of the user. [Patient, Doctor]
     */
    #role

    /**
     * @type {OT.Session} The session object.
     */
    #session

    /**
     * @type {OT.session.publisher}  The publisher object.
     */
    #publisher;

    #filterClass

    DOCTOR_ROLE = "doctor"
    PATIENT_ROLE = "patient"



 
    /**
     * Creates the instance of the SKOP. 
     * Initializes the session and the publisher.
     * If there is a subscriber, it subscribes to the session.
     * @param {*} apiKey  The API key of the session.
     * @param {*} token  The token of the session.
     * @param {*} sessionId  The session id of the session.
     * @param {string} role  The role of the user. [Patient, Doctor]
     */
    constructor(apiKey, token, sessionId, role) {
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;
        this.#role = role;
        this.#filterClass = new Filter();

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
            if(self.#role === self.DOCTOR_ROLE) return;
            self.useSkop(event.data)
            console.log("Using Skop - " + event.data);
        });

        //When a patient receives a signal:stop it stops the filtering.
        session.on("signal:stop", function(event) {
            if(self.#role === self.DOCTOR_ROLE) return;
            self.stopUsingSkop().then(
                console.log("Stopped using Skop")
            ).catch(e => {
                console.log("Error stopping using Skop" + e);
            });
        });


        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event) {
            //console.log("Signal data: " + event.data);
            self.setGain(event.data)
        });

        // initialize the publisher
        var publisherOptions = {
        insertMode: 'append',
        width: '100%',
        height: '100%'
        };
        var publisher = OT.initPublisher('publisher', publisherOptions, handleError); 
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
    skop(heartZone){
        if(heartZone === null || heartZone === undefined || heartZone === ""){
            this.signalStopUsingSkop();
        }
        else{
            this.signalHeartZone(heartZone);
        }
    }

    async useSkop(heartZone){
        if(this.#role === this.DOCTOR_ROLE) return;
        this.setUsingSkop(true);
        await this.#filterClass.init(this, heartZone);
    }

    async stopUsingSkop(){
        if(this.#role === this.DOCTOR_ROLE) return;
        this.setUsingSkop(false)
        this.#filterClass.defaultAudio(this.#publisher);
    }

    //------ SIGNALING ------//

    signalHeartZone(signal) {
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

    signalStopUsingSkop() {
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

    signalGain(gain){
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


    //----- GETTER & SETTER -----//
    /**
     * Returns the current role of the user.
     * @returns {string} The role of the user.
     */
    getRole(){
        return this.#role;
    }

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
    setGain(gain){
        if(this.#role === this.DOCTOR_ROLE) return;
        //let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        //this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);

        this.#filterClass.setGain(gain);
    }

    setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

}

class Filter{

    audioCtx;
    biquadFilter;
    audioSource;
    audioDestination;
    AORTIC = "Aortic";
    MITRAL = "Mitral";
    PULMONARY = "Pulmonary";
    TRICUSPID = "Tricuspid";


    async init(skop, heartZone){
        try{

            // define variables
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let stream = await navigator.mediaDevices.getUserMedia ({audio: true,video: false})
            let audioSource = audioCtx.createMediaStreamSource(stream);
            let audioDestination = audioCtx.createMediaStreamDestination();
            //Create the biquad filter
            let biquadFilter = audioCtx.createBiquadFilter();
            this.biquadFilter = biquadFilter;

            biquadFilter.type = "lowshelf"; // choisir le param : https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
            biquadFilter.frequency.setValueAtTime(250, audioCtx.currentTime); // 250Hz
            biquadFilter.gain.setValueAtTime(10, audioCtx.currentTime);


            if(heartZone === "Pulmonary"){ // les ondes entres 80 et 500 sont limitées
                biquadFilter.type = "peaking";
                biquadFilter.frequency.setValueAtTime(290, audioCtx.currentTime);
                biquadFilter.gain.setValueAtTime(-10, audioCtx.currentTime);
            }

            // connect the nodes together
            audioSource.connect(biquadFilter);
            biquadFilter.connect(audioDestination);

            // Sets the OT.publisher Audio Source to be the modified stream.
            skop.setAudioSource(audioDestination.stream.getAudioTracks()[0])
            console.log(audioDestination.stream.getAudioTracks()[0])


            console.log("SKOP : Audio input modified")
        }catch(error){
            handleError(error);
        }

    }

    /**
     * Change the filter mode, type and frequency depending on the category.
     * @param heartZone The category of heart zones being listened to. { "cardiac", "respiratory" }
     * @param skop The skop object that is being listened to.
     */
    filtering(heartZone, skop){
        try{
            if(heartZone === this.AORTIC || heartZone === this.MITRAL || heartZone === this.TRICUSPID){
                this.biquadFilter.type = "lowshelf";
                this.biquadFilter.frequency.setValueAtTime(250, this.audioCtx.currentTime); // 250Hz
                this.biquadFilter.gain.setValueAtTime(10, this.audioCtx.currentTime);
            }else if(heartZone === this.PULMONARY){
                this.biquadFilter.type = "peaking";
                this.biquadFilter.frequency.setValueAtTime(290, this.audioCtx.currentTime);
                this.biquadFilter.gain.setValueAtTime(-10, this.audioCtx.currentTime);
            }

            skop.setAudioSource(this.audioDestination.stream.getAudioTracks()[0])
        }
        catch (error){
            handleError(error);
        }

    }

    defaultAudio(skop){
        try{
            /*
            let defaultAudio = navigator.mediaDevices.getUserMedia({audio: true,video: false})
                .then(stream => {
                    let defStreamTrack = stream.getAudioTracks()[0];
                    skop.setAudioSource(defStreamTrack);
                })*/

            //test : just avoiding the biquad filter might be better
            this.audioSource.connect(this.audioDestination)

            skop.setAudioSource(this.audioDestination.stream.getAudioTracks()[0])
        }catch (error){
            handleError(error);
        }
    }

    setGain(gain){
        this.biquadFilter.gain.setValueAtTime(gain,new (window.AudioContext || window.webkitAudioContext) );
    }

    getAudioDestination(){
        return this.audioDestination;
    }

}

module.exports = { Skop : Skop,};