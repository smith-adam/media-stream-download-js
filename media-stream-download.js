
// wouldn't it be great if html5 video elements could tell you if they were playing?
// let's add a property called "playing" to all HTMLVideoElements on the page that tells us that
// we can only do this once so before we add it, check if it was already added
if (! ('playing' in HTMLVideoElement.prototype)) {
    Object.defineProperty(HTMLVideoElement.prototype, 'playing', {
        get: function(){
            return !!(this.currentTime > 0 && !this.paused && !this.ended && this.readyState > 2);
        }
    });
}

// this is what we'll create and call start() and stop() on
// it'll find all the videos on the page and create workers to handle recording each one
class VideoDownloader {
    #videos = document.getElementsByTagName('video'); // get all the videos on the page
    #workers = [];
    
    constructor() {
        // loop over all the videos and create workers for each one
    	for (const video of this.#videos) {
    		this.#workers.push(new VideoDownloadWorker(video));
    	}
    }
    
    // tell all the workers to start
    start = () => {
    	for (const worker of this.#workers) {
    		worker.start();
    	}
    }
    
    // tell all the workers to stop and save their data
    stop = () => {
    	for (const worker of this.#workers) {
    		worker.stop();
    	}
    }  
}

// worker classes used by VideoDownloader. handle all the capture and downloading
class VideoDownloadWorker {
    #logger = new Logger(Logger.VERBOSITY.LOW);
    
    #fps = 0;                                             // specify how many fps. 0 will grab frames as they are pushed to the video element  
    #filename = "cast.webm"                               // filename for downloaded file
    #options = { mimeType: "video/webm; codecs=vp9" };    // mime and codec settings for MediaRecorder
    #mimeType = "video/webm";                             // mime type for downloaded file
    
    #video;                  // holds a reference to the video
    #mediaRecorder;          // the MediaRecorder
    #recordedChunks = [];    // holds the data from the MediaRecorder
    
    #a = document.createElement("a");    // an anchor tag that'll be used to download the video
    
    // only required field is "video" all others have defualt values and are optional
    constructor(video, filename = this.#filename, mimeType = this.#mimeType, options = this.#options) {
       this.#video = video;
       this.#filename = filename;
       this.#options = options;

       // HTMLVideoElements can stall on slow connections, be paused etc.
       // on chrome i was running into issues with these pauses being recorded
       // added listeners to video events to pause recording when needed
       video.addEventListener('playing', this.#onPlayingEvent);
       video.addEventListener('pause', this.#onPauseEvent);
       video.addEventListener('stalled', this.#onStalledEvent);
       video.addEventListener('ended', this.#onEndedEvent);
    }
    
    // HTMLVideoElement Event Handlers
    #onPlayingEvent = (event) => {
        if(this.#mediaRecorder) {
            this.start();
        }
        this.#logger.log('video is now playing', event);
    }
    
    #onStalledEvent = (event) => {
       this.pause();
       this.#logger.log('video is stalled', event);
    }
    
    #onPauseEvent = (event) => {
       this.pause();
       this.#logger.log('video is paused', event);
    }
    
    #onEndedEvent = (event) => {
       this.stop();
       this.#logger.log('video ended', event);
    }
    
    // MediaRecorder Event Handlers
    #onDataAvailable = (event) => {
        if (event.data.size > 0) {
            this.#recordedChunks.push(event.data);
        }
        this.#logger.log('data available', event);
    }
    
    #downloadVideo = () => {
    	// convert recordedChunks into a blob of video data, and then into a blob url
        const blob = new Blob(this.#recordedChunks, {
            type: this.#mimeType
        });
        const url = URL.createObjectURL(blob);
        
        // download the blob as a file
        // create an invisible download tag, point it at the url, fire a click event on it
        const a = this.#a;
        a.style = "display: none";
        a.href = url;
        a.download = this.#filename;
        document.body.appendChild(a);
        a.click();

        // dispose of the blob url, MediaRecorder and the recordedChunks array and remove the anchor tag from the page
        window.URL.revokeObjectURL(url);
        a.parentNode.removeChild(a);
        this.#mediaRecorder = undefined;
    	this.#recordedChunks = [];
        
        this.#logger.log('downloading video');
    }
    
    #newMediaRecorder = () => {
        const stream = this.#video.captureStream(this.#fps);
        const mediaRecorder = new MediaRecorder(stream, this.#options);
        mediaRecorder.ondataavailable = this.#onDataAvailable; //if stop() or error stops this still gets called
        mediaRecorder.onstop = this.#downloadVideo;
        return mediaRecorder;
    }
    
    
    // Public Functions 
    start = () => {
        if(!this.#mediaRecorder || this.#mediaRecorder.state == "inactive") {
            this.#mediaRecorder = this.#newMediaRecorder();
            if(this.#video.playing) {
               this.#mediaRecorder.start();
               this.#logger.log('recording');
            } else {
                this.#logger.log('stream not playing, waiting to start recording');
            }
        } else if (this.#mediaRecorder.state == "paused") {
            this.#mediaRecorder.resume();
            this.#logger.log('resuming paused recording');
        } else {
        	this.#logger.log('already recording');
        }
    }
    
    stop = () => {
        if(this.#mediaRecorder && this.#mediaRecorder.state != "inactive") {
    	    this.#mediaRecorder.stop();
    	    this.#logger.log('stop active or paused media recording');
    	}
    }
    
    
    pause = () => {
        if(this.#mediaRecorder && this.#mediaRecorder.state == "recording") {
    	    this.#mediaRecorder.pause();
    	    this.#logger.log('pause media recording');
    	}
    }

}

// custom logger class i added for fun
// has js version of a static enum called VERBOSITY to set the loggin level
// low logs the first argument, high logs all arguments, none logs nothing
class Logger {
    verbosity;
    
    constructor(verbosity = Logger.VERBOSITY.NONE) {
        this.verbosity = verbosity;
    }
    
    log = (str, ...args) => {
    	switch(this.verbosity) {
    	    case Logger.VERBOSITY.LOW:
    	        console.log(str);
    	    break;
    	    case Logger.VERBOSITY.HIGH:
    	        console.log(str);
    	        for(const arg of args) { console.log(arg); }
    	    break;
    	    case Logger.VERBOSITY.NONE:
    	    default:
    	    break;
    	}
    }
}
Object.defineProperty(Logger, 'VERBOSITY', {
  value: {
        NONE: 'none',
        LOW: 'low',
        HIGH: 'high',
    },
  writable: false,
});

// as soon as the script loads create a VideoDownloader
let captureStream = new VideoDownloader();