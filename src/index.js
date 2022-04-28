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

    /**
     * @type {BiquadFilterNode} The filter node used to modify the audio.
     */
    #filter


 
    /**
     * Creates the instance of the SKOP. 
     * Initializes the session and the publisher.
     * If there is a subscriber, it subscribes to the session.
     * @param {*} apiKey  The API key of the session.
     * @param {*} token  The token of the session.
     * @param {*} sessionId  The session id of the session.
     * @param {*} role  The role of the user. [Patient, Doctor]
     */
    constructor(apiKey, token, sessionId, role) {
        // Used to access objects in functions.
        const self = this;
        this.#usingSkop = false;
        this.#role = role;

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
            console.log("Signal data: " + event.data);
            if(event.data === "default"){
                self.stopUsingSkop().then(
                    console.log("Stopped using Skop")
                ).catch(e => {
                    console.log("Error stopping using Skop" + e);
                });
                return;
            }
            self.useSkop(event.data)
        });


        // When a user receive a signal with a gain, it modifies the gain of the user.
        session.on("signal:gain", function(event) {
            console.log("Signal data: " + event.data);
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

    useSkop(heartZone){
        if(this.#role === "doctor") return;
        this.setUsingSkop(true);
        this.#ModifyAudio(heartZone)
    }

    async stopUsingSkop(){
        if(this.#role === "doctor") return;
        this.setUsingSkop(false)
        await this.#defaultAudio();
    }

    //--------- AUDIO MANIPULATION METHODS ---------//

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone. 
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone 
     */
    async #ModifyAudio(heartZone) {
        
        try{
            // Only the patient's audio needs to be modified.
            if(this.#role === "doctor") return

            // define variables
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let stream = await navigator.mediaDevices.getUserMedia ({audio: true,video: false})
            let audioSource = audioCtx.createMediaStreamSource(stream);
            let audioDestination = audioCtx.createMediaStreamDestination();
            //Create the biquad filter
            let biquadFilter = audioCtx.createBiquadFilter();
            this.#filter = biquadFilter;
           
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

            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT
            
            // Sets the OT.publisher Audio Source to be the modified stream.
            this.setAudioSource(audioDestination.stream.getAudioTracks()[0])



            console.log("SKOP : Audio input modified")
        }catch(error){
            handleError(error);
        }
    }




    async #defaultAudio(){
        try{
            let defaultAudio = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            let defStreamTrack = defaultAudio.getAudioTracks()[0];
            this.setAudioSource(defStreamTrack);
            console.log("SKOP : Audio input set to default - No modifications")
        }catch(err){
            handleError(err)
        }
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
        if(this.#role === "doctor") return;
        let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.#filter.gain.setValueAtTime(gain, audioCtx.currentTime);
    }

    setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }
}


module.exports = { Skop : Skop,};