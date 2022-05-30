const tf = require("@tensorflow/tfjs");
const blazeface = require("@tensorflow-models/blazeface");

let model;
let video;
let intervalId;

async function init(resWidth, resHeight) {
    await tf.ready();

    video = document.createElement('video');


        navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: false,
            })
            .then((stream) => {
                video.srcObject = stream;
                video.width = resWidth;
                video.height = resHeight;
                video.play();
            });


        video.addEventListener("play", async () => {
            model = await blazeface.load();
            console.log("model loaded");
        })
}

const detectFaces = async () => {
    const prediction = await model.estimateFaces(video, false);
    console.log("Oeil droit : " + prediction[0].landmarks[0]);
    console.log("Oeil gauche : " + prediction[0].landmarks[1]);
};


function start(){
    intervalId = setInterval(detectFaces, 100);
}

function stop(){
    clearInterval(intervalId);
}

export {init, start, stop};