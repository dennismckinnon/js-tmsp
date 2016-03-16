var util = require('util');
var types = require("./types");
var uuid = require('node-uuid');
var EventEmitter = require('events').EventEmitter;

var doneListener;
var closeListener;

function Response(connection, req){
	var self = this;

	EventEmitter.call(this);

	this.connection = connection;
	this.req = req;
	this.finished = false;

	//Response fields
	this.res = {};
	this.res.type = req.type;
	this.method = req.method;

	this.uuid = uuid.v4();

	//TODO move the socket into the response for direct writing
	doneListener = function(reqid){
		//Use the uuid to filter and ensure the correct request closes
		if(self.uuid == reqid){
			self.close()
		}
	}

	closeListener = function(){
		self.close()
	}

	//Add listener for end event on connection and emit a close event as a result
	this.connection.on('done', doneListener)
	this.connection.socket.on('close', closeListener)
}
util.inherits(Response, EventEmitter);

Response.prototype.close = function(){
	this.finished = true;
	this.connection.socket.removeListener('close', closeListener)
	this.connection.removeListener('done', doneListener)
	this.emit('close')
}

//For writing and then ending the response
Response.prototype.send = function(code, data, log, error){
	var self = this;

	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED1")
		return
	}

	this.write(code, data, log, error)
	this.end()
}

Response.prototype.err = function(err){
	console.log(err)
	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED2")
		return
	}

	var errMsg;
	if (err instanceof Error){
		errMsg = err.message;
	} else {
		errMsg = err;
	}

	this.send({code: types.CodeType.InternalError, error: errMsg})
}

Response.prototype.write = function(code, data, log, error){
	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED3")
		return
	}

	//Write the response fields
	if (typeof code === 'object'){
		//The information was passed as an object -> unpack it
		data = code.data;
		log = code.log;
		error = code.error;
		code = code.code;
	}

	//Handle missing arguments
	code = (code || types.CodeType.OK)
	data = (data || new Buffer(0))
	log = (log || "")
	error = (error || "")
	

	//Arguments parsing
	if (typeof code === 'number'){
		//The code was passed as a number
		this.res.code = code;
	} else if (typeof code === 'string'){
		//The code was passed as a name -> Try to match the name

		//TODO we should toUppercase() the codes string but we need to change the protobuf
		if(!types.CodeType[code]){
			this.res.code = types.CodeType.OK
		} else {
			this.res.code = types.CodeType[code]
		}
	}

	//TODO? Better stringification
	this.res.data = new Buffer(data)
	this.res.log = log.toString()
	this.res.error = error.toString()
}


//Calls the connections writer to 
Response.prototype.end = function(){
	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED4")
		return
	}

	var msg = new types.Response(this.res);
	this.connection.writeMessage(msg);
	this.connection.done(this.uuid);
}

Response.prototype.flush = function(){
	this.connection.flush();
}

Response.prototype.print = function(){
	var cleanObj = {}
	for (key in this){
		if(key != 'connection' && key != 'domain'){
			cleanObj[key] = this[key];
		}
	}
	console.log(cleanObj)
}

module.exports = Response;