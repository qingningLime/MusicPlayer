const svgcontainer = document.querySelector("div[svgcontainer]");
const audioFileInput = document.querySelector("input[audiofile]");
const audioPlayer = document.querySelector("audio[player]");
const progressBar = document.querySelector("div[processbar]");
const process = document.querySelector("div[process]");
const startTime = document.querySelector("p[start]");
const endTime = document.querySelector("p[end]");
const justSvg = document.querySelector("svg[svg]");
const playBtn = document.querySelector("svg[play]");
const pauseBtn = document.querySelector("svg[pause]");
const audioName = document.querySelector("p[name]");
const leftContent = document.querySelector("div[leftcontent]");
const rightContent = document.querySelector("div[rightcontent]");

let bgImg = new Image();
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
    if (files.length > 2) {
        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            const fileURL = URL.createObjectURL(file);
            console.log(file.name);

            if (file.name.split(".").pop().toLowerCase() !== "lrc") {
                if (['image/jpeg', 'image/png', 'image/gif',
                        'image/bmp', 'image/webp'].includes(file.type)) {
                    bgImg.src = fileURL;
                } else {
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
                }
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
    } else {
        rightContent.style.display = "none";
        leftContent.style.marginLeft = "none";
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
                    leftContent.style.marginLeft = "none";
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
            line.style.marginLeft = "0";
        } else {
            line.removeAttribute("highlight");
            line.style.filter = `blur(${Math.abs(activeIndex - index) * 0.5}px)`;
            line.style.marginLeft = `${Math.abs(activeIndex - index) * 1.25}px`;
        }
    });

    if (activeIndex >= 0) {
        const activeLine = lyricLines[activeIndex];
        if (activeLine) {
            const containerHeight = document.querySelector("div[lyricscontainer]").clientHeight;
            const activeLineOffset = activeLine.offsetTop;
            const offset = (containerHeight / 2) - activeLineOffset - 0.1 * containerHeight;
            lyricsElement.style.top = `${offset}px`;
        }
    }
}

audioPlayer.addEventListener('play', () => {
    setInterval(updateLyrics, 100);
});

function getDominantColors(imageData, colorCount = 5) {
    const pixels = imageData.data
    const colorMap = {}
    const minColorDistance = 45

    for (let i = 0; i < pixels.length; i += 4 * 4) {
        const r = pixels[i]
        const g = pixels[i + 1]
        const b = pixels[i + 2]
        const key = `${r},${g},${b}`

        let isUnique = true
        for (const existingColor of Object.keys(colorMap)) {
            const [er, eg, eb] = existingColor.split(',').map(Number)
            const distance = Math.sqrt((r - er) ** 2 + (g - eg) ** 2 + (b - eb) ** 2)
            if (distance < minColorDistance) {
                isUnique = false
                break
            }
        }

        if (isUnique) {
            colorMap[key] = (colorMap[key] || 0) + 1
        }
    }

    return Object.entries(colorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, colorCount)
        .map(([color]) => {
            const [r, g, b] = color.split(',')
            return `rgba(${r}, ${g}, ${b}, 0.9)`
        })
}

bgImg.onload = () => {
    justSvg.style.display = "none";
    svgcontainer.style.background = `url(${bgImg.src}`;

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    tempCanvas.width = 100
    tempCanvas.height = 100 * (bgImg.height / bgImg.width)

    tempCtx.drawImage(bgImg, 0, 0, tempCanvas.width, tempCanvas.height)
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)

    let colors = getDominantColors(imageData);
    document.body.style.setProperty('--background', colors[0]);
    document.body.style.setProperty('--color1', colors[0]);
    document.body.style.setProperty('--color2', colors[1]);
    document.body.style.setProperty('--color3', colors[2]);
    document.body.style.setProperty('--color4', colors[3]);
    document.body.style.setProperty('--color5', colors[4]);
    document.body.style.setProperty('--color1-rgba', colors[0].replace("0.9", "0"));
    document.body.style.setProperty('--color2-rgba', colors[1].replace("0.9", "0"));
    document.body.style.setProperty('--color3-rgba', colors[2].replace("0.9", "0"));
    document.body.style.setProperty('--color4-rgba', colors[3].replace("0.9", "0"));
    document.body.style.setProperty('--color5-rgba', colors[4].replace("0.9", "0"));
}