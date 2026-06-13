import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import PlanetDetailModal from './energy/PlanetDetailModal';
import { useEnergy } from '../context/EnergyContext';

const PLANET_ASSETS = [
  { texture: `${import.meta.env.BASE_URL}images/planet_rocky.png`, color: '#ffaaaa', size: 0.95 },
  { texture: `${import.meta.env.BASE_URL}images/planet_ice.png`, color: '#aaffff', size: 1.1 },
  { texture: `${import.meta.env.BASE_URL}images/planet_lava.png`, color: '#ffaa00', size: 1.22 },
  { texture: `${import.meta.env.BASE_URL}images/planet_void.png`, color: '#ddccff', size: 0.88 },
  { texture: `${import.meta.env.BASE_URL}images/planet_forest.png`, color: '#aaffaa', size: 1.02 },
  { texture: `${import.meta.env.BASE_URL}images/planet_gas.png`, color: '#ffccaa', size: 1.16 },
  { texture: `${import.meta.env.BASE_URL}images/planet_desert.png`, color: '#ffeeaa', size: 0.92 }
];

function getClusterOffsets(count) {
  if (count <= 1) return [[0, 0, 0]];
  if (count === 2) return [[-1.5, 0.5, 0], [1.5, -0.3, 0.2]];
  if (count === 3) return [[-1.8, 0.8, 0], [1.7, 0.4, 0.35], [0, -1.35, -0.2]];
  if (count === 4) return [[-1.8, 1.05, 0.1], [1.8, 0.95, -0.2], [-1.6, -1.2, 0.3], [1.6, -1.1, -0.25]];
  return [[-1.9, 1.2, 0.05], [1.9, 1.0, -0.2], [-2.1, -1.15, 0.28], [2.05, -1.05, -0.35], [0, 0, 0.45]];
}

function Planet({ planet, onClick }) {
  const meshRef = useRef();
  const texture = useLoader(THREE.TextureLoader, planet.asset.texture);
  const { size } = planet.asset;
  const [hovered, setHovered] = useState(false);
  const floatSeed = useMemo(
    () => planet.index * 0.73 + planet.basePosition[0] * 0.19 + planet.basePosition[1] * 0.37,
    [planet]
  );

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime() + floatSeed;
      meshRef.current.position.set(
        planet.basePosition[0] + Math.sin(t * 0.75) * 0.18,
        planet.basePosition[1] + Math.cos(t * 0.9) * 0.28,
        planet.basePosition[2] + Math.sin(t * 0.55) * 0.14
      );
      meshRef.current.rotation.y += 0.003;
      meshRef.current.rotation.x += 0.001;
    }
  });

  useFrame(() => {
    if (hovered) document.body.style.cursor = 'pointer';
    return () => { document.body.style.cursor = 'auto'; }
  });

  return (
    <group>
      <group
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(planet); }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      >
        <mesh>
          <sphereGeometry args={[size, 64, 64]} />
          <meshStandardMaterial
            map={texture}
            color="white"
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        {hovered && (
          <mesh scale={[1.02, 1.02, 1.02]}>
            <sphereGeometry args={[size, 64, 64]} />
            <meshBasicMaterial
              color="white"
              transparent
              opacity={0.1}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        )}

        <mesh scale={[1.06, 1.06, 1.06]}>
          <sphereGeometry args={[size, 64, 64]} />
          <meshBasicMaterial
            color={planet.asset.color}
            transparent
            opacity={0.06}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        <Html
          position={[0, size * 1.78, 0]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              fontFamily: '"STKaiti", "KaiTi", "Kaiti SC", serif',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.78), 0 0 18px rgba(255, 255, 255, 0.18)',
              whiteSpace: 'nowrap',
              letterSpacing: '2px'
            }}
          >
            {planet.keyword}
          </div>
        </Html>
      </group>
    </group>
  );
}

function Scene({ planets, onPlanetClick }) {
  return (
    <>
      <ambientLight intensity={0.7} color="#8aa8ff" />
      <pointLight position={[0, 2, 8]} intensity={2.2} distance={100} decay={1.2} color="#ffe2a8" />
      <pointLight position={[-10, 0, 6]} intensity={1.2} distance={40} color="#8cd8ff" />
      <pointLight position={[10, 1, 6]} intensity={1.2} distance={40} color="#ffcfa3" />
      <mesh position={[0, -0.5, -6]}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.08} />
      </mesh>

      {planets.map((planet) => (
        <Planet
          key={`${planet.userId}-${planet.keyword}`}
          planet={planet}
          onClick={onPlanetClick}
        />
      ))}

      <Stars radius={90} depth={20} count={3000} factor={4} saturation={0} fade speed={0.2} />
    </>
  );
}

export default function HeroSection({ goTo }) {
  const { activeKeywordRecordsByUser, users } = useEnergy();
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const planets = useMemo(() => {
    const userEntries = Object.values(users);
    const centers = {
      [userEntries[0]?.id || 'left']: [-8, 0.2, 0],
      [userEntries[1]?.id || 'right']: [8, 0.2, 0]
    };

    return userEntries.flatMap((user, userIndex) => {
      const records = activeKeywordRecordsByUser[user.id] || [];
      const offsets = getClusterOffsets(records.length);
      const center = centers[user.id] || [userIndex === 0 ? -8 : 8, 0.2, 0];

      return records.map((row, index) => {
        const offset = offsets[index] || [0, 0, 0];
        const asset = PLANET_ASSETS[(index + userIndex * 3) % PLANET_ASSETS.length];

        return {
          id: row.id,
          userId: user.id,
          userName: user.name,
          keyword: row.keyword,
          status: row.status,
          asset,
          index,
          basePosition: [
            center[0] + offset[0],
            center[1] + offset[1],
            center[2] + offset[2]
          ]
        };
      });
    });
  }, [activeKeywordRecordsByUser, users]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }}>

      <Canvas
        camera={{ position: [0, 4, 32], fov: 45 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
        style={{ position: 'relative', zIndex: 2 }}
      >
        <React.Suspense fallback={null}>
          <Scene planets={planets} onPlanetClick={setSelectedPlanet} />
        </React.Suspense>
      </Canvas>

      {selectedPlanet && (
        <PlanetDetailModal planet={selectedPlanet} onClose={() => setSelectedPlanet(null)} />
      )}

      {planets.length === 0 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}>
          <div style={{
            padding: '18px 24px',
            borderRadius: '999px',
            background: 'rgba(8, 12, 20, 0.55)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.86)',
            backdropFilter: 'blur(12px)'
          }}>
            先在 Energy Station 里添加年度关键词，双星系才会亮起来。
          </div>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10
      }}>
        <motion.button
          whileHover={{ scale: 1.05, borderColor: '#4ECDC4', boxShadow: '0 0 20px rgba(78, 205, 196, 0.3)' }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: 'relative',
            padding: '16px 48px',
            background: 'rgba(10, 20, 30, 0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#4ECDC4',
            fontSize: '16px',
            letterSpacing: '4px',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            fontFamily: '"Rajdhani", sans-serif',
            fontWeight: '600',
            textTransform: 'uppercase',
            clipPath: 'polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%)',
            textShadow: '0 0 10px rgba(78, 205, 196, 0.3)'
          }}
          onClick={() => {
            if (goTo) goTo('annual');
          }}
        >
          <span style={{ marginRight: '10px' }}>▶</span>
          ENTER SYSTEM
        </motion.button>
      </div>
    </div>
  );
}
