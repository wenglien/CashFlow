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

function labelSprite(amount: string, title: string, color: string) {
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
  sprite.scale.set(1.48, 0.58, 1);
  return sprite;
}

function axisLabelSprite(text: string) {
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
  context.fillText(text.slice(0, 13), canvas.width / 2, 34);
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.15, 0.3, 1);
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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7f9f6);

    const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 100);
    camera.position.set(0, 4.6, 8.1);
    camera.lookAt(0, 1.05, 0);

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
      new THREE.PlaneGeometry(8.6, 5.1),
      new THREE.MeshStandardMaterial({ color: 0xe7eee9, roughness: 0.88 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.z = -0.12;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(8, 8, 0x8ca29a, 0xd3ded8);
    grid.position.y = 0.012;
    grid.position.z = -0.12;
    scene.add(grid);

    const group = new THREE.Group();
    const startX = -((data.length - 1) * 1.35) / 2;
    data.forEach((item, index) => {
      const height = Math.max(0.2, (item.income / maxIncome) * 2.8);
      const geometry = new THREE.BoxGeometry(0.72, height, 0.86);
      const material = new THREE.MeshStandardMaterial({
        color: barColors[index % barColors.length],
        roughness: 0.28,
        metalness: 0.26,
        emissive: barColors[index % barColors.length],
        emissiveIntensity: 0.025
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set(startX + index * 1.35, height / 2, 0);
      bar.castShadow = true;
      bar.receiveShadow = true;
      group.add(bar);

      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 0.06, 0.9),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.18 })
      );
      cap.position.set(bar.position.x, height + 0.05, 0);
      cap.castShadow = true;
      group.add(cap);

      const label = labelSprite(formatNTD(item.income), "每月預估", barColors[index % barColors.length]);
      label.position.set(bar.position.x, height + 0.55, 0.1);
      group.add(label);

      const axisLabel = axisLabelSprite(item.name);
      axisLabel.position.set(bar.position.x, 0.12, 1.25);
      group.add(axisLabel);
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
      <div ref={hostRef} className="h-[340px] w-full overflow-hidden rounded-lg bg-mist md:h-[390px]" data-testid="cashflow-chart-3d" />
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {assets.map((asset, index) => {
          const income = (capital * (asset.allocationPercent / 100) * asset.dividendYield) / 12;
          return (
            <div key={asset.assetName} className="flex items-center justify-between gap-3 rounded-md bg-mist px-3 py-2 text-xs">
              <span className="flex min-w-0 items-center gap-2 text-ink/65">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: barColors[index % barColors.length] }} />
                <span className="truncate">{asset.assetName}</span>
              </span>
              <span className="font-semibold text-ink">{formatNTD(income)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
