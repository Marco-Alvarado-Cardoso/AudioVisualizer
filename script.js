    const canvas = document.getElementById('albumArt');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.6;
    const BASE_HEIGHT=canvas.height;
    const BASE_WIDTH=canvas.width;
    const ctx = canvas.getContext('2d');

    const AUDIO_BOOST = 1.2; //boostea asi alv
        const fileInput=document.getElementById('fileInput');
        const audioPlayer = document.getElementById('audioPlayer');
        const songName = document.getElementById('SongName');

        fileInput.addEventListener('change',function(){
        const file=fileInput.files[0];
        const url=URL.createObjectURL(file);

        audioPlayer.src=url;
        audioPlayer.play();
        });

        audioPlayer.addEventListener('loadedmetadata', () => {
            const fileName = audioPlayer.currentSrc.split('/').pop();
            songName.textContent = fileName;
        });

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audioPlayer);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        analyser.fftSize = 512; //mas frecuencia mas alto el numero
        analyser.smoothingTimeConstant = 0.3; // menos tiembla mas

        audioPlayer.addEventListener('play', () => {
            audioContext.resume();
        });

        function blackFond() {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }


        function particula() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 5 + 1;
            this.speedX = Math.random() * 3 - 1.5;
            this.speedY = Math.random() * 3 - 1.5;
        }

        const particulas = [];

        for ( i=0; i < 100; i++) {
            newParticula = new particula();
            particulas.push(newParticula);
        }

        const explosivas=[];

        function ParticulaExplosion(){
        this.x=Math.random()*canvas.width;
        this.y=Math.random()*canvas.height;
        this.size=0;
        this.maxSize=20+Math.random()*40;
        this.life=0;
        this.active=false;
        }

        for(let i=0;i<8;i++){
        explosivas.push(new ParticulaExplosion());
        }

        let mode = 0;
        function changeMode() {
         mode = (mode + 1) % 3; 
        }

        function draw() {
            requestAnimationFrame(draw);
            blackFond();
            if (mode == 0) drawBars();
            if (mode == 1) drawParticulas();
            if (mode == 2) drawWave();
        }
        requestAnimationFrame(draw);

        function drawBars() {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const barWidth = (canvas.width / dataArray.length) * 2.5;
            let barHeight;
            let x = 0;
            for (let i = 0; i < dataArray.length; i++) {
                barHeight = Math.pow(dataArray[i] / 255, 1.6) * BASE_HEIGHT * AUDIO_BOOST;
                ctx.fillStyle = 'rgb(' + (barHeight + 100) + ',2,255)';
                ctx.fillRect(x, BASE_HEIGHT - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }
        function drawParticulas(){
        const dataArray=new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        for(let i=0;i<particulas.length;i++){
        const p=particulas[i];
        const audioValue=dataArray[i%dataArray.length];

        // 🔥 BOOST GENERAL
        const AUDIO_BOOST=2.5;

        // 💥 tamaño reactivo al audio
        const targetSize=(audioValue/255)*18*AUDIO_BOOST;
        p.size+=(targetSize-p.size)*0.6;

        // 🔊 movimiento reactivo
        const force=((audioValue-80)/80)*AUDIO_BOOST;
        p.x+=p.speedX*AUDIO_BOOST+force;
        p.y+=p.speedY*AUDIO_BOOST+force;

        // 🔁 wrap (rebote infinito)
        if(p.x>canvas.width)p.x=0;
        if(p.x<0)p.x=canvas.width;
        if(p.y>canvas.height)p.y=0;
        if(p.y<0)p.y=canvas.height;

        // ✨ intensidad de audio
        const intensity=audioValue/255;

        // 🎨 color reactivo
        const color=audioValue>200
        ?`rgb(0,255,255)` // drop
        :`rgb(${255*intensity},${200*intensity},255)`;

        // 💡 dibujar partícula
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);

        ctx.fillStyle=color;
        ctx.shadowBlur=intensity*50;
        ctx.shadowColor=color;

        ctx.fill();

        // 💥 ACTIVAR EXPLOSIONES EN PICOS
        if(audioValue>220 && Math.random()<0.03){
        const e=explosivas[Math.floor(Math.random()*explosivas.length)];
        e.x=Math.random()*canvas.width;
        e.y=Math.random()*canvas.height;
        e.size=0;
        e.life=1;
        e.active=true;
        }
        }

        // =========================
        // 💥 PARTICULAS EXPLOSIVAS
        // =========================
        for(let i=0;i<explosivas.length;i++){
        const e=explosivas[i];

        if(!e.active)continue;

        // 📈 expansión de explosión
        e.size+=5;

        // ⏳ vida de explosión
        e.life-=0.02;

        // 💀 desactivar cuando muere
        if(e.life<=0){
        e.active=false;
        continue;
        }

        // 💥 dibujar explosión
        ctx.beginPath();
        ctx.arc(e.x,e.y,e.size,0,Math.PI*2);

        ctx.fillStyle=`rgba(0,255,255,${e.life})`;
        ctx.shadowBlur=50;
        ctx.shadowColor='cyan';

        ctx.fill();
        }

        // 🧹 limpiar glow global
        ctx.shadowBlur=0;
        }

        function drawWave() {
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            ctx.beginPath();
            ctx.moveTo(0, BASE_HEIGHT / 2);
            for (let i = 0; i < dataArray.length; i++) {
                const y = Math.pow(dataArray[i] / 255, 1.8) * BASE_HEIGHT * AUDIO_BOOST;
                ctx.lineTo(i * (BASE_WIDTH / dataArray.length), BASE_HEIGHT - y);
            }
            ctx.strokeStyle = 'rgb(0, 238, 255)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        