var util = require('util');
var net = require("net");
var EventEmitter = require('events').EventEmitter;

var Request = require('./request')
var Response = require('./response') 

var Connection = require("./connection").Connection;

function createServer(options){
	return new Server(options)
}

function Server(options){

	this.server = net.createServer(options)

	EventEmitter.call(this);

	var self = this;

	//TODO handle multiple requests coming from same connection
	this.server.on('connection', function onConnection(socket) {
		socket.name = socket.remoteAddress + ":" + socket.remotePort;
		//Construct the req and res objects

		//Process the connection, forward the emitted request events
		var conn = new Connection(socket)
		conn.on('request', function(req, res){
			self.emit('request', req, res)
		})
	})
}
util.inherits(Server, EventEmitter);

Server.prototype.listen = function(){
	this.server.listen.apply(this.server, arguments)
}

module.exports = {
	Server: Server,
	createServer: createServer
}