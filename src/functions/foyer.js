// const tf = require("@tensorflow/tfjs-core");
// require("@tensorflow/tfjs-backend-webgl");
// const blazeface = require("@tensorflow-models/blazeface");

import * as tf from '@tensorflow/tfjs-core';
import * as blazeface from '@tensorflow-models/blazeface';

require("@tensorflow/tfjs-backend-webgl");

let model;
let video;
let intervalId;
let prediction;
let cWidth;
let cHeight;
let canvas;
let ctx;
let currentFoyer;

function setupAR(userCanvas){
    if(userCanvas === undefined || userCanvas === null){
        throw new Error("Canvas is undefined or null");
    }
    //check if canvas is a string
    if(typeof userCanvas === "string"){
        canvas = document.getElementById(userCanvas);
        console.log(typeof userCanvas)
    }
    else if(userCanvas.nodeName === "CANVAS"){
        canvas = userCanvas;
    }
    else {
        throw new Error("Canvas is not a string nor a canvas");
    }
}

/**
 * Initiates the logic for augmented reality. The ratio of the width and height must be of 4:3.
 * Todo make it possible to use 16:9 ratio.
 * @param width A positive value describing the width of the canvas in pixels
 * @param height A positive value describing the height of the canvas in pixels
 * @returns {Promise<void>}
 */
async function init(width, height){
    cWidth = width;
    cHeight = height;

    //show canvas
    canvas.style.display = "block";
    ctx = canvas.getContext('2d');
    canvas.width = cWidth;
    canvas.height = cHeight;
    await tf.ready();

    // TODO peut etre enlever ce morceau de l'api pour laisser le choix au dev de cacher la camera ou non
    //hide video
    const videoVonage = document.getElementById("publisher");
    videoVonage.style.display = "none";

    //Getting video stream
    video = document.createElement('video');
    navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;

            video.width = width;
            video.height = height;

            console.log(video.width);
            video.play();
        });

    // When the video stream is ready, load the model
    video.addEventListener("play", async () => {
        model = await blazeface.load();
    })
}

const detectFaces = async () => {
    try{
        let rateX = cWidth/640;
        let rateY = cHeight/480;
        if(model === undefined) return;
        prediction = await model.estimateFaces(video, false).then(prediction => {
            if(prediction.length > 0) {
                //flip the video
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
                //get center between eyes
                let centerX = (prediction[0].landmarks[0][0] + prediction[0].landmarks[1][0]) / 2;
                let centerY = (prediction[0].landmarks[0][1] + prediction[0].landmarks[1][1]) / 2;

                //get distance between eyes
                let distance = Math.sqrt(Math.pow(prediction[0].landmarks[0][0] - prediction[0].landmarks[1][0], 2) + Math.pow(prediction[0].landmarks[0][1] - prediction[0].landmarks[1][1], 2));
                drawFocuses(distance, centerX, centerY, prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], prediction[0].landmarks[1][0]);
                ctx.restore();

            }else{
                // if no face detected, write "no face detected"
                ctx.font = "30px Arial";
                ctx.fillStyle = "rgb(255,7,7)";
                ctx.fillText("No face detected", cWidth/3, cHeight/2);
            }
        })
    }catch (e) {
        console.error(e)
    }
};

function drawFocuses(eyeDistance, centerX, centerY, rightEyeX, rightEyeY, leftEyeX){

    //test pour pulmonaire
    let xMultiplier;
    let yMultiplier;
    let rateX = cWidth/640;
    let rateY = cHeight/480;
    let color;

    switch (currentFoyer) {
        case "Pulmonary":
            xMultiplier = 1.4;
            yMultiplier = 3.2;
            //pulmonaire
            //drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier);


            // Test avec le ration de 640/width canvas voulu et 480/height canvas voulu
            // TODO Testez la correction qui utilise un ratio.
            drawPoint((rightEyeX + (leftEyeX-rightEyeX) * xMultiplier) * rateX , (rightEyeY + (leftEyeX -rightEyeX) * yMultiplier) * rateY);
            break;
        case "Mitral":
            //mitral
            xMultiplier = 2;
            yMultiplier = 4;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        case "Aortic":
            xMultiplier = -0.2;
            yMultiplier = 3;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        case "Tricuspid":
            xMultiplier = 0.9;
            yMultiplier = 4.5;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        default:
            throw new Error("Unknown zone, please give a zone that is in the list");
            break;

    }

    //todo rajouter la variable couleur à la fin de l'appel.
    //drawPoint((rightEyeX + (leftEyeX-rightEyeX) * xMultiplier) * rateX , (rightEyeY + (leftEyeX -rightEyeX) * yMultiplier) * rateY);

}

function drawPoint(x, y, color = "#a2d2ff"){
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.stroke();
}

async function start(foyer){
    currentFoyer = foyer;
    intervalId = setInterval( detectFaces, 100)
    return prediction;
}

function stop(){
    canvas.style.display = "none";
    const videoVonage = document.getElementById("publisher");
    videoVonage.style.display = "block";
    clearInterval(intervalId);
}

export {setupAR ,init, start, stop};