import React, { useEffect, useRef } from 'https://esm.sh/react@19.1.0';
import ReactDOM from 'https://esm.sh/react-dom@19.1.0/client';
import { Canvas, useFrame } from 'https://esm.sh/@react-three/fiber@9.4.5';
import * as Tone from 'https://esm.sh/tone@15.1.22';

function AudioReactiveMesh() {
  const meshRef = useRef();
  const analyserRef = useRef();

  useEffect(() => {
    async function setup() {
      await Tone.start();
      const response = await fetch('/api/tracks');
      const tracks = await response.json();
      const url = tracks[0] ? tracks[0].url : null;
      if (!url) return;
      const player = new Tone.Player(url).toDestination();
      const analyser = new Tone.Analyser('fft', 32);
      player.connect(analyser);
      analyserRef.current = analyser;
      player.autostart = true;
    }
    setup();
  }, []);

  useFrame(() => {
    if (analyserRef.current && meshRef.current) {
      const data = analyserRef.current.getValue();
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const scale = 1 + avg / 200;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

function HeroScene() {
  return (
    <Canvas style={{ height: '300px' }}>
      <ambientLight />
      <pointLight position={[10, 10, 10]} />
      <AudioReactiveMesh />
    </Canvas>
  );
}

ReactDOM.createRoot(document.getElementById('hero-root')).render(<HeroScene />);
