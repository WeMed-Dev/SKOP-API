import Swal from "sweetalert2";

const tf = require("@tensorflow/tfjs");
const blazeface = require("@tensorflow-models/blazeface");

let model;
let video;
let intervalId;
let prediction;
let width;
let height;
let canvas;

//set the canvas to the video size

let ctx;


function setupAR(userCanvas){
    if(userCanvas === undefined || userCanvas === null){
        throw new Error("Canvas is undefined or null");
    }
    //check if canvas is a string
    if(typeof userCanvas !== "string"){
        canvas = document.getElementById(userCanvas);
    }
    if(userCanvas.nodeName === "CANVAS"){
        canvas = userCanvas;
        console.log(userCanvas);
    }
    else {
        throw new Error("Canvas is not a string nor a canvas");
    }



}

async function init(resWidth, resHeight){
    width = resWidth;
    height = resHeight;
    //canvas = document.getElementById("canvas");

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
            video.width = 640;
            video.height = 480;
            video.play();
        });

    video.addEventListener("play", async () => {
        model = await blazeface.load();
        console.log("model loaded");
    })
}

const detectFaces = async () => {
    if(model === undefined) return;
    prediction = await model.estimateFaces(video, false);
    console.log("Oeil droit : " + prediction[0].landmarks[0]);
    console.log("Oeil gauche : " + prediction[0].landmarks[1]);


    //flip the video
    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, 640, 480);


    // draw eyes
    ctx.beginPath();
    ctx.arc(prediction[0].landmarks[0][0], prediction[0].landmarks[0][1], 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(prediction[0].landmarks[1][0], prediction[0].landmarks[1][1], 3, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.stroke();

    ctx.restore();



};


function start(){
    intervalId = setInterval(detectFaces, 100)
    return prediction;
}

function stop(){
    clearInterval(intervalId);
}
export {setupAR ,init, start, stop};