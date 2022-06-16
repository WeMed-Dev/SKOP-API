import * as OT from '@opentok/client';
import {checkAPIKEY, fetchVonage} from "./functions/request";

/**
 * Displays any error messages.
 * @param {*} error
 */
function handleError(error) {
    if (error) console.error(error);
}

class DoctorTS{
    private session: OT.Session;
    private publisher: OT.Publisher;

    private apiKeyVonage: string;
    private token:string;
    private sessionId:string;

    private apiKeyWemed: string;


    constructor(APIKEY, TOKEN, SESSIONID, APIKEY_WEMED){
        this.apiKeyVonage = APIKEY;
        this.token = TOKEN;
        this.sessionId = SESSIONID;

        this.apiKeyWemed = APIKEY_WEMED;

        const session = OT.initSession(this.apiKeyVonage, this.sessionId);
        this.session = session;

        session.on('streamCreated', (event) => {
            let subscriberOptions:OT.SubscriberProperties = {
                insertMode: 'append',
                width: '100%',
                height: '100%'
            }
            session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
        })

        session.on('sessionDisconnected', function sessionDisconnected(event) {
            console.log('You were disconnected from the session.', event.reason);
        })

        //Initialize the publisher
        let publisherOptions:OT.PublisherProperties = {
            insertMode: 'append',
            width: '100%',
            height: '100%'
        }
        const publisher = OT.initPublisher('publisher', publisherOptions, handleError);
        this.publisher = publisher;

        // Connect to the session

        session.connect(this.token, (error) => {
            // If the connection is successful, publish to the session
            if (error) {
                console.log(error.message);
            }
            else {
                session.publish(publisher, handleError);
            }
        });

    }

    static async init(API_KEY_WEMED, ROOM_ID){
        // return checkAPIKEY(API_KEY_WEMED).then(res =>{
        //     if(res === true){
        //         return fetchVonage(ROOM_ID).then(res=> {
        //             return new DoctorTS(res.apiKey, res.token, res.sessionId,API_KEY_WEMED)
        //         })
        //     }
        // })

        return fetchVonage(ROOM_ID).then(res=> {
            return new DoctorTS(res.apiKey, res.token, res.sessionId, API_KEY_WEMED)
        })
    }


    //------ SIGNALING ------//

    private signalHeartZone(signal) {
        this.session.signal({
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

    private signalStopUsingSkop() {
        this.session.signal({
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

    private signalGain(gain){
        this.session.signal({
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

    private signalUseAugmentedReality(useAR){
        this.session.signal({
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


    //--- USING SKOP ---//

    skop(heartZone:string){
        if(heartZone === null || heartZone === undefined || heartZone === ""){
            this.signalStopUsingSkop();
        }
        else{
            this.signalHeartZone(heartZone);
        }
    }

    setGain(gain:number){
        if (gain === null || gain === undefined) {
            throw new TypeError("Gain cannot be null or undefined");
        }
        else if (isNaN(gain)) {
            throw new TypeError("Gain must be a number");
        }
        this.signalGain(gain);
    }


    useAR(useAR:boolean){
        if (useAR === null || useAR === undefined) {
            throw new TypeError("Use AR cannot be null or undefined");
        }
        else if (typeof useAR !== "boolean") {
            throw new TypeError("Argument must be a boolean");
        }
        this.signalUseAugmentedReality(useAR);
    }

}

export { DoctorTS };