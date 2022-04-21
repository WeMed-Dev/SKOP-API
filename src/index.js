const OT = require('@opentok/client');


function handleError(error) {
    if (error) {
      console.error(error);
    }
}


class Skop {

    /**
    * @type {boolean} Indicates the current mode between conversation and gain.
    */
    #usingSkop;

    /**
    * @type {boolean} Indicates if the user is the patient. If not this indicates that the user is the doctor.
    */
    #isPatient;

    /**
    * @type {string} Indicates which part of the heart the doctor is going to listen to.
    */
    #heartZone;

    /**
     * @type {OT.session.publisher}  The publisher object.
     */
    #publisher;

    constructor(sessionId, token, apiKey, isPatient) {

        this.#usingSkop = false;
        this.#isPatient = isPatient;
      
        

        /**
         * @@type {OT.Session} The session object.
         */
        var session = OT.initSession(apiKey, sessionId);

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
    async ModifyAudio(heartZone) {
        try{
            // define variables
            var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let stream = await navigator.mediaDevices.getUserMedia ({audio: true,video: false})
            let audioSource = audioCtx.createMediaStreamSource(stream);

            //Create the biquad filter
            let biquadFilter = audioCtx.createBiquadFilter();
            biquadFilter.type = "lowshelf"; // IT WILL BE PARTICULARLY IMPORTANT TO CHOSE A GOOD PARAMETER HERE USING THIS LINK : https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode
            biquadFilter.frequency.setValueAtTime(10000, audioCtx.currentTime);
            biquadFilter.gain.setValueAtTime(25, audioCtx.currentTime);

            // connect the nodes together
            audioSource.connect(biquadFilter);
            // biquadFilter.connect(audioCtx.destination); UNCOMMENT THIS IF YOU WANT TO HEAR THE RESULT
            
            // Sets the OT.publisher Audio Source to be the modified stream.
            this.setAudioSource(audioSource.mediaStream.getAudioTracks()[0])
            console.log("SKOP : Audio input modified")
        }catch(err){
            handleError(err)
        }
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
        this.setUsingSkop(true);
        this.ModifyAudio(heartZone) 
    }

    stopUsingSkop(){
        this.setUsingSkop(false)
        /**
         * TODO: find a way to set the publisher's audio back to default.
         */
    }

    isUsingSkop() { 
        return this.#usingSkop;
    }

    setUsingSkop(isUsingSkop){
        this.#usingSkop = isUsingSkop;
    }

    getIsPatient() {
        return this.#isPatient;
    }

    setIsPatient(isPatient) {
        this.#isPatient = isPatient;
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






   





