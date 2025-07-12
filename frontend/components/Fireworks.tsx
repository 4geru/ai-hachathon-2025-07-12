'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type ExplosionType = 'sphere' | 'fountain' | 'star' | 'custom' | 'ring';

interface FireworkParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
  opacity: number;
}

interface FireworksProps {
  fireId: string;
  initialPosition: [number, number, number];
  onExplode: (fireId: string, position: [number, number, number]) => void;
  explosionType?: ExplosionType;
  baseColor?: [number, number, number];
}

const Firework: React.FC<FireworksProps> = ({ fireId, initialPosition, onExplode, explosionType = 'sphere', baseColor }) => {
  // Use useRef for mutable particles array to avoid frequent re-renders
  const particlesRef = useRef<FireworkParticle[]>([]);
  const [stage, setStage] = useState<'launch' | 'explode' | 'fade'>('launch');
  const launchStartTime = useRef(0);
  const explodePosition = useRef(new THREE.Vector3());
  const material = useRef<THREE.PointsMaterial>(null);

  const initialVelocity = useMemo(() => new THREE.Vector3(0, 5 + Math.random() * 5, 0), []);

  // Refs for BufferAttribute arrays
  const positions = useRef(new Float32Array());
  const colors = useRef(new Float32Array());
  const opacities = useRef(new Float32Array());
  const mesh = useRef<THREE.Points>(null);

  // Initial particle setup (launch particle)
  useEffect(() => {
    launchStartTime.current = performance.now();
    const startPos = new THREE.Vector3(...initialPosition);
    const launchColor = baseColor ? new THREE.Color(...baseColor) : new THREE.Color().setHSL(Math.random(), 1, 0.7);

    particlesRef.current = [{
      position: startPos,
      velocity: initialVelocity,
      color: launchColor,
      life: 0,
      maxLife: 2,
      opacity: 1
    }];

    // Initialize buffer attribute arrays with appropriate size
    positions.current = new Float32Array(particlesRef.current.length * 3);
    colors.current = new Float32Array(particlesRef.current.length * 3);
    opacities.current = new Float32Array(particlesRef.current.length);

    // Populate arrays for the initial launch particle
    particlesRef.current.forEach((p, i) => {
      p.position.toArray(positions.current, i * 3);
      p.color.toArray(colors.current, i * 3);
      opacities.current[i] = p.opacity;
    });

    if (mesh.current) {
      (mesh.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (mesh.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (mesh.current.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
    }

  }, [initialPosition, initialVelocity, baseColor]); // Dependencies for initial setup

  useFrame((state, delta) => {
    const currentParticles = particlesRef.current;

    if (!currentParticles.length) {
      if (stage === 'explode' && material.current) {
        setStage('fade');
      }
      return;
    }

    const activeParticles: FireworkParticle[] = []; // To hold particles that are still alive

    if (stage === 'launch') {
      const mainParticle = currentParticles[0];
      mainParticle.position.addScaledVector(mainParticle.velocity, delta);
      mainParticle.life += delta;

      if (mainParticle.life >= mainParticle.maxLife) {
        explodePosition.current.copy(mainParticle.position);
        onExplode(fireId, [explodePosition.current.x, explodePosition.current.y, explodePosition.current.z]);
        setStage('explode');

        const currentBaseColor = mainParticle.color;
        const currentExplosionType = explosionType === 'sphere' && Math.random() < 0.5 ? 'fountain' : explosionType;

        const explodeCount = 150 + Math.floor(Math.random() * 350);

        for (let i = 0; i < explodeCount; i++) {
          let velocity: THREE.Vector3;
          let particleColor = currentBaseColor.clone().offsetHSL(Math.random() * 0.2 - 0.1, 0, 0);

          switch (currentExplosionType) {
            case 'sphere':
              velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
              ).normalize().multiplyScalar(2 + Math.random() * 3);
              break;
            case 'fountain':
              velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5,
                Math.random() * 3 + 1,
                (Math.random() - 0.5) * 1.5
              ).normalize().multiplyScalar(2.5 + Math.random() * 3.5);
              break;
            case 'star':
              const angle = (i / explodeCount) * Math.PI * 2;
              const radius = 2 + Math.random() * 2;
              velocity = new THREE.Vector3(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                (Math.random() - 0.5) * 0.5
              );
              velocity.multiplyScalar(1.5 + Math.random() * 1);
              break;
            case 'ring':
              const ringAngle = (i / explodeCount) * Math.PI * 2;
              const ringRadius = 3 + Math.random() * 2;
              const verticalOffset = (Math.random() - 0.5) * 0.5;
              velocity = new THREE.Vector3(
                Math.cos(ringAngle) * ringRadius,
                verticalOffset,
                Math.sin(ringAngle) * ringRadius
              ).normalize().multiplyScalar(3 + Math.random() * 2);
              break;
            case 'custom':
            default:
              velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5,
                (Math.random() - 0.5) * 5
              ).normalize().multiplyScalar(4 + Math.random() * 4);
              particleColor = new THREE.Color().setHSL(Math.random(), 1, 0.5);
              break;
          }

          activeParticles.push({
            position: explodePosition.current.clone(),
            velocity: velocity,
            color: particleColor,
            life: 0,
            maxLife: 1.5 + Math.random() * 1.5,
            opacity: 1
          });
        }
        particlesRef.current = activeParticles; // Update the ref directly
      } else {
        activeParticles.push(mainParticle);
        particlesRef.current = activeParticles; // Update the ref directly
      }
    } else if (stage === 'explode') {
      currentParticles.forEach(p => {
        p.velocity.y -= 9.8 * delta * 0.1;
        p.velocity.multiplyScalar(0.98);
        p.position.addScaledVector(p.velocity, delta);
        p.life += delta;
        p.opacity = Math.max(0, 1 - (p.life / p.maxLife));

        if (p.life < p.maxLife) {
          activeParticles.push(p);
        }
      });

      particlesRef.current = activeParticles; // Update the ref directly

      if (activeParticles.length === 0) {
        setStage('fade');
      }
    } else if (stage === 'fade') {
      if (material.current) {
        material.current.opacity -= delta * 0.5;
        if (material.current.opacity <= 0) {
          particlesRef.current = []; // Clear particles when fully faded
        }
      }
    }

    // Populate BufferAttribute arrays from the (now updated) particlesRef.current
    const positionsArray = positions.current;
    const colorsArray = colors.current;
    const opacitiesArray = opacities.current;

    // Ensure arrays are large enough (reallocate if size changes significantly)
    if (currentParticles.length * 3 > positionsArray.length) {
        positions.current = new Float32Array(currentParticles.length * 3);
        colors.current = new Float32Array(currentParticles.length * 3);
        opacities.current = new Float32Array(currentParticles.length);
    }

    currentParticles.forEach((p, i) => {
      p.position.toArray(positionsArray, i * 3);
      p.color.toArray(colorsArray, i * 3);
      opacitiesArray[i] = p.opacity;
    });

    if (mesh.current) {
      (mesh.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (mesh.current.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
      (mesh.current.geometry.attributes.opacity as THREE.BufferAttribute).needsUpdate = true;
    }
  });

  // Render nothing if no particles or fully faded
  if (!particlesRef.current.length && stage !== 'fade') return null;
  if (stage === 'fade' && (!material.current || material.current.opacity <= 0)) return null;

  return (
    <points ref={mesh}>
      <bufferGeometry>
        {/* Pass refs directly to bufferAttribute */}
        <bufferAttribute attach="attributes-position" array={positions.current} count={particlesRef.current.length} itemSize={3} args={[positions.current, 3]} />
        <bufferAttribute attach="attributes-color" array={colors.current} count={particlesRef.current.length} itemSize={3} args={[colors.current, 3]} />
        <bufferAttribute attach="attributes-opacity" array={opacities.current} count={particlesRef.current.length} itemSize={1} args={[opacities.current, 1]} normalized={true} />
      </bufferGeometry>
      <pointsMaterial ref={material} vertexColors size={2.0} transparent opacity={1} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
};

export default Firework; 