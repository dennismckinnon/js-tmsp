var util = require('util');

var types = require("./types");
var EventEmitter = require('events').EventEmitter;

function Request(connection, reqBytes){
	this.req = types.Request.decode(reqBytes);

	//Expand
	this.type = this.req.type;
	this.data = this.req.data;


	this.connection = connection;
	this.finished = false;

	this.method = types.methodLookup[this.type].toUpperCase()
	//TODO Run this past ethan. ensure this is right
	this.data = this.req.data.buffer.slice(this.req.data.offset);
	this.dataLength = this.req.data.limit - this.req.data.offset;
	this.dataLittle = this.req.data.littleEndian;

	this.key = this.req.key;
	this.value = this.req.value;

	EventEmitter.call(this);

	//Add listener for end event on connection and emit a close event as a result
	this.connection.socket.on('end', function(){
		this.finished = true;
		this.emit('close')
	})

}
util.inherits(Request, EventEmitter);

module.exports = Request;