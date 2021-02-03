var express = require('express');
var socket = require('socket.io');
var app = express();
var cors = require('cors')
var server = app.listen(4000, '192.168.29.188', () => {
    console.log('listening on port 4000');
})
app.use(express.static('public'));
app.use(cors())
var io = socket(server);
userrooms = {}
users = [];
connections = [];
rooms = [];
masterRoomData = {};
var host = false;
var notifyfix = false
io.on('connection', (socket) => {
    console.log('Made socket connection', socket.id);
    // connections.push(socket);
    socket.on('chat', (data) => {
        io.sockets.emit('chat', data);
    });

    socket.on('typing', (data) => {
        socket.broadcast.emit('typing', data);
    });

    socket.on('new_user', (data, callback) => {
        callback(true);
        socket.username = data;
        users.push(socket.username);
        console.log(socket.username);
    });

    socket.on('new_room', (data, callback) => {
        socket.roomnum = data;
        userrooms[socket.id] = data
        console.log(userrooms);
        var host = null
        var init = false
        if (!rooms.includes(socket.roomnum)) {
            rooms.push(socket.roomnum);
        }
        if (masterRoomData['room-' + socket.roomnum] === undefined) {
            socket.send(socket.id)
            // Sets the first socket to join as the host
            host = socket.id
            init = true

            // Set the host on the client side
            socket.emit('setHost');
            //console.log(socket.id)
        } else {
            console.log(socket.roomnum)
            host = masterRoomData['room-' + socket.roomnum].host
        }
        console.log(socket.username + " connected to room-" + socket.roomnum)
        // console.log("Before",io.sockets);
        socket.join("room-" + socket.roomnum);
        // console.log("hi:",socket);
        // console.log(io.sockets);
        if (init) {
            // console.log("Hey",io.sockets.adapter.rooms['room-' + socket.roomnum]);
            // io.sockets.adapter.rooms['room-' + socket.roomnum].host = host
            // io.sockets.adapter.rooms['room-' + socket.roomnum]['hostName'] = socket.username
            // io.sockets.adapter.rooms['room-' + socket.roomnum]['users'] = [socket.username]
            // io.sockets.adapter.rooms['room-' + socket.roomnum]['queue'] = {
            //     html5: []
            // }
            let roomData = new Object();
            roomData['host'] = host;
            roomData['hostName'] = socket.username;
            roomData['users'] = [socket.username];
            // roomData['sockets'] = [socket];
            roomData['currPlayer'] = 0;
            roomData['currVideo'] = {
                html5: 'KillingMeSoftly.mp4'
            }
            roomData['prevVideo'] = {
                html5: {
                    id: 'KillingMeSoftly.mp4',
                    time: 0
                }
            }
            roomData['queue'] = { 'html5': [] };
            masterRoomData["room-" + socket.roomnum] = roomData;
        }
        io.sockets.in("room-" + socket.roomnum).emit('changeHostLabel', {
            username: masterRoomData['room-' + socket.roomnum].hostName
        })

        updateQueueVideos();

        switch (masterRoomData['room-' + socket.roomnum].currPlayer) {
            case 0:
                var currVideo = masterRoomData['room-' + socket.roomnum].currVideo.html5;
                break;
            default:
                console.log('invalid player id');
        }

        switch (masterRoomData['room-' + socket.roomnum].currPlayer) {
            case 0:
                io.sockets.in('room-' + socket.roomnum).emit('createHTML5', {});
                break;
            default:
                console.log('invalid player id');
        }
        socket.emit('changeVideoClient', {
            videoId: currVideo
        });

        if (socket.id != host) {
            setTimeout(function () {
                socket.broadcast.to(host).emit('getData');
            }, 1000);
            masterRoomData['room-' + socket.roomnum].users.push(socket.username);
        }
        updateRoomUsers(socket.roomnum)
    });

    // Update the playlist/queue
    function updateQueueVideos() {
        if (masterRoomData['room-' + socket.roomnum] !== undefined) {
            var vidlist = masterRoomData['room-' + socket.roomnum].queue
            var currPlayer = masterRoomData['room-' + socket.roomnum].currPlayer
            io.sockets.in("room-" + socket.roomnum).emit('get vidlist', {
                vidlist: vidlist,
                currPlayer: currPlayer,
            })
        }
    }
    socket.on('getVideo', (callback) => {
        if (masterRoomData['room-' + socket.roomnum] != undefined) {
            if (masterRoomData['room-' + socket.roomnum].currPlayer == 0) {
                var currVideo = masterRoomData['room-' + socket.roomnum].currVideo.html5;
            }
        }
        callback(currVideo);
    })

    socket.on('sync host', (data) => {
        if (masterRoomData['room-' + socket.roomnum] != undefined) {
            var host = masterRoomData['room-' + socket.roomnum].host;
            if (socket.id != host) {
                socket.broadcast.to(host).emit('getData');
            }
            else {
                socket.emit('syncHost', masterRoomData['room-' + socket.roomnum], 'room-' + socket.roomnum);
            }
        }
    })

    socket.on('sync video', (data) => {
        if (masterRoomData['room-' + socket.roomnum] !== undefined) {
            var roomnum = data.room
            var currTime = data.time
            var state = data.state
            var videoId = data.videoId
            var playerId = masterRoomData['room-' + socket.roomnum].currPlayer
            io.sockets.in('room-' + socket.roomnum).emit('syncClientVideo', {
                time: currTime,
                state: state,
                videoId: videoId,
                playerId: playerId
            })
        }
    })

    socket.on('get host data', (data) => {
        console.log(masterRoomData['room-' + data.room])
        if (masterRoomData['room-' + socket.roomnum] !== undefined) {
            var roomnum = data.room;
            var host = masterRoomData['room-' + roomnum].host
            if (data.currTime === undefined) {
                var caller = socket.id;
                socket.broadcast.to(host).emit('getPlayerData', {
                    room: roomnum,
                    caller: caller
                })
            } else {
                var caller = data.caller;
                socket.broadcast.to(caller).emit('compareHost', data);
            }
        }
    })


    function updateRoomUsers(roomnum) {
        if (masterRoomData['room-' + socket.roomnum] !== undefined) {
            var roomUsers = masterRoomData['room-' + socket.roomnum].users;
            io.sockets.in('room-' + socket.roomnum).emit('get users', roomUsers);
        }
    }

    //socket functions

    socket.on('play other', (data) => {
        var roomnum = data.room;
        io.sockets.in('room-' + roomnum).emit('justPlay');
    })

    socket.on('pause other', (data) => {
        var roomnum = data.room;
        socket.broadcast.to('room-' + roomnum).emit('justPause');
    })

    socket.on('seek other', (data) => {
        var roomnum = data.room;
        var currTime = data.time;
        console.log("Time:" + currTime);
        socket.broadcast.to('room-' + roomnum).emit('justSeek', {
            time: currTime
        });
    })

    socket.on('disconnect', (data) => {
        console.log(users);
        if (socket.roomnum && masterRoomData['room-' + socket.roomnum]) {
            if (users.indexOf(socket.username) != -1) {
                users.splice((users.indexOf(socket.username)), 1);
            }
            connections.splice(connections.indexOf(socket), 1);
            console.log('online users: ' + users.length);
            let roomData = masterRoomData['room-' + socket.roomnum];
            let usersInRoom = roomData.users;
            if (usersInRoom.indexOf(socket.username) != -1) {
                usersInRoom.splice((usersInRoom.indexOf(socket.username)), 1);
                masterRoomData['room-' + socket.roomnum].users = usersInRoom;

                updateRoomUsers(socket.roomnum);
            }
            if (roomData.hostName == socket.username && usersInRoom.length > 0) {
                socket.broadcast.emit('setAutoHost', {
                    roomnum: socket.roomnum
                })
            }
        }


    })

    socket.on('change host', (data) => {
        if (masterRoomData['room-' + socket.roomnum].users[0] == socket.username) {
            var roomnum = data.room;
            var newHost = socket.id;
            var currHost = masterRoomData['room-' + socket.roomnum].host;
            if (newHost != currHost) {
                socket.broadcast.to(currHost).emit('unsetHost');
                masterRoomData['room-' + socket.roomnum].host = newHost;
                socket.emit('setHost');
                masterRoomData['room-' + socket.roomnum].hostName = socket.username;
                io.sockets.in('room-' + roomnum).emit('changeHostLabel', {
                    username: socket.username
                })
            }

        }
    })

    socket.on('send message', function (data) {
        var encodedMsg = data.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        // console.log(data);
        io.sockets.in("room-" + socket.roomnum).emit('new message', {
            msg: encodedMsg,
            user: socket.username
        });
    });

    socket.on('typing', (data) => {
        socket.emit('typingFromServer', {
            username: socket.username
        })
    })

    socket.on('sync_others', (data) => {
        socket.broadcast.to('room-' + socket.roomnum).emit('justSeek', {
            time: data.time
        })
    })

    socket.on('sync_me', (data) => {
        console.log('Hi you want to sync?');
        socket.broadcast.to('room-' + socket.roomnum).emit('tell_me');
    })

    socket.on('hostTime', (data) => {
        socket.broadcast.to('room-' + socket.roomnum).emit('justSeek', {
            time: data.time
        })
    })

})