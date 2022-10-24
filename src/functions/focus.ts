import * as tf from '@tensorflow/tfjs-core';
import * as blazeface from '@tensorflow-models/blazeface';
import Swal from "sweetalert2";

require("@tensorflow/tfjs-backend-webgl");

let model;
let video: HTMLVideoElement;
let intervalId;
let prediction;
let cWidth:number;
let cHeight:number;
let canvas;
let ctx:CanvasRenderingContext2D;
let currentFoyer:string;
let stopAnimation = false;


let distanceCamera: number;
let oldDistanceCamera: number;
let monoyer:boolean =false;

let image2:HTMLImageElement;



/**
 * Initiates the logic for augmented reality.
 * Todo make it possible to use 16:9 ratio.
 */
async function init(stream:MediaStream){

    canvas = document.createElement('canvas');
    cWidth = 640;
    cHeight = 480;

    ctx = canvas.getContext('2d');
    // canvas.width = cWidth;
    // canvas.height = cHeight;
    canvas.width = 640;
    canvas.height = 480;
    await tf.ready();

    //Getting video stream
    video = document.createElement('video');


    navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;
            video.width = cWidth;
            video.height = cHeight;
            video.autoplay = true;

            // check if on iOS
            // if iOS we add certain parameters to the video
            if(navigator.userAgent.match(/iPhone|iPad|iPod/i)){
                video.muted = true;
                video.playsInline = true;
            }
            video.play();
        });
        //wait for the video to be loaded


    // When the video stream is ready, load the model
    video.addEventListener("play", async () => {
        model = await blazeface.load();
        await detectFaces();
        console.log("Loaded Blazeface")
        if(monoyer === true){
            Swal.fire({
                position: 'top',
                html: '<div> <img src="https://i.ibb.co/PFsd4cR/monoyer.png" id="monoyer" style="  top: 5%; left: 40%;"/>  </div>',
                showConfirmButton: false,
                showCloseButton: true,
            })
            image2 = document.getElementById("monoyer") as HTMLImageElement;
        }
    })
    return canvas.captureStream(30)
}

const detectFaces = async () => {
    try{
        let rateX = cWidth/640;
        let rateY = cHeight/480;
        if(model === undefined) return;
        prediction = await model.estimateFaces(video, false).then(prediction => {

            if(prediction.length > 0) {
                //flip the video
                ctx.clearRect(0, 0, cWidth, cHeight);
                ctx.save();
                ctx.translate(cWidth, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, video.width, video.height);

                // TODO enlever le dessin des yeux
                /*
                // draw eyes
                ctx.beginPath(); //right eye
                ctx.arc(prediction[0].landmarks[0][0] * rateX, prediction[0].landmarks[0][1]*rateY, 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'blue';
                ctx.fill();

                //left eye
                ctx.beginPath();
                ctx.arc(prediction[0].landmarks[1][0]* rateX, prediction[0].landmarks[1][1]*rateY, 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.stroke();
                 */
                //get distance between eyes
                let distance = Math.sqrt(Math.pow(prediction[0].landmarks[0][0] - prediction[0].landmarks[1][0], 2) + Math.pow(prediction[0].landmarks[0][1] - prediction[0].landmarks[1][1], 2));
                drawFocuses(distance, prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], prediction[0].landmarks[1][0]);
                console.log("Drawings done");


                ctx.restore();
                if(monoyer === true){
                    //distance between eyes and camera
                    oldDistanceCamera = distanceCamera;
                    distanceCamera = (1/(distance/90)) * 50;
                    if(oldDistanceCamera - Math.abs(distanceCamera) > 1){
                        image2.width = ((((((1/60)*Math.PI/180)*(distanceCamera/100))*5)*1000)*11/2.55*381/11);
                        image2.height = ((((((1/60)*Math.PI/180)*(distanceCamera/100))*5)*1000)*11/2.55*863/11);
                    }
                }
                else if (monoyer === false){
                    Swal.close();
                    console.log("Monoyer closed");
                }


            }else{
                ctx.font = "30px Arial";
                ctx.fillStyle = "rgb(255,7,7)";
                ctx.fillText("No face detected", (cWidth/3) *rateX , (cHeight/2) *rateY);
            }
        })

    }catch (e) {
        console.error(e)
    }
    if(stopAnimation === false) requestAnimationFrame(detectFaces);

};

function drawFocuses(eyeDistance:number, rightEyeX, rightEyeY, leftEyeX){
    let xMultiplier:number;
    let yMultiplier:number;
    let rateX = cWidth/640;
    let rateY = cHeight/480;
    let color:string;
    let colorANT = "#a2d2ff";
    let colorP = "#ffa2a2";
    let colorC = "#ff0000";

    switch (currentFoyer) {
        //Pulmonary focuses
        //frontal
        case "ANT1L":
            xMultiplier = 1.4;
            yMultiplier = 2.2;
            color = colorANT;
            break;
        case "ANT1R":
            xMultiplier = -0.6;
            yMultiplier = 2.2;
            color = colorANT;
            break
        case "ANT2L":
            xMultiplier = 0.7;
            yMultiplier = 3.35;
            color = colorANT;
            break;
        case "ANT2R":
            xMultiplier = 0;
            yMultiplier = 3.35;
            color = colorANT;
            break;
        case "ANT3L":
            xMultiplier = 0.7;
            yMultiplier = 3.85;
            color = colorANT;
            break;
        case "ANT3R":
            xMultiplier = 0;
            yMultiplier = 3.85;
            color = colorANT;
            break;
        case "ANT4L":
            xMultiplier = 1.9;
            yMultiplier = 4.05;
            color = colorANT;
            break;
        case "ANT4R":
            xMultiplier = -1;
            yMultiplier = 4.05;
            color = colorANT;
            break;
        case "ANT5L":
            xMultiplier = 2.2;
            yMultiplier = 4.9;
            color = colorANT;
            break;
        case "ANT5R":
            xMultiplier = -1.5;
            yMultiplier = 4.9;
            color = colorANT;
            break;
        //Back focuses
        case "P1L":
            xMultiplier = 1.4;
            yMultiplier = 2.2;
            color = colorP;
            break;
        case "P1R":
            xMultiplier = -0.6;
            yMultiplier = 2.2;
            color = colorP;
            break;
        case "P2L":
            xMultiplier = 1;
            yMultiplier = 2.8;
            color = colorP;
            break;
        case "P2R":
            xMultiplier = -0.1;
            yMultiplier = 2.8;
            color = colorP;
            break;
        case "P3L":
            xMultiplier = 0.685;
            yMultiplier = 3.2;
            color = colorP;
            break;
        case "P3R":
            xMultiplier = 0.235;
            yMultiplier = 3.2;
            color = colorP;
            break;
        case "P4L":
            xMultiplier = 0.815;
            yMultiplier = 3.7;
            color = colorP;
            break;
        case "P4R":
            xMultiplier = 0.3;
            yMultiplier = 3.7;
            color = colorP;
            break;
        case "P5L":
            xMultiplier = 1.1;
            yMultiplier = 4.9;
            color = colorP;
            break;
        case "P5R":
            xMultiplier = -0.6;
            yMultiplier = 4.9;
            color = colorP;
            break;
        case "P6L":
            xMultiplier = 0.7;
            yMultiplier = 6;
            color = colorP;
            break;
        case "P6R":
            xMultiplier = -0.7;
            yMultiplier = 6;
            color = colorP;
            break;
        case "P7L":
            xMultiplier = 1.7;
            yMultiplier = 6;
            color = colorP;
            break;
        case "P7R":
            xMultiplier = -1.2;
            yMultiplier = 6;
            color = colorP;
            break;
        case "P8L":
            xMultiplier = 1.7;
            yMultiplier = 5.1;
            color = colorP;
            break;
        case "P8R":
            xMultiplier = -1.2;
            yMultiplier = 5.1;
            color = colorP;
            break;

        // Cardiac focuses
        case "Mitral":
            xMultiplier = 1.9;
            yMultiplier = 4.5;
            color = colorC;
            break;
        case "Aortic":
            xMultiplier = -0.2;
            yMultiplier = 3;
            color = colorC;
            break;
        case "Pulmonary":
            xMultiplier = 1.4;
            yMultiplier = 3.2;
            color = colorC;
            break;
        case "Tricuspid":
            xMultiplier = 0.9;
            yMultiplier = 4.5;
            color = colorC;
            break;
        default:
            xMultiplier = 100;
            yMultiplier = 100;
            console.error("Unknown zone, please give a zone that is in the list");
            break;
    }
    drawPoint((rightEyeX + (leftEyeX-rightEyeX) * xMultiplier) * rateX , (rightEyeY + (leftEyeX -rightEyeX) * yMultiplier) * rateY, color);
}

function drawPoint(x:number, y:number, color:string = "red"){
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
}


async function start(foyer:string){
    currentFoyer = foyer;
    stopAnimation = false;
}

function stop(){
    stopAnimation = true;
}


function toggleMonoyer(toggle:boolean){
  monoyer = toggle;
  console.log(monoyer);
}

export {init, start, stop, toggleMonoyer};



