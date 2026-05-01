"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { AssetAllocation } from "@/lib/types";

const barColors = ["#1f6f58", "#d4a73f", "#4b8f8c", "#ec7f67", "#7fbf9f"];
const money = new Intl.NumberFormat("zh-TW", {
  maximumFractionDigits: 0
});

function formatNTD(value: number) {
  return `NT$${money.format(value)}`;
}

function chartLayout(width: number) {
  const compact = width < 560;
  return {
    compact,
    spacing: compact ? 0.78 : 1.35,
    barWidth: compact ? 0.44 : 0.72,
    barDepth: compact ? 0.56 : 0.86,
    maxBarHeight: compact ? 2.25 : 2.8,
    amountLabelScale: compact ? [0.9, 0.36, 1] as const : [1.48, 0.58, 1] as const,
    axisLabelScale: compact ? [0.76, 0.22, 1] as const : [1.15, 0.3, 1] as const,
    axisLabelZ: compact ? 0.94 : 1.25,
    amountLabelLift: compact ? 0.36 : 0.55,
    floorWidth: compact ? 5.4 : 8.6,
    floorDepth: compact ? 4.65 : 5.1,
    gridSize: compact ? 5.1 : 8,
    cameraFov: compact ? 46 : 38,
    cameraPosition: compact ? new THREE.Vector3(0, 3.65, 7.7) : new THREE.Vector3(0, 4.6, 8.1),
    lookAt: compact ? new THREE.Vector3(0, 0.95, 0) : new THREE.Vector3(0, 1.05, 0)
  };
}

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

function labelSprite(amount: string, title: string, color: string, scale: readonly [number, number, number]) {
  const canvas = document.createElement("canvas");
  canvas.width = 300;
  canvas.height = 118;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(23,32,29,0.2)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 10;
  roundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 18);
  context.fillStyle = "rgba(23,32,29,0.9)";
  context.fill();
  context.shadowBlur = 0;
  context.fillStyle = color;
  context.fillRect(28, 30, 8, 58);
  context.fillStyle = "#edf2ef";
  context.font = "700 26px Arial";
  context.textAlign = "left";
  context.fillText(amount, 48, 52);
  context.fillStyle = "rgba(237,242,239,0.72)";
  context.font = "500 20px Arial";
  context.fillText(title.slice(0, 12), 48, 82);

  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(...scale);
  return sprite;
}

function axisLabelSprite(text: string, scale: readonly [number, number, number], maxChars: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 220;
  canvas.height = 56;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Sprite();
  context.fillStyle = "rgba(23,32,29,0.72)";
  roundedRect(context, 8, 8, canvas.width - 16, canvas.height - 16, 12);
  context.fill();
  context.fillStyle = "#edf2ef";
  context.font = "600 18px Arial";
  context.textAlign = "center";
  context.fillText(text.slice(0, maxChars), canvas.width / 2, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(...scale);
  return sprite;
}

export function CashFlowChart({ assets, capital }: { assets: AssetAllocation[]; capital: number }) {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || assets.length === 0) return;

    const data = assets.map((asset) => ({
      name: asset.assetName,
      income: (capital * (asset.allocationPercent / 100) * asset.dividendYield) / 12
    }));
    const maxIncome = Math.max(...data.map((item) => item.income), 1);
    const layout = chartLayout(host.clientWidth);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f9f6);

    const camera = new THREE.PerspectiveCamera(layout.cameraFov, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.copy(layout.cameraPosition);
    camera.lookAt(layout.lookAt);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdce5e0, 1.45));
    const light = new THREE.DirectionalLight(0xffffff, 2.1);
    light.position.set(3.5, 7, 5);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    scene.add(light);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(layout.floorWidth, layout.floorDepth),
      new THREE.MeshStandardMaterial({ color: 0xe7eee9, roughness: 0.88 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -0.12;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(layout.gridSize, 8, 0x8ca29a, 0xd3ded8);
    grid.position.y = 0.012;
    grid.position.z = -0.12;
    scene.add(grid);

    const group = new THREE.Group();
    const startX = -((data.length - 1) * layout.spacing) / 2;
    data.forEach((item, index) => {
      const height = Math.max(0.16, (item.income / maxIncome) * layout.maxBarHeight);
      const geometry = new THREE.BoxGeometry(layout.barWidth, height, layout.barDepth);
      const material = new THREE.MeshStandardMaterial({
        color: barColors[index % barColors.length],
        roughness: 0.28,
        metalness: 0.26,
        emissive: barColors[index % barColors.length],
        emissiveIntensity: 0.025
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set(startX + index * layout.spacing, height / 2, 0);
      bar.castShadow = true;
      bar.receiveShadow = true;
      group.add(bar);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(layout.barWidth + 0.04, 0.06, layout.barDepth + 0.04),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.18 })
      );
      cap.position.set(bar.position.x, height + 0.05, 0);
      cap.castShadow = true;
      group.add(cap);

      const label = labelSprite(formatNTD(item.income), "每月預估", barColors[index % barColors.length], layout.amountLabelScale);
      label.position.set(bar.position.x, height + layout.amountLabelLift, 0.1);
      group.add(label);

      const axisLabel = axisLabelSprite(item.name, layout.axisLabelScale, layout.compact ? 8 : 13);
      axisLabel.position.set(bar.position.x, 0.12, layout.axisLabelZ);
      group.add(axisLabel);
    });

    scene.add(group);

    const resizeObserver = new ResizeObserver(() => {
      if (!host.clientWidth || !host.clientHeight) return;
      const nextLayout = chartLayout(host.clientWidth);
      camera.fov = nextLayout.cameraFov;
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.position.copy(nextLayout.cameraPosition);
      camera.lookAt(nextLayout.lookAt);
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    });
    resizeObserver.observe(host);

    let frameId = 0;
    const animate = () => {
      frameId = window.requestAnimationFrame(animate);
      group.rotation.y = Math.sin(Date.now() * 0.00032) * 0.1;
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
  }, [assets, capital]);

  return (
    <div className="relative">
      <div ref={hostRef} className="h-[300px] w-full min-w-0 overflow-hidden rounded-lg bg-mist sm:h-[340px] md:h-[390px]" data-testid="cashflow-chart-3d" />
      <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {assets.map((asset, index) => {
          const income = (capital * (asset.allocationPercent / 100) * asset.dividendYield) / 12;
          return (
            <div key={asset.assetName} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-mist px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-ink/65">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: barColors[index % barColors.length] }} />
                <span className="truncate">{asset.assetName}</span>
              </span>
              <span className="whitespace-nowrap font-semibold text-ink">{formatNTD(income)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
