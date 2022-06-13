const OT = require("@opentok/client");
const {checkAPIKEY, fetchVonage} = require("./functions/request");

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

    #apiKeyVonage

    #token

    #apiKeyWemed

    /**
     * @param {string} Current sessionId, this can be seen as the room id.
     */
    #sessionId;

    /**
     * @type {OT.Publisher} The publisher object.
     */
    #publisher;

    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED) {
        const self = this;
        this.#apiKeyVonage = APIKEY;
        this.#token = TOKEN;
        this.#sessionId = SESSIONID;

        this.#apiKeyWemed = APIKEY_WEMED;

        // Initialize the session
        const session = OT.initSession(self.#apiKeyVonage, self.#sessionId);
        this.#session = session;


        //subscribe to a new stream in the session
        session.on('streamCreated', function streamCreated(event) {
            let subscriberOptions = {
                insertMode: 'append',
                width: '100%',
                height: '100%',
                resolution: '1280x720',
            };
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        });

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        })

        // initialize the publisher
        let publisherOptions = {
            insertMode: 'append',
            width: '100%',
            height: '100%',
            resolution: '1280x720',
        };
        let publisher = OT.initPublisher('publisher', publisherOptions, handleError)
        this.#publisher = publisher; // This variable cannot be used for the session.connect() method. But is used to access the publisher outside of the constructor.

        // Connect to the session
        session.connect(self.#token, function callback(error) {
            if (error) {
                handleError(error);
            } else {
                // If the connection is successful, publish the publisher to the session
                session.publish(publisher , handleError);
            }
        });
    }

    static async init(API_KEY_WEMED, ROOM_ID){
        return checkAPIKEY(API_KEY_WEMED).then(res =>{
            if(res === true){
                return fetchVonage(ROOM_ID).then(res=> {
                    return new Doctor(res.apiKey, res.token, res.sessionId)
                })
            }
        })
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

    useAR(useAR){
        if (useAR === null || useAR === undefined || useAR === "") {
            throw new TypeError("Use AR cannot be null or undefined");
        }
        else if (typeof useAR !== "boolean") {
            throw new TypeError("Argument must be a boolean");
        }
        this.#signalUseAugmentedReality(useAR);
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

    #signalUseAugmentedReality(useAR){
        this.#session.signal({
            type: 'useAR',
            data: useAR
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