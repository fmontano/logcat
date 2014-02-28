var util = require('util'),
	colors = require('colors'),
	app = require('express.io')(),
	spawn = require('child_process').spawn,
	io = require('socket.io-client'),
	state = {
		'success': ['success', 'D\/DroidGap', 'D\/CordovaLog'],
		'error': ['error', 'E\/'],
		'warning': ['warning', 'W\/Web Console'],
		'info': ['info']
	},
	logcat = spawn('adb', ['logcat']);

app.http().io();
app.get('/', function(req, res) {res.sendfile(__dirname + '/public/client.html');});
app.get('/js/jquery-1.9.1.min.js', function(req, res) {res.sendfile(__dirname + '/public/js/jquery-1.9.1.min.js');});
app.get('/js/bootstrap.min.js', function(req, res) {res.sendfile(__dirname + '/public/js/bootstrap.min.js');});
app.get('/css/bootstrap.min.css', function(req, res) {res.sendfile(__dirname + '/public/css/bootstrap.min.css');});

/// Trying to connect to logcat-server to send logs
var socket = io.connect('http://127.0.0.1:8888');
socket.on('connect', function () { }); /// Left here for later use

var parseStdout = function(data, _class) {
	data.toString().split('\n').forEach(function(line) {
		if(line != '') {
			var type = ['info'];
			if(state.hasOwnProperty(_class)) {
				type.push(_class);
			} else {
				Object.keys(state).forEach(function(k) {
					if(util.isArray(state[k])) {
						state[k].forEach(function(rx) {
							var r = new RegExp(rx);
							if(r.test(line)) {
								type.push(k);
							}
						});
					}
				});
			}
			
			if(type.indexOf('error') >= 0) {
				console.log(line.red.bold);
				app.io.broadcast('line', {'line': line, 'type': 'error'});
				socket.emit('log', {'line': line, 'type': 'error' }, function(){});
			} else if(type.indexOf('warning') >= 0) {
				console.log(line.yellow.bold);
				app.io.broadcast('line', {'line': line, 'type': 'warning'});
				socket.emit('log', {'line': line, 'type': 'warning' }, function(){});
			} else if(type.indexOf('success') >= 0) {
				console.log(line.green.bold);
				app.io.broadcast('line', {'line': line, 'type': 'success'});
				socket.emit('log', {'line': line, 'type': 'success' }, function(){});
			} else {
				console.log(line.blue.bold);
				app.io.broadcast('line', {'line': line, 'type': type[0]});
				socket.emit('log', {'line': line, 'type': type[0] }, function(){});
			}
		}
	});
};

logcat.stdout.on('data', function(data){parseStdout(data);});

logcat.stderr.on('data', function(data){parseStdout(data, 'error');});

logcat.on('exit', function (code) {
	logcat = spawn('adb', ['logcat']);
});

module.exports = app;
