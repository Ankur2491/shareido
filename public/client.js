var socket = io.connect("http://192.168.29.188:4000");
var roomnum;
$(function () {
    var $userForm = $('#userForm');
    var $username = $('#username');
    var $roomnum = $('#roomnum');
    var $userFormArea = $('#userFormArea');
    var $roomArea = $('#roomArea');
    var $message = $('#message');
    var $vidlist = $('#vidlist');
    var $users = $('#users');
    var media = document.querySelector('video');
    var $messageForm = $('#messageForm');
    var msg = document.getElementById('message');
    var sync = document.getElementById('sync');
    var videoId = '';
    var $chat = $('#chat');
    var host = false;
    var notifyfix = false


    $messageForm.submit(function (e) {
        e.preventDefault();
        // console.log("Submitted");
        feedback.innerHTML = '';
        socket.emit('send message', $message.val());
        $message.val('');
    });

    msg.addEventListener('keypress', () => {
        socket.emit('typing', $username.val());
    })

    socket.on('typing', (data) => {
        feedback.innerHTML = '<p><em>' + data + ' is typing a message...</em></p>';
    })

    sync.addEventListener('click',()=>{
        if(host){
            socket.emit('sync_others',{time: media.currentTime});
        }
        else{
            console.log('Its me');
            socket.emit('sync_me');
        }
    })
    
    socket.on('tell_me',(data)=>{
        if(host){
            console.log('myTime',media.currentTime);
            socket.emit('hostTime',{
                time: media.currentTime
            })
        }
    })

    $userForm.submit(function (e) {
        e.preventDefault();
        if ($username.val() == "" || $roomnum.val() == "") {
            var noname = document.getElementById('missinginfo')
            noname.innerHTML = "Please enter the details below!"
        }
        else {
            username = $username.val()
            socket.emit('new_user', $username.val(), (data) => {
                if (data) {
                    $userFormArea.hide();
                    $roomArea.show();

                    // Show header buttons!
                    // document.getElementById('chat-nav').style.display = 'block';
                    // document.getElementById('about-nav').style.display = 'block';
                    // document.getElementById('contact-nav').style.display = 'block';
                    if ($roomnum.val() != '') {
                        roomnum = $roomnum.val();
                    }
                }
            });
            socket.emit('new_room', $roomnum.val(), (data) => {
                if (data) {
                    console.log("Host is syncing the new socket!");
                    syncVideo(roomnum);
                }
            });
        }
    });

    socket.on('changeHostLabel', (data) => {
        var user = data.username;
        var hostlabel = document.getElementById('hostlabel');
        hostlabel.innerHTML = "<i class=\"fas fa-user\"></i> Current Host: " + user
    })

    socket.on('get vidlist', (data) => {
        console.log("updating the queue");
        var html5 = ''
        html5 += `<li class="vid-item"></li>`
        $vidlist.html(html5)
    })

    socket.on('createHTML5', (data) => {
        var html5 = document.getElementById('HTML5Area');
        html5.style.display = 'block';
        document.getElementById('visual-queue').style.display = 'none'
        document.getElementById('queue-arrows').style.display = 'none'
        // document.getElementById('html5-input').style.display = 'block'
    })

    socket.on('changeVideoClient', (data) => {
        videoId = data.videoId;
        console.log(videoId);

        socket.emit('getVideo', (id) => {
            videoId = id;
            id = videoId;
            console.log(id);
            switch (id) {
                case 0:
                    loadHtmlVideo(videoId);
                    break;
                default:
                    console.log('error');
            }
        })
        setTimeout(function () {
            console.log("resyncing with host after video change")
            socket.emit('sync host', {});
        }, 1000);
    })

    function loadHtmlVideo(videoId) {
        console.log('videoId', videoId);
        media.src = videoId;
    }

    socket.on('getData', (data) => {
        socket.emit('sync host', {});
    })

    socket.on('syncHost', (data, roomnum) => {
        // console.log(data);
        syncVideo(data, roomnum);
    })

    function syncVideo(data, roomnum) {
        var currTime = 0;
        var state;
        console.log(roomnum);
        if (data.currPlayer == 0) {
            currTime = media.currentTime;
            state = media.paused;
        }
        socket.emit('sync video', {
            room: roomnum,
            time: currTime,
            state: state,
            videoId: videoId
        })
    }

    socket.on('syncClientVideo', (data) => {
        var currTime = data.time;
        var state = data.state;
        var videoId = data.videoId;
        var playerId = data.playerId;
        console.log("current time is: " + currTime)
        console.log("curr vid id: " + videoId)
        console.log("state" + state)
        media.currentTime = currTime;
        if (state) {
            media.pause()
        }
        else {
            media.play()
        }
    })

    socket.on('setHost', () => {
        notifyfix = true;
        console.log("You are the new host!")
        host = true
    })

    socket.on('get users', (data) => {
        var html = '';
        for (i = 0; i < data.length; i++) {
            html += '<li style="padding-right: 10em;" class="list-group-item chat-users">' + data[i] + '</li>';
        }
        $users.html(html)
    })

    function getHostData(roomnum) {
        socket.emit('get host data', {
            room: roomnum
        });
    }

    //event listeners
    media.addEventListener("play", (e) => {
        if (host) {
            playOther(roomnum);
        }
        else {
            getHostData(roomnum);
        }
    })

    media.addEventListener("pause", function (e) {
        if (host) {
            pauseOther(roomnum)
        }
    })

    media.addEventListener("seeked", function (e) {
        let currTime = media.currentTime
        console.log("currTime:" + currTime + host);
        if (host) {
            seekOther(roomnum, currTime)
        }
    })


    function playOther(roomnum) {
        socket.emit('play other', {
            room: roomnum
        });
    }

    function pauseOther(roomnum) {
        socket.emit('pause other', {
            room: roomnum
        });
    }

    function seekOther(roomnum, currTime) {
        console.log(roomnum, currTime);
        socket.emit('seek other', {
            room: roomnum,
            time: currTime
        })
    }

    socket.on('justPlay', (data) => {
        if (media.paused) {
            media.play();
        }
    })

    socket.on('justPause', (data) => {
        media.pause();
    })

    socket.on('justSeek', (data) => {
        console.log('data.time:',data.time);
        currTime = data.time;
        media.currentTime = currTime;
    })

    socket.on('setAutoHost', (data) => {
        console.log("Here:");
        if (data.roomnum == roomnum) {
            changeHost(data.roomnum);
        }
    })

    function changeHost(roomnum) {
        if (!host) {
            console.log('calling to make me host');
            socket.emit('change host', {
                room: roomnum
            })
        }
    }

    socket.on('new message', function(data) {
        var last_div = $('.chat > div:last')[0]
        feedback.innerHTML = '';
        // This checks for the last user
        // If you are the last user, attach the message instead of creating a new div
        if (last_div !== undefined) {
            var myRegex = /.*<strong>(.+)<\/strong>.*/g
            var match = myRegex.exec(last_div.innerHTML)
            console.log(last_div.innerHTML)
            var last_user = ""
            if (match != null) {
                console.log("found the user!" + match[1])
                last_user = match[1]
            }
        }
        if (data.user != last_user) {
            $chat.append('<div class="well well-sm message-well"><strong>' + data.user + '</strong>: ' + data.msg + '</div>');
            // $vidlist.append('<div class="vid-item"><div class="thumb"><img src="http://img.youtube.com/vi/eg6kNoJmzkY/0.jpg"></div><div class="desc">Jessica Hernandez & the Deltas - Dead Brains</div></div>');
        }
        // If you sent the last message, append to previous
        else {
            last_div.innerHTML = last_div.innerHTML + " <br> " + data.msg
            // $vidlist.append('<div class="vid-item"><div class="thumb"><img src="http://img.youtube.com/vi/eg6kNoJmzkY/0.jpg"></div><div class="desc">Jessica Hernandez & the Deltas - Dead Brains</div></div>');
        }
        // $chat.scrollTop = $chat.scrollHeight;
        // Auto scroll on each message send!
        $('div#chat').scrollTop($('div#chat')[0].scrollHeight)
    });

});