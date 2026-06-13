import { describe, expect, it } from "vitest";

import { applyContrastToPixels } from "./preprocess";

function px(...values: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(values);
}

describe("applyContrastToPixels", () => {
  it("ไม่เปลี่ยนค่าตรงกลาง (128 → 128)", () => {
    const data = px(128, 128, 128, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBe(128);
    expect(data[1]).toBe(128);
    expect(data[2]).toBe(128);
    expect(data[3]).toBe(255); // alpha ไม่ถูกแตะ
  });

  it("ขาวยังขาว (255 → 255)", () => {
    const data = px(255, 255, 255, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBe(255);
    expect(data[1]).toBe(255);
    expect(data[2]).toBe(255);
  });

  it("ดำยังดำ (0 → 0)", () => {
    const data = px(0, 0, 0, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
  });

  it("สีอ่อนกว่ากลางสว่างขึ้น (200 > 128 → มากกว่า 200)", () => {
    const data = px(200, 200, 200, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBeGreaterThan(200);
  });

  it("สีเข้มกว่ากลางมืดลง (50 < 128 → น้อยกว่า 50)", () => {
    const data = px(50, 50, 50, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBeLessThan(50);
  });

  it("แต่ละ channel boost แยกกัน ไม่ทำ grayscale", () => {
    // ตัวอักษรขาว (255,255,255) บนพื้นเขียว (0,180,0) — กรณี mymo GSB
    // หลัง boost: ขาวยังขาว, เขียวสดขึ้น → contrast เพิ่ม
    const white = px(255, 255, 255, 255);
    const green = px(0, 180, 0, 255);
    applyContrastToPixels(white);
    applyContrastToPixels(green);
    // ขาวยังสว่างสุด
    expect(white[0]).toBe(255);
    expect(white[1]).toBe(255);
    expect(white[2]).toBe(255);
    // เขียว: R channel ลดลง (0→0), G สูงขึ้น (180→มากกว่า 180)
    expect(green[0]).toBe(0);
    expect(green[1]).toBeGreaterThan(180);
    expect(green[2]).toBe(0);
  });

  it("ไม่ overflow เกิน [0, 255]", () => {
    const data = px(10, 240, 128, 255, 0, 255, 64, 255);
    applyContrastToPixels(data);
    for (let i = 0; i < data.length; i++) {
      expect(data[i]).toBeGreaterThanOrEqual(0);
      expect(data[i]).toBeLessThanOrEqual(255);
    }
  });

  it("ประมวลผลหลาย pixel พร้อมกันถูกต้อง", () => {
    const data = px(128, 128, 128, 255, 255, 255, 255, 255, 0, 0, 0, 255);
    applyContrastToPixels(data);
    expect(data[0]).toBe(128); // pixel 1: เทากลาง
    expect(data[4]).toBe(255); // pixel 2: ขาว
    expect(data[8]).toBe(0);   // pixel 3: ดำ
  });
});
