const OT = require("@opentok/client");

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
        // Initialize the session
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
        })

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
        if (gain === null || gain === undefined || gain === "") {
            throw new TypeError("Gain cannot be null or undefined");
        }
        else if (isNaN(gain)) {
            throw new TypeError("Gain must be a number");
        }
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

module.exports = Doctor;