

navigator.mediaDevices.getUserMedia({audio: true, video: false})
.then(media => {
    console.log("Get user media")
    console.log(media)
})



navigator.mediaDevices.enumerateDevices()
.then(enumM => {
    console.log("Enum Devices")
    console.log(enumM)
})
