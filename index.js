const svgcontainer = document.querySelector("div[svgcontainer]");
const audioFileInput = document.querySelector("input[audiofile]");
const audioPlayer = document.querySelector("audio[player]");
const progressBar = document.querySelector("div[processbar]");
const process = document.querySelector("div[process]");
const startTime = document.querySelector("p[start]");
const endTime = document.querySelector("p[end]");
const playBtn = document.querySelector("svg[play]");
const pauseBtn = document.querySelector("svg[pause]");
const audioName = document.querySelector("p[name]");
const rightContent = document.querySelector("div[rightcontent]");

let playing = false;
let isDragging = false;
let lrcData;
let lyrics = [];
let lyricsElement;
let reader;

svgcontainer.addEventListener("mouseover", () => {
    svgcontainer.style.transform = "scale(1.1)";
});

svgcontainer.addEventListener("mouseout", () => {
    svgcontainer.style.transform = "scale(1)";
});

svgcontainer.addEventListener("click", async () => {
    // const filePaths = await window.electron.openDialog();
    // if (filePaths && filePaths.length > 0) {
    //     // 处理选中的文件
    //     for (const filePath of filePaths) {
    //         const file = new File([await fetch(filePath).then(r => r.blob())], filePath.split('/').pop());
    //         const event = { target: { files: [file] } };
    //         audioFileInput.dispatchEvent(new CustomEvent('change', { detail: event }));
    //     }
    // }
    audioFileInput.click();
});

audioFileInput.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files.length > 1) {
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            const fileURL = URL.createObjectURL(file);
            console.log(file.name);

            if (file.name.split(".").pop().toLowerCase() !== "lrc") {
                audioPlayer.src = fileURL;
                playBtn.dispatchEvent(new Event("click"));
                audioPlayer.addEventListener("loadedmetadata", () => {
                    endTime.textContent = `-${formatTime(audioPlayer.duration)}`;
                });
                setTimeout(() => {
                    audioPlayer.play();
                }, 100);

                let filename = file.name.split('.')[0];
                if (filename.length > 15) {
                    filename = filename.substring(0, 15) + "...";
                }
                audioName.textContent = filename;
            } else {
                reader = new FileReader();
                reader.onload = function(e) {
                    lrcData = e.target.result;
                    lyrics = parseLrc(lrcData);
                    lyricsElement = document.querySelector("div[lyrics]");
                    lyricsElement.innerHTML = lyrics.map(line => `<div lyric>${line.text}</div>`).join('');
                };
                reader.readAsText(file);
            }
        }
    }
});

function fetchLrcFile(filename) {
    return new Promise((resolve, reject) => {
        const lrcFileUrl = `${filename}`;
        fetch(lrcFileUrl)
            .then(response => {
                if (response.ok) {
                    return response.text();
                } else {
                    reject("No such lrc file");
                    rightContent.style.display = "none";
                }
            })
            .then(lrcData => resolve(lrcData))
            .catch(error => reject(error));
    });
}

audioPlayer.addEventListener("timeupdate", () => {
    if (audioPlayer.duration) {
        process.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
        startTime.textContent = formatTime(audioPlayer.currentTime);
        endTime.textContent = `-${formatTime(audioPlayer.duration - audioPlayer.currentTime)}`;
    }
});

progressBar.addEventListener("mousedown", (event) => {
    isDragging = true;
    updateProgress(event);
});

document.addEventListener("mousemove", (event) => {
    if (isDragging) {
        updateProgress(event);
    }
});

document.addEventListener("mouseup", () => {
    isDragging = false;
});

playBtn.addEventListener("click", () => {
    playing = true;
    audioPlayer.play();
    pauseBtn.style.display = "block";
    playBtn.style.display = "none";
});

pauseBtn.addEventListener("click", () => {
    playing = false;
    audioPlayer.pause();
    pauseBtn.style.display = "none";
    playBtn.style.display = "block";
});

function updateProgress(event) {
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const progressBarWidth = rect.width;
    const percentage = (clickPosition / progressBarWidth) * 100;
    process.style.width = `${percentage}%`;
    audioPlayer.currentTime = (percentage / 100) * audioPlayer.duration;

    if (!playing) {
        playBtn.dispatchEvent(new Event("click"));
    }
}

function formatTime(time) {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
}

function parseLrc(lrcText) {
    const lines = lrcText.trim().split('\n');
    const lrcArray = [];

    lines.forEach(line => {
        const timeMatch = line.match(/\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/);

        if (timeMatch) {
            const minutes = parseInt(timeMatch[1], 10);
            const seconds = parseInt(timeMatch[2], 10);
            const milliseconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

            const text = line.replace(timeMatch[0], '').trim();

            const timeInSeconds = minutes * 60 + seconds + milliseconds / 1000;
            if (text) {
                lrcArray.push({ time: timeInSeconds, text });
            }
        }
    });
    
    return lrcArray;
}


function updateLyrics() {
    const currentTime = audioPlayer.currentTime;
    const lyricLines = document.querySelectorAll('div[lyric]');
    let activeIndex = 0;

    for (let i = 0; i < lyrics.length; i++) {
        if (currentTime >= lyrics[i].time) {
            activeIndex = i;
        } else {
            break;
        }
    }

    lyricLines.forEach((line, index) => {
        if (index === activeIndex) {
            line.setAttribute("highlight", "")
            line.style.filter = "none";
        } else {
            line.removeAttribute("highlight");
            line.style.filter = `blur(${Math.abs(activeIndex - index) * 0.5}px)`;
        }
    });

    if (activeIndex >= 0) {
        const activeLine = lyricLines[activeIndex];
        if (activeLine) {
            const containerHeight = document.querySelector("div[lyricscontainer]").clientHeight;
            const activeLineOffset = activeLine.offsetTop;
            const offset = (containerHeight / 2) - activeLineOffset - 0.15 * containerHeight;
            lyricsElement.style.top = `${offset}px`;
        }
    }
}

audioPlayer.addEventListener('play', () => {
    setInterval(updateLyrics, 100);
});