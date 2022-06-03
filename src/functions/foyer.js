const tf = require("@tensorflow/tfjs");
const blazeface = require("@tensorflow-models/blazeface");

let model;
let video;
let intervalId;
let prediction;
let width;
let height;
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

async function init(resWidth, resHeight){
    //show canvas
    canvas.style.display = "block";
    ctx = canvas.getContext('2d');
    canvas.width = 640;
    canvas.height = 480;
    await tf.ready();

    // TODO peut etre enlever ce morceau de l'api pour laisser le choix au dev de cacher la camera ou non
    //hide video
    const videoVonage = document.getElementById("publisher");
    videoVonage.style.display = "none";

    //Getting video stream
    video = document.createElement('video');
    navigator.mediaDevices
        .getUserMedia({
            video: {width: 640, height: 480},
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;
            video.width = 640;
            video.height = 480;
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
        if(model === undefined) return;
        prediction = await model.estimateFaces(video, false).then(prediction => {
            if(prediction.length > 0) {
                //flip the video
                ctx.save();
                ctx.translate(640, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, 640, 480);

                // TODO enlever le dessin des yeux
                /*
                // draw eyes
                ctx.beginPath(); //right eye
                ctx.arc(prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'blue';
                ctx.fill();

                //left eye
                ctx.beginPath();
                ctx.arc(prediction[0].landmarks[1][0], prediction[0].landmarks[1][1], 3, 0, 2 * Math.PI);
                ctx.fillStyle = 'red';
                ctx.fill();
                ctx.stroke();
                */
                //get center between eyes
                let centerX = (prediction[0].landmarks[0][0] + prediction[0].landmarks[1][0]) / 2;
                let centerY = (prediction[0].landmarks[0][1] + prediction[0].landmarks[1][1]) / 2;


                //get distance between eyes
                let distance = Math.sqrt(Math.pow(prediction[0].landmarks[0][0] - prediction[0].landmarks[1][0], 2) + Math.pow(prediction[0].landmarks[0][1] - prediction[0].landmarks[1][1], 2));
                drawFocuses(distance, centerX, centerY, prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], prediction[0].landmarks[1][0], prediction[0].landmarks[1][1]);
                ctx.restore();
            }else{
                // if no face detected, write "no face detected"
                ctx.font = "30px Arial";
                ctx.fillStyle = "rgb(255,7,7)";
                ctx.fillText("No face detected", width/3, height/2);
            }

        })
    }catch (e) {
        console.log(e);
    }
};

function drawFocuses(eyeDistance, centerX, centerY, rightEyeX, rightEyeY, leftEyeX, leftEyeY){

    //test pour pulmonaire
    let xMultiplier = 1.5;
    let yMultiplier = 3.5;

    switch (currentFoyer) {
        case "Pulmonary":
            xMultiplier = 1.4;
            yMultiplier = 3.2;
            //pulmonaire
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier);
            break;
        case "Mitral":
            //mitral
            xMultiplier = 2;
            yMultiplier = 4;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        case "Aortic":
            xMultiplier = -0.5;
            yMultiplier = 3;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        case "Tricuspid":
            xMultiplier = 0.9;
            yMultiplier = 4.5;
            drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier, "red");
            break;
        default:
            break;
    }
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
    //canvas.style.width = width + "px";
    //canvas.style.height = height + "px";
    canvas.style.width = 640 + "px";
    canvas.style.height = 480 + "px";
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