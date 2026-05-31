"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { AssetAllocation } from "@/lib/types";

const palette = ["#1f6f58", "#ec7f67", "#d4a73f", "#4b8f8c", "#7fbf9f"];

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function labelSprite(title: string, subtitle: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 118;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(23,32,29,0.22)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 10;
  roundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 18);
  context.fillStyle = "rgba(23,32,29,0.88)";
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.fillRect(28, 30, 8, 58);
  context.fillStyle = "#edf2ef";
  context.font = "700 26px Arial";
  context.textAlign = "left";
  context.fillText(title.slice(0, 13), 48, 50);
  context.font = "500 22px Arial";
  context.fillStyle = "rgba(237,242,239,0.72)";
  context.fillText(subtitle, 48, 82);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.64, 0.6, 1);
  return sprite;
}

export function PortfolioChart({ assets }: { assets: AssetAllocation[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || assets.length === 0) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f9f6);

    const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 5.4, 7.7);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdce5e0, 1.55));
    const light = new THREE.DirectionalLight(0xffffff, 2.2);
    light.position.set(4, 7, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.72, 80),
      new THREE.MeshStandardMaterial({ color: 0xe7eee9, roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.08;
    floor.receiveShadow = true;
    scene.add(floor);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(2.03, 0.015, 12, 120),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.2 })
    );
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = 0.35;
    scene.add(rim);

    const group = new THREE.Group();
    let start = 0;
    assets.forEach((asset, index) => {
      const angle = (asset.allocationPercent / 100) * Math.PI * 2;
      const mid = start + angle / 2;
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, 1.78, start, start + angle, false);
      shape.lineTo(0, 0);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.42 + index * 0.018,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.025,
        bevelThickness: 0.025
      });
      const material = new THREE.MeshStandardMaterial({
        color: palette[index % palette.length],
        roughness: 0.3,
        metalness: 0.24,
        emissive: palette[index % palette.length],
        emissiveIntensity: 0.025
      });
      const slice = new THREE.Mesh(geometry, material);
      slice.rotation.x = -Math.PI / 2;
      slice.position.set(Math.cos(mid) * 0.05, index * 0.025, Math.sin(mid) * 0.05);
      slice.castShadow = true;
      slice.receiveShadow = true;
      group.add(slice);

      const label = labelSprite(asset.assetName, `${asset.allocationPercent}% 配置`, palette[index % palette.length]);
      label.position.set(Math.cos(mid) * 2.52, 0.78, Math.sin(mid) * 2.52);
      group.add(label);
      start += angle;
    });

    scene.add(group);

    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      group.rotation.y += 0.0024;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      host.removeChild(renderer.domElement);
      scene.traverse((object) => {
        if (object instanceof THREE.Sprite) {
          object.material.map?.dispose();
          object.material.dispose();
        }
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [assets]);

  return (
    <div className="relative">
      <div ref={hostRef} className="h-[320px] w-full overflow-hidden rounded-lg bg-mist md:h-[360px]" data-testid="portfolio-chart-3d" />
      <div className="mt-3 grid gap-2 text-xs text-ink/65">
        {assets.map((asset, index) => (
          <div key={asset.assetName} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: palette[index % palette.length] }} />
              <span className="truncate">{asset.assetName}</span>
            </span>
            <span className="font-semibold text-ink">{asset.allocationPercent}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
