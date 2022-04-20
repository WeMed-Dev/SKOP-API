fetch("https://test-wemed.herokuapp.com/session")
.then(data => data.json())
.then(data => console.log(data))

