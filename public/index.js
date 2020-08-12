const domain = location.origin
console.log("domain", domain)



const ws = new WebSocket("ws://qwer.qq.maximilian.mairinger.com/ws/");
 
ws.addEventListener('open', function open() {
  console.log("open")
  ws.send('something');
});
 
ws.addEventListener('message', function incoming(data) {
  console.log(data);
});