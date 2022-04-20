const OT = require('@opentok/client');


function handleError(error) {
    if (error) {
      console.error(error);
    }
}


class Skop {

    /**
    * @type {string} Indicates the current mode between conversation and gain.
    */
    #mode;

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

    constructor(sessionId, token, apiKey, isPatient, mode, heartZone) {

        this.#mode = mode;
        this.#isPatient = isPatient;
        this.#heartZone = heartZone;
        

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

    grabPatientAudio(){
        if(!this.#isPatient){
            console.log("The user has to be a patient.");
            return;
        } 
        let constraintObj = {audio: true, video: false}; // this way of getting MediaStreamTracks could be useful if we need to switch between a microphone and the SKOP audio.
        navigator.mediaDevices.getUserMedia(constraintObj)
        .then(function(mediaStreamObj) {
            console.log(mediaStreamObj);
            console.log(mediaStreamObj.getAudioTracks()); // this gives a MediaStreamTrack[] so we can get the audio source and modify and then set it to the publisher.

        })
        
    }


    getAudioSource() {
      return this.#publisher.getAudioSource();
    }

    setAudioSource(audioSource) {
        this.#publisher.setAudioSource(audioSource);
    }

    getMode() { 
        return this.#mode;
    }

    setMode(mode){
        this.#mode = mode;
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
     * @param {heartZone} heartZone Takes on of the four heart zones. [Pulmonary, Aortic, Tricuspid, Mitral]
     */
    setHeartZone(heartZone) {
        this.#heartZone = heartZone;
    }
}


module.exports = { Skop : Skop,};






   





