"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { MarketQuote } from "@/lib/types";

const colors = {
  positive: "#39c28f",
  neutral: "#d4a73f",
  negative: "#ec7f67",
  grid: 0x6f8880,
  text: "#edf2ef"
};

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

function makeLabel(symbol: string, change: number, price: number, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 280;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(0,0,0,0.24)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 10;
  roundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 16);
  context.fillStyle = "rgba(23,32,29,0.9)";
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.fillRect(26, 28, 7, 58);
  context.fillStyle = colors.text;
  context.font = "700 24px Arial";
  context.textAlign = "left";
  context.fillText(symbol, 44, 49);
  context.font = "600 19px Arial";
  context.fillStyle = change >= 0 ? "#9df0c9" : "#ffb1a2";
  context.fillText(`${change >= 0 ? "+" : ""}${change.toFixed(2)}%`, 44, 76);
  context.fillStyle = "rgba(237,242,239,0.7)";
  context.font = "500 16px Arial";
  context.fillText(`NT$${price.toFixed(2)}`, 156, 76);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.32, 0.53, 1);
  return sprite;
}

export function MarketScene3D({ quotes, selectedSymbol }: { quotes: MarketQuote[]; selectedSymbol?: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || quotes.length === 0) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x17201d);

    const camera = new THREE.PerspectiveCamera(36, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 5.6, 10.4);
    camera.lookAt(0, 0.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xeef7f2, 0x0b1210, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(11.4, 7.2),
      new THREE.MeshStandardMaterial({ color: 0x1e2a25, roughness: 0.9, metalness: 0.05 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(10.5, 12, colors.grid, 0x31443d);
    grid.position.y = -0.02;
    scene.add(grid);

    const maxVolume = Math.max(...quotes.map((quote) => quote.volume), 1);
    const maxPrice = Math.max(...quotes.map((quote) => quote.price), 1);
    const group = new THREE.Group();
    const gap = Math.min(1.18, 8 / Math.max(quotes.length, 1));
    const startX = -((quotes.length - 1) * gap) / 2;

    quotes.forEach((quote, index) => {
      const priceHeight = Math.max(0.35, (quote.price / maxPrice) * 3.3);
      const volumeDepth = Math.max(0.55, (quote.volume / maxVolume) * 1.6);
      const width = selectedSymbol === quote.symbol ? 0.64 : 0.48;
      const tone = quote.changePercent > 0.15 ? colors.positive : quote.changePercent < -0.15 ? colors.negative : colors.neutral;
      const geometry = new THREE.BoxGeometry(width, priceHeight, volumeDepth);
      const material = new THREE.MeshStandardMaterial({
        color: tone,
        roughness: 0.3,
        metalness: 0.34,
        emissive: tone,
        emissiveIntensity: selectedSymbol === quote.symbol ? 0.28 : 0.05
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set(startX + index * gap, priceHeight / 2, quote.changePercent / 2.6);
      bar.castShadow = true;
      bar.receiveShadow = true;
      group.add(bar);

      const capGeometry = new THREE.BoxGeometry(width + 0.08, 0.06, volumeDepth + 0.08);
      const capMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.32, metalness: 0.22, emissive: tone, emissiveIntensity: 0.12 });
      const cap = new THREE.Mesh(capGeometry, capMaterial);
      cap.position.set(bar.position.x, priceHeight + 0.05, bar.position.z);
      cap.castShadow = true;
      group.add(cap);

      const marker = new THREE.Mesh(
        new THREE.TorusGeometry(selectedSymbol === quote.symbol ? 0.35 : 0.26, 0.018, 10, 40),
        new THREE.MeshStandardMaterial({ color: tone, emissive: tone, emissiveIntensity: 0.35 })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(bar.position.x, 0.015, bar.position.z);
      group.add(marker);

      const label = makeLabel(quote.symbol, quote.changePercent, quote.price, tone);
      const labelLane = index % 2 === 0 ? 0.36 : -0.34;
      label.position.set(bar.position.x, priceHeight + 0.64, bar.position.z + labelLane);
      group.add(label);
    });

    scene.add(group);

    let frameId = 0;
    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      group.rotation.y = Math.sin(Date.now() * 0.00032) * 0.11;
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
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [quotes, selectedSymbol]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-ink">
      <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 text-[11px] font-semibold text-white/80">
        <span className="rounded-md bg-white/10 px-2 py-1">高度：價格</span>
        <span className="rounded-md bg-white/10 px-2 py-1">深度：成交量</span>
        <span className="rounded-md bg-white/10 px-2 py-1">前後：漲跌幅</span>
      </div>
      <div ref={hostRef} className="h-[340px] w-full md:h-[460px]" data-testid="market-scene-3d" />
    </div>
  );
}
