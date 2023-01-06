import NetworkTest, { ErrorNames } from 'opentok-network-test-js';
import {fetchVonage} from "./request";
import Swal from "sweetalert2";


export default function testNetwork(OT,roomID){
    let apiKey;
    let token;
    let sessionId;

    // Fetching information to do the test using the roomID
    // Adding a random number to the roomID so fetchVonage() doesn't return the same information as the one used to connect to the session between the doctor and the patient
    // The network test is done simultaneously with the ongoing session and thus needs its own credentials to avoid conflicts.
    fetchVonage(roomID + Math.random()).then((data) => {
        apiKey = data.apiKey;
        token = data.token;
        sessionId = data.sessionId;
    }).then(() => {
        const otNetworkTest = new NetworkTest(OT, {
            apiKey: apiKey, // Add the API key for your OpenTok project here.
            sessionId: sessionId, // Add a test session ID for that project
            token: token // Add a token for that session here
        });

        otNetworkTest.testConnectivity().then((results) => {
            // console.log('OpenTok connectivity test results', results);
            otNetworkTest.testQuality(function updateCallback(stats) {
                // console.log('intermediate testQuality stats', stats);
            }).then((results) => {
                // This function is called when the quality test is completed.
                // console.log('OpenTok quality results', results);
                let publisherSettings:any = {};
                if (results.video.reason) {
                    // console.log('Video not supported:', results.video.reason);
                    publisherSettings.videoSource = null; // audio-only
                    Swal.fire({
                        title: 'Bande passante trop faible',
                        text: "Votre bande passante est insuffisante pour assurer un flux vidéo optimal lors de la téléconsultation. Nous vous recommandons de vérifier votre connexion Internet et de déconnecter d'autres appareils pour améliorer la qualité de la vidéo. ",
                        icon: 'warning',
                        confirmButtonText: 'OK'
                    })
                } else {
                    publisherSettings.frameRate = results.video.recommendedFrameRate;
                    publisherSettings.resolution = results.video.recommendedResolution;
                }
                if (!results.audio.supported) {
                    // console.log('Audio not supported:', results.audio.reason);
                    publisherSettings.audioSource = null;
                    // video-only, but you probably don't want this -- notify the user?
                    Swal.fire({
                        title: 'Audio non supporté',
                        text: "Cause : " + results.audio.reason,
                        icon: 'error',
                        confirmButtonText: 'OK'
                    }).then(() => {

                    })
                }
                if (!publisherSettings.videoSource && !publisherSettings.audioSource) {
                    // Do not publish. Notify the user.
                } else {
                    // Publish to the "real" session, using the publisherSettings object.

                }
            }).catch((error) => {
                console.log('OpenTok quality test error', error);
            });
        }).catch(function(error) {
            console.log('OpenTok connectivity test error', error);
        });
    })


}


