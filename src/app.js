
// fetch("https://test-wemed.herokuapp.com/session")
// .then(data => data.json())
// .then(data => console.log(data))

const apiKey = 47478071;
const sessionId = "2_MX40NzQ3ODA3MX5-MTY1MDUzMTAxMjM1M35WaGpyaEhsVmJTK2pubHZNbDJCdmsrK2R-fg";
const token = "T1==cGFydG5lcl9pZD00NzQ3ODA3MSZzaWc9NTljZDE4NGQzNTVjZDgwNGNlYzMzOWRlZGE1MTE4MDFhYjhhNGQ0YzpzZXNzaW9uX2lkPTJfTVg0ME56UTNPREEzTVg1LU1UWTFNRFV6TVRBeE1qTTFNMzVXYUdweWFFaHNWbUpUSzJwdWJIWk5iREpDZG1zcksyUi1mZyZjcmVhdGVfdGltZT0xNjUwNTMxMDEyJnJvbGU9cHVibGlzaGVyJm5vbmNlPTE2NTA1MzEwMTIuMzgzMzQ0MTQ4OTU4NCZpbml0aWFsX2xheW91dF9jbGFzc19saXN0PQ=="



let test = new Skop.Skop(sessionId, token, apiKey, true, true, "Aortic");


