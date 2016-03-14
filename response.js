var util = require('util');
var types = require("./types");
var EventEmitter = require('events').EventEmitter;

function Response(connection, req){
	var self = this;

	EventEmitter.call(this);

	this.connection = connection;
	this.req = req;
	this.finished = false;

	//Response fields
	this.res = {};
	this.res.type = req.type;
	this.method = types.methodLookup[req.type].toUpperCase()

	//Add listener for end event on connection and emit a close event as a result
	this.connection.socket.on('end', this.endListener)
}
util.inherits(Response, EventEmitter);

Response.prototype.endListener = function(){
	this.close();
}

Response.prototype.close = function(){
	this.finished = true;
	this.connection.socket.removeListener('end', this.endListener)
	this.connection.flush()
	this.emit('close')
}

//For writing and then ending the response
Response.prototype.send = function(code, data, log, error){
	var self = this;

	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED")
		return
	}

	this.write(code, data, log, error)
	console.log("Sending")
	console.log(this.res)

	this.end()
}

Response.prototype.err = function(err){
	//If response already closed don't allow it to write
	if(this.finished){
		console.log("ALREADY CLOSED")
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
		console.log("ALREADY CLOSED")
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
		console.log("ALREADY CLOSED")
		return
	}

	var msg = new types.Response(this.res);
	this.connection.writeMessage(msg);
	this.connection.done();
	//Clean up the request and responses
	this.req.close();
	this.close();
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