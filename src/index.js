const OT = require('@opentok/client');

function handleError(error) {
    if (error) console.error(error);
}

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
    * @type {string} Indicates which part of the heart the doctor is going to listen to.
    */
    #heartZone;

    /**
     * @type {OT.Session} The session object.
     */
    #session

    /**
     * @type {OT.session.publisher}  The publisher object.
     */
    #publisher;

 

    constructor(apiKey, token, sessionId, role) {
        // Used to access objects in functions.
        var self = this;

        this.#usingSkop = false;
        this.#role = role;
      
        /**
         * @@type {OT.Session} The session object.
         */
        var session = OT.initSession(apiKey, sessionId);
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

        session.on("signal", function(event) {
            console.log("Signal data: " + event.data);
            if(event.data == "default"){
                self.#defaultAudio();
                return;
            } 
            self.#ModifyAudio(event.data.heartZone)
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

    /**
     * This method gets the sound inpot of the user (that should be a patient) and modifies it so it is coherent with the given heartZone. 
     * Afterwards the modified stream is used by the publisher instead of the direct user sound input.
     * @param {*} heartZone 
     */
    async #ModifyAudio(heartZone) {
        try{
            // Only the patient's audio needs to be modified.
            if(this.#role === "doctor") return

            if(heartZone === "Aortic"){
                // TODO: modify audio to listen to the aortic zone
            }
            else if(heartZone === "Mitrale"){
                // TODO: modify audio to listen to the mitral zone
            }
            else if(heartZone === "Pulmonary"){
                // TODO: modify audio to listen to the pulmonary zone
            }
            else if(heartZone === "Tricuspid"){
                // TODO: modify audio to listen to the tricuspid zone
            }
        }catch(error){
            handleError(error);
        }

        // test TODO: do that the input audio is not the doctor's microphone but the patient's audio input.
        try{
            // define variables
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let stream = await navigator.mediaDevices.getUserMedia ({audio: true,video: false})
            let audioSource = audioCtx.createMediaStreamSource(stream);

            //Create the biquad filter
            let biquadFilter = audioCtx.createBiquadFilter();
            biquadFilter.type = "lowshelf"; // IT WILL BE PARTICULARLY IMPORTANT TO CHOSE A GOOD PARAMETER HERE USING THIS LINK : https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
            biquadFilter.frequency.setValueAtTime(1000, audioCtx.currentTime);
            biquadFilter.gain.setValueAtTime(10, audioCtx.currentTime);

            // connect the nodes together
            audioSource.connect(biquadFilter);
            // biquadFilter.connect(audioCtx.destination); //UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT
            
            // Sets the OT.publisher Audio Source to be the modified stream.
            this.setAudioSource(audioSource.mediaStream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
        }catch(err){
            handleError(err)
        }
    }

    async #defaultAudio(){
        try{
          
            /**
             * TODO: check if this works.
             */
            let defaultAudio = await navigator.mediaDevices.getUserMedia({audio: true,video: false})
            let defStreamTrack = defaultAudio.getAudioTracks()[0];
            this.setAudioSource(defStreamTrack);
            console.log("SKOP : Audio input set to default - No modifications")
        }catch(err){
            handleError(err)
        }
    }

    signalToPatient(signal) {
        this.#session.signal({
            type: 'foo',
            data: signal
        }, function(error) {
            if (error) {
                console.log('Error sending signal:' + error.message);
            } else {
                console.log('Signal sent.');
            }
        })
    }


    /**
     * 
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

    useSkop(heartZone){
        if(this.#role === "doctor") return;
        this.setUsingSkop(true);
        this.ModifyAudio(heartZone) 
    }

    async stopUsingSkop(){
        if(this.#role === "doctor") return;
        this.setUsingSkop(false)
        this.defaultAudio()
    }

    isUsingSkop() { 
        return this.#usingSkop;
    }

    setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

    getRole() {
        return this.#role;
    }

    setRole(role) {
        this.#role = role;
    }

    getHeartZone() {
        return this.#heartZone;
    }

    /**
     * @param {heartZone} heartZone Can be set to one of the heart zones. [Pulmonary, Aortic, Tricuspid, Mitral]
     */
    setHeartZone(heartZone) {
        this.#heartZone = heartZone;
    }
}

module.exports = { Skop : Skop,};