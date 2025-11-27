import { world, system } from "@minecraft/server";

let requests = {};
let cooldowns = {};
let TIMEOUT = 120000;
let COOLDOWN = 30000;

function sendMessage(player, msg){
  player.sendMessage(msg);
}

function cleanExpiredRequests(){
  let now = Date.now();
  for(let key in requests){
    if(requests[key].timestamp + TIMEOUT < now){
      let requester = world.getPlayers().find(p => p.name === requests[key].from);
      let target = world.getPlayers().find(p => p.name === key);
      if(requester) requester.sendMessage(`TPA request to ${key} expired`);
      if(target) target.sendMessage(`TPA request from ${requests[key].from} expired`);
      delete requests[key];
    }
  }
}

world.events.beforeChat.subscribe(event => {
  let msg = event.message.trim().split(" ");
  let sender = event.sender;
  if(msg[0] === "/tpa" && msg[1]){
    let target = world.getPlayers().find(p => p.name === msg[1]);
    if(!target) { sendMessage(sender, "Player not found"); event.cancel=true; return; }
    if(sender.name in cooldowns && cooldowns[sender.name] + COOLDOWN > Date.now()){
      sendMessage(sender, "You are on cooldown");
      event.cancel=true;
      return;
    }
    requests[target.name] = { from: sender.name, timestamp: Date.now() };
    sendMessage(target, `${sender.name} sent you a TPA request. /tpaccept or /tpdeny`);
    sendMessage(sender, `TPA request sent to ${target.name}`);
    cooldowns[sender.name] = Date.now();
    event.cancel=true;
  }
  if(msg[0] === "/tpaccept"){
    if(requests[sender.name]){
      let requester = world.getPlayers().find(p => p.name === requests[sender.name].from);
      if(requester){
        requester.teleport(sender.location);
        sendMessage(requester, `Teleported to ${sender.name}`);
        sendMessage(sender, `${requester.name} has teleported to you`);
      }
      delete requests[sender.name];
    } else sendMessage(sender, "No TPA requests");
    event.cancel=true;
  }
  if(msg[0] === "/tpdeny"){
    if(requests[sender.name]){
      let requester = world.getPlayers().find(p => p.name === requests[sender.name].from);
      if(requester){
        sendMessage(requester, `${sender.name} denied your TPA request`);
        sendMessage(sender, `You denied ${requester.name}'s TPA request`);
      }
      delete requests[sender.name];
    } else sendMessage(sender, "No TPA requests");
    event.cancel=true;
  }
});

system.runInterval(() => {
  cleanExpiredRequests();
}, 5000);
