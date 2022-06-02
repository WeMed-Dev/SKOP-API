import Swal from "sweetalert2";

const tf = require("@tensorflow/tfjs");
const blazeface = require("@tensorflow-models/blazeface");

window.requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame;

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
    width = resWidth;
    height = resHeight;

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

    video = document.createElement('video');

    navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: false,
        })
        .then((stream) => {
            video.srcObject = stream;
            //video.width = 640;
            //video.height = 480;
            video.play();
        });

    video.addEventListener("play", async () => {
        model = await blazeface.load();
        console.log("model loaded");
    })
}

const detectFaces = async () => {
    try{
        if(model === undefined) return;
        prediction = await model.estimateFaces(video, false).then(prediction => {
            if(prediction.length > 0) {
                //flip the video
                ctx.save();
                ctx.translate(width, 0);
                ctx.scale(-1, 1);
                ctx.drawImage(video, 0, 0, width, height);
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

                //get center between eyes
                let centerX = (prediction[0].landmarks[0][0] + prediction[0].landmarks[1][0]) / 2;
                let centerY = (prediction[0].landmarks[0][1] + prediction[0].landmarks[1][1]) / 2;


                //get distance between eyes
                let distance = Math.sqrt(Math.pow(prediction[0].landmarks[0][0] - prediction[0].landmarks[1][0], 2) + Math.pow(prediction[0].landmarks[0][1] - prediction[0].landmarks[1][1], 2));
                drawFocuses(distance, centerX, centerY, prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], prediction[0].landmarks[1][0], prediction[0].landmarks[1][1]);
                ctx.restore();
            }else{
                ctx.font = "30px Arial";
                ctx.fillStyle = "rgb(255,7,7)";
                ctx.fillText("No face detected", width/3, height/2);
            }

        })

        //console.log("Oeil droit : " + prediction[0].landmarks[0]);
        //console.log("Oeil gauche : " + prediction[0].landmarks[1]);



    }catch (e) {
        console.log(e);
    }
};

function drawFocuses(eyeDistance, centerX, centerY, rightEyeX, rightEyeY, leftEyeX, leftEyeY){

    //test pour pulmonaire
    let xMultiplier = 1.5;
    let yMultiplier = 3.5;

    switch (currentFoyer) {
        case "pulmonaire", "pulmonary":
            xMultiplier = 1.5;
            yMultiplier = 3.5;

    }

    drawPoint(rightEyeX + (leftEyeX-rightEyeX) * xMultiplier, rightEyeY + (leftEyeX -rightEyeX) * yMultiplier);



    /*
    //aortic
    drawPoint(width - 369, 272);
    //tricuspid
    drawPoint(width - 320, 333);
    //mitral
    drawPoint(width - 283, 348);

     */
}

function drawPoint(x, y){
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "#a2d2ff";
    ctx.fill();
    ctx.strokeStyle = "#a2d2ff";
    ctx.stroke();
}

async function start(foyer){
    /*
    if(foyer === undefined || foyer === null){
        throw new Error("The zone is undefined or null");
    }*/

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