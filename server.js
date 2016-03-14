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

	//What do I do with the options??
	this.server = net.createServer()

	EventEmitter.call(this);

	var self = this;

	this.server.on('connection', function onConnection(socket) {
		socket.name = socket.remoteAddress + ":" + socket.remotePort;
		console.log("new connection from", socket.name);

		//Construct the req and res objects

		//Get bytes and decode them
		var conn = new Connection(socket, function(reqBytes, cb) {
			var req = new Request(conn, reqBytes)
			var res = new Response(conn, req)

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