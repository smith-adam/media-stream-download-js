# media-stream-download-js
Capture all playing video elements on the page and output them as files

Primarily work with ES5 at work, decided to brush up on ES6 concepts.
Script allows you to save all HTMLVideoElements on the page to files using MediaRecorder API
https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API
 
Useful for capturing video streams of meetings, Twitch streams, Crowdcast.io events.
Any time typical capture stategies fail.

Will capture all videos on the page when the VideoDownloader class is initialized.


Adds a 'playing' property to the HTMLVideoElements on the page to easily tell if they are conducting playback.
VideoDownloader class handles finding all the videos and managing all the worker classes.
Instatiate this and call start() to start recording from all the video elements and stop() to stop recording and output the results as a file.

VideoDownloadWorker class handles the capture of the video.
Can be instansiated with the HTMLVideoElement (required), filename (optional), mimeType (optional), mediaRecorderOptions (optional)
Instatiate this and call start() to start or resume recording the video element; stop() to stop recording and output the results as a file; pause() to pause the recording


