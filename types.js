function xport(exports, m) {
  for (var key in m) {
    exports[key] = m[key];
  }
}

var proto = require("protobufjs");
var protoPath = require("path").join(__dirname, "types.proto"); // TODO: better to just compile this into a js file.
var builder = proto.loadProtoFile(protoPath);
var types = builder.build("types");

var methodLookup = {};

for (var key in types.MessageType){
	if(types.MessageType.hasOwnProperty(key)){
		methodLookup[types.MessageType[key]] = key;
	}
}

var methods = [];

for (var key in types.MessageType){
	if(types.MessageType.hasOwnProperty(key)){
		methods.push(key)
	}
}

var codeLookup = {};
for (var key in types.CodeType){
	if(types.CodeType.hasOwnProperty(key)){
		codeLookup[types.CodeType[key]] = key;
	}
}

module.exports = types;
module.exports.methodLookup = methodLookup;
module.exports.codeLookup = codeLookup;
module.exports.methods = methods;
