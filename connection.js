var wire = require("js-wire");
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Request = require('./request')
var Response = require('./response') 

var maxWriteBufferLength = 4096; // Any more and flush

function Connection(socket, msgCb) {
	this.socket = socket;
	this.recvBuf = new Buffer(0);
	this.sendBuf = new Buffer(0);
	this.waitingResult = false;
	var self = this;

	EventEmitter.call(this);

	// Handle TMSP requests.
	socket.on('data', function(data) {
		self.appendData(data);
	});
}

util.inherits(Connection, EventEmitter);

Connection.prototype.appendData = function(bytes) {
	var self = this;
	if (bytes.length > 0) {
		this.recvBuf = Buffer.concat([this.recvBuf, new Buffer(bytes)]);
	}
	if (this.waitingResult) {
		return;
	}
	var r = new wire.Reader(this.recvBuf);
	var msgBytes;
	//TODO if this fails we should clean up properly
	try {
		msgBytes = r.readByteArray();
	} catch(e) {
		return;
	}
	this.recvBuf = r.buf.slice(r.offset);
	this.waitingResult = true;
	this.socket.pause();

	var req = new Request(this, msgBytes);
	var res = new Response(this, req);
	this.emit('request', req, res);
};


//This gets called after msg handler is finished with response.
Connection.prototype.done = function(){
	this.waitingResult = false;
	this.socket.resume();
	//What does this do?
	//I think this is a weird way of triggering the connection to close...
	if (this.recvBuf.length > 0) {
		this.appendData("");
	}
}

Connection.prototype.writeMessage = function(msg) {
	var msgBytes = msg.encode().toBuffer();
	var msgLength = wire.uvarintSize(msgBytes.length);
	var buf = new Buffer(1+msgLength+msgBytes.length);
	var w = new wire.Writer(buf);
	w.writeByteArray(msgBytes); // TODO technically should be writeVarint
	this.sendBuf = Buffer.concat([this.sendBuf, w.getBuffer()]);
	if (this.sendBuf.length >= maxWriteBufferLength) {
		this.flush();
	}
};

Connection.prototype.flush = function() {
	console.log("flushing")
	var n = this.socket.write(this.sendBuf);
	this.sendBuf = new Buffer(0);
	console.log("done flushing")
}

Connection.prototype.close = function() {
	this.socket.destroy();
}

module.exports = {
	Connection: Connection
};
