"use strict";


const WebSocketServer = require('ws').Server;
const Splitter        = require('stream-split');
const merge           = require('mout/object/merge');
const fs              = require('fs');
const NALseparator    = new Buffer([0,0,0,1]);//NAL break
const TEST_VARIABLE            = true;

class _Server {

  constructor(server, options) {

    this.options = merge({
        width : 960,
        height: 540,
    }, options);

    this.wss = new WebSocketServer({ server });

    this.new_client = this.new_client.bind(this);
    this.start_feed = this.start_feed.bind(this);
    this.broadcast  = this.broadcast.bind(this);
    this.broadcastPackage = this.broadcastPackage.bind(this);
    this.wss.on('connection', this.new_client);
  }
  

  start_feed() {
    var readStream = this.get_feed();
    this.readStream = readStream;

    if (TEST_VARIABLE) {
      readStream = readStream.pipe(new Splitter(NALseparator));
      readStream.on("data", this.broadcast);
    } else {
       this.broadcastPackage(0);
    }
  }

  get_feed() {
    throw new Error("to be implemented");
  }

  broadcastPackage(index) {
    fs.access('/home/andrey/test/list/' + index, (err) => {
      if (err) {
        console.error('File Does not exists');
        return;
      }
      
      fs.readFile('/home/andrey/test/list/' + index ,(err, data) => {
        if (err) throw err;
        var socket = this.wss.clients[0];
        if(!socket.buzy) {          
          socket.buzy = true;
          socket.buzy = false;
          socket.send(Buffer.concat([NALseparator, data]), { binary: true}, function ack(error) {
            socket.buzy = false;
            broadcastPackage(0);
          });
      }
      });
    });
  }

  broadcast(data) {
    console.log(this.wss.clients.length);
    this.wss.clients.forEach(function(socket) {

      if(socket.buzy)
        return;

      socket.buzy = true;
      socket.buzy = false;

      socket.send(Buffer.concat([NALseparator, data]), { binary: true}, function ack(error) {
        console.log("data : " + data.length);
        socket.buzy = false;
      });
    });
  }

  new_client(socket) {
  
    var self = this;
    console.log('New guy');

    socket.send(JSON.stringify({
      action : "init",
      width  : this.options.width,
      height : this.options.height,
    }));

    socket.on("message", function(data){
      var cmd = "" + data, action = data.split(' ')[0];
      console.log("Incomming action '%s'", action);

      if(action == "REQUESTSTREAM")
        self.start_feed();
      if(action == "STOPSTREAM")
        self.readStream.pause();
    });

    socket.on('close', function() {
      self.readStream.end();
      console.log('stopping client interval');
    });
  }


};


module.exports = _Server;
