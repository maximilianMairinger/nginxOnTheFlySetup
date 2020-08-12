const domain = location.origin
console.log("domain", domain)



const ws = new WebSocket("ws://qwer.qq.maximilian.mairinger.com");
 
ws.on('open', function open() {
  console.log("open")
  ws.send('something');
});
 
ws.on('message', function incoming(data) {
  console.log(data);
});