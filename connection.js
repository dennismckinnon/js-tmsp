var wire = require("js-wire");
var util = require('util');
var LinkedList = require('linkedlist');
var EventEmitter = require('events').EventEmitter;

var tmspReader = require('./tmspReader');
var Request = require('./request')
var Response = require('./response')
var types = require('./types'); 

var maxWriteBufferLength = 4096; // Any more and flush

function Connection(socket, msgCb) {
	this.socket = socket;
	this.parser = new tmspReader();
	this.recvBuf = new Buffer(0);
	this.sendBuf = new Buffer(0);
	this.reqQueue = new LinkedList;
	this.running = false;
	var self = this;

//	console.log(this.parser)

	EventEmitter.call(this);

//	socket.on('readable', function(){console.log("read me seymour!")})
	socket.pipe(this.parser);
	// Handle TMSP requests.

	this.parser.on('readable', onReadable)

	this.parser.on('empty', onEmpty)

	function onReadable(){
		self.work = true;
		//If not working get started!
		console.log("Stop Slacking off!")
		if(!self.running){
			self.runNextRequest();
		}
	}

	function onEmpty(){
		self.work = false
		console.log("Empty!")
	}

	socket.on('end', function(){
		console.log("END FOUND!")
	})


//	socket.on('end', this.processRequests.bind(this))
	
	socket.on('close', function(haderr){console.log("Closing"); console.log(haderr)})
	socket.on('drain', function(){console.log("sendBuffer empty")})
}

util.inherits(Connection, EventEmitter);




//This is the request processor loop using events to trigger
//the next request in the Queue.
Connection.prototype.runNextRequest = function(){
	console.log("running next")
	var self = this;

	var req = this.parser.read()
	if (req){
		var res = new Response(this, req);

		console.log(req)
		console.log(req.method)
		console.log(res.method)

		//No matter how the response object gets closed this
		//will trigger the next one if there is one.
		res.once('close', function(){
			//Check if there is work.
			if(self.work){
				self.runNextRequest()
			} else {
				//Let the system know that you have stopped working
				self.working = false;
			}
		});

		this.emit('request', req, res);		
	}
}


//This gets called after msg handler is finished with response.
Connection.prototype.done = function(reqid){
//	console.log("DONEING")
	var self = this;
	this.waitingResult = false;
	this.socket.resume();
	this.sendCurrentBuffer(function(){
		self.emit('done', reqid)
	});
	//What does this do?
	//I think this is a weird way of triggering the connection to close...
//	if (this.recvBuf.length > 0) {
//		this.appendData("");
//	}
}

Connection.prototype.writeMessage = function(msg) {
	var msgBytes = msg.encode().toBuffer();
	var msgLength = wire.uvarintSize(msgBytes.length);
	var buf = new Buffer(1+msgLength+msgBytes.length);
	var w = new wire.Writer(buf);
	w.writeByteArray(msgBytes); // TODO technically should be writeVarint
	this.sendBuf = Buffer.concat([this.sendBuf, w.getBuffer()]);
	if (this.sendBuf.length >= maxWriteBufferLength) {
		this.sendCurrentBuffer();
	}
};

Connection.prototype.sendCurrentBuffer = function(cb){
	var self = this;
	var n = this.socket.write(this.sendBuf, function(){
		self.flush();
		if(cb){
			cb();
		}
	});
}

Connection.prototype.flush = function() {
	this.sendBuf = new Buffer(0);
}

Connection.prototype.close = function() {
	this.socket.destroy();
}

module.exports = {
	Connection: Connection
};
